/**
 * Hook: useRoomSocket
 *
 * Manages WebSocket lifecycle, auto-reconnect, message queuing,
 * key exchange negotiation, and encrypted message dispatch.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ClientMessage,
  ServerMessage,
  Participant,
  TimelineItem,
  EncryptedFileAttachment,
  ReplyReference,
  ReactionMap,
  EncryptedInnerPayload,
  EncryptedV2Payload,
  ChatMessage,
} from '../types/protocol.ts';
import { AadMetadata } from '../crypto/types.ts';
import { getWebSocketUrl } from '../services/api.ts';
import { useCryptoSession } from './useCryptoSession.ts';
import { CallState } from '../client/components/VoiceCallModal.tsx';

export function isSafeAttachmentUrl(url: string | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('vbscript:')) {
    return false;
  }
  if (trimmed.startsWith('data:text/html') || trimmed.startsWith('data:application/xhtml')) {
    return false;
  }
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return true;
  }
  return false;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export function formatTtlLabel(ttlMs: number): string {
  if (ttlMs <= 0) return 'Off';
  if (ttlMs < 60000) return `${Math.round(ttlMs / 1000)}s`;
  if (ttlMs < 3600000) return `${Math.round(ttlMs / 60000)}m`;
  return `${Math.round(ttlMs / 3600000)}h`;
}

export interface UseRoomSocketOptions {
  roomCode: string;
  participantId: string;
  displayName: string;
  onExpired?: () => void;
  onError?: (error: string) => void;
}

export function useRoomSocket({
  roomCode,
  participantId,
  displayName,
  onExpired,
  onError,
}: UseRoomSocketOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [peerTyping, setPeerTyping] = useState<string | null>(null);
  const [peerLastSeen, setPeerLastSeen] = useState<number | null>(null);
  const [blockedParticipantIds, setBlockedParticipantIds] = useState<Set<string>>(new Set());
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number>(Date.now() + 15 * 60 * 1000);
  const [disappearingTtlMs, setDisappearingTtlMs] = useState<number>(0);

  const timelineRef = useRef<TimelineItem[]>(timeline);
  timelineRef.current = timeline;

  // WebRTC Call State
  const [callState, setCallState] = useState<CallState>('idle');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const incomingOfferSdpRef = useRef<string | null>(null);

  const blockedRef = useRef(blockedParticipantIds);
  blockedRef.current = blockedParticipantIds;

  const disappearingTtlMsRef = useRef<number>(0);
  disappearingTtlMsRef.current = disappearingTtlMs;

  const participantsRef = useRef<Participant[]>([]);
  participantsRef.current = participants;

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyLeftRef = useRef(false);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Replay Protection & Sequence Tracking
  const outboundSeqRef = useRef<number>(1);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const seenMessageIdsListRef = useRef<string[]>([]);
  const lastSeqBySenderRef = useRef<Map<string, number>>(new Map());

  /**
   * Replay Protection Check:
   * Rejects replayed or duplicate message IDs and enforces sequence windowing.
   */
  const checkReplay = useCallback((messageId: string, senderId: string, seq?: number): boolean => {
    if (!messageId || typeof messageId !== 'string') {
      return false;
    }
    if (seenMessageIdsRef.current.has(messageId)) {
      return false; // Replay detected
    }

    if (seq !== undefined && typeof seq === 'number') {
      const lastSeq = lastSeqBySenderRef.current.get(senderId) || 0;
      if (seq <= lastSeq - 50) {
        return false; // Stale packet outside sequence window
      }
      if (seq > lastSeq) {
        lastSeqBySenderRef.current.set(senderId, seq);
      }
    }

    seenMessageIdsRef.current.add(messageId);
    seenMessageIdsListRef.current.push(messageId);
    if (seenMessageIdsListRef.current.length > 1000) {
      const oldest = seenMessageIdsListRef.current.shift();
      if (oldest) seenMessageIdsRef.current.delete(oldest);
    }

    return true;
  }, []);

  // E2E Cryptographic engine
  const crypto = useCryptoSession();
  const cryptoRef = useRef(crypto);
  cryptoRef.current = crypto;

  /**
   * Dispatches a typed client frame through the WebSocket connection
   */
  const send = useCallback((msg: ClientMessage): boolean => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      try {
        socketRef.current.send(JSON.stringify(msg));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  const unreadReceivedIdsRef = useRef<Set<string>>(new Set());

  const sendDeliveryAck = useCallback(
    async (targetMessageId: string) => {
      if (!cryptoRef.current.isEncrypted) return;
      try {
        const ackId = `dack-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const payload: EncryptedInnerPayload = {
          version: 2,
          kind: 'delivery_ack',
          messageId: targetMessageId,
          deliveredTo: participantId,
          timestamp: Date.now(),
        };
        const aad: AadMetadata = {
          version: 2,
          roomCode,
          senderId: participantId,
          messageId: ackId,
          type: 'message',
        };
        const { ciphertext, iv } = await cryptoRef.current.encrypt(JSON.stringify(payload), aad);
        send({
          type: 'message',
          roomCode,
          senderId: participantId,
          messageId: ackId,
          iv,
          ciphertext,
          timestamp: Date.now(),
        });
      } catch {
        // ignore ack failure
      }
    },
    [participantId, roomCode, send]
  );

  const sendReadAck = useCallback(
    async (targetMessageId: string) => {
      if (!cryptoRef.current.isEncrypted) return;
      try {
        const ackId = `rack-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const payload: EncryptedInnerPayload = {
          version: 2,
          kind: 'read_ack',
          messageId: targetMessageId,
          readBy: participantId,
          timestamp: Date.now(),
        };
        const aad: AadMetadata = {
          version: 2,
          roomCode,
          senderId: participantId,
          messageId: ackId,
          type: 'message',
        };
        const { ciphertext, iv } = await cryptoRef.current.encrypt(JSON.stringify(payload), aad);
        send({
          type: 'message',
          roomCode,
          senderId: participantId,
          messageId: ackId,
          iv,
          ciphertext,
          timestamp: Date.now(),
        });
      } catch {
        // ignore ack failure
      }
    },
    [participantId, roomCode, send]
  );

  const sendDeliveryAckRef = useRef(sendDeliveryAck);
  sendDeliveryAckRef.current = sendDeliveryAck;

  const sendReadAckRef = useRef(sendReadAck);
  sendReadAckRef.current = sendReadAck;

  /**
   * WebRTC Signaling and Call Management
   */
  const cleanUpCall = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      try {
        pcRef.current.close();
      } catch {
        // ignore
      }
      pcRef.current = null;
    }
    iceCandidateQueueRef.current = [];
    incomingOfferSdpRef.current = null;
    setRemoteStream(null);
    setIsMuted(false);
    setCallDuration(0);
    setCallState('idle');
  }, []);

  const cleanUpCallRef = useRef(cleanUpCall);
  cleanUpCallRef.current = cleanUpCall;

  const sendWebRtcSignal = useCallback(
    async (signal: {
      signalType: 'offer' | 'answer' | 'ice_candidate' | 'hangup' | 'reject';
      sdp?: string;
      candidate?: RTCIceCandidateInit;
    }) => {
      if (!cryptoRef.current.isEncrypted) return;
      try {
        const signalId = `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const payload: EncryptedInnerPayload = {
          version: 2,
          kind: 'webrtc_signal',
          signalType: signal.signalType,
          sdp: signal.sdp,
          candidate: signal.candidate,
          senderId: participantId,
          timestamp: Date.now(),
        };
        const aad: AadMetadata = {
          version: 2,
          roomCode,
          senderId: participantId,
          messageId: signalId,
          type: 'message',
        };
        const { ciphertext, iv } = await cryptoRef.current.encrypt(JSON.stringify(payload), aad);
        send({
          type: 'message',
          roomCode,
          senderId: participantId,
          messageId: signalId,
          iv,
          ciphertext,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.warn('Failed to dispatch encrypted WebRTC signal', err);
      }
    },
    [participantId, roomCode, send]
  );

  const sendWebRtcSignalRef = useRef(sendWebRtcSignal);
  sendWebRtcSignalRef.current = sendWebRtcSignal;

  const startCall = useCallback(async () => {
    if (callState !== 'idle' || !cryptoRef.current.isEncrypted) return;
    try {
      setCallState('calling');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendWebRtcSignalRef.current({
            signalType: 'ice_candidate',
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await sendWebRtcSignalRef.current({
        signalType: 'offer',
        sdp: offer.sdp,
      });
    } catch (err) {
      console.warn('Call start error', err);
      cleanUpCallRef.current();
      setErrorBanner('Microphone permission denied or WebRTC unavailable.');
    }
  }, [callState]);

  const acceptCall = useCallback(async () => {
    if (callState !== 'incoming' || !incomingOfferSdpRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendWebRtcSignalRef.current({
            signalType: 'ice_candidate',
            candidate: event.candidate.toJSON(),
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      await pc.setRemoteDescription({
        type: 'offer',
        sdp: incomingOfferSdpRef.current,
      });

      while (iceCandidateQueueRef.current.length > 0) {
        const cand = iceCandidateQueueRef.current.shift();
        if (cand) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch {
            // ignore
          }
        }
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await sendWebRtcSignalRef.current({
        signalType: 'answer',
        sdp: answer.sdp,
      });

      setCallState('connected');
      const start = Date.now();
      callTimerRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } catch (err) {
      console.warn('Accept call error', err);
      cleanUpCallRef.current();
      setErrorBanner('Failed to accept call: microphone unavailable.');
    }
  }, [callState]);

  const rejectCall = useCallback(async () => {
    await sendWebRtcSignalRef.current({ signalType: 'reject' });
    cleanUpCallRef.current();
  }, []);

  const endCall = useCallback(async () => {
    await sendWebRtcSignalRef.current({ signalType: 'hangup' });
    cleanUpCallRef.current();
  }, []);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  /**
   * Panic / Burn Room Kill Switch
   * Immediately destroys all keys, clears session memory, notifies peer, and redirects to decoy.
   */
  const burnRoom = useCallback(async () => {
    cleanUpCallRef.current();
    try {
      if (cryptoRef.current.isEncrypted) {
        const burnId = `burn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const payload: EncryptedInnerPayload = {
          version: 2,
          kind: 'burn_room',
          burnerId: participantId,
          timestamp: Date.now(),
        };
        const aad: AadMetadata = {
          version: 2,
          roomCode,
          senderId: participantId,
          messageId: burnId,
          type: 'message',
        };
        const { ciphertext, iv } = await cryptoRef.current.encrypt(JSON.stringify(payload), aad);
        send({
          type: 'message',
          roomCode,
          senderId: participantId,
          messageId: burnId,
          iv,
          ciphertext,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.warn('Error sending burn signal', err);
    }

    crypto.resetCrypto();
    timelineRef.current.forEach((item) => {
      if (item.kind === 'message' && item.attachment?.dataUrl?.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(item.attachment.dataUrl);
        } catch {
          // ignore
        }
      }
    });

    if (socketRef.current) {
      try {
        socketRef.current.close(1000, 'Room Burned');
      } catch {
        // ignore
      }
      socketRef.current = null;
    }

    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch {
      // ignore
    }

    window.location.replace('https://www.google.com');
  }, [crypto, participantId, roomCode, send]);

  /**
   * Connects to the WebSocket room endpoint
   */
  const connect = useCallback(async () => {
    if (isManuallyLeftRef.current) return;

    if (socketRef.current) {
      const oldWs = socketRef.current;
      socketRef.current = null;
      oldWs.onopen = null;
      oldWs.onmessage = null;
      oldWs.onerror = null;
      oldWs.onclose = null;
      try {
        oldWs.close(1000, 'Replaced by new connection');
      } catch {
        // ignore
      }
    }

    setStatus(reconnectAttemptsRef.current > 0 ? 'reconnecting' : 'connecting');
    setErrorBanner(null);

    // Initialize local crypto keys if not yet prepared
    let localPublicKeyJwk = cryptoRef.current.publicKeyJwk;
    if (!localPublicKeyJwk) {
      try {
        localPublicKeyJwk = await cryptoRef.current.initializeSession();
      } catch (err) {
        console.error('Cryptographic key generation failed:', err);
        const reason = err instanceof Error ? err.message : 'Web Crypto API unavailable';
        setErrorBanner(`Failed to generate local cryptographic keys: ${reason}`);
        setStatus('disconnected');
        return;
      }
    }

    const wsUrl = getWebSocketUrl(roomCode);
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;
    } catch (err) {
      setStatus('disconnected');
      setErrorBanner('Failed to initiate WebSocket connection');
      return;
    }

    ws.onopen = () => {
      if (socketRef.current !== ws) return;
      setStatus('connected');
      reconnectAttemptsRef.current = 0;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // 1. Join room
      send({
        type: 'join',
        roomCode,
        participantId,
        displayName,
      });

      // 2. Announce public key for E2E agreement
      if (localPublicKeyJwk) {
        send({
          type: 'key-exchange',
          roomCode,
          senderId: participantId,
          publicKey: localPublicKeyJwk,
        });
      }

      // 3. Keepalive ping every 25s
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = setInterval(() => {
        send({ type: 'ping' });
      }, 25000);
    };

    ws.onmessage = async (event) => {
      try {
        const data: ServerMessage = JSON.parse(event.data);

        switch (data.type) {
          case 'pong':
            // keepalive acknowledgement
            break;

          case 'room-state': {
            setParticipants(data.participants);
            setExpiresAt(data.expiresAt);

            // If a peer is already present, trigger key exchange immediately
            const otherPeer = data.participants.find((p) => p.id !== participantId);
            if (otherPeer && localPublicKeyJwk) {
              send({
                type: 'key-exchange',
                roomCode,
                senderId: participantId,
                publicKey: localPublicKeyJwk,
              });
            }
            break;
          }

          case 'peer-joined': {
            setPeerLastSeen(null);
            setParticipants((prev) => {
              const exists = prev.some((p) => p.id === data.participant.id);
              if (exists) return prev;
              return [...prev, data.participant];
            });

            setTimeline((prev) => [
              ...prev,
              {
                kind: 'system',
                id: `join-${Date.now()}-${data.participant.id}`,
                type: 'system',
                content: `${data.participant.displayName} connected. Establishing E2E session...`,
                timestamp: Date.now(),
              },
            ]);

            // Peer joined: send them our public key so they can derive the shared secret
            if (localPublicKeyJwk) {
              send({
                type: 'key-exchange',
                roomCode,
                senderId: participantId,
                publicKey: localPublicKeyJwk,
              });
            }
            break;
          }

          case 'peer-left': {
            setParticipants((prev) => prev.filter((p) => p.id !== data.participantId));
            setPeerTyping(null);
            setPeerLastSeen(Date.now());

            setTimeline((prev) => [
              ...prev,
              {
                kind: 'system',
                id: `leave-${Date.now()}-${data.participantId}`,
                type: 'system',
                content: `${data.displayName} left the room.`,
                timestamp: Date.now(),
              },
            ]);
            break;
          }

          case 'key-exchange': {
            if (data.senderId !== participantId) {
              try {
                await cryptoRef.current.handlePeerPublicKey(data.publicKey);

                setTimeline((prev) => [
                  ...prev,
                  {
                    kind: 'system',
                    id: `crypto-${Date.now()}`,
                    type: 'system',
                    content: 'End-to-end encrypted session established (AES-256-GCM / ECDH P-256).',
                    timestamp: Date.now(),
                  },
                ]);
              } catch (err) {
                setErrorBanner('Cryptographic key agreement failed.');
              }
            }
            break;
          }

          case 'message': {
            if (data.senderId !== participantId) {
              if (blockedRef.current.has(data.senderId)) {
                break;
              }

              // Replay protection check
              if (!checkReplay(data.messageId, data.senderId)) {
                break;
              }

              try {
                // Decrypt with AAD binding (version, room, sender, messageId)
                const aad: AadMetadata = {
                  version: 2,
                  roomCode,
                  senderId: data.senderId,
                  messageId: data.messageId,
                  type: 'message',
                };

                let plaintext: string;
                try {
                  plaintext = await cryptoRef.current.decrypt(data.ciphertext, data.iv, aad);
                } catch {
                  // Backwards-compatible fallback for non-AAD messages
                  plaintext = await cryptoRef.current.decrypt(data.ciphertext, data.iv);
                }

                const senderName =
                  participantsRef.current.find((p) => p.id === data.senderId)?.displayName || 'Participant';

                let parsed: any = null;
                try {
                  parsed = JSON.parse(plaintext);
                } catch {
                  // Legacy raw string plaintext fallback
                  parsed = { type: 'text', text: plaintext };
                }

                if (parsed && typeof parsed === 'object' && parsed.version === 2) {
                  const v2 = parsed as EncryptedV2Payload;
                  switch (v2.kind) {
                    case 'chat_message': {
                      if (v2.messageId && v2.messageId !== data.messageId && !checkReplay(v2.messageId, data.senderId)) {
                        break;
                      }

                      // Sanitize attachment URL against dangerous schemes
                      let safeAttachment = v2.attachment;
                      if (safeAttachment && !isSafeAttachmentUrl(safeAttachment.dataUrl)) {
                        safeAttachment = undefined;
                      }

                      const targetMsgId = v2.messageId || data.messageId;

                      const incomingMsg: TimelineItem = {
                        kind: 'message',
                        id: targetMsgId,
                        senderId: data.senderId,
                        senderName,
                        text: v2.text,
                        attachment: safeAttachment,
                        messageType: safeAttachment ? 'file' : 'text',
                        timestamp: data.timestamp,
                        isOwn: false,
                        status: 'delivered',
                        replyTo: v2.replyTo,
                        isViewOnce: v2.isViewOnce,
                        isVoiceNote: v2.isVoiceNote,
                        voiceDurationSec: v2.voiceDurationSec,
                        reactions: {},
                        ttlMs: v2.ttlMs,
                        expiresAt: v2.expiresAt,
                      };
                      setTimeline((prev) => [...prev, incomingMsg]);

                      // Dispatch delivery acknowledgment to peer
                      sendDeliveryAckRef.current(targetMsgId);

                      // If tab is active and visible, dispatch read ack immediately
                      if (
                        typeof document !== 'undefined' &&
                        !document.hidden &&
                        (typeof document.hasFocus !== 'function' || document.hasFocus())
                      ) {
                        sendReadAckRef.current(targetMsgId);
                      } else {
                        unreadReceivedIdsRef.current.add(targetMsgId);
                      }
                      break;
                    }

                    case 'delivery_ack': {
                      const { messageId } = v2;
                      setTimeline((prev) =>
                        prev.map((item) => {
                          if (item.kind !== 'message' || item.id !== messageId) return item;
                          if (item.status === 'sending' || item.status === 'sent') {
                            return { ...item, status: 'delivered' };
                          }
                          return item;
                        })
                      );
                      break;
                    }

                    case 'read_ack': {
                      const { messageId } = v2;
                      setTimeline((prev) =>
                        prev.map((item) => {
                          if (item.kind !== 'message' || item.id !== messageId) return item;
                          return { ...item, status: 'read' };
                        })
                      );
                      break;
                    }

                    case 'reaction': {
                      const { messageId, emoji, action, participantId: reactorId } = v2;
                      setTimeline((prev) =>
                        prev.map((item) => {
                          if (item.kind !== 'message' || item.id !== messageId) return item;
                          const reactions: ReactionMap = { ...(item.reactions || {}) };
                          const userList = new Set(reactions[emoji] || []);
                          if (action === 'add') {
                            userList.add(reactorId);
                          } else {
                            userList.delete(reactorId);
                          }
                          if (userList.size === 0) {
                            delete reactions[emoji];
                          } else {
                            reactions[emoji] = Array.from(userList);
                          }
                          return { ...item, reactions };
                        })
                      );
                      break;
                    }

                    case 'edit': {
                      const { messageId, newText } = v2;
                      setTimeline((prev) =>
                        prev.map((item) => {
                          if (item.kind !== 'message' || item.id !== messageId) return item;
                          if (item.senderId !== data.senderId) return item;
                          return { ...item, text: newText, isEdited: true };
                        })
                      );
                      break;
                    }

                    case 'delete': {
                      const { messageId } = v2;
                      setTimeline((prev) =>
                        prev.map((item) => {
                          if (item.kind !== 'message' || item.id !== messageId) return item;
                          if (item.senderId !== data.senderId) return item;
                          return {
                            ...item,
                            isDeleted: true,
                            text: undefined,
                            attachment: undefined,
                          };
                        })
                      );
                      break;
                    }

                    case 'pin': {
                      const { messageId, isPinned } = v2;
                      setTimeline((prev) =>
                        prev.map((item) => {
                          if (item.kind !== 'message' || item.id !== messageId) return item;
                          return { ...item, isPinned };
                        })
                      );
                      break;
                    }

                    case 'view_once_opened': {
                      const { messageId } = v2;
                      setTimeline((prev) =>
                        prev.map((item) => {
                          if (item.kind !== 'message' || item.id !== messageId) return item;
                          if (item.attachment?.dataUrl?.startsWith('blob:')) {
                            try {
                              URL.revokeObjectURL(item.attachment.dataUrl);
                            } catch {
                              // ignore
                            }
                          }
                          return {
                            ...item,
                            isViewed: true,
                            viewedAt: Date.now(),
                            attachment: undefined, // Immediately zero out viewed attachment
                          };
                        })
                      );
                      break;
                    }

                    case 'disappearing_timer': {
                      const { ttlMs, setBy } = v2;
                      setDisappearingTtlMs(ttlMs);
                      const label = formatTtlLabel(ttlMs);
                      setTimeline((prev) => [
                        ...prev,
                        {
                          kind: 'system',
                          id: `disappear-${Date.now()}`,
                          type: 'system',
                          content: `${setBy || 'Peer'} set disappearing messages to ${label}.`,
                          timestamp: Date.now(),
                        },
                      ]);
                      break;
                    }

                    case 'burn_room': {
                      cleanUpCallRef.current();
                      cryptoRef.current.resetCrypto();
                      timelineRef.current.forEach((item) => {
                        if (item.kind === 'message' && item.attachment?.dataUrl?.startsWith('blob:')) {
                          try {
                            URL.revokeObjectURL(item.attachment.dataUrl);
                          } catch {
                            // ignore
                          }
                        }
                      });
                      if (socketRef.current) {
                        try {
                          socketRef.current.close(1000, 'Room Burned');
                        } catch {
                          // ignore
                        }
                        socketRef.current = null;
                      }
                      try {
                        sessionStorage.clear();
                        localStorage.clear();
                      } catch {
                        // ignore
                      }
                      window.location.replace('https://www.google.com');
                      break;
                    }

                    case 'webrtc_signal': {
                      const { signalType, sdp, candidate, senderId: sigSenderId } = v2;
                      if (sigSenderId === participantId) break;

                      if (signalType === 'offer' && sdp) {
                        incomingOfferSdpRef.current = sdp;
                        setCallState('incoming');
                      } else if (signalType === 'answer' && sdp) {
                        if (pcRef.current) {
                          try {
                            await pcRef.current.setRemoteDescription({ type: 'answer', sdp });
                            while (iceCandidateQueueRef.current.length > 0) {
                              const cand = iceCandidateQueueRef.current.shift();
                              if (cand) {
                                try {
                                  await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
                                } catch {
                                  // ignore
                                }
                              }
                            }
                            setCallState('connected');
                            const start = Date.now();
                            callTimerRef.current = setInterval(() => {
                              setCallDuration(Math.floor((Date.now() - start) / 1000));
                            }, 1000);
                          } catch (err) {
                            console.warn('Failed to set remote answer', err);
                          }
                        }
                      } else if (signalType === 'ice_candidate' && candidate) {
                        if (pcRef.current && pcRef.current.remoteDescription) {
                          try {
                            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                          } catch (err) {
                            console.warn('Failed to add ICE candidate', err);
                          }
                        } else {
                          iceCandidateQueueRef.current.push(candidate);
                        }
                      } else if (signalType === 'hangup' || signalType === 'reject') {
                        cleanUpCallRef.current();
                        setTimeline((prev) => [
                          ...prev,
                          {
                            kind: 'system',
                            id: `call-ended-${Date.now()}`,
                            type: 'system',
                            content: signalType === 'reject' ? 'Peer declined the voice call.' : 'Voice call ended.',
                            timestamp: Date.now(),
                          },
                        ]);
                      }
                      break;
                    }
                  }
                } else {
                  // Legacy V1 format fallback
                  let messageType: 'text' | 'file' = 'text';
                  let messageText = plaintext;
                  let fileAttachment = undefined;

                  const legacy = parsed as Record<string, any> | null;
                  if (legacy && typeof legacy === 'object') {
                    if (legacy.type === 'file' && legacy.attachment) {
                      if (isSafeAttachmentUrl(legacy.attachment.dataUrl)) {
                        fileAttachment = legacy.attachment;
                        messageType = 'file';
                      }
                    } else if (legacy.type === 'text' && typeof legacy.text === 'string') {
                      messageText = legacy.text;
                    }
                  }

                  const legacyMsg: TimelineItem = {
                    kind: 'message',
                    id: data.messageId,
                    senderId: data.senderId,
                    senderName,
                    text: messageType === 'text' ? messageText : undefined,
                    attachment: fileAttachment,
                    messageType,
                    timestamp: data.timestamp,
                    isOwn: false,
                    status: 'delivered',
                    reactions: {},
                  };
                  setTimeline((prev) => [...prev, legacyMsg]);
                }
              } catch (err) {
                // Tampered or invalid ciphertext dropped safely
              }
            }
            break;
          }

          case 'typing': {
            if (data.senderId !== participantId) {
              if (blockedRef.current.has(data.senderId)) {
                break;
              }
              if (data.isTyping) {
                const peerName =
                  participants.find((p) => p.id === data.senderId)?.displayName || 'Peer';
                setPeerTyping(peerName);

                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                  setPeerTyping(null);
                }, 3000);
              } else {
                setPeerTyping(null);
              }
            }
            break;
          }

          case 'room-expired': {
            setErrorBanner(data.message || 'Room has expired due to inactivity.');
            setStatus('disconnected');
            if (onExpiredRef.current) onExpiredRef.current();
            break;
          }

          case 'error': {
            setErrorBanner(data.message);
            if (data.code === 'ROOM_FULL' || data.code === 'ROOM_EXPIRED') {
              setStatus('disconnected');
              isManuallyLeftRef.current = true;
            }
            if (onErrorRef.current) onErrorRef.current(data.message);
            break;
          }
        }
      } catch (err) {
        console.error('Error handling WebSocket message frame', err);
      }
    };

    ws.onclose = (event) => {
      // Ignore close events from stale/superseded sockets
      if (socketRef.current !== ws) return;

      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      if (isManuallyLeftRef.current || event.code === 1000 || event.code === 4000 || event.code === 4003) {
        setStatus('disconnected');
        return;
      }

      // Attempt automatic reconnection with exponential backoff and jitter
      if (reconnectAttemptsRef.current < 5) {
        setStatus('reconnecting');
        const baseDelay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 10000);
        const jitter = Math.random() * 500;
        const delay = baseDelay + jitter;
        reconnectAttemptsRef.current += 1;
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      } else {
        setStatus('disconnected');
        setErrorBanner('Connection lost. Click retry to reconnect to the secure room.');
      }
    };

    ws.onerror = () => {
      if (socketRef.current !== ws) return;
      // On browser WebSocket, onerror is immediately followed by onclose
    };
  }, [roomCode, participantId, displayName, send]);

  // Connect on mount
  useEffect(() => {
    isManuallyLeftRef.current = false;
    reconnectAttemptsRef.current = 0;
    connect();

    return () => {
      isManuallyLeftRef.current = true;
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (socketRef.current) {
        const oldWs = socketRef.current;
        socketRef.current = null;
        oldWs.onopen = null;
        oldWs.onmessage = null;
        oldWs.onerror = null;
        oldWs.onclose = null;
        try {
          oldWs.close(1000, 'Component unmounted');
        } catch {
          // ignore
        }
      }
      cryptoRef.current.resetCrypto();
    };
  }, [roomCode, participantId, displayName]);

  // Periodic pruning of expired disappearing messages
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setTimeline((prev) => {
        const hasExpired = prev.some(
          (item) => item.kind === 'message' && item.expiresAt && item.expiresAt <= now
        );
        if (!hasExpired) return prev;
        return prev.filter(
          (item) => !(item.kind === 'message' && item.expiresAt && item.expiresAt <= now)
        );
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Flush read receipts when tab/window gains focus or becomes visible
  useEffect(() => {
    const handleFocusOrVisible = () => {
      if (typeof document === 'undefined') return;
      if (!document.hidden && (typeof document.hasFocus !== 'function' || document.hasFocus())) {
        if (unreadReceivedIdsRef.current.size > 0) {
          const ids = Array.from(unreadReceivedIdsRef.current);
          unreadReceivedIdsRef.current.clear();
          for (const id of ids) {
            sendReadAckRef.current(id);
          }
        }
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    window.addEventListener('visibilitychange', handleFocusOrVisible);
    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      window.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, []);

  /**
   * Encrypts and transmits a chat message or encrypted file attachment (with optional reply, view-once, and ttl)
   */
  const sendMessage = useCallback(
    async (
      text: string,
      file?: EncryptedFileAttachment,
      replyTo?: ReplyReference,
      isViewOnce?: boolean,
      isVoiceNote?: boolean,
      voiceDurationSec?: number
    ) => {
      const trimmed = text.trim();
      if (!trimmed && !file) return;

      if (!crypto.isEncrypted) {
        setErrorBanner('Cannot send: waiting for second participant to establish E2E session.');
        return;
      }

      const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const timestamp = Date.now();
      const currentTtl = disappearingTtlMsRef.current;
      const expiresAt = currentTtl > 0 ? timestamp + currentTtl : undefined;

      // Optimistically add to timeline with status 'sending'
      setTimeline((prev) => [
        ...prev,
        {
          kind: 'message',
          id: messageId,
          senderId: participantId,
          senderName: displayName,
          text: trimmed || undefined,
          attachment: file,
          messageType: file ? 'file' : 'text',
          timestamp,
          isOwn: true,
          status: 'sending',
          replyTo,
          isViewOnce,
          isVoiceNote,
          voiceDurationSec,
          reactions: {},
          ttlMs: currentTtl > 0 ? currentTtl : undefined,
          expiresAt,
        },
      ]);

      try {
        const payloadObject: EncryptedInnerPayload = {
          version: 2,
          kind: 'chat_message',
          messageId,
          text: trimmed || undefined,
          attachment: file,
          replyTo: replyTo || undefined,
          isViewOnce: isViewOnce || undefined,
          isVoiceNote: isVoiceNote || undefined,
          voiceDurationSec: voiceDurationSec || undefined,
          ttlMs: currentTtl > 0 ? currentTtl : undefined,
          expiresAt,
        };

        const aad: AadMetadata = {
          version: 2,
          roomCode,
          senderId: participantId,
          messageId,
          type: 'message',
        };

        const payloadString = JSON.stringify(payloadObject);
        const { ciphertext, iv } = await crypto.encrypt(payloadString, aad);

        const sent = send({
          type: 'message',
          roomCode,
          senderId: participantId,
          messageId,
          iv,
          ciphertext,
          timestamp,
        });

        setTimeline((prev) =>
          prev.map((m) =>
            m.kind === 'message' && m.id === messageId ? { ...m, status: sent ? 'sent' : 'failed' } : m
          )
        );
      } catch (err) {
        setTimeline((prev) =>
          prev.map((m) =>
            m.kind === 'message' && m.id === messageId ? { ...m, status: 'failed' } : m
          )
        );
        setErrorBanner('Failed to encrypt message before transmission.');
      }
    },
    [crypto, participantId, displayName, roomCode, send]
  );

  /**
   * Retries transmission of a previously failed message
   */
  const retrySendMessage = useCallback(
    async (messageId: string) => {
      let targetMsg: ChatMessage | undefined;
      setTimeline((prev) => {
        const item = prev.find((m) => m.kind === 'message' && m.id === messageId);
        if (item && item.kind === 'message' && item.isOwn) {
          targetMsg = item;
          return prev.map((m) => (m.id === messageId ? { ...m, status: 'sending' } : m));
        }
        return prev;
      });

      if (!targetMsg) return;
      if (!crypto.isEncrypted) {
        setErrorBanner('Cannot retry: waiting for second participant to establish E2E session.');
        setTimeline((prev) =>
          prev.map((m) => (m.id === messageId && m.kind === 'message' ? { ...m, status: 'failed' } : m))
        );
        return;
      }

      const timestamp = Date.now();
      const currentTtl = disappearingTtlMsRef.current;
      const expiresAt = currentTtl > 0 ? timestamp + currentTtl : undefined;

      try {
        const payloadObject: EncryptedInnerPayload = {
          version: 2,
          kind: 'chat_message',
          messageId,
          text: targetMsg.text,
          attachment: targetMsg.attachment,
          replyTo: targetMsg.replyTo,
          isViewOnce: targetMsg.isViewOnce,
          ttlMs: currentTtl > 0 ? currentTtl : undefined,
          expiresAt,
        };

        const aad: AadMetadata = {
          version: 2,
          roomCode,
          senderId: participantId,
          messageId,
          type: 'message',
        };

        const payloadString = JSON.stringify(payloadObject);
        const { ciphertext, iv } = await crypto.encrypt(payloadString, aad);

        const sent = send({
          type: 'message',
          roomCode,
          senderId: participantId,
          messageId,
          iv,
          ciphertext,
          timestamp,
        });

        setTimeline((prev) =>
          prev.map((m) =>
            m.kind === 'message' && m.id === messageId ? { ...m, status: sent ? 'sent' : 'failed' } : m
          )
        );
      } catch (err) {
        setTimeline((prev) =>
          prev.map((m) =>
            m.kind === 'message' && m.id === messageId ? { ...m, status: 'failed' } : m
          )
        );
        setErrorBanner('Failed to encrypt message before transmission.');
      }
    },
    [crypto, participantId, roomCode, send]
  );

  /**
   * Toggles an emoji reaction on a message
   */
  const sendReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!crypto.isEncrypted) return;

      let action: 'add' | 'remove' = 'add';
      setTimeline((prev) =>
        prev.map((item) => {
          if (item.kind !== 'message' || item.id !== messageId) return item;
          const reactions: ReactionMap = { ...(item.reactions || {}) };
          const userList = new Set(reactions[emoji] || []);
          if (userList.has(participantId)) {
            userList.delete(participantId);
            action = 'remove';
          } else {
            userList.add(participantId);
            action = 'add';
          }
          if (userList.size === 0) {
            delete reactions[emoji];
          } else {
            reactions[emoji] = Array.from(userList);
          }
          return { ...item, reactions };
        })
      );

      try {
        const eventId = `react-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const payload: EncryptedInnerPayload = {
          version: 2,
          kind: 'reaction',
          messageId,
          emoji,
          action,
          participantId,
        };
        const aad: AadMetadata = {
          version: 2,
          roomCode,
          senderId: participantId,
          messageId: eventId,
          type: 'message',
        };
        const { ciphertext, iv } = await crypto.encrypt(JSON.stringify(payload), aad);
        send({
          type: 'message',
          roomCode,
          senderId: participantId,
          messageId: eventId,
          iv,
          ciphertext,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Failed to send reaction:', err);
      }
    },
    [crypto, participantId, roomCode, send]
  );

  /**
   * Edits a previously sent message
   */
  const sendEdit = useCallback(
    async (messageId: string, newText: string) => {
      const trimmed = newText.trim();
      if (!trimmed || !crypto.isEncrypted) return;

      // Optimistically update
      setTimeline((prev) =>
        prev.map((item) => {
          if (item.kind !== 'message' || item.id !== messageId || item.senderId !== participantId) {
            return item;
          }
          return { ...item, text: trimmed, isEdited: true };
        })
      );

      try {
        const eventId = `edit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const payload: EncryptedInnerPayload = {
          version: 2,
          kind: 'edit',
          messageId,
          newText: trimmed,
        };
        const aad: AadMetadata = {
          version: 2,
          roomCode,
          senderId: participantId,
          messageId: eventId,
          type: 'message',
        };
        const { ciphertext, iv } = await crypto.encrypt(JSON.stringify(payload), aad);
        send({
          type: 'message',
          roomCode,
          senderId: participantId,
          messageId: eventId,
          iv,
          ciphertext,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Failed to send edit:', err);
      }
    },
    [crypto, participantId, roomCode, send]
  );

  /**
   * Deletes a message (for me or everyone)
   */
  const sendDelete = useCallback(
    async (messageId: string, mode: 'me' | 'everyone') => {
      if (mode === 'me') {
        setTimeline((prev) => prev.filter((item) => item.id !== messageId));
        return;
      }

      // mode === 'everyone'
      if (!crypto.isEncrypted) return;

      setTimeline((prev) =>
        prev.map((item) => {
          if (item.kind !== 'message' || item.id !== messageId || item.senderId !== participantId) {
            return item;
          }
          return {
            ...item,
            isDeleted: true,
            text: undefined,
            attachment: undefined,
          };
        })
      );

      try {
        const eventId = `del-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const payload: EncryptedInnerPayload = {
          version: 2,
          kind: 'delete',
          messageId,
          deleteType: 'everyone',
        };
        const aad: AadMetadata = {
          version: 2,
          roomCode,
          senderId: participantId,
          messageId: eventId,
          type: 'message',
        };
        const { ciphertext, iv } = await crypto.encrypt(JSON.stringify(payload), aad);
        send({
          type: 'message',
          roomCode,
          senderId: participantId,
          messageId: eventId,
          iv,
          ciphertext,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Failed to send delete:', err);
      }
    },
    [crypto, participantId, roomCode, send]
  );

  /**
   * Pins or unpins a message
   */
  const sendPin = useCallback(
    async (messageId: string, isPinned: boolean) => {
      if (!crypto.isEncrypted) return;

      setTimeline((prev) =>
        prev.map((item) => {
          if (item.kind !== 'message' || item.id !== messageId) return item;
          return { ...item, isPinned };
        })
      );

      try {
        const eventId = `pin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const payload: EncryptedInnerPayload = {
          version: 2,
          kind: 'pin',
          messageId,
          isPinned,
        };
        const aad: AadMetadata = {
          version: 2,
          roomCode,
          senderId: participantId,
          messageId: eventId,
          type: 'message',
        };
        const { ciphertext, iv } = await crypto.encrypt(JSON.stringify(payload), aad);
        send({
          type: 'message',
          roomCode,
          senderId: participantId,
          messageId: eventId,
          iv,
          ciphertext,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Failed to send pin:', err);
      }
    },
    [crypto, participantId, roomCode, send]
  );

  /**
   * Acknowledges that a view-once media item has been viewed by recipient
   */
  const sendViewOnceAck = useCallback(
    async (messageId: string) => {
      setTimeline((prev) =>
        prev.map((item) => {
          if (item.kind !== 'message' || item.id !== messageId) return item;
          if (item.attachment?.dataUrl?.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(item.attachment.dataUrl);
            } catch {
              // ignore
            }
          }
          return {
            ...item,
            isViewed: true,
            viewedAt: Date.now(),
            attachment: undefined, // Immediately wipe attachment in viewer memory
          };
        })
      );

      if (!crypto.isEncrypted) return;

      try {
        const eventId = `vo-ack-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const payload: EncryptedInnerPayload = {
          version: 2,
          kind: 'view_once_opened',
          messageId,
          viewerId: participantId,
        };
        const aad: AadMetadata = {
          version: 2,
          roomCode,
          senderId: participantId,
          messageId: eventId,
          type: 'message',
        };
        const { ciphertext, iv } = await crypto.encrypt(JSON.stringify(payload), aad);
        send({
          type: 'message',
          roomCode,
          senderId: participantId,
          messageId: eventId,
          iv,
          ciphertext,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Failed to send view once ack:', err);
      }
    },
    [crypto, participantId, roomCode, send]
  );

  /**
   * Configures disappearing messages timer
   */
  const setDisappearingTimer = useCallback(
    async (ttlMs: number) => {
      setDisappearingTtlMs(ttlMs);
      const label = formatTtlLabel(ttlMs);
      setTimeline((prev) => [
        ...prev,
        {
          kind: 'system',
          id: `disappear-self-${Date.now()}`,
          type: 'system',
          content: `You set disappearing messages to ${label}.`,
          timestamp: Date.now(),
        },
      ]);

      if (!crypto.isEncrypted) return;

      try {
        const eventId = `dt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const payload: EncryptedInnerPayload = {
          version: 2,
          kind: 'disappearing_timer',
          ttlMs,
          setBy: displayName,
        };
        const aad: AadMetadata = {
          version: 2,
          roomCode,
          senderId: participantId,
          messageId: eventId,
          type: 'message',
        };
        const { ciphertext, iv } = await crypto.encrypt(JSON.stringify(payload), aad);
        send({
          type: 'message',
          roomCode,
          senderId: participantId,
          messageId: eventId,
          iv,
          ciphertext,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error('Failed to send disappearing timer:', err);
      }
    },
    [crypto, displayName, participantId, roomCode, send]
  );

  /**
   * Broadcasts typing status
   */
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      send({
        type: 'typing',
        roomCode,
        senderId: participantId,
        isTyping,
      });
    },
    [roomCode, participantId, send]
  );

  /**
   * Leaves the room voluntarily
   */
  const leaveRoom = useCallback(() => {
    isManuallyLeftRef.current = true;
    send({
      type: 'leave',
      roomCode,
      senderId: participantId,
    });
    if (socketRef.current) {
      try {
        socketRef.current.close(1000, 'User departed');
      } catch {
        // ignore
      }
    }
    setStatus('disconnected');
    crypto.resetCrypto();
  }, [roomCode, participantId, send, crypto]);

  /**
   * Manual reconnect trigger
   */
  const retryConnection = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    isManuallyLeftRef.current = false;
    connect();
  }, [connect]);

  /**
   * Local block controls
   */
  const blockParticipant = useCallback((id: string) => {
    setBlockedParticipantIds((prev) => new Set([...prev, id]));
  }, []);

  const unblockParticipant = useCallback((id: string) => {
    setBlockedParticipantIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isParticipantBlocked = useCallback((id: string) => {
    return blockedRef.current.has(id);
  }, []);

  return {
    status,
    participants,
    timeline,
    peerTyping,
    peerLastSeen,
    blockedParticipantIds,
    blockParticipant,
    unblockParticipant,
    isParticipantBlocked,
    errorBanner,
    expiresAt,
    crypto,
    disappearingTtlMs,
    sendMessage,
    retrySendMessage,
    sendReaction,
    sendEdit,
    sendDelete,
    sendPin,
    sendViewOnceAck,
    setDisappearingTimer,
    sendTyping,
    leaveRoom,
    retryConnection,
    burnRoom,
    callState,
    remoteStream,
    isMuted,
    callDuration,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  };
}
