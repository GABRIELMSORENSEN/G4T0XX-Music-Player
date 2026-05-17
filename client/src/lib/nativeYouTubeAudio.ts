import { Capacitor, registerPlugin } from '@capacitor/core';
import type { Song } from './storage';

interface NativeState {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  streamUrl: string;
  playing: boolean;
  loading: boolean;
  ended: boolean;
  error: string;
  positionMs: number;
  durationMs: number;
  playbackState: number;
}

interface NativeStream {
  videoId: string;
  audioUrl: string;
  mimeType: string;
  extension: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
  bitrate: number;
}

interface NativePlaylist {
  title: string;
  songs: Song[];
}

interface NewPipeAudioPlugin {
  play(options: {
    videoId: string;
    title?: string;
    artist?: string;
    thumbnail?: string;
    positionMs?: number;
    volume?: number;
    speed?: number;
  }): Promise<NativeState>;
  pause(): Promise<NativeState>;
  resume(): Promise<NativeState>;
  stop(): Promise<NativeState>;
  seek(options: { positionMs: number }): Promise<NativeState>;
  setVolume(options: { volume: number }): Promise<NativeState>;
  setSpeed(options: { speed: number }): Promise<NativeState>;
  getState(): Promise<NativeState>;
  extract(options: { videoId: string }): Promise<NativeStream>;
  search(options: { query: string; limit?: number }): Promise<{ songs: Song[] }>;
  playlist(options: { url: string }): Promise<NativePlaylist>;
  prefetch(options: { videoIds: string }): Promise<void>;
}

const NewPipeAudio = registerPlugin<NewPipeAudioPlugin>('NewPipeAudio');

export function canUseNativeYouTubeAudio() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function isNativeYouTubeSong(song: Song | null | undefined) {
  return canUseNativeYouTubeAudio() && !!song && !song.isLocal && !song.isDownloaded;
}

export async function playNativeYouTubeAudio(
  song: Song,
  options: { position?: number; volume?: number; speed?: number } = {},
) {
  await NewPipeAudio.play({
    videoId: song.id,
    title: song.title,
    artist: song.artist,
    thumbnail: song.thumbnail,
    positionMs: Math.max(0, Math.round((options.position ?? 0) * 1000)),
    volume: options.volume ?? 1,
    speed: options.speed ?? 1,
  });
  return waitForNativeYouTubeReady(song.id);
}

export const pauseNativeYouTubeAudio = () => NewPipeAudio.pause();
export const resumeNativeYouTubeAudio = () => NewPipeAudio.resume();
export const stopNativeYouTubeAudio = () => NewPipeAudio.stop();
export const getNativeYouTubeState = () => NewPipeAudio.getState();

export function seekNativeYouTubeAudio(positionSeconds: number) {
  return NewPipeAudio.seek({ positionMs: Math.max(0, Math.round(positionSeconds * 1000)) });
}

export function setNativeYouTubeVolume(volume: number) {
  return NewPipeAudio.setVolume({ volume: Math.max(0, Math.min(1, volume)) });
}

export function setNativeYouTubeSpeed(speed: number) {
  return NewPipeAudio.setSpeed({ speed: Math.max(0.25, Math.min(2, speed)) });
}

export function extractNativeYouTubeAudio(videoId: string) {
  return NewPipeAudio.extract({ videoId });
}

export async function searchNativeYouTube(query: string, limit = 0): Promise<Song[]> {
  const result = await NewPipeAudio.search({ query, limit });
  return result.songs || [];
}

export function importNativeYouTubePlaylist(url: string): Promise<NativePlaylist> {
  return NewPipeAudio.playlist({ url });
}

export function prefetchNativeYouTubeAudio(videoIds: string[]) {
  const ids = videoIds.filter(Boolean).slice(0, 5);
  if (!ids.length) return Promise.resolve();
  return NewPipeAudio.prefetch({ videoIds: ids.join(',') }).catch(() => {});
}

async function waitForNativeYouTubeReady(videoId: string): Promise<NativeState> {
  const startedAt = Date.now();
  let lastState = await NewPipeAudio.getState();

  while (Date.now() - startedAt < 25_000) {
    lastState = await NewPipeAudio.getState();
    if (lastState.videoId === videoId) {
      if (lastState.error) throw new Error(lastState.error);
      if (lastState.streamUrl || lastState.playing || lastState.playbackState === 3) return lastState;
    }
    await new Promise(resolve => setTimeout(resolve, 350));
  }

  throw new Error(lastState.error || 'Tempo esgotado ao carregar a musica do YouTube.');
}
