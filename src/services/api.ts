/**
 * NEXUS Client API Service
 */

import { RoomInfoResponse } from '../types/protocol.ts';
import { normalizeRoomCode } from '../utils/room-code.ts';

export interface CreateRoomResponse {
  roomCode: string;
  createdAt: number;
  expiresInMinutes: number;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export const DEFAULT_PRODUCTION_URL = 'https://nexus-private-chat.abhishekraaj07.workers.dev';

/**
 * Checks whether the app is executing inside a Capacitor native shell (Android/iOS)
 * or bundled asset environment.
 */
export function isNativeMobileApp(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).Capacitor ||
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    (window.location.hostname === 'localhost' && !window.location.port)
  );
}

/**
 * Returns the public web origin for sharing room links.
 * Ensures mobile app users generate links targeting the live Cloudflare deployment.
 */
export function getShareableOrigin(): string {
  if (typeof window === 'undefined') return DEFAULT_PRODUCTION_URL;
  if (isNativeMobileApp()) return DEFAULT_PRODUCTION_URL;
  return window.location.origin || DEFAULT_PRODUCTION_URL;
}

/**
 * Resolves the API base URL for REST endpoints.
 * Prioritizes VITE_API_BASE_URL env, localStorage override, Capacitor native detection, or relative origin.
 */
export function getApiBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
    return (import.meta.env.VITE_API_BASE_URL as string).replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    const custom = window.localStorage.getItem('nexus_relay_url');
    if (custom) return custom.replace(/\/+$/, '');
  }

  // Inside Capacitor native app (Android/iOS) or packaged mobile webview
  if (isNativeMobileApp()) {
    return DEFAULT_PRODUCTION_URL;
  }

  return '';
}

/**
 * Calls POST /api/rooms to create a new private room.
 */
export async function createRoom(): Promise<CreateRoomResponse> {
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data.error || 'Failed to create room', res.status);
    }

    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Network error while creating room. Check connection.');
  }
}

/**
 * Checks room metadata via GET /api/rooms/:code/info.
 */
export async function getRoomInfo(code: string): Promise<RoomInfoResponse> {
  const normalized = normalizeRoomCode(code);
  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/rooms/${normalized}/info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new ApiError('Room not found or may have expired', 404);
      }
      if (res.status === 429) {
        throw new ApiError('Too many attempts. Please wait a moment.', 429);
      }
      const data = await res.json().catch(() => ({}));
      throw new ApiError(data.error || 'Could not verify room', res.status);
    }

    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Unable to connect to room server.');
  }
}

/**
 * Resolves the appropriate WebSocket URL based on current origin or configured base URL.
 */
export function getWebSocketUrl(code: string): string {
  const normalized = normalizeRoomCode(code);
  const base = getApiBaseUrl();

  if (base) {
    const wsBase = base.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
    return `${wsBase}/api/rooms/${normalized}/ws`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/rooms/${normalized}/ws`;
}
