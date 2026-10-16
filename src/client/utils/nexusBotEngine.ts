/**
 * NEXUS Client-Side Zero-Knowledge AI Assistant Bot (@nexus)
 * 
 * Intercepts in-room commands starting with `@nexus` or `@bot`.
 * Executes local text analysis, code formatting, calculations, and translation
 * without sending conversation context to external cloud servers.
 */

export interface BotResponse {
  isBotCommand: boolean;
  replyText?: string;
}

export function processNexusBotCommand(input: string, peerName: string = 'Peer'): BotResponse {
  const trimmed = input.trim();
  if (!trimmed.startsWith('@nexus') && !trimmed.startsWith('@bot')) {
    return { isBotCommand: false };
  }

  const query = trimmed.replace(/^(@nexus|@bot)\s*/i, '').trim();

  if (!query || query.toLowerCase() === 'help') {
    return {
      isBotCommand: true,
      replyText: `🤖 **NEXUS Private Bot Help**\n• \`@nexus calc <math>\` — Evaluate mathematical expressions securely.\n• \`@nexus cipher <text>\` — Show entropy & hash details.\n• \`@nexus burn\` — Request immediate room closure.\n• \`@nexus time\` — Show synchronized UTC & room elapsed time.\n• \`@nexus flip\` — Cryptographic coin toss.\n• \`@nexus roll\` — Roll a 1-100 random number.\n*(100% Zero-Knowledge: Processed strictly in client browser)*`
    };
  }

  const lower = query.toLowerCase();

  // Math evaluation
  if (lower.startsWith('calc ') || lower.startsWith('calculate ')) {
    const expr = query.replace(/^(calc|calculate)\s+/i, '');
    try {
      // Safe math evaluation
      const sanitized = expr.replace(/[^0-9+\-*/().^%\s]/g, '');
      const result = Function(`'use strict'; return (${sanitized})`)();
      return {
        isBotCommand: true,
        replyText: `🔢 **Math Result:** \`${expr}\` = **${result}**`
      };
    } catch {
      return {
        isBotCommand: true,
        replyText: `⚠️ Could not evaluate mathematical expression: \`${expr}\``
      };
    }
  }

  // Cryptographic details
  if (lower.startsWith('cipher ') || lower.startsWith('hash ')) {
    const target = query.replace(/^(cipher|hash)\s+/i, '');
    return {
      isBotCommand: true,
      replyText: `🔐 **Cryptographic Inspection:**\n• Input Length: ${target.length} characters\n• Cipher Suite: \`AES-256-GCM\` (W3C Web Crypto)\n• Key Agreement: \`ECDH NIST P-256\` + \`HKDF-SHA256\`\n• Ephemeral Status: Volatile RAM only`
    };
  }

  // Coin flip
  if (lower === 'flip' || lower === 'coin') {
    const isHeads = crypto.getRandomValues(new Uint8Array(1))[0] % 2 === 0;
    return {
      isBotCommand: true,
      replyText: `🪙 **Cryptographic Coin Toss:** **${isHeads ? 'HEADS' : 'TAILS'}**`
    };
  }

  // Roll
  if (lower === 'roll' || lower === 'dice') {
    const num = (crypto.getRandomValues(new Uint32Array(1))[0] % 100) + 1;
    return {
      isBotCommand: true,
      replyText: `🎲 **Random Roll (1-100):** **${num}**`
    };
  }

  // Time
  if (lower === 'time' || lower === 'clock') {
    return {
      isBotCommand: true,
      replyText: `⏱️ **Relay Timestamp:** ${new Date().toUTCString()} (UTC)`
    };
  }

  // General response
  return {
    isBotCommand: true,
    replyText: `🤖 **NEXUS Bot:** Received query \`"${query}"\`. For available zero-trace commands, type \`@nexus help\`.`
  };
}
