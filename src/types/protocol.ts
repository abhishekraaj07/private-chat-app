/**
 * NEXUS Protocol & Message Types
 */

export interface Participant {
  id: string;
  displayName: string;
  joinedAt: number;
}

export type ClientMessage =
  | {
      type: 'join';
      roomCode: string;
      participantId: string;
      displayName: string;
    }
  | {
      type: 'key-exchange';
      roomCode: string;
      senderId: string;
      publicKey: JsonWebKey;
    }
  | {
      type: 'message';
      roomCode: string;
      senderId: string;
      messageId: string;
      iv: string;
      ciphertext: string;
      timestamp: number;
    }
  | {
      type: 'typing';
      roomCode: string;
      senderId: string;
      isTyping: boolean;
    }
  | {
      type: 'leave';
      roomCode: string;
      senderId: string;
    }
  | {
      type: 'ping';
    };

export type ServerMessage =
  | {
      type: 'room-state';
      roomCode: string;
      participantCount: number;
      participants: Participant[];
      createdAt: number;
      expiresAt: number;
    }
  | {
      type: 'peer-joined';
      participant: Participant;
      participantCount: number;
    }
  | {
      type: 'peer-left';
      participantId: string;
      displayName: string;
      participantCount: number;
    }
  | {
      type: 'key-exchange';
      senderId: string;
      publicKey: JsonWebKey;
    }
  | {
      type: 'message';
      senderId: string;
      messageId: string;
      iv: string;
      ciphertext: string;
      timestamp: number;
    }
  | {
      type: 'typing';
      senderId: string;
      isTyping: boolean;
    }
  | {
      type: 'error';
      code: 'ROOM_NOT_FOUND' | 'ROOM_FULL' | 'ROOM_EXPIRED' | 'INVALID_PAYLOAD' | 'RATE_LIMITED' | 'UNAUTHORIZED' | 'SERVER_ERROR';
      message: string;
    }
  | {
      type: 'pong';
    }
  | {
      type: 'room-expired';
      message: string;
    };

export interface EncryptedFileAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

export interface ReplyReference {
  id: string;
  messageId?: string;
  senderName: string;
  text?: string;
  snippet?: string;
  isFile?: boolean;
  fileName?: string;
  isViewOnce?: boolean;
}

export type ReactionMap = Record<string, string[]>; // emoji -> array of participantIds

export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ChatMessage {
  id: string;
  kind?: 'message';
  senderId: string;
  senderName: string;
  text?: string;
  attachment?: EncryptedFileAttachment;
  messageType?: 'text' | 'file';
  timestamp: number;
  isOwn?: boolean;
  status?: MessageDeliveryStatus;
  replyTo?: ReplyReference;
  reactions?: ReactionMap;
  isEdited?: boolean;
  isDeleted?: boolean;
  isViewOnce?: boolean;
  isViewed?: boolean;
  viewedAt?: number;
  isVoiceNote?: boolean;
  voiceDurationSec?: number;
  isPinned?: boolean;
  expiresAt?: number;
  ttlMs?: number;
}

export type EncryptedV2Payload =
  | {
      version: 2;
      kind: 'chat_message';
      messageId: string;
      text?: string;
      attachment?: EncryptedFileAttachment;
      replyTo?: ReplyReference;
      isViewOnce?: boolean;
      isVoiceNote?: boolean;
      voiceDurationSec?: number;
      ttlMs?: number;
      expiresAt?: number;
    }
  | {
      version: 2;
      kind: 'reaction';
      messageId: string;
      emoji: string;
      action: 'add' | 'remove';
      participantId: string;
    }
  | {
      version: 2;
      kind: 'edit';
      messageId: string;
      newText: string;
    }
  | {
      version: 2;
      kind: 'delete';
      messageId: string;
      deleteType: 'everyone';
    }
  | {
      version: 2;
      kind: 'pin';
      messageId: string;
      isPinned: boolean;
    }
  | {
      version: 2;
      kind: 'view_once_opened';
      messageId: string;
      viewerId: string;
    }
  | {
      version: 2;
      kind: 'disappearing_timer';
      ttlMs: number;
      setBy: string;
    }
  | {
      version: 2;
      kind: 'delivery_ack';
      messageId: string;
      deliveredTo: string;
      timestamp: number;
    }
  | {
      version: 2;
      kind: 'read_ack';
      messageId: string;
      readBy: string;
      timestamp: number;
    }
  | {
      version: 2;
      kind: 'burn_room';
      burnerId: string;
      timestamp: number;
    }
  | {
      version: 2;
      kind: 'webrtc_signal';
      signalType: 'offer' | 'answer' | 'ice_candidate' | 'hangup' | 'reject';
      sdp?: string;
      candidate?: RTCIceCandidateInit;
      senderId: string;
      timestamp: number;
    };

export interface EncryptedLegacyPayload {
  type?: 'text' | 'file';
  text?: string;
  attachment?: EncryptedFileAttachment;
}

export type EncryptedInnerPayload = EncryptedV2Payload | EncryptedLegacyPayload;

export interface SystemNotification {
  id: string;
  type: 'system';
  content: string;
  timestamp: number;
}

export type TimelineItem =
  | ({ kind: 'message' } & ChatMessage)
  | ({ kind: 'system' } & SystemNotification);

export interface RoomInfoResponse {
  roomCode: string;
  participantCount: number;
  maxParticipants: number;
  isFull: boolean;
  isExpired: boolean;
  createdAt: number;
  expiresAt: number;
}
