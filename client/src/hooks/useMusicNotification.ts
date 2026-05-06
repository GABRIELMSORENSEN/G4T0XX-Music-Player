/**
 * useMusicNotification
 * 
 * Fires LocalNotifications (via @capacitor/local-notifications) as a fallback
 * for showing the music player in the notification tray. Mainly used on
 * Android < 13 or when the ForegroundService notification needs an update.
 */

import { useCallback } from 'react';

const NOTIF_ID = 9001;

export function useMusicNotification() {
  const notify = useCallback(async (
    title: string,
    artist: string,
    isPlaying: boolean
  ) => {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const perms = await LocalNotifications.checkPermissions();
      if (perms.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') return;
      }
      await LocalNotifications.schedule({
        notifications: [
          {
            id: NOTIF_ID,
            title: `${isPlaying ? '▶' : '⏸'} ${title}`,
            body: artist,
            ongoing: true,
            autoCancel: false,
            smallIcon: 'ic_launcher',
            channelId: 'g4t0xx_music',
          },
        ],
      });
    } catch (e) {
      // Plugin not available (web mode) — silently ignore
    }
  }, []);

  const cancelNotification = useCallback(async () => {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID }] });
    } catch {}
  }, []);

  return { notify, cancelNotification };
}
