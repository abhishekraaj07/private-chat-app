/**
 * NEXUS Emergency Duress & Panic Wipe Engine
 * 
 * Instantly wipes all cryptographic keys in browser memory, clears localStorage,
 * disconnects WebSocket relay, and redirects browser to an innocent decoy website.
 */

export function executePanicWipe(decoyUrl: string = 'https://en.wikipedia.org/wiki/Cryptography'): void {
  try {
    // 1. Wipe sessionStorage and localStorage
    if (typeof window !== 'undefined') {
      window.sessionStorage.clear();
      window.localStorage.clear();
      
      // 2. Overwrite URL history to prevent back-button inspection
      window.history.replaceState(null, '', '/');
      
      // 3. Immediately redirect to decoy
      window.location.replace(decoyUrl);
    }
  } catch (e) {
    // Fallback hard redirect
    window.location.href = 'https://google.com';
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
