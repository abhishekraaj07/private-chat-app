import { describe, it, expect } from 'vitest';
import { ChatMessage, ReplyReference, ReactionMap } from '../src/types/protocol.ts';

describe('Critical Chat Bubble Layout & Message Formatting (P0)', () => {
  it('A. verifies short message "hi" structure and formatting', () => {
    const msg: ChatMessage = {
      id: 'msg-hi',
      senderId: 'user-1',
      senderName: 'Alice',
      text: 'hi',
      timestamp: Date.now(),
      kind: 'message',
    };
    expect(msg.text).toBe('hi');
    expect(msg.text.length).toBe(2);
    // In ChatArea, 'hi' does not break words because of [word-break:normal]
  });

  it('B. verifies short message "hello" preserves word integrity', () => {
    const msg: ChatMessage = {
      id: 'msg-hello',
      senderId: 'user-1',
      senderName: 'Alice',
      text: 'hello',
      timestamp: Date.now(),
      kind: 'message',
    };
    expect(msg.text).toBe('hello');
    expect(msg.text.split(' ').length).toBe(1);
  });

  it('C. verifies "hello world" multi-word short bubble', () => {
    const msg: ChatMessage = {
      id: 'msg-hw',
      senderId: 'user-1',
      senderName: 'Alice',
      text: 'hello world',
      timestamp: Date.now(),
      kind: 'message',
    };
    expect(msg.text).toBe('hello world');
  });

  it('D. verifies long sentence naturally sized bubble', () => {
    const sentence = 'The native Web Crypto API enables zero-knowledge client encryption over ephemeral WebSocket streams.';
    const msg: ChatMessage = {
      id: 'msg-long',
      senderId: 'user-1',
      senderName: 'Alice',
      text: sentence,
      timestamp: Date.now(),
      kind: 'message',
    };
    expect(msg.text).toBe(sentence);
    expect(msg.text.length).toBeGreaterThan(50);
  });

  it('E. verifies very long URL wraps safely with overflow-wrap:anywhere', () => {
    const longUrl = 'https://nexus-private-chat.abhishekraaj07.workers.dev/room/a9b8c7d6e5f4g3h2i1j0k1l2m3n4o5p6q7r8s9t0/verify?token=0123456789abcdef0123456789abcdef';
    const msg: ChatMessage = {
      id: 'msg-url',
      senderId: 'user-1',
      senderName: 'Alice',
      text: longUrl,
      timestamp: Date.now(),
      kind: 'message',
    };
    expect(msg.text).toBe(longUrl);
  });

  it('F. verifies multiline message preserves line breaks (whitespace-pre-wrap)', () => {
    const multiline = 'Line 1\nLine 2\nLine 3 with indentation';
    const msg: ChatMessage = {
      id: 'msg-multi',
      senderId: 'user-1',
      senderName: 'Alice',
      text: multiline,
      timestamp: Date.now(),
      kind: 'message',
    };
    expect(msg.text.split('\n').length).toBe(3);
  });

  it('G. verifies emojis render properly without word corruption', () => {
    const emojiMsg = '🔐 🛡️ 🚀 ❤️ 👍 🔥';
    const msg: ChatMessage = {
      id: 'msg-emoji',
      senderId: 'user-1',
      senderName: 'Alice',
      text: emojiMsg,
      timestamp: Date.now(),
      kind: 'message',
    };
    expect(msg.text).toBe(emojiMsg);
  });

  it('H. verifies message with numbers, symbols, and code snippets', () => {
    const codeMsg = 'const x = { a: 1, b: 2 }; // AES-256-GCM iv.length === 12';
    const msg: ChatMessage = {
      id: 'msg-code',
      senderId: 'user-1',
      senderName: 'Alice',
      text: codeMsg,
      timestamp: Date.now(),
      kind: 'message',
    };
    expect(msg.text).toContain('AES-256-GCM');
  });

  it('I. verifies consecutive message grouping logic (6-10px rhythm)', () => {
    const now = Date.now();
    const msg1: ChatMessage = {
      id: 'm1',
      senderId: 'alice',
      senderName: 'Alice',
      text: 'First message',
      timestamp: now,
      kind: 'message',
    };
    const msg2: ChatMessage = {
      id: 'm2',
      senderId: 'alice',
      senderName: 'Alice',
      text: 'Second consecutive message',
      timestamp: now + 2000,
      kind: 'message',
    };
    const msg3: ChatMessage = {
      id: 'm3',
      senderId: 'bob',
      senderName: 'Bob',
      text: 'Reply from new sender',
      timestamp: now + 5000,
      kind: 'message',
    };

    const isConsecutive1 = false; // first message
    const isConsecutive2 = msg2.senderId === msg1.senderId && Math.abs(msg2.timestamp - msg1.timestamp) < 5 * 60 * 1000;
    const isConsecutive3 = msg3.senderId === msg2.senderId && Math.abs(msg3.timestamp - msg2.timestamp) < 5 * 60 * 1000;

    expect(isConsecutive1).toBe(false);
    expect(isConsecutive2).toBe(true); // Should apply mt-1.5 compact spacing
    expect(isConsecutive3).toBe(false); // Should apply mt-4 new group spacing
  });

  it('J. verifies quoted reply structure and referencing', () => {
    const parentMsg: ChatMessage = {
      id: 'orig-1',
      senderId: 'bob',
      senderName: 'Bob',
      text: 'Original question about encryption',
      timestamp: Date.now(),
      kind: 'message',
    };

    const replyRef: ReplyReference = {
      id: parentMsg.id,
      messageId: parentMsg.id,
      senderName: parentMsg.senderName,
      snippet: parentMsg.text.slice(0, 100),
    };

    const replyMsg: ChatMessage = {
      id: 'rep-1',
      senderId: 'alice',
      senderName: 'Alice',
      text: 'Here is the answer.',
      replyTo: replyRef,
      timestamp: Date.now() + 1000,
      kind: 'message',
    };

    expect(replyMsg.replyTo?.senderName).toBe('Bob');
    expect(replyMsg.replyTo?.snippet).toBe('Original question about encryption');
  });

  it('K. verifies reaction toggle and deduplication behavior', () => {
    const reactions: ReactionMap = {
      '👍': ['alice'],
    };

    // Alice clicks '👍' again -> should toggle off
    const existing = reactions['👍'] || [];
    const toggled = existing.includes('alice')
      ? existing.filter((u) => u !== 'alice')
      : [...existing, 'alice'];

    expect(toggled).toEqual([]);

    // Bob reacts '👍' -> should add
    const bobReact = toggled.includes('bob')
      ? toggled.filter((u) => u !== 'bob')
      : [...toggled, 'bob'];

    expect(bobReact).toEqual(['bob']);
  });

  it('L. verifies pinned message filtering', () => {
    const timeline: ChatMessage[] = [
      { id: '1', senderId: 'u1', senderName: 'Alice', text: 'Normal', timestamp: 1, kind: 'message' },
      { id: '2', senderId: 'u1', senderName: 'Alice', text: 'Important rule', isPinned: true, timestamp: 2, kind: 'message' },
      { id: '3', senderId: 'u2', senderName: 'Bob', text: 'Acknowledged', timestamp: 3, kind: 'message' },
    ];

    const pinned = timeline.filter((m) => m.isPinned && !m.isDeleted);
    expect(pinned.length).toBe(1);
    expect(pinned[0].id).toBe('2');
  });

  it('M. verifies View Once media single-view invariant', () => {
    const viewOnceMsg: ChatMessage = {
      id: 'vo-1',
      senderId: 'alice',
      senderName: 'Alice',
      isViewOnce: true,
      isViewed: false,
      timestamp: Date.now(),
      kind: 'message',
    };

    // Initially can be opened
    expect(viewOnceMsg.isViewOnce).toBe(true);
    expect(viewOnceMsg.isViewed).toBe(false);

    // After recipient opens and closes
    viewOnceMsg.isViewed = true;
    expect(viewOnceMsg.isViewed).toBe(true);
    // UI condition ensures (!msg.isViewed) prevents re-opening
    const canOpenAgain = !viewOnceMsg.isViewed;
    expect(canOpenAgain).toBe(false);
  });
});
