import { create } from 'zustand';
import { Song, addToRecents } from './storage';

interface MusicPlayerState {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  isMuted: boolean;
  repeatMode: 'none' | 'one' | 'all';
  isShuffle: boolean;
  
  setCurrentSong: (song: Song | null) => void;
  setQueue: (songs: Song[]) => void;
  addToQueue: (song: Song) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setIsMuted: (isMuted: boolean) => void;
  setRepeatMode: (mode: 'none' | 'one' | 'all') => void;
  setIsShuffle: (isShuffle: boolean) => void;
  
  playNext: () => void;
  playPrevious: () => void;
}

export const useMusicPlayer = create<MusicPlayerState>((set, get) => ({
  currentSong: null,
  queue: [],
  isPlaying: false,
  volume: 0.7,
  progress: 0,
  duration: 0,
  isMuted: false,
  repeatMode: 'none',
  isShuffle: false,

  setCurrentSong: (song) => {
    set({ currentSong: song, isPlaying: !!song, progress: 0 });
    if (song) addToRecents(song);
  },
  setQueue: (queue) => set({ queue }),
  addToQueue: (song) => set((state) => ({ queue: [...state.queue, song] })),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  setIsMuted: (isMuted) => set({ isMuted }),
  setRepeatMode: (repeatMode: 'none' | 'one' | 'all') => set({ repeatMode }),
  setIsShuffle: (isShuffle: boolean) => set({ isShuffle }),

  playNext: () => {
    const { queue, currentSong, isShuffle, repeatMode } = get();
    if (!currentSong) return;

    if (repeatMode === 'one') {
      set({ progress: 0, isPlaying: true });
      return;
    }

    if (queue.length === 0) return;
    const currentIndex = queue.findIndex((s: Song) => s.id === currentSong.id);
    
    let nextIndex: number;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = currentIndex + 1;
    }

    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') nextIndex = 0;
      else { set({ isPlaying: false }); return; }
    }

    set({ currentSong: queue[nextIndex], isPlaying: true, progress: 0 });
    addToRecents(queue[nextIndex]);
  },

  playPrevious: () => {
    const { queue, currentSong, progress } = get();
    // If more than 3 seconds in, restart song
    if (progress > 3) {
      set({ progress: 0 });
      return;
    }
    if (!currentSong || queue.length === 0) return;
    const currentIndex = queue.findIndex((s: Song) => s.id === currentSong.id);
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    set({ currentSong: queue[prevIndex], isPlaying: true, progress: 0 });
    addToRecents(queue[prevIndex]);
  },
}));
