/**
 * useBackgroundService
 * 
 * Manages the Android ForegroundService (MusicService) that keeps audio alive
 * when the screen is off. Communicates via Capacitor's native bridge.
 * 
 * Also sets up the global window.__musicControl callback so MainActivity.java
 * can fire play/pause/next/prev back into React state.
 */

import { useEffect, useRef } from 'react';

export interface ServiceControls {
  startService: (title: string, artist: string, isPlaying: boolean) => void;
  stopService: () => void;
  updateService: (title: string, artist: string, isPlaying: boolean) => void;
}

type ControlAction = 'play' | 'pause' | 'next' | 'prev';

export function useBackgroundService(
  onControl: (action: ControlAction) => void
): ServiceControls {
  const onControlRef = useRef(onControl);
  onControlRef.current = onControl;

  useEffect(() => {
    // Expose global so MainActivity.java can call it
    (window as any).__musicControl = (action: ControlAction) => {
      onControlRef.current(action);
    };
    return () => {
      delete (window as any).__musicControl;
    };
  }, []);

  const isNative = () =>
    typeof (window as any).Capacitor !== 'undefined' &&
    (window as any).Capacitor?.isNativePlatform?.();

  const sendIntent = async (
    action: string,
    title?: string,
    artist?: string,
    isPlaying?: boolean
  ) => {
    if (!isNative()) return;
    try {
      // Use Capacitor's App plugin to send intent to MusicService
      const { App } = await import('@capacitor/app');
      await (App as any).sendIntent?.({
        action,
        extras: {
          title: title || '',
          artist: artist || '',
          isPlaying: isPlaying ?? false,
        },
      });
    } catch {
      // Fallback: try direct via Android bridge if available
      try {
        const cap = (window as any).Capacitor;
        if (cap?.Plugins?.App) {
          await cap.Plugins.App.sendIntent?.({
            action,
            extras: { title, artist, isPlaying },
          });
        }
      } catch {}
    }
  };

  const startService = (title: string, artist: string, isPlaying: boolean) => {
    sendIntent('com.g4t0xx.ytmusic.UPDATE', title, artist, isPlaying);
  };

  const stopService = () => {
    sendIntent('com.g4t0xx.ytmusic.STOP');
  };

  const updateService = (title: string, artist: string, isPlaying: boolean) => {
    sendIntent('com.g4t0xx.ytmusic.UPDATE', title, artist, isPlaying);
  };

  return { startService, stopService, updateService };
}
