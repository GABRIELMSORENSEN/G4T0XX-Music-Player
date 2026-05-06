import { describe, expect, it } from 'vitest';
import { mergeOfflineAndLocalSongs } from './musicLibrary';
import type { Song } from './storage';

const baseSong = (id: string, flags: Partial<Song> = {}): Song => ({
  id,
  title: id,
  artist: 'Artist',
  thumbnail: '',
  duration: '',
  url: '',
  timestamp: 1,
  ...flags,
});

describe('music library helpers', () => {
  it('shows downloaded and local songs together without duplicates', () => {
    const downloaded = [baseSong('yt1', { isDownloaded: true }), baseSong('same', { isDownloaded: true })];
    const local = [baseSong('local1', { isLocal: true }), baseSong('same', { isLocal: true, localPath: 'content://same' })];

    expect(mergeOfflineAndLocalSongs(downloaded, local).map(song => song.id)).toEqual(['yt1', 'same', 'local1']);
  });

  it('keeps local playback metadata when merging libraries', () => {
    const merged = mergeOfflineAndLocalSongs([], [baseSong('local1', { isLocal: true, localPath: 'content://music', mimeType: 'audio/mpeg' })]);

    expect(merged[0]).toMatchObject({ id: 'local1', isLocal: true, localPath: 'content://music', mimeType: 'audio/mpeg' });
  });
});
