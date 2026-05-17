import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Play, RefreshCw, Search, Video, X } from 'lucide-react';
import type { Song } from '../lib/storage';
import { searchYoutube } from '../lib/streams';
import { buildYoutubeEmbedUrl } from '../lib/youtubePlayer';

interface Props {
  song: Song | null;
  startAt: number;
  playlist?: Song[];
  autoplay?: boolean;
  onOpenPlayer: () => void;
  onSelectSong: (song: Song, list: Song[]) => void;
}

export function VideoTab({ song, startAt, playlist = [], autoplay = false, onOpenPlayer, onSelectSong }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

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

  const handleCinemaSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const term = query.trim();
    if (!term) return;
    setIsSearching(true);
    setError('');
    try {
      const songs = await searchYoutube(term);
      setResults(songs);
      if (!songs.length) setError('Nenhum video encontrado.');
    } catch (err: any) {
      setError(err?.message || 'Busca indisponivel agora.');
    } finally {
      setIsSearching(false);
    }
  };

  const searchPanel = (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <form onSubmit={handleCinemaSearch} className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"/>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar videos do YouTube"
            className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm outline-none"/>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{backgroundColor:'var(--accent,#e11d48)'}}>
          {isSearching ? <RefreshCw size={16} className="animate-spin"/> : <Search size={16}/>}
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {results.length > 0 && (
        <div className="mt-3 grid gap-2">
          {results.map(item => (
            <button key={item.id} onClick={() => onSelectSong(item, results)}
              className="flex items-center gap-3 rounded-xl bg-white/5 p-2 text-left active:bg-white/10">
              <img src={item.thumbnail} className="h-11 w-11 rounded-lg object-cover"/>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-zinc-100">{item.title}</span>
                <span className="block truncate text-[10px] text-zinc-500">{item.artist}</span>
              </span>
              <Play size={14} className="fill-current text-zinc-400"/>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  if (!song || song.isLocal) {
    return (
      <div className="space-y-4">
        {searchPanel}
        <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
          <Video size={46} className="mb-3 opacity-25" />
          <p className="text-sm font-bold text-zinc-300">Modo Cinema</p>
          <p className="mt-1 max-w-xs text-xs">Pesquise um video para assistir aqui dentro do app.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {searchPanel}
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
    </div>
  );
}
