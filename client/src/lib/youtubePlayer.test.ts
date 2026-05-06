import { describe, expect, it } from 'vitest';
import { buildYoutubeEmbedUrl, youtubeQueueIds } from './youtubePlayer';
import type { Song } from './storage';

const song = (id: string, isLocal = false): Song => ({
  id,
  title: id,
  artist: 'Artist',
  thumbnail: '',
  duration: '',
  url: `https://www.youtube.com/watch?v=${id}`,
  timestamp: 1,
  isLocal,
});

describe('youtube player helpers', () => {
  it('keeps the current song first and removes local songs from the iframe playlist', () => {
    expect(youtubeQueueIds('video_b1', [song('video_a1'), song('video_b1'), song('local1', true), song('video_c1')])).toEqual(['video_b1', 'video_c1', 'video_a1']);
  });

  it('builds a YouTube embed URL with autoplay, start time and playlist ids', () => {
    const url = new URL(buildYoutubeEmbedUrl('video_b1', { autoplay: true, startAt: 14, playlist: [song('video_a1'), song('video_b1'), song('video_c1')] }));

    expect(url.origin).toBe('https://www.youtube.com');
    expect(url.pathname).toBe('/embed/video_b1');
    expect(url.searchParams.get('autoplay')).toBe('1');
    expect(url.searchParams.get('start')).toBe('14');
    expect(url.searchParams.get('playlist')).toBe('video_b1,video_c1,video_a1');
    expect(url.searchParams.get('enablejsapi')).toBe('1');
  });
});
