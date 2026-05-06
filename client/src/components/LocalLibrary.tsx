import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FolderOpen, Music, RefreshCw, Trash2, X, Upload, AlertCircle } from 'lucide-react';
import type { Song } from '../lib/storage';
import { saveLocalSong, getLocalSongs, deleteLocalSong } from '../lib/storage';
import { getNativeAudioSongs, isNativeAndroid } from '../lib/nativeLocalMusic';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPlay: (song: Song, list: Song[]) => void;
  currentSongId?: string;
}

function fileToSong(file: File): Song {
  const name = file.name.replace(/\.[^/.]+$/, '');
  const parts = name.split(' - ');
  return {
    id: 'local_' + file.name + '_' + file.size,
    title: parts.length >= 2 ? parts.slice(1).join(' - ') : name,
    artist: parts.length >= 2 ? parts[0] : 'Local',
    thumbnail: 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect width="80" height="80" rx="12" fill="#1a1a1a"/><text x="40" y="50" font-size="32" text-anchor="middle" fill="#e11d48">♪</text></svg>`),
    duration: '',
    url: '',
    timestamp: Date.now(),
    isLocal: true,
    localPath: file.name,
  };
}

export function LocalLibrary({ isOpen, onClose, onPlay, currentSongId }: Props) {
  const [songs, setSongs]     = useState<Song[]>([]);
  const [loaded, setLoaded]   = useState(false);
  const [picking, setPicking] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (loaded) return;
    const local = await getLocalSongs();
    setSongs(local); setLoaded(true);
  }, [loaded]);

  React.useEffect(() => { if (isOpen) load(); }, [isOpen]);

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPicking(true);
    for (const file of files) {
      const song = fileToSong(file);
      song.blob = file as unknown as Blob;
      await saveLocalSong(song);
    }
    const updated = await getLocalSongs();
    setSongs(updated);
    setPicking(false);
    e.target.value = '';
  };

  const scanNativeLibrary = useCallback(async () => {
    if (!isNativeAndroid()) return;
    setScanning(true);
    setError('');
    try {
      const nativeSongs = await getNativeAudioSongs();
      for (const song of nativeSongs) await saveLocalSong(song);
      const updated = await getLocalSongs();
      setSongs(updated);
      setLoaded(true);
    } catch (err: any) {
      setError(err?.message || 'Nao foi possivel ler as musicas do aparelho.');
    } finally {
      setScanning(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen && isNativeAndroid()) scanNativeLibrary();
  }, [isOpen, scanNativeLibrary]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteLocalSong(id);
    setSongs(prev => prev.filter(s => s.id !== id));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[170] flex flex-col bg-[#0d0d0d]"
          style={{ paddingTop: 'max(20px,env(safe-area-inset-top))', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-between px-5 pb-3 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <FolderOpen size={16} style={{ color: 'var(--accent,#e11d48)' }} />
              <span className="font-black text-sm">ARQUIVOS LOCAIS</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/8 text-zinc-400">
              <X size={16} />
            </button>
          </div>

          {/* Info */}
          <div className="px-5 py-3 flex-shrink-0">
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mb-3">
              <AlertCircle size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300">No Android, o app procura automaticamente músicas do aparelho, incluindo Downloads. Você também pode importar arquivos manualmente.</p>
            </div>
            {error && (
              <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                {error}
              </div>
            )}
            {isNativeAndroid() && (
              <button
                onClick={scanNativeLibrary}
                disabled={scanning}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 py-3 text-sm font-bold text-zinc-200 disabled:opacity-60"
              >
                <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
                {scanning ? 'Procurando músicas...' : 'Atualizar músicas do celular'}
              </button>
            )}
            <label className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-white/20 rounded-2xl text-sm text-zinc-400 cursor-pointer hover:bg-white/5">
              <Upload size={16} />
              {picking ? 'Importando...' : 'Importar arquivos de música'}
              <input type="file" accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac" multiple className="hidden" onChange={handleFilePick} />
            </label>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-5" style={{ WebkitOverflowScrolling: 'touch' }}>
            {songs.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-zinc-600 gap-3">
                <Music size={44} className="opacity-20" />
                <p className="text-sm">Nenhuma música local importada</p>
              </div>
            ) : (
              <div className="space-y-1 pb-4">
                {songs.map(song => (
                  <div key={song.id}
                    onClick={() => { onPlay(song, songs); onClose(); }}
                    className="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-white/5 group"
                    style={currentSongId === song.id ? { backgroundColor: 'var(--accent,#e11d48)18' } : {}}>
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900 flex items-center justify-center">
                      <img src={song.thumbnail} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs truncate" style={currentSongId === song.id ? { color: 'var(--accent,#e11d48)' } : {}}>{song.title}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{song.artist}</p>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 bg-green-500/20 text-green-500 rounded uppercase font-bold flex-shrink-0">LOCAL</span>
                    <button onClick={e => handleDelete(song.id, e)} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
