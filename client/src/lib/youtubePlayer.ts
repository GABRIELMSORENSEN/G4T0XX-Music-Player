import type { Song } from './storage';

export interface YoutubeEmbedOptions {
  autoplay?: boolean;
  startAt?: number;
  playlist?: Song[];
}

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;

export function youtubeQueueIds(currentId: string, playlist: Song[] = []): string[] {
  const ids = playlist
    .filter(song => !song.isLocal && YOUTUBE_ID.test(song.id))
    .map(song => song.id);

  const unique = Array.from(new Set(ids.length ? ids : [currentId].filter(id => YOUTUBE_ID.test(id))));
  const currentIndex = unique.indexOf(currentId);
  if (currentIndex < 0) return unique;

  return [...unique.slice(currentIndex), ...unique.slice(0, currentIndex)];
}

export function buildYoutubeEmbedUrl(videoId: string, options: YoutubeEmbedOptions = {}): string {
  const url = new URL(`https://www.youtube.com/embed/${encodeURIComponent(videoId)}`);
  const queue = youtubeQueueIds(videoId, options.playlist);
  url.searchParams.set('autoplay', options.autoplay ? '1' : '0');
  url.searchParams.set('controls', '1');
  url.searchParams.set('modestbranding', '1');
  url.searchParams.set('rel', '0');
  url.searchParams.set('playsinline', '1');
  url.searchParams.set('enablejsapi', '1');
  url.searchParams.set('iv_load_policy', '3');

  if (options.startAt && options.startAt > 0) {
    url.searchParams.set('start', String(Math.max(0, Math.floor(options.startAt))));
  }
  if (queue.length > 1) {
    url.searchParams.set('playlist', queue.join(','));
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    url.searchParams.set('origin', window.location.origin);
  }

  return url.toString();
}
