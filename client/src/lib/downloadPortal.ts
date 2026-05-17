import type { Song } from './storage';

const Y2META_BASE = 'https://y2meta.is/en110/youtube-to-mp3/';

export function youtubeWatchUrl(song: Pick<Song, 'id' | 'url'> | null): string {
  if (!song) return '';
  if (song.url?.startsWith('https://www.youtube.com/watch')) return song.url;
  return `https://www.youtube.com/watch?v=${song.id}`;
}

export function nativeDownloadQuery(song: Pick<Song, 'id' | 'url' | 'title' | 'artist'> | null): string {
  if (!song) return '';
  const text = `${song.title || ''} ${song.artist || ''}`.replace(/\s+/g, ' ').trim();
  return text || youtubeWatchUrl(song);
}

export function y2MetaUrl(): string {
  return Y2META_BASE;
}
