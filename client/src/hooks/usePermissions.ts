import { useEffect, useState } from 'react';
import { requestNativeAudioPermission } from '../lib/nativeLocalMusic';

// Checks if running inside Capacitor/Android native
export const isNative = () =>
  typeof (window as any).Capacitor !== 'undefined' &&
  (window as any).Capacitor?.isNativePlatform?.();

export type PermStatus = 'unknown' | 'granted' | 'denied' | 'prompt';

export interface PermissionsState {
  notifications: PermStatus;
  storage: PermStatus;
  requested: boolean;
}

export function usePermissions() {
  const [perms, setPerms] = useState<PermissionsState>({
    notifications: 'unknown',
    storage: 'unknown',
    requested: false,
  });

  const requestAll = async () => {
    let notif: PermStatus = 'granted';
    let storage: PermStatus = 'granted';

    try {
      // Notifications
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          const result = await Notification.requestPermission();
          notif = result === 'granted' ? 'granted' : 'denied';
        } else {
          notif = Notification.permission as PermStatus;
        }
      }

      // Storage (via Capacitor Filesystem plugin if native)
      if (isNative()) {
        const { Filesystem } = await import('@capacitor/filesystem');
        try {
          const r = await (Filesystem as any).requestPermissions();
          storage = r?.publicStorage === 'granted' ? 'granted' : 'denied';
        } catch {
          storage = 'granted'; // assume granted if plugin not available
        }
        try {
          const audioGranted = await requestNativeAudioPermission();
          if (audioGranted) storage = 'granted';
        } catch {}
      }
    } catch (e) {
      console.warn('Permissions error:', e);
    }

    setPerms({ notifications: notif, storage, requested: true });
    return { notif, storage };
  };

  useEffect(() => {
    // Auto-check current state on mount
    const check = async () => {
      let notif: PermStatus = 'unknown';
      if ('Notification' in window) {
        notif = Notification.permission as PermStatus;
      }
      setPerms(p => ({ ...p, notifications: notif }));
    };
    check();
  }, []);

  return { perms, requestAll };
}
