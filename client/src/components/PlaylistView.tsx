import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Download, Heart, ListMusic } from 'lucide-react';
import type { Song, Playlist } from '../lib/storage';

interface PlaylistViewProps {
  playlist: Playlist | null;
  isOpen: boolean;
  onClose: () => void;
  onPlaySong: (song: Song, list: Song[]) => void;
  onDownload: (song: Song) => void;
  onDownloadPlaylist: (songs: Song[]) => void;
  onFav: (song: Song) => void;
  currentSongId?: string;
  favIds: Set<string>;
  downloadingIds: Set<string>;
  dlPct: Record<string, number>;
  isDownloadingPlaylist?: boolean;
  playlistDone?: number;
  playlistTotal?: number;
}

export function PlaylistView({
  playlist, isOpen, onClose, onPlaySong, onDownload, onDownloadPlaylist, onFav,
  currentSongId, favIds, downloadingIds, dlPct,
  isDownloadingPlaylist = false, playlistDone = 0, playlistTotal = 0,
}: PlaylistViewProps) {
  if (!playlist) return null;
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[170] flex flex-col bg-[#0d0d0d]"
          style={{
            paddingTop: 'max(20px, env(safe-area-inset-top))',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pb-3 border-b border-white/5 flex-shrink-0">
            {playlist.cover
              ? <img src={playlist.cover} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              : <div className="w-12 h-12 rounded-xl bg-brand-gray flex items-center justify-center flex-shrink-0"><ListMusic size={20} className="text-zinc-600"/></div>
            }
            <div className="flex-1 min-w-0">
              <h2 className="font-black text-base truncate">{playlist.name}</h2>
              <p className="text-xs text-zinc-500">{playlist.songs.length} músicas</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/8 flex-shrink-0">
              <X size={18} />
            </button>
          </div>

          {/* Play/download buttons */}
          {playlist.songs.length > 0 && (
            <div className="px-4 py-3 flex-shrink-0 grid grid-cols-2 gap-2">
              <button
                onClick={() => { onPlaySong(playlist.songs[0], playlist.songs); onClose(); }}
                className="py-3 bg-brand-red rounded-2xl font-black text-sm flex items-center justify-center gap-2"
              >
                <Play size={16} className="fill-current" /> Tocar tudo
              </button>
              <button
                onClick={() => onDownloadPlaylist(playlist.songs)}
                disabled={isDownloadingPlaylist}
                className="py-3 bg-green-600 disabled:bg-green-900/70 disabled:text-green-200 rounded-2xl font-black text-sm flex items-center justify-center gap-2"
              >
                {isDownloadingPlaylist
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                  : <Download size={16}/>}
                {isDownloadingPlaylist ? `${playlistDone}/${playlistTotal}` : 'Baixar'}
              </button>
            </div>
          )}

          {/* Song list */}
          <div className="flex-1 overflow-y-auto px-4 space-y-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {playlist.songs.map((song, i) => (
              <div key={song.id}
                onClick={() => { onPlaySong(song, playlist.songs); onClose(); }}
                className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors group ${
                  currentSongId === song.id ? 'bg-brand-red/10' : 'hover:bg-white/5 active:bg-white/8'
                }`}
              >
                <span className="text-[11px] text-zinc-600 w-5 text-right flex-shrink-0">{i + 1}</span>
                <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-900">
                  <img src={song.thumbnail} className="w-full h-full object-cover" />
                  {currentSongId === song.id && (
                    <div className="absolute inset-0 bg-brand-red/40 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-xs truncate leading-tight ${currentSongId === song.id ? 'text-brand-red' : ''}`}>{song.title}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{song.artist}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                  <button onClick={e => { e.stopPropagation(); onFav(song); }}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg ${favIds.has(song.id) ? 'text-brand-red' : 'text-zinc-600'}`}>
                    <Heart size={13} className={favIds.has(song.id) ? 'fill-current' : ''} />
                  </button>
                  {!song.isDownloaded && (
                    <button onClick={e => { e.stopPropagation(); onDownload(song); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-white"
                      disabled={downloadingIds.has(song.id)}>
                      {downloadingIds.has(song.id)
                        ? <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"/>
                        : <Download size={13} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
