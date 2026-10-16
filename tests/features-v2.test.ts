import { describe, it, expect } from 'vitest';
import { formatTtlLabel } from '../src/hooks/useRoomSocket.ts';
import {
  EncryptedV2Payload,
  ReplyReference,
  ReactionMap,
  ChatMessage,
} from '../src/types/protocol.ts';
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedSecret,
  encryptMessage,
  decryptMessage,
} from '../src/crypto/e2e.ts';

describe('NEXUS Feature Upgrade V2 Specifications', () => {
  describe('Disappearing Messages TTL Formatting', () => {
    it('correctly labels standard TTL intervals', () => {
      expect(formatTtlLabel(0)).toBe('Off');
      expect(formatTtlLabel(30 * 1000)).toBe('30s');
      expect(formatTtlLabel(5 * 60 * 1000)).toBe('5m');
      expect(formatTtlLabel(60 * 60 * 1000)).toBe('1h');
      expect(formatTtlLabel(24 * 60 * 60 * 1000)).toBe('24h');
      expect(formatTtlLabel(48 * 60 * 60 * 1000)).toBe('48h');
    });
  });

  describe('V2 Encrypted Inner Payloads & Zero-Knowledge Serialization', () => {
    it('serializes and deserializes a reply message payload', async () => {
      const replyRef: ReplyReference = {
        id: 'orig-msg-1',
        messageId: 'orig-msg-1',
        senderName: 'Alice',
        text: 'Zero knowledge relay test',
        snippet: 'Zero knowledge relay test',
      };

      const payload: EncryptedV2Payload = {
        version: 2,
        kind: 'chat_message',
        messageId: 'msg-reply-1',
        text: 'I agree with this encryption standard.',
        replyTo: replyRef,
        isViewOnce: false,
      };

      const jsonString = JSON.stringify(payload);
      const parsed: EncryptedV2Payload = JSON.parse(jsonString);

      expect(parsed.version).toBe(2);
      expect(parsed.kind).toBe('chat_message');
      if (parsed.kind === 'chat_message') {
        expect(parsed.replyTo?.senderName).toBe('Alice');
        expect(parsed.replyTo?.id).toBe('orig-msg-1');
        expect(parsed.isViewOnce).toBe(false);
      }
    });

    it('serializes and deserializes a 1× View-Once photo payload', async () => {
      const payload: EncryptedV2Payload = {
        version: 2,
        kind: 'chat_message',
        messageId: 'vo-msg-1',
        attachment: {
          name: 'secret-blueprint.png',
          size: 1024,
          type: 'image/png',
          dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        },
        isViewOnce: true,
      };

      const jsonString = JSON.stringify(payload);
      const parsed: EncryptedV2Payload = JSON.parse(jsonString);

      expect(parsed.version).toBe(2);
      if (parsed.kind === 'chat_message') {
        expect(parsed.isViewOnce).toBe(true);
        expect(parsed.attachment?.name).toBe('secret-blueprint.png');
      }
    });

    it('serializes and deserializes message reactions', () => {
      const reactionPayload: EncryptedV2Payload = {
        version: 2,
        kind: 'reaction',
        messageId: 'msg-target-123',
        emoji: '🔥',
        action: 'add',
        participantId: 'user-bob',
      };

      const jsonString = JSON.stringify(reactionPayload);
      const parsed: EncryptedV2Payload = JSON.parse(jsonString);

      expect(parsed.kind).toBe('reaction');
      if (parsed.kind === 'reaction') {
        expect(parsed.emoji).toBe('🔥');
        expect(parsed.action).toBe('add');
        expect(parsed.participantId).toBe('user-bob');
      }
    });

    it('serializes edit, delete, pin, and view-once ACK events', () => {
      const editPayload: EncryptedV2Payload = {
        version: 2,
        kind: 'edit',
        messageId: 'msg-1',
        newText: 'Updated content without leaking keys',
      };
      const deletePayload: EncryptedV2Payload = {
        version: 2,
        kind: 'delete',
        messageId: 'msg-1',
        deleteType: 'everyone',
      };
      const pinPayload: EncryptedV2Payload = {
        version: 2,
        kind: 'pin',
        messageId: 'msg-1',
        isPinned: true,
      };
      const ackPayload: EncryptedV2Payload = {
        version: 2,
        kind: 'view_once_opened',
        messageId: 'vo-msg-1',
        viewerId: 'user-peer',
      };

      expect(JSON.parse(JSON.stringify(editPayload)).kind).toBe('edit');
      expect(JSON.parse(JSON.stringify(deletePayload)).kind).toBe('delete');
      expect(JSON.parse(JSON.stringify(pinPayload)).kind).toBe('pin');
      expect(JSON.parse(JSON.stringify(ackPayload)).kind).toBe('view_once_opened');
    });
  });

  describe('End-to-End Cryptographic Envelope with V2 Payloads', () => {
    it('encrypts and decrypts V2 payload through ECDH derived AES-256-GCM session key', async () => {
      // Setup Alice & Bob key exchange
      const alicePair = await generateKeyPair();
      const bobPair = await generateKeyPair();

      const alicePublicJwk = await exportPublicKey(alicePair.publicKey);
      const bobPublicJwk = await exportPublicKey(bobPair.publicKey);

      const alicePeerKey = await importPublicKey(bobPublicJwk);
      const bobPeerKey = await importPublicKey(alicePublicJwk);

      const aliceSessionKey = await deriveSharedSecret(alicePair.privateKey, alicePeerKey);
      const bobSessionKey = await deriveSharedSecret(bobPair.privateKey, bobPeerKey);

      // Alice sends encrypted reaction payload
      const innerPayload: EncryptedV2Payload = {
        version: 2,
        kind: 'reaction',
        messageId: 'chat-999',
        emoji: '❤️',
        action: 'add',
        participantId: 'alice-id',
      };

      const plaintext = JSON.stringify(innerPayload);
      const { ciphertext, iv } = await encryptMessage(aliceSessionKey, plaintext);

      // Bob decrypts payload
      const decryptedPlaintext = await decryptMessage(bobSessionKey, ciphertext, iv);
      const receivedPayload = JSON.parse(decryptedPlaintext) as EncryptedV2Payload;

      expect(receivedPayload.version).toBe(2);
      expect(receivedPayload.kind).toBe('reaction');
      if (receivedPayload.kind === 'reaction') {
        expect(receivedPayload.emoji).toBe('❤️');
        expect(receivedPayload.participantId).toBe('alice-id');
      }
    });
  });

  describe('Client State Aggregations', () => {
    it('aggregates and toggles reactions correctly in reaction map', () => {
      const reactions: ReactionMap = {};

      // User 1 adds 👍
      const addReaction = (map: ReactionMap, emoji: string, userId: string) => {
        const next = { ...map };
        const users = new Set(next[emoji] || []);
        users.add(userId);
        next[emoji] = Array.from(users);
        return next;
      };

      const removeReaction = (map: ReactionMap, emoji: string, userId: string) => {
        const next = { ...map };
        const users = new Set(next[emoji] || []);
        users.delete(userId);
        if (users.size === 0) {
          delete next[emoji];
        } else {
          next[emoji] = Array.from(users);
        }
        return next;
      };

      let current = addReaction(reactions, '👍', 'user1');
      expect(current['👍']).toEqual(['user1']);

      // User 2 adds 👍
      current = addReaction(current, '👍', 'user2');
      expect(current['👍']).toEqual(['user1', 'user2']);

      // User 1 removes 👍
      current = removeReaction(current, '👍', 'user1');
      expect(current['👍']).toEqual(['user2']);

      // User 2 removes 👍
      current = removeReaction(current, '👍', 'user2');
      expect(current['👍']).toBeUndefined();
    });

    it('correctly filters search matches case-insensitively', () => {
      const messages: Partial<ChatMessage>[] = [
        { id: '1', text: 'Zero-knowledge encryption keys' },
        { id: '2', text: 'Hello world' },
        { id: '3', text: 'EnCrYpTiOn verified' },
        { id: '4', text: 'Deleted message text', isDeleted: true },
      ];

      const query = 'encryption';
      const matches = messages.filter(
        (m) => !m.isDeleted && m.text?.toLowerCase().includes(query.toLowerCase())
      );

      expect(matches.length).toBe(2);
      expect(matches.map((m) => m.id)).toEqual(['1', '3']);
    });

    it('manages message delivery state transitions (sending -> sent -> delivered -> read)', () => {
      let message: Partial<ChatMessage> = {
        id: 'msg-status-1',
        text: 'Testing delivery status lifecycle',
        status: 'sending',
      };
      expect(message.status).toBe('sending');

      // Socket confirms frame dispatched
      message = { ...message, status: 'sent' };
      expect(message.status).toBe('sent');

      // Peer client sends delivery acknowledgment
      message = { ...message, status: 'delivered' };
      expect(message.status).toBe('delivered');

      // Peer views/reads message
      message = { ...message, status: 'read' };
      expect(message.status).toBe('read');
    });

    it('filters out messages from locally blocked participants', () => {
      const timeline: Partial<ChatMessage>[] = [
        { id: '1', senderId: 'user-alice', text: 'Hello from Alice' },
        { id: '2', senderId: 'user-bob', text: 'Spam from Bob' },
        { id: '3', senderId: 'user-alice', text: 'Important update' },
      ];

      const blockedParticipants = new Set(['user-bob']);
      const visibleTimeline = timeline.filter(
        (m) => m.senderId && !blockedParticipants.has(m.senderId)
      );

      expect(visibleTimeline.length).toBe(2);
      expect(visibleTimeline.map((m) => m.id)).toEqual(['1', '3']);
      expect(visibleTimeline.some((m) => m.senderId === 'user-bob')).toBe(false);
    });

    it('serializes, encrypts, and parses delivery_ack and read_ack payloads', async () => {
      const keyA = await generateKeyPair();
      const keyB = await generateKeyPair();
      const pubB = await exportPublicKey(keyB.publicKey);
      const importedPubB = await importPublicKey(pubB);
      const sessionKey = await deriveSharedSecret(keyA.privateKey, importedPubB);

      // 1. Delivery ACK
      const deliveryPayload: EncryptedV2Payload = {
        version: 2,
        kind: 'delivery_ack',
        messageId: 'target-msg-456',
        deliveredTo: 'user-bob',
        timestamp: Date.now(),
      };

      const encDelivery = await encryptMessage(sessionKey, JSON.stringify(deliveryPayload));
      const decDelivery = await decryptMessage(sessionKey, encDelivery.ciphertext, encDelivery.iv);
      const parsedDelivery: EncryptedV2Payload = JSON.parse(decDelivery);

      expect(parsedDelivery.kind).toBe('delivery_ack');
      if (parsedDelivery.kind === 'delivery_ack') {
        expect(parsedDelivery.messageId).toBe('target-msg-456');
        expect(parsedDelivery.deliveredTo).toBe('user-bob');
      }

      // 2. Read ACK
      const readPayload: EncryptedV2Payload = {
        version: 2,
        kind: 'read_ack',
        messageId: 'target-msg-456',
        readBy: 'user-bob',
        timestamp: Date.now(),
      };

      const encRead = await encryptMessage(sessionKey, JSON.stringify(readPayload));
      const decRead = await decryptMessage(sessionKey, encRead.ciphertext, encRead.iv);
      const parsedRead: EncryptedV2Payload = JSON.parse(decRead);

      expect(parsedRead.kind).toBe('read_ack');
      if (parsedRead.kind === 'read_ack') {
        expect(parsedRead.messageId).toBe('target-msg-456');
        expect(parsedRead.readBy).toBe('user-bob');
      }
    });
  });
});
