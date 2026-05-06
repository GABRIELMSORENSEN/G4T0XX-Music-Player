/**
 * useMediaSession.ts
 *
 * Integra o plugin @jofr/capacitor-media-session com o player.
 * Fornece:
 *  - Metadados (título, artista, capa) na notificação do Android
 *  - Controles de play/pause/next/prev/seek na notificação e lock screen
 *  - setPositionState → barra de progresso arrastável na notificação
 *  - Fallback para navigator.mediaSession nativo (browser/PWA)
 */

import { useEffect, useRef, useCallback } from 'react';
import type { Song } from '../lib/storage';

type PlayerControls = {
  onPlay:      () => void;
  onPause:     () => void;
  onNext:      () => void;
  onPrev:      () => void;
  onSeek:      (time: number) => void;
  getPosition: () => number;
};

const isNative = () =>
  typeof (window as any).Capacitor !== 'undefined' &&
  (window as any).Capacitor?.isNativePlatform?.() === true;

async function getPlugin() {
  try {
    const { MediaSession } = await import('@jofr/capacitor-media-session');
    return { plugin: MediaSession };
  } catch {
    return { plugin: null };
  }
}

export function useMediaSession(
  song: Song | null,
  isPlaying: boolean,
  duration: number,
  playbackRate: number,
  controls: PlayerControls
) {
  const positionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pluginRef = useRef<any>(null);
  const controlsRef = useRef(controls);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  // ── Carrega o plugin uma vez ──────────────────────────────────────────────
  useEffect(() => {
    getPlugin().then(({ plugin }) => { pluginRef.current = plugin; });
  }, []);

  // ── Registra action handlers (apenas uma vez) ─────────────────────────────
  useEffect(() => {
    const register = async () => {
      const { plugin } = await getPlugin();
      const p = pluginRef.current || plugin;
      if (!p) return;
      pluginRef.current = p;

      const handlers: Array<{ action: MediaSessionAction; fn: (d: any) => void }> = [
        { action: 'play',          fn: ()  => controlsRef.current.onPlay() },
        { action: 'pause',         fn: ()  => controlsRef.current.onPause() },
        { action: 'nexttrack',     fn: ()  => controlsRef.current.onNext() },
        { action: 'previoustrack', fn: ()  => controlsRef.current.onPrev() },
        { action: 'seekto',        fn: (d) => { if (d.seekTime != null) controlsRef.current.onSeek(d.seekTime); } },
        { action: 'seekforward',   fn: (d) => controlsRef.current.onSeek(controlsRef.current.getPosition() + (d.seekOffset ?? 10)) },
        { action: 'seekbackward',  fn: (d) => controlsRef.current.onSeek(Math.max(0, controlsRef.current.getPosition() - (d.seekOffset ?? 10))) },
        { action: 'stop',          fn: ()  => controlsRef.current.onPause() },
      ];

      for (const { action, fn } of handlers) {
        try { await p.setActionHandler({ action }, fn); } catch {}
        try { navigator.mediaSession?.setActionHandler(action as any, fn as any); } catch {}
      }
    };

    register();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // só uma vez — controls via closure com ref

  // ── Atualiza metadados quando a música muda ───────────────────────────────
  useEffect(() => {
    if (!song) return;

    const artUrl = song.isLocal
      ? (song.thumbnail || '')
      : `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`;

    const metadata = {
      title:   song.title,
      artist:  song.artist,
      album:   'G4T0XX YT Music',
      artwork: [{ src: artUrl, sizes: '480x360', type: 'image/jpeg' }],
    };

    // Plugin nativo (Android via @jofr/capacitor-media-session)
    const p = pluginRef.current;
    if (p && isNative()) {
      p.setMetadata(metadata).catch(() => {});
    }

    // Fallback: API nativa do browser
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata(metadata);
      } catch {}
    }
  }, [song?.id, song?.title, song?.artist, song?.thumbnail, song?.isLocal]);

  // ── Atualiza playbackState quando play/pause muda ─────────────────────────
  useEffect(() => {
    const state = !song ? 'none' : isPlaying ? 'playing' : 'paused';
    const p = pluginRef.current;

    if (p && isNative()) {
      p.setPlaybackState({ playbackState: state }).catch(() => {});
    }
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = state; } catch {}
    }
  }, [isPlaying, song?.id]);

  // ── setPositionState — permite arrastar a barra na notificação ────────────
  const updatePosition = useCallback((position: number) => {
    if (!song || duration <= 0) return;

    const opts = {
      duration:     Math.max(0, duration),
      playbackRate: playbackRate || 1,
      position:     Math.max(0, Math.min(position, duration)),
    };

    const p = pluginRef.current;
    if (p && isNative()) {
      p.setPositionState(opts).catch(() => {});
    }
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.setPositionState(opts); } catch {}
    }
  }, [song?.id, duration, playbackRate]);

  useEffect(() => {
    if (song && duration > 0) updatePosition(controlsRef.current.getPosition());
  }, [song?.id, duration, playbackRate, updatePosition]);

  // ── Poll de posição a cada 1s quando tocando ──────────────────────────────
  useEffect(() => {
    if (positionIntervalRef.current) {
      clearInterval(positionIntervalRef.current);
      positionIntervalRef.current = null;
    }

    if (!isPlaying || !song) return;

    // Atualiza imediatamente
    updatePosition(controlsRef.current.getPosition());

    positionIntervalRef.current = setInterval(() => {
      updatePosition(controlsRef.current.getPosition());
    }, 1000);

    return () => {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
        positionIntervalRef.current = null;
      }
    };
  }, [isPlaying, song?.id, duration, updatePosition]);

  return { updatePosition };
}
