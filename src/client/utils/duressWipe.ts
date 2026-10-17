/**
 * NEXUS Emergency Duress & Panic Wipe Engine
 * 
 * Instantly wipes all cryptographic keys in browser memory, clears localStorage,
 * disconnects WebSocket relay, and redirects browser to an innocent decoy website.
 */

export interface PanicWipeOptions {
  decoyUrl?: string;
  onBeforeRedirect?: () => void;
}

export function executePanicWipe(options?: string | PanicWipeOptions): void {
  const decoyUrl = typeof options === 'string'
    ? options
    : options?.decoyUrl || 'https://en.wikipedia.org/wiki/Cryptography';

  const onBeforeRedirect = typeof options === 'object' ? options?.onBeforeRedirect : undefined;

  try {
    // 0. Execute caller-provided teardown (WebSockets, WebRTC, CryptoKeys)
    if (onBeforeRedirect) {
      try {
        onBeforeRedirect();
      } catch (err) {
        console.warn('Error during panic pre-redirect teardown', err);
      }
    }

    if (typeof window !== 'undefined') {
      // 1. Wipe sessionStorage and localStorage
      window.sessionStorage.clear();
      window.localStorage.clear();
      
      // 2. Overwrite URL history to prevent back-button inspection
      window.history.replaceState(null, '', '/');
      
      // 3. Immediately redirect to innocent decoy
      window.location.replace(decoyUrl);
    }
  } catch (e) {
    // Fallback hard redirect
    if (typeof window !== 'undefined') {
      window.location.href = 'https://google.com';
    }
  }
}

/**
 * Global Keyboard Shortcut Listener for Panic Mode:
 * Default: Ctrl + Alt + Q  or  Cmd + Alt + Q
 */
export function setupPanicHotkeys(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'q' || e.key === 'Q')) {
      e.preventDefault();
      executePanicWipe();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}
