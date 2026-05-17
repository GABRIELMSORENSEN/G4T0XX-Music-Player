import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import type { Song } from './storage';
import {
  extractNativeYouTubeAudio,
  importNativeYouTubePlaylist,
  searchNativeYouTube,
} from './nativeYouTubeAudio';

export type { Song };

const UA = 'Mozilla/5.0 (Linux; Android 14; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0';
const OFFLINE_AUDIO_DIR = 'offline';

export interface StreamResult {
  audioUrl: string;
  videoUrl?: string;
  mimeType: string;
  title?: string;
  thumbnail?: string;
  provider?: string;
  attempt?: number;
}

export interface OfflineDownloadResult {
  blob?: Blob;
  localPath?: string;
  fileName: string;
  mimeType: string;
  size?: number;
}

export interface PlaylistImportResult {
  title: string;
  songs: Song[];
}

export function invalidateInstance() {
  // Mantido para compatibilidade com chamadas antigas. NewPipe roda localmente.
}

export async function getInstance(): Promise<string> {
  throw new Error('Instancias externas foram removidas. Use NewPipe nativo no Android.');
}

export function thumbUrl(id: string, q: 'mq' | 'hq' | 'sd' = 'mq'): string {
  return id ? `https://i.ytimg.com/vi/${id}/${q}default.jpg` : '';
}

export async function fetchJSON(url: string, ms = 12000): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': UA },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchYoutube(query: string): Promise<Song[]> {
  if (!query.trim()) return [];
  if (!isNativeAndroid()) {
    throw new Error('Busca NewPipe disponivel apenas no app Android.');
  }
  return searchNativeYouTube(query, 0);
}

export async function importYoutubePlaylist(url: string): Promise<PlaylistImportResult> {
  if (!isNativeAndroid()) {
    throw new Error('Importacao de playlist via NewPipe disponivel apenas no app Android.');
  }
  return importNativeYouTubePlaylist(url);
}

export async function getAudioStream(videoId: string, startAt = 0): Promise<StreamResult> {
  if (!isNativeAndroid()) {
    throw new Error('Extracao NewPipe disponivel apenas no app Android.');
  }
  const stream = await extractNativeYouTubeAudio(videoId);
  return {
    audioUrl: stream.audioUrl,
    mimeType: stream.mimeType || 'audio/webm',
    title: stream.title,
    thumbnail: stream.thumbnail || thumbUrl(videoId, 'hq'),
    provider: 'NewPipe',
    attempt: startAt,
  };
}

export async function downloadAudio(
  videoId: string,
  onProgress: (pct: number) => void,
): Promise<Blob> {
  onProgress(10);
  const stream = await getAudioStream(videoId);
  onProgress(20);
  const response = await fetch(stream.audioUrl, {
    headers: { 'User-Agent': UA, Accept: '*/*' },
    signal: AbortSignal.timeout(180_000),
  });
  if (!response.ok) throw new Error(`Download falhou: HTTP ${response.status}`);
  const blob = await response.blob();
  onProgress(100);
  return blob;
}

export async function downloadAudioOffline(
  videoId: string,
  onProgress: (pct: number) => void,
): Promise<OfflineDownloadResult> {
  onProgress(3);

  if (isNativeAndroid()) {
    const native = await downloadAudioNative(videoId, onProgress);
    if (native) return native;
  }

  const blob = await downloadAudio(videoId, onProgress);
  return {
    blob,
    fileName: `${videoId}.${mimeToExt(blob.type)}`,
    mimeType: blob.type || 'audio/mpeg',
    size: blob.size,
  };
}

function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function offlineAudioFileName(videoId: string, mimeType = '') {
  return `${videoId}.${mimeToExt(mimeType)}`;
}

export function offlineAudioPath(fileName: string) {
  return `${OFFLINE_AUDIO_DIR}/${fileName}`;
}

function mimeToExt(mimeType = '') {
  const clean = mimeType.split(';')[0].toLowerCase();
  if (clean.includes('mpeg') || clean.includes('mp3')) return 'mp3';
  if (clean.includes('mp4') || clean.includes('m4a') || clean.includes('aac')) return 'm4a';
  if (clean.includes('opus')) return 'opus';
  if (clean.includes('ogg')) return 'ogg';
  if (clean.includes('webm')) return 'webm';
  return 'mp3';
}

async function downloadAudioNative(
  videoId: string,
  onProgress: (pct: number) => void,
): Promise<OfflineDownloadResult | null> {
  let progressHandle: any;
  try {
    progressHandle = await Filesystem.addListener('progress', status => {
      const total = Number(status.contentLength || 0);
      const loaded = Number(status.bytes || 0);
      if (total > 0) onProgress(Math.max(8, Math.min(98, Math.round((loaded / total) * 100))));
    });
  } catch {}

  try {
    onProgress(8);
    const stream = await getAudioStream(videoId);
    onProgress(18);
    const fileName = offlineAudioFileName(videoId, stream.mimeType);
    const path = offlineAudioPath(fileName);

    await ensureOfflineAudioDir();
    await Filesystem.deleteFile({ path, directory: Directory.Data }).catch(() => {});

    const result = await Filesystem.downloadFile({
      url: stream.audioUrl,
      path,
      directory: Directory.Data,
      recursive: true,
      progress: true,
    } as any);

    const uri = result.path || (await Filesystem.getUri({ path, directory: Directory.Data })).uri;
    onProgress(100);
    return {
      localPath: uri,
      fileName,
      mimeType: stream.mimeType || 'audio/mpeg',
    };
  } finally {
    try { progressHandle?.remove?.(); } catch {}
  }
}

async function ensureOfflineAudioDir() {
  try {
    await Filesystem.mkdir({
      path: OFFLINE_AUDIO_DIR,
      directory: Directory.Data,
      recursive: true,
    });
  } catch (err: any) {
    const msg = String(err?.message || err || '').toLowerCase();
    if (msg.includes('exist') || msg.includes('already')) return;

    await Filesystem.stat({
      path: OFFLINE_AUDIO_DIR,
      directory: Directory.Data,
    });
  }
}
