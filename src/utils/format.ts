/**
 * Formatting and Utility Helpers
 */

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatTimeRemaining(expiresAt: number): string {
  const diffMs = Math.max(0, expiresAt - Date.now());
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

let activeClipboardTimer: ReturnType<typeof setTimeout> | null = null;
let lastCopiedValue: string | null = null;

export async function clearClipboardNow(): Promise<boolean> {
  if (activeClipboardTimer) {
    clearTimeout(activeClipboardTimer);
    activeClipboardTimer = null;
  }
  lastCopiedValue = null;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText('');
      return true;
    }
  } catch {
    // fallback
  }
  return false;
}

export async function copyToClipboard(text: string, autoClearSeconds: number = 30): Promise<boolean> {
  let ok = false;
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // fallback
    }
  }

  if (!ok) {
    // Fallback
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      ok = document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch {
      ok = false;
    }
  }

  if (ok && autoClearSeconds > 0) {
    if (activeClipboardTimer) {
      clearTimeout(activeClipboardTimer);
    }
    lastCopiedValue = text;
    activeClipboardTimer = setTimeout(async () => {
      try {
        if (navigator?.clipboard?.readText) {
          const current = await navigator.clipboard.readText();
          if (current === lastCopiedValue) {
            await navigator.clipboard.writeText('');
          }
        } else if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText('');
        }
      } catch {
        // clipboard permission or tab inactive
      }
      activeClipboardTimer = null;
      lastCopiedValue = null;
    }, autoClearSeconds * 1000);
  }

  return ok;
}

export function formatCallDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
