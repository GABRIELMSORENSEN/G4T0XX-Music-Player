import { Capacitor, registerPlugin } from '@capacitor/core';
import type { Song } from './storage';

interface NativeAudioFile {
  id: string;
  title: string;
  artist: string;
  displayName: string;
  durationMs: number;
  mimeType: string;
  uri: string;
}

interface LocalMusicPlugin {
  requestAudioPermission(): Promise<{ granted: boolean }>;
  listAudio(): Promise<{ songs: NativeAudioFile[] }>;
  prepareAudio(options: { uri: string; id?: string; fileName?: string; mimeType?: string }): Promise<{ fileUri: string }>;
}

const LocalMusic = registerPlugin<LocalMusicPlugin>('LocalMusic');

const fmtDuration = (ms: number) => {
  if (!ms || Number.isNaN(ms)) return '';
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const localThumb =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="12" fill="#1a1a1a"/><text x="40" y="50" font-size="32" text-anchor="middle" fill="#e11d48">♪</text></svg>',
  );

export function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function nativeUriToSrc(uri: string) {
  return Capacitor.convertFileSrc(uri);
}

export async function requestNativeAudioPermission(): Promise<boolean> {
  if (!isNativeAndroid()) return true;
  const perm = await LocalMusic.requestAudioPermission();
  return !!perm.granted;
}

export async function prepareNativeAudio(song: Song): Promise<string> {
  if (!isNativeAndroid() || !song.localPath?.startsWith('content://')) {
    return nativeUriToSrc(song.localPath || song.url);
  }

  const result = await LocalMusic.prepareAudio({
    uri: song.localPath,
    id: song.id,
    fileName: song.fileName,
    mimeType: song.mimeType,
  });
  return nativeUriToSrc(result.fileUri);
}

export async function getNativeAudioSongs(): Promise<Song[]> {
  if (!isNativeAndroid()) return [];

  const perm = await LocalMusic.requestAudioPermission();
  if (!perm.granted) throw new Error('Permissao de audio negada');

  const result = await LocalMusic.listAudio();
  return result.songs.map(file => ({
    id: `native_${file.id}`,
    title: file.title || file.displayName.replace(/\.[^/.]+$/, ''),
    artist: file.artist || 'Local',
    thumbnail: localThumb,
    duration: fmtDuration(file.durationMs),
    url: file.uri,
    timestamp: Date.now(),
    isLocal: true,
    localPath: file.uri,
    fileName: file.displayName,
    mimeType: file.mimeType,
  }));
}
