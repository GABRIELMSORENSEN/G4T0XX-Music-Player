import { describe, expect, it } from 'vitest';
import { nativeDownloadQuery, y2MetaUrl, youtubeWatchUrl } from './downloadPortal';

describe('download portal helpers', () => {
  it('uses the requested Y2Meta page inside the app', () => {
    expect(y2MetaUrl()).toBe('https://y2meta.is/en110/youtube-to-mp3/');
  });

  it('builds a YouTube watch URL from a song id', () => {
    expect(youtubeWatchUrl({ id: 'abc123XYZ90', url: '' })).toBe('https://www.youtube.com/watch?v=abc123XYZ90');
  });

  it('builds a native download search query from title and artist', () => {
    expect(nativeDownloadQuery({ id: 'abc123XYZ90', url: '', title: 'Song Name', artist: 'Artist Name' })).toBe('Song Name Artist Name');
  });
});
