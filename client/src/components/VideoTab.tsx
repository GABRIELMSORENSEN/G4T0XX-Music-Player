import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Play, Video, X } from 'lucide-react';
import type { Song } from '../lib/storage';
import { buildYoutubeEmbedUrl } from '../lib/youtubePlayer';

interface Props {
  song: Song | null;
  startAt: number;
  playlist?: Song[];
  autoplay?: boolean;
  onOpenPlayer: () => void;
}

export function VideoTab({ song, startAt, playlist = [], autoplay = false, onOpenPlayer }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === wrapRef.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const enterFullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else el.requestFullscreen();
    } catch {}
  };
  const exitFullscreen = () => {
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
  };

  if (!song || song.isLocal) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
        <Video size={46} className="mb-3 opacity-25" />
        <p className="text-sm font-bold text-zinc-300">Modo Cinema</p>
        <p className="mt-1 max-w-xs text-xs">Toque uma música do YouTube para abrir o clipe aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold">Modo Cinema</h2>
          <p className="truncate text-xs text-zinc-500">{song.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onOpenPlayer} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold">
            <Play size={13} /> Player
          </button>
          <button onClick={enterFullscreen} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10" title="Tela cheia">
            <Maximize2 size={15} />
          </button>
        </div>
      </div>

      <div ref={wrapRef} className="relative overflow-hidden rounded-lg bg-black" style={{ aspectRatio: '16/9' }}>
        {isFullscreen && (
          <button onClick={exitFullscreen} className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/80 px-3 py-2 text-xs font-bold text-white">
            <X size={14} /> Sair
          </button>
        )}
        <iframe
          src={buildYoutubeEmbedUrl(song.id, { autoplay, startAt, playlist })}
          className="h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          title={song.title}
        />
      </div>

      <p className="text-xs text-zinc-500">
        O áudio principal é pausado quando você entra no Modo Cinema para evitar duas fontes tocando ao mesmo tempo.
      </p>
    </div>
  );
}
