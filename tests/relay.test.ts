import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { WebSocket } from 'ws';
import { NexusRelayServer } from '../server/relay.ts';
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedSecret,
  encryptMessage,
  decryptMessage,
} from '../src/crypto/e2e.ts';

describe('End-to-End WebSocket Relay & Cryptographic Session', () => {
  let server: http.Server;
  let relay: NexusRelayServer;
  let port: number;

  beforeAll(async () => {
    relay = new NexusRelayServer();
    server = http.createServer((req, res) => {
      const handled = relay.handleHttpRequest(req, '127.0.0.1', (code, headers, body) => {
        res.writeHead(code, headers);
        res.end(body);
      });
      if (!handled) {
        res.writeHead(404);
        res.end();
      }
    });

    server.on('upgrade', (req, socket, head) => {
      relay.wss.handleUpgrade(req, socket, head, (ws) => {
        relay.wss.emit('connection', ws, req);
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr) {
          port = addr.port;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    relay.destroy();
    await new Promise<void>((resolve) => {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      server.close(() => resolve());
    });
  });

  it('runs full peer-to-peer encrypted exchange over zero-knowledge relay', async () => {
    const room = relay.createRoom();
    const roomCode = room.code;

    // 1. Peer A generates keys and connects
    const aliceKeys = await generateKeyPair();
    const alicePubJwk = await exportPublicKey(aliceKeys.publicKey);
    const aliceWs = new WebSocket('ws://127.0.0.1:' + port + '/api/rooms/' + roomCode + '/ws');

    await new Promise<void>((resolve) => aliceWs.on('open', () => resolve()));
    aliceWs.send(JSON.stringify({
      type: 'join',
      roomCode,
      participantId: 'alice-id',
      displayName: 'Alice',
    }));

    // 2. Peer B generates keys and connects
    const bobKeys = await generateKeyPair();
    const bobPubJwk = await exportPublicKey(bobKeys.publicKey);
    const bobWs = new WebSocket('ws://127.0.0.1:' + port + '/api/rooms/' + roomCode + '/ws');

    await new Promise<void>((resolve) => bobWs.on('open', () => resolve()));
    bobWs.send(JSON.stringify({
      type: 'join',
      roomCode,
      participantId: 'bob-id',
      displayName: 'Bob',
    }));

    // 3. Exchange public keys
    const aliceReceivedPeerKeyPromise = new Promise<JsonWebKey>((resolve) => {
      aliceWs.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'key-exchange' && msg.senderId === 'bob-id') {
          resolve(msg.publicKey);
        }
      });
    });

    const bobReceivedPeerKeyPromise = new Promise<JsonWebKey>((resolve) => {
      bobWs.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'key-exchange' && msg.senderId === 'alice-id') {
          resolve(msg.publicKey);
        }
      });
    });

    // Alice sends key
    aliceWs.send(JSON.stringify({
      type: 'key-exchange',
      roomCode,
      senderId: 'alice-id',
      publicKey: alicePubJwk,
    }));

    // Bob sends key
    bobWs.send(JSON.stringify({
      type: 'key-exchange',
      roomCode,
      senderId: 'bob-id',
      publicKey: bobPubJwk,
    }));

    const bobPubReceivedByAlice = await aliceReceivedPeerKeyPromise;
    const alicePubReceivedByBob = await bobReceivedPeerKeyPromise;

    expect(bobPubReceivedByAlice.x).toBe(bobPubJwk.x);
    expect(alicePubReceivedByBob.x).toBe(alicePubJwk.x);

    // 4. Derive symmetric shared keys
    const aliceDerivedKey = await deriveSharedSecret(
      aliceKeys.privateKey,
      await importPublicKey(bobPubReceivedByAlice)
    );
    const bobDerivedKey = await deriveSharedSecret(
      bobKeys.privateKey,
      await importPublicKey(alicePubReceivedByBob)
    );

    // 5. Alice encrypts and sends a message to Bob
    const secretMessage = 'Confidential transmission: 42.9482, -71.1823';
    const encryptedByAlice = await encryptMessage(aliceDerivedKey, secretMessage);

    const bobReceivedMsgPromise = new Promise<{ ciphertext: string; iv: string }>((resolve) => {
      bobWs.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'message' && msg.senderId === 'alice-id') {
          resolve({ ciphertext: msg.ciphertext, iv: msg.iv });
        }
      });
    });

    aliceWs.send(JSON.stringify({
      type: 'message',
      roomCode,
      senderId: 'alice-id',
      messageId: 'msg-1',
      ciphertext: encryptedByAlice.ciphertext,
      iv: encryptedByAlice.iv,
      timestamp: Date.now(),
    }));

    const receivedByBob = await bobReceivedMsgPromise;
    const decryptedByBob = await decryptMessage(bobDerivedKey, receivedByBob.ciphertext, receivedByBob.iv);
    expect(decryptedByBob).toBe(secretMessage);

    // 6. Test reconnect: Alice reconnects on a new socket with the same participantId
    const aliceWs2 = new WebSocket('ws://127.0.0.1:' + port + '/api/rooms/' + roomCode + '/ws');
    await new Promise<void>((resolve) => aliceWs2.on('open', () => resolve()));

    let roomFullError = false;
    aliceWs2.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'error' && msg.code === 'ROOM_FULL') {
        roomFullError = true;
      }
    });

    aliceWs2.send(JSON.stringify({
      type: 'join',
      roomCode,
      participantId: 'alice-id',
      displayName: 'Alice (Reconnected)',
    }));

    await new Promise((r) => setTimeout(r, 100));
    expect(roomFullError).toBe(false);

    // 7. Third participant with a different ID is rejected with ROOM_FULL
    const charlieWs = new WebSocket('ws://127.0.0.1:' + port + '/api/rooms/' + roomCode + '/ws');
    const charlieFullPromise = new Promise<string>((resolve) => {
      charlieWs.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'error' && msg.code === 'ROOM_FULL') {
          resolve(msg.code);
        }
      });
      charlieWs.on('close', (code) => {
        if (code === 4003) {
          resolve('ROOM_FULL');
        }
      });
    });

    await new Promise<void>((resolve) => charlieWs.on('open', () => resolve()));

    charlieWs.send(JSON.stringify({
      type: 'join',
      roomCode,
      participantId: 'charlie-id',
      displayName: 'Charlie',
    }));

    const charlieCode = await charlieFullPromise;
    expect(charlieCode).toBe('ROOM_FULL');

    // Cleanup
    aliceWs.close();
    aliceWs2.close();
    bobWs.close();
    charlieWs.close();
  });
});
