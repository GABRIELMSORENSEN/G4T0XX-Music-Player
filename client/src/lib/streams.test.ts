import { describe, expect, it } from 'vitest';
import { offlineAudioFileName, offlineAudioPath } from './streams';

describe('offline audio helpers', () => {
  it('stores native offline downloads inside the offline directory', () => {
    const fileName = offlineAudioFileName('b0-NaEj2dQ0', 'audio/mp4');
    expect(fileName).toBe('b0-NaEj2dQ0.m4a');
    expect(offlineAudioPath(fileName)).toBe('offline/b0-NaEj2dQ0.m4a');
  });
});
