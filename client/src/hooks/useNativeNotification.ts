/**
 * useNativeNotification
 * Dispara o ForegroundService (MusicService) via intent simulado pelo Capacitor,
 * e atualiza a notificação com thumbnail da música.
 * 
 * No Android WebView não conseguimos chamar startService() diretamente,
 * então usamos um CustomPlugin ou LocalNotifications como ponte.
 * Aqui usamos LocalNotifications com flag ongoing=true que no Android
 * aparece como controle persistente + chamamos o service via intent.
 */
import { useCallback, useRef } from 'react';

const NOTIF_ID = 9001;

export function useNativeNotification() {
  const lastSongId = useRef('');

  const updateNotification = useCallback(async (
    title: string,
    artist: string,
    thumbnail: string,
    isPlaying: boolean,
    songId: string
  ) => {
    // Evita atualizar se nada mudou
    if (lastSongId.current === songId + isPlaying) return;
    lastSongId.current = songId + isPlaying;

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');

      // Cria canal na primeira vez (Android 8+)
      try {
        await LocalNotifications.createChannel({
          id: 'g4t0xx_music',
          name: 'G4T0XX YT Music',
          importance: 3, // IMPORTANCE_DEFAULT
          sound: undefined,
          vibration: false,
        });
      } catch {}

      const perms = await LocalNotifications.checkPermissions();
      if (perms.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') return;
      }

      // Cancela notificação anterior
      try { await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID }] }); } catch {}

      await LocalNotifications.schedule({
        notifications: [{
          id: NOTIF_ID,
          title: `${isPlaying ? '▶' : '⏸'} ${title}`,
          body: artist,
          largeBody: artist,
          summaryText: 'G4T0XX YT Music',
          ongoing: true,
          autoCancel: false,
          smallIcon: 'ic_launcher',
          iconColor: '#e11d48',
          channelId: 'g4t0xx_music',
          // attachments para thumbnail (iOS/Android)
          attachments: thumbnail ? [{ id: 'thumb', url: thumbnail }] : undefined,
        }],
      });
    } catch (e) {
      // Silencia erros — notificação é opcional
    }
  }, []);

  const cancelNotification = useCallback(async () => {
    lastSongId.current = '';
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID }] });
    } catch {}
  }, []);

  return { updateNotification, cancelNotification };
}
