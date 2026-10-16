import { describe, it, expect } from 'vitest';
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedSecret,
  encryptMessage,
  decryptMessage,
  bytesToBase64,
  base64ToBytes,
} from '../src/crypto/e2e.ts';

describe('Client-Side E2E Cryptographic Engine', () => {
  it('generates a valid ECDH P-256 keypair', async () => {
    const pair = await generateKeyPair();
    expect(pair).toBeDefined();
    expect(pair.publicKey).toBeDefined();
    expect(pair.privateKey).toBeDefined();
    expect(pair.publicKey.algorithm.name).toBe('ECDH');
    expect((pair.publicKey.algorithm as EcKeyGenParams).namedCurve).toBe('P-256');
  });

  it('exports and imports public key via JWK format', async () => {
    const pair = await generateKeyPair();
    const jwk = await exportPublicKey(pair.publicKey);

    expect(jwk.kty).toBe('EC');
    expect(jwk.crv).toBe('P-256');
    expect(jwk.x).toBeDefined();
    expect(jwk.y).toBeDefined();
    // Private attributes (d) must NOT be present in public key export
    expect((jwk as Record<string, unknown>).d).toBeUndefined();

    const imported = await importPublicKey(jwk);
    expect(imported).toBeDefined();
    expect(imported.algorithm.name).toBe('ECDH');
  });

  it('derives identical shared secrets for two communicating peers (Alice & Bob)', async () => {
    const alicePair = await generateKeyPair();
    const bobPair = await generateKeyPair();

    const alicePublicJwk = await exportPublicKey(alicePair.publicKey);
    const bobPublicJwk = await exportPublicKey(bobPair.publicKey);

    const aliceImportedBob = await importPublicKey(bobPublicJwk);
    const bobImportedAlice = await importPublicKey(alicePublicJwk);

    const aliceSecretKey = await deriveSharedSecret(alicePair.privateKey, aliceImportedBob);
    const bobSecretKey = await deriveSharedSecret(bobPair.privateKey, bobImportedAlice);

    expect(aliceSecretKey).toBeDefined();
    expect(bobSecretKey).toBeDefined();

    // Verify both keys can encrypt and decrypt each other's messages
    const plaintext = 'Classified message from Alice to Bob.';
    const encryptedByAlice = await encryptMessage(aliceSecretKey, plaintext);
    const decryptedByBob = await decryptMessage(bobSecretKey, encryptedByAlice.ciphertext, encryptedByAlice.iv);

    expect(decryptedByBob).toBe(plaintext);
  });

  it('generates fresh 96-bit IV for each message encryption', async () => {
    const pair = await generateKeyPair();
    const jwk = await exportPublicKey(pair.publicKey);
    const imported = await importPublicKey(jwk);
    const key = await deriveSharedSecret(pair.privateKey, imported);

    const msg = 'Test uniqueness of IV';
    const enc1 = await encryptMessage(key, msg);
    const enc2 = await encryptMessage(key, msg);

    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);

    // 12 bytes = 16 base64 characters
    const ivBytes1 = base64ToBytes(enc1.iv);
    const ivBytes2 = base64ToBytes(enc2.iv);
    expect(ivBytes1.byteLength).toBe(12);
    expect(ivBytes2.byteLength).toBe(12);
  });

  it('rejects tampered ciphertext during AES-GCM decryption', async () => {
    const pair = await generateKeyPair();
    const jwk = await exportPublicKey(pair.publicKey);
    const imported = await importPublicKey(jwk);
    const key = await deriveSharedSecret(pair.privateKey, imported);

    const plaintext = 'Authentic unmodified payload';
    const { ciphertext, iv } = await encryptMessage(key, plaintext);

    // Tamper with ciphertext by flipping a bit
    const cipherBytes = base64ToBytes(ciphertext);
    cipherBytes[0] ^= 0x01;
    const tamperedCiphertext = bytesToBase64(cipherBytes);

    await expect(decryptMessage(key, tamperedCiphertext, iv)).rejects.toThrow();
  });

  it('rejects decryption when using a different key (wrong-key rejection)', async () => {
    const alicePair = await generateKeyPair();
    const bobPair = await generateKeyPair();
    const evePair = await generateKeyPair();

    // Alice and Bob share a secret
    const bobJwk = await exportPublicKey(bobPair.publicKey);
    const aliceSecretKey = await deriveSharedSecret(alicePair.privateKey, await importPublicKey(bobJwk));

    // Eve tries to derive a key with Alice
    const eveSecretKey = await deriveSharedSecret(evePair.privateKey, await importPublicKey(bobJwk));

    const plaintext = 'Secret Alice transmission';
    const { ciphertext, iv } = await encryptMessage(aliceSecretKey, plaintext);

    // Eve attempts decryption with her key
    await expect(decryptMessage(eveSecretKey, ciphertext, iv)).rejects.toThrow();
  });

  it('strictly enforces non-extractable ECDH private keys while allowing public key export', async () => {
    const pair = await generateKeyPair();

    // Private key must be non-extractable
    expect(pair.privateKey.extractable).toBe(false);
    expect(pair.publicKey.extractable).toBe(true);

    // Attempting to export the private key must throw
    await expect(
      globalThis.crypto.subtle.exportKey('jwk', pair.privateKey)
    ).rejects.toThrow();

    // Public key export must succeed
    const publicJwk = await exportPublicKey(pair.publicKey);
    expect(publicJwk.kty).toBe('EC');
    expect(publicJwk.crv).toBe('P-256');
  });

  it('authenticates envelope metadata using AAD and detects any tampering', async () => {
    const alicePair = await generateKeyPair();
    const bobPair = await generateKeyPair();

    const alicePublicJwk = await exportPublicKey(alicePair.publicKey);
    const bobPublicJwk = await exportPublicKey(bobPair.publicKey);

    const aliceKey = await deriveSharedSecret(alicePair.privateKey, await importPublicKey(bobPublicJwk));
    const bobKey = await deriveSharedSecret(bobPair.privateKey, await importPublicKey(alicePublicJwk));

    const aad = {
      version: 2,
      roomCode: 'NX7K99',
      senderId: 'alice-session-1',
      messageId: 'msg-1001',
      seq: 1,
      type: 'message',
    };

    const plaintext = 'Authenticated confidential message';
    const encrypted = await encryptMessage(aliceKey, plaintext, aad);

    // Decryption with exact matching AAD succeeds
    const decrypted = await decryptMessage(bobKey, encrypted.ciphertext, encrypted.iv, aad);
    expect(decrypted).toBe(plaintext);

    // Tampering with senderId in AAD must cause decryption failure
    await expect(
      decryptMessage(bobKey, encrypted.ciphertext, encrypted.iv, {
        ...aad,
        senderId: 'mallory-imposter',
      })
    ).rejects.toThrow();

    // Tampering with roomCode in AAD must cause decryption failure
    await expect(
      decryptMessage(bobKey, encrypted.ciphertext, encrypted.iv, {
        ...aad,
        roomCode: 'OTHER8',
      })
    ).rejects.toThrow();

    // Tampering with messageId in AAD must cause decryption failure
    await expect(
      decryptMessage(bobKey, encrypted.ciphertext, encrypted.iv, {
        ...aad,
        messageId: 'msg-spoofed',
      })
    ).rejects.toThrow();

    // Tampering with sequence number in AAD must cause decryption failure
    await expect(
      decryptMessage(bobKey, encrypted.ciphertext, encrypted.iv, {
        ...aad,
        seq: 999,
      })
    ).rejects.toThrow();
  });

  it('rejects tampered IV during decryption', async () => {
    const pair = await generateKeyPair();
    const jwk = await exportPublicKey(pair.publicKey);
    const imported = await importPublicKey(jwk);
    const key = await deriveSharedSecret(pair.privateKey, imported);

    const plaintext = 'Payload with tested IV';
    const { ciphertext, iv } = await encryptMessage(key, plaintext);

    // Tamper with IV
    const ivBytes = base64ToBytes(iv);
    ivBytes[0] ^= 0xFF;
    const tamperedIv = bytesToBase64(ivBytes);

    await expect(decryptMessage(key, ciphertext, tamperedIv)).rejects.toThrow();
  });

  it('rejects invalid IV lengths (non-96-bit)', async () => {
    const pair = await generateKeyPair();
    const jwk = await exportPublicKey(pair.publicKey);
    const imported = await importPublicKey(jwk);
    const key = await deriveSharedSecret(pair.privateKey, imported);

    const { ciphertext } = await encryptMessage(key, 'Hello');

    // 8 bytes IV (too short)
    const shortIv = bytesToBase64(new Uint8Array(8));
    await expect(decryptMessage(key, ciphertext, shortIv)).rejects.toThrow(/Invalid IV length/);

    // 16 bytes IV (expected 12 for AES-GCM standard)
    const longIv = bytesToBase64(new Uint8Array(16));
    await expect(decryptMessage(key, ciphertext, longIv)).rejects.toThrow(/Invalid IV length/);
  });
});

