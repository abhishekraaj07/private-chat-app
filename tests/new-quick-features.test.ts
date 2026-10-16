import { describe, it, expect } from 'vitest';
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedSecret,
  encryptMessage,
  decryptMessage,
  computeSafetyFingerprint,
} from '../src/crypto/e2e.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('New Security Features: SAS Fingerprints, 2FA Passphrase Salting, Decoy & Surveillance Shield', () => {
  it('computes identical SAS emoji and 6-digit numeric fingerprints regardless of key ordering', async () => {
    const aliceKeys = await generateKeyPair();
    const bobKeys = await generateKeyPair();

    const aliceJwk = await exportPublicKey(aliceKeys.publicKey);
    const bobJwk = await exportPublicKey(bobKeys.publicKey);

    // Compute from Alice's perspective
    const aliceFingerprint = await computeSafetyFingerprint(aliceJwk, bobJwk);

    // Compute from Bob's perspective (reversed order)
    const bobFingerprint = await computeSafetyFingerprint(bobJwk, aliceJwk);

    expect(aliceFingerprint.emojis).toBe(bobFingerprint.emojis);
    expect(aliceFingerprint.numeric).toBe(bobFingerprint.numeric);
    expect(aliceFingerprint.hexFormatted).toBe(bobFingerprint.hexFormatted);
    expect(aliceFingerprint.rawHash).toBe(bobFingerprint.rawHash);

    // Formatted checks
    expect(aliceFingerprint.emojis.split(' ').length).toBe(4);
    expect(aliceFingerprint.numeric).toMatch(/^\d{3}-\d{3}$/);
    expect(aliceFingerprint.hexFormatted).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  it('produces different fingerprints for different participants', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();
    const eve = await generateKeyPair();

    const aliceJwk = await exportPublicKey(alice.publicKey);
    const bobJwk = await exportPublicKey(bob.publicKey);
    const eveJwk = await exportPublicKey(eve.publicKey);

    const fpBob = await computeSafetyFingerprint(aliceJwk, bobJwk);
    const fpEve = await computeSafetyFingerprint(aliceJwk, eveJwk);

    expect(fpBob.rawHash).not.toBe(fpEve.rawHash);
  });

  it('salts HKDF with room passphrase: matching passphrases can decrypt, mismatched cannot', async () => {
    const aliceKeys = await generateKeyPair();
    const bobKeys = await generateKeyPair();

    const passphrase = 'UltraSecretRoomPassword123!';

    // Alice and Bob derive shared secret with the matching passphrase
    const aliceKey = await deriveSharedSecret(
      aliceKeys.privateKey,
      bobKeys.publicKey,
      undefined,
      passphrase
    );

    const bobKey = await deriveSharedSecret(
      bobKeys.privateKey,
      aliceKeys.publicKey,
      undefined,
      passphrase
    );

    // Encrypt with Alice's key
    const secretMessage = 'Zero-Knowledge 2FA Encrypted Confidential Transmission';
    const payload = await encryptMessage(aliceKey, secretMessage);

    // Bob successfully decrypts
    const decrypted = await decryptMessage(bobKey, payload.ciphertext, payload.iv);
    expect(decrypted).toBe(secretMessage);

    // Eve with wrong passphrase fails to decrypt
    const eveWrongPassKey = await deriveSharedSecret(
      bobKeys.privateKey,
      aliceKeys.publicKey,
      undefined,
      'WrongPassword!'
    );

    await expect(
      decryptMessage(eveWrongPassKey, payload.ciphertext, payload.iv)
    ).rejects.toThrow();

    // Default unsalted key also fails to decrypt salted message
    const unsaltedKey = await deriveSharedSecret(
      bobKeys.privateKey,
      aliceKeys.publicKey
    );

    await expect(
      decryptMessage(unsaltedKey, payload.ciphertext, payload.iv)
    ).rejects.toThrow();
  });

  it('integrates CalculatorDecoy component with stealth exit mechanisms', () => {
    const decoyPath = path.resolve(__dirname, '../src/client/components/CalculatorDecoy.tsx');
    expect(fs.existsSync(decoyPath)).toBe(true);

    const content = fs.readFileSync(decoyPath, 'utf-8');
    expect(content).toContain('CalculatorDecoy');
    expect(content).toContain('1337');
    expect(content).toContain('onUnlock');
    expect(content).toContain('calculator-decoy-overlay');
  });

  it('integrates Anti-Surveillance Shield overlay and Stealth triggers in ChatRoomPage and Header', () => {
    const chatRoomPagePath = path.resolve(__dirname, '../src/client/pages/ChatRoomPage.tsx');
    const headerPath = path.resolve(__dirname, '../src/client/components/Header.tsx');

    const chatContent = fs.readFileSync(chatRoomPagePath, 'utf-8');
    const headerContent = fs.readFileSync(headerPath, 'utf-8');

    // Anti-surveillance & Stealth presence in ChatRoomPage
    expect(chatContent).toContain('CalculatorDecoy');
    expect(chatContent).toContain('privacy-blur-shield');
    expect(chatContent).toContain('Anti-Surveillance Shield');
    expect(chatContent).toContain('handlePanicKill');

    // Controls in Header
    expect(headerContent).toContain('header-stealth-btn');
    expect(headerContent).toContain('header-menu-stealth-btn');
    expect(headerContent).toContain('header-menu-privacy-blur-btn');
    expect(headerContent).toContain('header-panic-kill-btn');
  });
});
