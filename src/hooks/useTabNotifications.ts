import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for managing background tab notifications:
 * - Dynamic document title updates with unread count: (1) New Message — NEXUS
 * - HTML5 Web Notifications when tab is hidden and permission is granted
 * - Zero plaintext leakage (never includes decrypted message content)
 * - Automatic title restoration and cleanup on user focus
 * - Non-intrusive permission handling
 */
export function useTabNotifications() {
  const unreadCountRef = useRef(0);
  const originalTitleRef = useRef(typeof document !== 'undefined' ? document.title : 'NEXUS — Private Encrypted Chat');
  const activeNotificationRef = useRef<Notification | null>(null);

  // Cache initial page title
  useEffect(() => {
    if (typeof document !== 'undefined' && document.title) {
      originalTitleRef.current = document.title;
    }
  }, []);

  // Clear unread count and restore document title
  const clearNotifications = useCallback(() => {
    unreadCountRef.current = 0;
    if (typeof document !== 'undefined') {
      document.title = originalTitleRef.current || 'NEXUS — Private Encrypted Chat';
    }
    if (activeNotificationRef.current) {
      try {
        activeNotificationRef.current.close();
      } catch {
        // Ignored
      }
      activeNotificationRef.current = null;
    }
  }, []);

  // Listen for tab visibility changes and focus/blur
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        clearNotifications();
      }
    };

    const handleFocus = () => {
      clearNotifications();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [clearNotifications]);

  /**
   * Called when a genuine incoming peer message is decrypted and delivered.
   * Only triggers alerts if the user is not actively viewing the document.
   */
  const notifyIncomingMessage = useCallback(() => {
    if (typeof document === 'undefined') return;

    // If tab is currently active and focused, do not alter title or trigger notifications
    const isTabActive = !document.hidden && (typeof document.hasFocus === 'function' ? document.hasFocus() : true);
    if (isTabActive) {
      return;
    }

    // Increment unread count
    unreadCountRef.current += 1;
    const count = unreadCountRef.current;
    const countSuffix = count === 1 ? 'New Message' : 'New Messages';

    // Update document title safely
    document.title = `(${count}) ${countSuffix} — NEXUS`;

    // Trigger HTML5 Web Notification if granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        if (activeNotificationRef.current) {
          activeNotificationRef.current.close();
        }

        const notif = new Notification('NEXUS', {
          body: count === 1 ? 'New encrypted message' : `${count} new encrypted messages`,
          tag: 'nexus-incoming-message',
          icon: '/favicon.ico',
        });

        notif.onclick = () => {
          try {
            window.focus();
          } catch {
            // Ignored if window.focus is restricted
          }
          notif.close();
        };

        activeNotificationRef.current = notif;
      } catch (err) {
        // Notification API may throw on some restricted environments
        console.warn('NEXUS Notification error:', err);
      }
    }
  }, []);

  /**
   * User-initiated permission request (e.g. from settings or UI toggle)
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission | 'unsupported'> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return 'denied';
    }
  }, []);

  return {
    notifyIncomingMessage,
    clearNotifications,
    requestPermission,
  };
}
