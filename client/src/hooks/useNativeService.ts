/**
 * useNativeService — gerencia o ForegroundService nativo e notificações.
 * Sem vibração. Usa LocalNotifications + startForegroundService via intent.
 */
import { useCallback, useRef, useEffect } from 'react';
import type { Song } from '../lib/storage';

const isNative = () =>
  typeof (window as any).Capacitor !== 'undefined' &&
  (window as any).Capacitor?.isNativePlatform?.() === true;

export function useNativeService(onControl: (action: 'play'|'pause'|'next'|'prev') => void) {
  const onControlRef = useRef(onControl);
  onControlRef.current = onControl;

  useEffect(() => {
    (window as any).__musicControl = (a: string) => onControlRef.current(a as any);
    return () => { delete (window as any).__musicControl; };
  }, []);

  /** Atualiza a notificação nativa com título, artista e thumbnail */
  const updateNotification = useCallback(async (song: Song, playing: boolean) => {
    if (!isNative()) return;
    try {
      // Usa LocalNotifications com ongoing = true
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      try {
        await LocalNotifications.createChannel({
          id: 'g4t0xx_music_v2',
          name: 'G4T0XX YT Music',
          importance: 3,
          sound: undefined,
          vibration: false,  // SEM VIBRAÇÃO
          lights: false,
        });
      } catch {}
      const perms = await LocalNotifications.checkPermissions();
      if (perms.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') return;
      }
      try { await LocalNotifications.cancel({ notifications: [{ id: 9001 }] }); } catch {}
      await LocalNotifications.schedule({
        notifications: [{
          id: 9001,
          title: `${playing ? '▶' : '⏸'} ${song.title}`,
          body: song.artist,
          ongoing: true,
          autoCancel: false,
          smallIcon: 'ic_launcher',
          iconColor: '#e11d48',
          channelId: 'g4t0xx_music_v2',
          sound: undefined,
          attachments: song.thumbnail ? [{ id: 'cover', url: song.thumbnail }] : undefined,
        }],
      });
    } catch {}
  }, []);

  const cancelNotification = useCallback(async () => {
    if (!isNative()) return;
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.cancel({ notifications: [{ id: 9001 }] });
    } catch {}
  }, []);

  return { updateNotification, cancelNotification };
}
