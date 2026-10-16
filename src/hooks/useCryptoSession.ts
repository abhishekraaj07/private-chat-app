/**
 * Hook: useCryptoSession
 *
 * Manages client-side Web Crypto API keypair, key exchange,
 * and AES-256-GCM encryption/decryption.
 *
 * Safety:
 * - Private keys are never exported or sent anywhere.
 * - Derived AES key is non-extractable.
 * - Fresh 96-bit IV generated for each message.
 * - isEncrypted is strictly false until shared secret is successfully derived.
 */

import { useState, useRef, useCallback } from 'react';
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  computeSafetyFingerprint,
  deriveSharedSecret,
  encryptMessage,
  decryptMessage,
} from '../crypto/e2e.ts';
import { EncryptedPayload, AadMetadata } from '../crypto/types.ts';

export interface CryptoSessionState {
  isKeyReady: boolean;
  isEncrypted: boolean;
  isPeerVerified: boolean;
  fingerprint: string | null;
  sasCode: string | null;
  sasEmojis: string | null;
  publicKeyJwk: JsonWebKey | null;
}

export function useCryptoSession() {
  const [state, setState] = useState<CryptoSessionState>({
    isKeyReady: false,
    isEncrypted: false,
    isPeerVerified: false,
    fingerprint: null,
    sasCode: null,
    sasEmojis: null,
    publicKeyJwk: null,
  });

  const keyPairRef = useRef<CryptoKeyPair | null>(null);
  const sharedKeyRef = useRef<CryptoKey | null>(null);
  const peerKeyRef = useRef<CryptoKey | null>(null);
  const publicKeyJwkRef = useRef<JsonWebKey | null>(null);

  /**
   * Initializes local ephemeral ECDH keypair and prepares public key for exchange.
   */
  const initializeSession = useCallback(async (): Promise<JsonWebKey> => {
    const keyPair = await generateKeyPair();
    keyPairRef.current = keyPair;

    const jwk = await exportPublicKey(keyPair.publicKey);
    publicKeyJwkRef.current = jwk;

    setState((prev) => ({
      ...prev,
      isKeyReady: true,
      publicKeyJwk: jwk,
    }));

    return jwk;
  }, []);

  /**
   * Derives shared secret when peer's public key is received via relay.
   */
  const handlePeerPublicKey = useCallback(async (peerJwk: JsonWebKey, passphrase?: string): Promise<void> => {
    if (!keyPairRef.current) {
      throw new Error('Local keypair not yet generated');
    }

    const peerKey = await importPublicKey(peerJwk);
    peerKeyRef.current = peerKey;

    const sharedKey = await deriveSharedSecret(
      keyPairRef.current.privateKey,
      peerKey,
      undefined,
      passphrase
    );
    sharedKeyRef.current = sharedKey;

    // Calculate deterministic canonical SAS safety fingerprint & emojis
    let fingerprint = 'E2E-ACTIVE';
    let sasCode: string | null = null;
    let sasEmojis: string | null = null;

    try {
      const myJwk = publicKeyJwkRef.current || state.publicKeyJwk;
      if (myJwk) {
        const safety = await computeSafetyFingerprint(myJwk, peerJwk);
        fingerprint = safety.hexFormatted;
        sasCode = safety.numeric;
        sasEmojis = safety.emojis;
      }
    } catch {
      // fallback
    }

    setState((prev) => ({
      ...prev,
      isEncrypted: true,
      isPeerVerified: false,
      fingerprint,
      sasCode,
      sasEmojis,
    }));
  }, [state.publicKeyJwk]);

  /**
   * Explicit user verification of peer's session fingerprint out-of-band.
   */
  const setPeerVerified = useCallback((verified: boolean) => {
    setState((prev) => ({
      ...prev,
      isPeerVerified: verified,
    }));
  }, []);

  /**
   * Encrypts plaintext message with the derived AES-256-GCM key and optional AAD.
   */
  const encrypt = useCallback(async (plaintext: string, aad?: Uint8Array | AadMetadata): Promise<EncryptedPayload> => {
    if (!sharedKeyRef.current) {
      throw new Error('E2E session not established yet');
    }
    return await encryptMessage(sharedKeyRef.current, plaintext, aad);
  }, []);

  /**
   * Decrypts incoming ciphertext message with the derived AES-256-GCM key and optional AAD.
   */
  const decrypt = useCallback(async (ciphertext: string, iv: string, aad?: Uint8Array | AadMetadata): Promise<string> => {
    if (!sharedKeyRef.current) {
      throw new Error('E2E session not established yet');
    }
    return await decryptMessage(sharedKeyRef.current, ciphertext, iv, aad);
  }, []);

  /**
   * Cleans up keys from memory upon leaving or disconnecting.
   */
  const resetCrypto = useCallback(() => {
    keyPairRef.current = null;
    sharedKeyRef.current = null;
    peerKeyRef.current = null;
    setState({
      isKeyReady: false,
      isEncrypted: false,
      isPeerVerified: false,
      fingerprint: null,
      publicKeyJwk: null,
    });
  }, []);

  return {
    isKeyReady: state.isKeyReady,
    isEncrypted: state.isEncrypted,
    isPeerVerified: state.isPeerVerified,
    fingerprint: state.fingerprint,
    publicKeyJwk: state.publicKeyJwk,
    setPeerVerified,
    initializeSession,
    handlePeerPublicKey,
    encrypt,
    decrypt,
    resetCrypto,
  };
}

