import React, { useRef, useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Music, Video, Play, Pause, SkipBack, SkipForward,
  Maximize2, ChevronDown, Headphones, PictureInPicture2,
} from 'lucide-react';
import type { Song } from '../lib/storage';
import { buildYoutubeEmbedUrl } from '../lib/youtubePlayer';

interface Props {
  song: Song | null;
  isOpen: boolean;
  isPlaying: boolean;
  playlist?: Song[];
  audioMode: boolean;          // true = só áudio (esconde vídeo)
  onClose: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onToggleAudioMode: () => void;
  onEnterPip: () => void;
}

export const VideoPlayer = memo(function VideoPlayer({
  song, isOpen, isPlaying, audioMode, playlist = [],
  onClose, onTogglePlay, onNext, onPrev, onToggleAudioMode, onEnterPip,
}: Props) {
  const frameWrapRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === frameWrapRef.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  if (!song || !isOpen) return null;

  const videoId = song.id;
  const enterFullscreen = () => {
    const el = frameWrapRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else el.requestFullscreen();
    } catch {}
  };
  const exitFullscreen = () => {
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
  };

  return (
    <motion.div
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-0 z-[195] flex flex-col bg-black"
      style={{ paddingTop: 'max(0px,env(safe-area-inset-top))' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0 bg-black/80">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10">
          <ChevronDown size={20} />
        </button>
        <div className="text-center flex-1 mx-3">
          <p className="font-bold text-xs truncate">{song.title}</p>
          <p className="text-[10px] text-zinc-500 truncate">{song.artist}</p>
        </div>
        {/* Toggle Áudio / Vídeo */}
        <div className="flex items-center gap-1">
          <button onClick={onToggleAudioMode}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              audioMode ? 'bg-white/10 text-zinc-300' : 'text-white'
            }`}
            style={!audioMode ? { backgroundColor: 'var(--accent,#e11d48)' } : {}}>
            {audioMode ? <><Music size={12}/> Áudio</> : <><Video size={12}/> Clipe</>}
          </button>
          <button onClick={onEnterPip} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10" title="Picture-in-picture">
            <PictureInPicture2 size={15} />
          </button>
          <button onClick={enterFullscreen} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10" title="Tela cheia">
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      {/* Vídeo ou capa */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        {audioMode ? (
          // Modo só áudio — mostra capa grande
          <div className="flex flex-col items-center gap-6 px-8">
            <img src={song.thumbnail} className="w-72 h-72 object-cover rounded-3xl shadow-2xl"
              style={{ boxShadow: '0 0 80px rgba(0,0,0,0.8)' }} />
            <div className="text-center">
              <p className="font-black text-xl">{song.title}</p>
              <p className="text-zinc-400">{song.artist}</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-full text-xs text-zinc-400">
              <Headphones size={13} /> Modo apenas áudio — economiza dados
            </div>
          </div>
        ) : (
          // Modo vídeo — embeds YouTube IFrame (visível só aqui)
          <div ref={frameWrapRef} className="relative w-full bg-black" style={{ aspectRatio: '16/9' }}>
            {isFullscreen && (
              <button onClick={exitFullscreen} className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/80 px-3 py-2 text-xs font-bold text-white">
                <X size={14} /> Sair
              </button>
            )}
            <iframe
              src={buildYoutubeEmbedUrl(videoId, { autoplay: true, playlist })}
              className="w-full h-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title={song.title}
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex-shrink-0 bg-black pb-safe px-8 py-5">
        <div className="flex items-center justify-center gap-8">
          <button onClick={onPrev} className="text-zinc-300 hover:text-white">
            <SkipBack size={30} className="fill-current" />
          </button>
          <button onClick={onTogglePlay}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform">
            {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
          </button>
          <button onClick={onNext} className="text-zinc-300 hover:text-white">
            <SkipForward size={30} className="fill-current" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});
