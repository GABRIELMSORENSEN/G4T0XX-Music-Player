import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Music2, RefreshCw, ExternalLink } from 'lucide-react';
import type { Song } from '../lib/storage';
import { fetchLyrics, type LyricsResult, type LyricLine } from '../lib/lyrics';

interface Props {
  song: Song | null;
  isOpen: boolean;
  progress: number; // segundos — para highlight da linha ativa
  onClose: () => void;
}

export function LyricsPanel({ song, isOpen, progress, onClose }: Props) {
  const [result, setResult]   = useState<LyricsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [lastId, setLastId]   = useState('');
  const listRef               = useRef<HTMLDivElement>(null);

  const load = useCallback(async (s: Song, force = false) => {
    if (!force && s.id === lastId && result) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await fetchLyrics(s.title, s.artist);
      setResult(r); setLastId(s.id);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [lastId, result]);

  useEffect(() => { if (isOpen && song) load(song); }, [isOpen, song?.id]);

  // Scroll para linha ativa
  const activeIdx = result?.synced
    ? (() => {
        const lines = result.lines;
        let idx = 0;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].time <= progress) idx = i; else break;
        }
        return idx;
      })()
    : -1;

  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    const el = listRef.current.children[activeIdx] as HTMLElement;
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeIdx]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed inset-0 z-[250] flex flex-col bg-[#0d0d0d]"
          style={{ paddingTop: 'max(20px,env(safe-area-inset-top))', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-between px-5 pb-3 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Music2 size={15} style={{ color: 'var(--accent,#e11d48)' }} />
              <span className="font-black text-sm">LETRA</span>
              {result && <span className="px-1.5 py-0.5 bg-white/5 rounded text-[9px] text-zinc-500">{result.source}</span>}
              {result?.synced && <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[9px]">sincronizada</span>}
            </div>
            <div className="flex gap-2">
              {song && !loading && (
                <button onClick={() => { setLastId(''); load(song, true); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-500">
                  <RefreshCw size={13} />
                </button>
              )}
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-400">
                <X size={16} />
              </button>
            </div>
          </div>

          {song && (
            <div className="flex items-center gap-3 px-5 py-3 flex-shrink-0 border-b border-white/5">
              <img src={song.thumbnail} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-xs truncate">{song.title}</p>
                <p className="text-[10px] text-zinc-500 truncate">{song.artist}</p>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-5 pb-10" style={{ WebkitOverflowScrolling: 'touch' }}>
            {loading && (
              <div className="flex flex-col items-center py-20 gap-4">
                <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent,#e11d48) transparent transparent transparent' }} />
                <p className="text-xs text-zinc-500">Buscando letra...</p>
              </div>
            )}
            {!loading && error && (
              <div className="flex flex-col items-center py-16 gap-3 text-center">
                <Music2 size={36} className="text-zinc-700" />
                <p className="text-sm text-zinc-500">{error}</p>
                {song && (
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(song.title+' '+song.artist+' letra')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs hover:underline" style={{ color: 'var(--accent,#e11d48)' }}>
                    Buscar no Google <ExternalLink size={10} />
                  </a>
                )}
              </div>
            )}
            {!loading && result && (
              <div ref={listRef} className="py-4 space-y-0.5">
                {result.lines.map((line, i) => (
                  <p key={i}
                    className={`text-sm leading-relaxed transition-all duration-300 ${
                      line.text === '' ? 'h-4' :
                      result.synced
                        ? i === activeIdx ? 'text-white font-bold text-base' : i < activeIdx ? 'text-zinc-600' : 'text-zinc-400'
                        : 'text-zinc-300'
                    }`}
                  >{line.text}</p>
                ))}
                <p className="text-[10px] text-zinc-700 text-center pt-6">via {result.source}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
