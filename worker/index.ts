/**
 * NEXUS Cloudflare Worker
 *
 * Edge router routing HTTP and WebSocket connections to isolated Room Durable Objects.
 */

import { Env } from './types.ts';
import { RoomDurableObject } from './room-do.ts';
import { generateRoomCode, normalizeRoomCode, isValidRoomCode } from '../src/utils/room-code.ts';
import { roomCreationLimiter, joinAttemptLimiter } from './rate-limit.ts';

export { RoomDurableObject };

function getClientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1';
}

function applySecurityHeaders(headers: Headers, allowedOrigin?: string | null): void {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; connect-src 'self' https: http: ws: wss: blob:; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';"
  );
  if (allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
    headers.set('Vary', 'Origin');
  }
}

function isOriginAllowed(origin: string | null, url: URL): boolean {
  if (!origin) return true;
  if (origin === url.origin) return true;
  if (
    origin === 'https://localhost' ||
    origin === 'capacitor://localhost' ||
    origin === 'http://localhost' ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('https://localhost:')
  ) {
    return true;
  }
  return false;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const clientIp = getClientIp(request);
    const origin = request.headers.get('Origin');

    // Trusted CORS Origins (strict verification, no arbitrary origin reflection)
    const originAllowed = isOriginAllowed(origin, url);
    const effectiveCorsOrigin = origin && originAllowed ? origin : null;

    // Handle preflight CORS requests
    if (request.method === 'OPTIONS') {
      if (originAllowed) {
        const headers = new Headers({
          'Access-Control-Allow-Origin': effectiveCorsOrigin || url.origin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Upgrade, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400',
          'Vary': 'Origin',
        });
        return new Response(null, { headers, status: 204 });
      }
      return new Response('CORS Preflight Forbidden', { status: 403 });
    }

    // Strict CORS check on API endpoints: block unauthorized cross-origin requests
    if (url.pathname.startsWith('/api/') && origin && !originAllowed) {
      return new Response(
        JSON.stringify({ error: 'Origin not allowed by CORS policy' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. POST /api/rooms - Create a new ephemeral room
    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      const rateCheck = roomCreationLimiter.check(clientIp);
      if (!rateCheck.allowed) {
        const rateLimitHeaders = new Headers({
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil(rateCheck.retryAfterMs / 1000).toString(),
        });
        applySecurityHeaders(rateLimitHeaders, effectiveCorsOrigin);
        return new Response(
          JSON.stringify({
            error: 'Too many rooms created from this IP. Please wait before trying again.',
          }),
          {
            status: 429,
            headers: rateLimitHeaders,
          }
        );
      }

      // Generate cryptographically secure room code
      const roomCode = generateRoomCode();
      const doId = env.ROOMS.idFromName(roomCode);
      const roomStub = env.ROOMS.get(doId);

      // Initialize the Durable Object
      await roomStub.fetch(new Request('https://do/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode }),
      }));

      const responsePayload = {
        roomCode,
        createdAt: Date.now(),
        expiresInMinutes: 15,
      };

      const response = new Response(JSON.stringify(responsePayload), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      applySecurityHeaders(response.headers, effectiveCorsOrigin);
      return response;
    }

    // Match /api/rooms/:code or /api/rooms/:code/(ws|info)
    const match = url.pathname.match(/^\/api\/rooms\/([A-Za-z0-9_-]+)(?:\/(ws|info))?$/);
    if (match) {
      const rawCode = match[1];
      const action = match[2] || 'info';
      const roomCode = normalizeRoomCode(rawCode);

      if (!isValidRoomCode(roomCode)) {
        const errResp = new Response(
          JSON.stringify({ error: 'Invalid room code format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
        applySecurityHeaders(errResp.headers, effectiveCorsOrigin);
        return errResp;
      }

      // Probing rate limit check
      const rateCheck = joinAttemptLimiter.check(clientIp);
      if (!rateCheck.allowed) {
        const errResp = new Response(
          JSON.stringify({ error: 'Too many attempts. Please wait a moment.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
        applySecurityHeaders(errResp.headers, effectiveCorsOrigin);
        return errResp;
      }

      const doId = env.ROOMS.idFromName(roomCode);
      const roomStub = env.ROOMS.get(doId);

      if (action === 'info') {
        const doResponse = await roomStub.fetch(new Request(`https://do/info?code=${roomCode}`));
        const headers = new Headers(doResponse.headers);
        applySecurityHeaders(headers, effectiveCorsOrigin);
        return new Response(doResponse.body, {
          status: doResponse.status,
          headers,
        });
      }

      if (action === 'ws') {
        // Forward WebSocket upgrade request to the Durable Object
        const doUrl = new URL(request.url);
        doUrl.pathname = '/ws';
        return roomStub.fetch(new Request(doUrl.toString(), request));
      }
    }

    // Default 404 for unknown API endpoints
    if (url.pathname.startsWith('/api/')) {
      const errHeaders = new Headers({ 'Content-Type': 'application/json' });
      applySecurityHeaders(errHeaders, effectiveCorsOrigin);
      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: errHeaders,
      });
    }

    // Serve static frontend assets from dist/ with SPA fallback
    if (env.ASSETS) {
      let response = await env.ASSETS.fetch(request);
      if (response.status === 404 && request.method === 'GET' && !url.pathname.startsWith('/api/')) {
        const indexUrl = new URL('/index.html', request.url);
        response = await env.ASSETS.fetch(new Request(indexUrl.toString(), request));
      }

      // Ensure HTML always receives security headers and no-cache to avoid stale script hash traps
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        const newHeaders = new Headers(response.headers);
        applySecurityHeaders(newHeaders);
        newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }

      return response;
    }

    const gatewayHeaders = new Headers();
    applySecurityHeaders(gatewayHeaders, effectiveCorsOrigin);
    return new Response('NEXUS API Gateway', { status: 200, headers: gatewayHeaders });
  },
};
