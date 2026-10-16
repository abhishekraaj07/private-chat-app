/**
 * NEXUS E2E Cryptography Types
 */

export interface EncryptedPayload {
  ciphertext: string; // Base64url or Base64 encoded
  iv: string;         // Base64url or Base64 encoded (12 bytes / 96 bits)
}

export interface KeyExchangePayload {
  senderId: string;
  publicKey: JsonWebKey;
}

export interface AadMetadata {
  version: number;
  roomCode: string;
  senderId: string;
  messageId: string;
  seq?: number;
  type?: string;
}

export class CryptoError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'CryptoError';
  }
}
