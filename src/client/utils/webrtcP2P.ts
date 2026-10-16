/**
 * NEXUS WebRTC Direct P2P DataChannel Engine
 * 
 * Uses WebSocket relay solely for initial ICE/SDP exchange.
 * Once established, opens a direct, encrypted browser-to-browser pipe
 * eliminating server relay hops and unlocking high-speed transfers.
 */

export interface P2PSignalingMessage {
  type: 'webrtc-offer' | 'webrtc-answer' | 'webrtc-ice';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export class NexusP2PManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private onMessageCallback: ((data: string) => void) | null = null;
  private onStatusChangeCallback: ((status: 'disconnected' | 'connecting' | 'connected') => void) | null = null;
  private sendSignalingFn: (msg: P2PSignalingMessage) => void;

  constructor(sendSignaling: (msg: P2PSignalingMessage) => void) {
    this.sendSignalingFn = sendSignaling;
  }

  public init(isInitiator: boolean, onMessage: (data: string) => void, onStatusChange: (status: 'disconnected' | 'connecting' | 'connected') => void) {
    this.onMessageCallback = onMessage;
    this.onStatusChangeCallback = onStatusChange;

    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingFn({
          type: 'webrtc-ice',
          candidate: event.candidate.toJSON()
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (state === 'connected') {
        this.onStatusChangeCallback?.('connected');
      } else if (state === 'connecting') {
        this.onStatusChangeCallback?.('connecting');
      } else {
        this.onStatusChangeCallback?.('disconnected');
      }
    };

    if (isInitiator) {
      this.dataChannel = this.peerConnection.createDataChannel('nexus-p2p', {
        ordered: true
      });
      this.setupDataChannel(this.dataChannel);

      this.peerConnection.createOffer().then((offer) => {
        this.peerConnection?.setLocalDescription(offer);
        this.sendSignalingFn({
          type: 'webrtc-offer',
          sdp: offer
        });
      });
    } else {
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onopen = () => {
      this.onStatusChangeCallback?.('connected');
    };
    channel.onclose = () => {
      this.onStatusChangeCallback?.('disconnected');
    };
    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        this.onMessageCallback?.(event.data);
      }
    };
  }

  public async handleSignaling(msg: P2PSignalingMessage) {
    if (!this.peerConnection) return;

    if (msg.type === 'webrtc-offer' && msg.sdp) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.sendSignalingFn({
        type: 'webrtc-answer',
        sdp: answer
      });
    } else if (msg.type === 'webrtc-answer' && msg.sdp) {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    } else if (msg.type === 'webrtc-ice' && msg.candidate) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
    }
  }

  public send(data: string): boolean {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(data);
      return true;
    }
    return false;
  }

  public close() {
    this.dataChannel?.close();
    this.peerConnection?.close();
    this.dataChannel = null;
    this.peerConnection = null;
  }
}
