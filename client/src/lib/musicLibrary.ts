import type { Song } from './storage';

export function mergeOfflineAndLocalSongs(songs: Song[], localSongs: Song[]): Song[] {
  const merged = new Map<string, Song>();
  for (const song of songs) {
    if (song.isDownloaded || song.isLocal) merged.set(song.id, song);
  }
  for (const song of localSongs) {
    if (!merged.has(song.id)) merged.set(song.id, song);
  }
  return Array.from(merged.values());
}
