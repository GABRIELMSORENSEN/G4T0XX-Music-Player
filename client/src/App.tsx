import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Search as SearchIcon, Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Repeat, Shuffle, Heart, Download, Music,
  ListMusic, Settings as SettingsIcon, History, Star,
  X, Maximize2, Minimize2, Plus, Trash2, QrCode, Copy, Check,
  Repeat1, Coffee, Github, ExternalLink, WifiOff, RefreshCw,
  Gauge, Mic2, ChevronDown, FolderOpen, Video, Globe2, Youtube,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMusicPlayer } from './lib/store';
import {
  Song, getRecents, getFavorites, addToFavorites, getPlaylists,
  saveSong, getSetting, saveSetting, getSongs, savePlaylist,
  deletePlaylist, Playlist, clearRecents, getLocalSongs, removeFavorite,
} from './lib/storage';
import {
  searchYoutube, getAudioStream, downloadAudioOffline, importYoutubePlaylist,
} from './lib/streams';
import { GatoIcon } from './components/GatoIcon';
import { LyricsPanel } from './components/LyricsPanel';
import { PermissionsModal } from './components/PermissionsModal';
import { PlaylistView } from './components/PlaylistView';
import { SettingsPanel, type UISize } from './components/SettingsPanel';
import { VideoPlayer } from './components/VideoPlayer';
import { VideoTab } from './components/VideoTab';
import { LocalLibrary } from './components/LocalLibrary';
import { usePermissions } from './hooks/usePermissions';
import { useMediaSession } from './hooks/useMediaSession';
import { setNativeEqualizerPreset } from './lib/nativeAudioEffects';
import { isNativeAndroid, prepareNativeAudio } from './lib/nativeLocalMusic';
import { mergeOfflineAndLocalSongs } from './lib/musicLibrary';
import { nativeDownloadQuery } from './lib/downloadPortal';
import { enterNativePip, setNativePipAuto } from './lib/nativePip';
import {
  getNativeYouTubeState,
  isNativeYouTubeSong,
  pauseNativeYouTubeAudio,
  playNativeYouTubeAudio,
  prefetchNativeYouTubeAudio,
  resumeNativeYouTubeAudio,
  seekNativeYouTubeAudio,
  setNativeYouTubeSpeed,
  setNativeYouTubeVolume,
  stopNativeYouTubeAudio,
} from './lib/nativeYouTubeAudio';

function fmtSecs(s: number): string {
  if (!s || isNaN(s) || s < 0) return '0:00';
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}
const SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

// ── Toast ──────────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: 'success'|'error'|'info' }) {
  return (
    <motion.div initial={{opacity:0,y:40,scale:0.9}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:20}}
      className={`fixed bottom-28 left-4 right-4 z-[999] px-4 py-3 rounded-2xl text-sm font-bold shadow-2xl pointer-events-none border text-center ${
        type==='success'?'bg-green-600/95 border-green-400 text-white'
        :type==='error'?'bg-red-700/95 border-red-400 text-white'
        :'bg-zinc-800/95 border-zinc-600 text-white'}`}>
      {msg}
    </motion.div>
  );
}

// ── SpeedPanel ────────────────────────────────────────────────────────────────
const SpeedPanel = memo(function SpeedPanel({ isOpen, speed, onClose, onChange }: {
  isOpen: boolean; speed: number; onClose: () => void; onChange: (v: number) => void;
}) {
  const pct = ((speed - 0.25) / 1.75) * 100;
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
          className="fixed inset-0 z-[500] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}>
          <motion.div initial={{y:50,opacity:0}} animate={{y:0,opacity:1}} exit={{y:50,opacity:0}}
            transition={{type:'spring',damping:28,stiffness:300}}
            className="bg-[#111] rounded-3xl w-full max-w-sm border border-white/10 p-5"
            style={{paddingBottom:'max(20px,env(safe-area-inset-bottom))'}}
            onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gauge size={16} style={{color:'var(--accent,#e11d48)'}}/>
                <span className="font-black text-sm">VELOCIDADE</span>
              </div>
              <span className="text-2xl font-black" style={{color:'var(--accent,#e11d48)'}}>{speed}x</span>
            </div>
            <input type="range" min={0.25} max={2.0} step={0.05} value={speed}
              onChange={e=>onChange(parseFloat(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer mb-4"
              style={{background:`linear-gradient(to right,var(--accent,#e11d48) ${pct}%,#27272a ${pct}%)`}}/>
            <div className="grid grid-cols-3 gap-2">
              {SPEED_PRESETS.map(s=>(
                <button key={s} onClick={()=>onChange(s)}
                  className={`py-2 rounded-xl text-sm font-bold transition-all ${speed===s?'text-white':'bg-white/5 hover:bg-white/10 text-zinc-400'}`}
                  style={speed===s?{backgroundColor:'var(--accent,#e11d48)'}:{}}>
                  {s===0.5?'0.5x 🐢':s===0.75?'0.75x':s===1.0?'1x':s===1.25?'1.25x':s===1.5?'1.5x':'2x 🐇'}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <p className="text-xs text-zinc-600 flex-1">{speed<1?'🐢 Slowed':speed>1?'🐇 Sped up':'✓ Normal'}</p>
              <button onClick={()=>onChange(1.0)} className="text-xs text-zinc-500 hover:text-white">Resetar</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// ── ExpandedPlayer ────────────────────────────────────────────────────────────
const ExpandedPlayer = memo(function ExpandedPlayer({
  isOpen, song, isPlaying, progress, duration, isFav, isLoading,
  onClose, onTogglePlay, onSeek, onNext, onPrev, onFav,
  onShowLyrics, onShowVideo, onDownload, isDownloading, dlPct, isDownloaded,
}: {
  isOpen: boolean; song: Song|null; isPlaying: boolean; progress: number;
  duration: number; isFav: boolean; isLoading: boolean;
  onClose:()=>void; onTogglePlay:()=>void; onSeek:(v:number)=>void;
  onNext:()=>void; onPrev:()=>void; onFav:()=>void;
  onShowLyrics:()=>void; onShowVideo:()=>void;
  onDownload:()=>void; isDownloading:boolean; dlPct?:number; isDownloaded:boolean;
}) {
  const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;
  // Drag-to-seek state
  const seekBarRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [localPct, setLocalPct] = useState<number|null>(null);

  const getSeekValue = (clientX: number) => {
    if (!seekBarRef.current) return null;
    const r = seekBarRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * (duration || 0);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    seekBarRef.current?.setPointerCapture(e.pointerId);
    const v = getSeekValue(e.clientX);
    if (v !== null) setLocalPct((v / (duration||1)) * 100);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const v = getSeekValue(e.clientX);
    if (v !== null) setLocalPct((v / (duration||1)) * 100);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const v = getSeekValue(e.clientX);
    if (v !== null) { onSeek(v); setLocalPct(null); }
  };

  const displayPct = localPct !== null ? localPct : pct;

  if (!isOpen || !song) return null;
  return (
    <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
      transition={{type:'spring',damping:30,stiffness:300}}
      className="fixed inset-0 z-[190] flex flex-col"
      style={{
        background:'linear-gradient(180deg,#0a0a0a 0%,#111 60%,#0d0d0d 100%)',
        paddingTop:'max(24px,env(safe-area-inset-top))',
        paddingBottom:'max(24px,env(safe-area-inset-bottom))',
      }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/8">
          <ChevronDown size={20}/>
        </button>
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Tocando agora</span>
        <div className="flex items-center gap-1">
          <button onClick={onShowVideo} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/8">
            <Video size={15} className="text-zinc-400"/>
          </button>
          <button onClick={onShowLyrics} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/8">
            <Mic2 size={15} className="text-zinc-400"/>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-5 min-h-0">
        {/* Thumbnail */}
        <div className="relative w-full max-w-xs">
          <img src={song.thumbnail} alt="" className="w-full aspect-square object-cover rounded-3xl shadow-2xl"
            style={{boxShadow:isPlaying?`0 0 60px rgba(var(--accent-rgb,225,29,72),0.35),0 20px 60px rgba(0,0,0,0.8)`:'0 20px 60px rgba(0,0,0,0.8)'}}/>
          {isLoading && (
            <div className="absolute inset-0 rounded-3xl bg-black/60 flex items-center justify-center">
              <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin"/>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="w-full text-center">
          <h2 className="font-black text-lg leading-tight mb-1 line-clamp-2">{song.title}</h2>
          <p className="text-zinc-400 text-sm">{song.artist}</p>
          {song.isLocal && <span className="text-[10px] text-green-400 font-bold">📁 Local</span>}
        </div>

        {/* Seek bar — com drag/arraste */}
        <div className="w-full space-y-1">
          <div
            ref={seekBarRef}
            className="relative h-10 w-full flex items-center cursor-pointer touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Track */}
            <div className="absolute left-0 right-0 h-1.5 bg-zinc-800 rounded-full">
              <div className="h-full rounded-full relative"
                style={{width:`${displayPct}%`, backgroundColor:'var(--accent,#e11d48)', transition: isDraggingRef.current ? 'none' : 'width 0.4s linear'}}>
                {/* Thumb — maior para facilitar toque */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-lg border-2 border-white"
                  style={{boxShadow:`0 0 0 3px var(--accent,#e11d48)44`}}/>
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-[11px] text-zinc-600">{fmtSecs(progress)}</span>
            <span className="text-[11px] text-zinc-600">{fmtSecs(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between w-full max-w-xs">
          <button onClick={onFav} style={isFav?{color:'var(--accent,#e11d48)'}:{}} className={isFav?'':'text-zinc-600 hover:text-white'}>
            <Heart size={22} className={isFav?'fill-current':''}/>
          </button>
          <button onClick={onPrev} className="text-zinc-300 hover:text-white">
            <SkipBack size={28} className="fill-current"/>
          </button>
          <button onClick={onTogglePlay}
            className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform">
            {isLoading
              ? <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"/>
              : isPlaying
                ? <Pause size={24} className="fill-current"/>
                : <Play size={24} className="fill-current ml-1"/>
            }
          </button>
          <button onClick={onNext} className="text-zinc-300 hover:text-white">
            <SkipForward size={28} className="fill-current"/>
          </button>
          <button onClick={onDownload} disabled={isDownloading}
            className={`${isDownloaded?'text-green-400':'text-zinc-600 hover:text-white'} disabled:opacity-50`}>
            {isDownloading
              ? <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"/>
              : <Download size={22} className={isDownloaded?'fill-current':''}/>
            }
          </button>
        </div>

        {isDownloading && dlPct !== undefined && (
          <div className="w-full max-w-xs">
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{width:`${dlPct}%`}}/>
            </div>
            <p className="text-center text-[10px] text-zinc-500 mt-1">Baixando {dlPct}%...</p>
          </div>
        )}
      </div>
    </motion.div>
  );
});

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const {
    currentSong, setCurrentSong, isPlaying, setIsPlaying,
    progress, setProgress, duration, setDuration,
    volume, setVolume, isMuted, setIsMuted,
    playNext, playPrevious, queue, setQueue,
    repeatMode, setRepeatMode, isShuffle, setIsShuffle,
  } = useMusicPlayer();

  // UI
  const [activeTab, setActiveTab]             = useState('home');
  const [showExpanded, setShowExpanded]       = useState(false);
  const [showLyrics, setShowLyrics]           = useState(false);
  const [showSpeedPanel, setShowSpeedPanel]   = useState(false);
  const [showSettings, setShowSettings]       = useState(false);
  const [showPermModal, setShowPermModal]     = useState(false);
  const [isFloating, setIsFloating]           = useState(false);
  const [showVideo, setShowVideo]             = useState(false);
  const [audioMode, setAudioMode]             = useState(true);
  const [showLocal, setShowLocal]             = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist|null>(null);

  // Library
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching]     = useState(false);
  const [searchError, setSearchError]     = useState('');
  const [searchStatus, setSearchStatus]   = useState('');
  const [recents, setRecents]             = useState<Song[]>([]);
  const [favorites, setFavorites]         = useState<Song[]>([]);
  const [playlists, setPlaylists]         = useState<Playlist[]>([]);
  const [offlineSongs, setOfflineSongs]   = useState<Song[]>([]);

  // Audio — TUDO via <audio> nativo (funciona com tela desligada)
  const [audioUrl, setAudioUrl]           = useState<string|null>(null);
  const [audioLoading, setAudioLoading]   = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [streamAttempt, setStreamAttempt] = useState(0);

  // Settings
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [appIconImage, setAppIconImage] = useState('');
  const [appIconVideo, setAppIconVideo] = useState('');
  const [appIconObjectUrl, setAppIconObjectUrl] = useState('');
  const [bgImage, setBgImage]         = useState('');
  const [bgVideo, setBgVideo]         = useState('');
  const [bgObjectUrl, setBgObjectUrl] = useState('');
  const [bgOpacity, setBgOpacity]     = useState(40);
  const [bgBlur, setBgBlur]           = useState(6);
  const [accentColor, setAccentColor] = useState('#e11d48');
  const [customColor, setCustomColor] = useState('#06b6d4');
  const [uiSize, setUISize]           = useState<UISize>('normal');
  const [eqPreset, setEqPreset]       = useState('Normal');
  const [bitDepth, setBitDepth]       = useState(16);

  // Download / favs
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [dlPct, setDlPct]                   = useState<Record<string,number>>({});
  const [playlistDownloading, setPlaylistDownloading] = useState(false);
  const [playlistDone, setPlaylistDone] = useState(0);
  const [playlistTotal, setPlaylistTotal] = useState(0);
  const [favoritedIds, setFavoritedIds]     = useState<Set<string>>(new Set());

  // Misc
  const [toast, setToast]           = useState<{msg:string;type:'success'|'error'|'info'}|null>(null);
  const [isOffline, setIsOffline]   = useState(!navigator.onLine);
  const [ytImportUrl, setYtImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [newPlName, setNewPlName]   = useState('');
  const [showNewPl, setShowNewPl]   = useState(false);
  const [copied, setCopied]         = useState(false);
  const [downloaderSong, setDownloaderSong] = useState<Song|null>(null);

  // Refs
  const audioRef    = useRef<HTMLAudioElement>(null);
  const silentRef   = useRef<HTMLAudioElement>(null);
  const wakeLockRef = useRef<any>(null);
  const appIconFileRef = useRef<HTMLInputElement | null>(null);
  const bgFileRef   = useRef<HTMLInputElement | null>(null);
  const eqCtxRef    = useRef<AudioContext|null>(null);
  const eqSrcRef    = useRef<MediaElementAudioSourceNode|null>(null);
  const eqNodeRef   = useRef<any>(null);
  const streamSongRef = useRef<string | null>(null);
  const shouldAutoplayCurrentRef = useRef(true);

  const { perms, requestAll } = usePermissions();

  // ── @jofr/capacitor-media-session — notificação com seek e metadados ──────
  useMediaSession(
    currentSong,
    isPlaying,
    duration,
    playbackSpeed,
    {
      onPlay:      () => { isNativeYouTubeSong(currentSong) ? resumeNativeYouTubeAudio().catch(() => {}) : audioRef.current?.play().catch(() => {}); setIsPlaying(true); },
      onPause:     () => { isNativeYouTubeSong(currentSong) ? pauseNativeYouTubeAudio().catch(() => {}) : audioRef.current?.pause(); setIsPlaying(false); },
      onNext:      () => playNext(),
      onPrev:      () => playPrevious(),
      onSeek:      (t) => { if (isNativeYouTubeSong(currentSong)) seekNativeYouTubeAudio(t).catch(() => {}); else if (audioRef.current) audioRef.current.currentTime = t; setProgress(t); },
      getPosition: () => isNativeYouTubeSong(currentSong) ? progress : (audioRef.current?.currentTime ?? 0),
    }
  );

  // ── Accent color CSS var ────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accentColor);
    const h = accentColor.replace('#','');
    const r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
    document.documentElement.style.setProperty('--accent-rgb', `${r},${g},${b}`);
    if (settingsLoaded) saveSetting('accent_color', accentColor);
  }, [accentColor, settingsLoaded]);

  useEffect(() => {
    document.documentElement.style.fontSize = uiSize==='small'?'14px':uiSize==='large'?'18px':'16px';
    if (settingsLoaded) saveSetting('ui_size', uiSize);
  }, [uiSize, settingsLoaded]);

  useEffect(() => {
    setStreamAttempt(0);
  }, [currentSong?.id]);

  // ── INIT ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    const onVisibilityChange = () => {
      // Quando tela apaga ou app vai para background:
      silentRef.current?.play().catch(() => {});
      if (eqCtxRef.current?.state === 'suspended') {
        eqCtxRef.current.resume().catch(() => {});
      }
      // Mantém o áudio tocando quando a tela desliga
      if (document.visibilityState === 'hidden' && audioRef.current && isPlaying && !isNativeYouTubeSong(currentSong)) {
        audioRef.current.play().catch(() => {});
      }
    };
    const onNativePause = () => {
      silentRef.current?.play().catch(() => {});
      if (eqCtxRef.current?.state === 'suspended') eqCtxRef.current.resume().catch(() => {});
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisibilityChange);
    // Evento nativo do Capacitor para quando o app vai para background
    document.addEventListener('pause', onNativePause);

    (async () => {
      await Promise.all([loadLibrary(), loadSettings()]);
      const asked = localStorage.getItem('perms_asked') || await getSetting('perms_asked');
      if (asked) localStorage.setItem('perms_asked', '1');
      if (mounted && !asked) setTimeout(() => mounted && setShowPermModal(true), 1200);
    })();

    // Controles via notificação / botões de hardware
    (window as any).__musicControl = (action: string) => {
      switch (action) {
        case 'play':  isNativeYouTubeSong(currentSong) ? resumeNativeYouTubeAudio().catch(()=>{}) : audioRef.current?.play().catch(()=>{}); setIsPlaying(true);  break;
        case 'pause': isNativeYouTubeSong(currentSong) ? pauseNativeYouTubeAudio().catch(()=>{}) : audioRef.current?.pause(); setIsPlaying(false); break;
        case 'next':  playNext();    break;
        case 'prev':  playPrevious(); break;
        case 'stop':  isNativeYouTubeSong(currentSong) ? stopNativeYouTubeAudio().catch(()=>{}) : audioRef.current?.pause(); setIsPlaying(false); stopService(); break;
      }
    };
    (window as any).__onAppPause  = () => silentRef.current?.play().catch(() => {});
    (window as any).__onAppResume = () => {
      if (eqCtxRef.current?.state === 'suspended') eqCtxRef.current.resume().catch(() => {});
    };
    return () => {
      mounted = false;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('pause', onNativePause);
      delete (window as any).__musicControl;
      delete (window as any).__onAppPause;
      delete (window as any).__onAppResume;
    };
  }, []);

  const loadSettings = async () => {
    try {
      const theme = await getSetting('custom_theme');
      if (theme) {
        if (typeof theme === 'string') setBgImage(theme);
        else if (theme.type === 'video') setBgVideo(theme.data);
        else setBgImage(theme.data);
      }
      const icon = await getSetting('app_icon_media');
      if (icon) {
        if (icon.type === 'video') setAppIconVideo(icon.data);
        else setAppIconImage(icon.data);
      }
      const spd = await getSetting('playback_speed'); if (typeof spd === 'number') setPlaybackSpeed(spd);
      const acc = await getSetting('accent_color');   if (acc) setAccentColor(acc);
      const custom = await getSetting('custom_color'); if (custom) setCustomColor(custom);
      const sz  = await getSetting('ui_size');         if (sz) setUISize(sz);
      const op  = await getSetting('bg_opacity');      if (typeof op === 'number') setBgOpacity(op);
      const bl  = await getSetting('bg_blur');         if (typeof bl === 'number') setBgBlur(bl);
      const eq  = await getSetting('eq_preset');       if (eq) setEqPreset(eq);
      const bits = await getSetting('audio_bit_depth'); if (typeof bits === 'number') setBitDepth(bits);
    } finally {
      setSettingsLoaded(true);
    }
  };

  const loadLibrary = async () => {
    const [r,f,p,s,l] = await Promise.all([getRecents(), getFavorites(), getPlaylists(), getSongs(), getLocalSongs()]);
    const mergedSongs = mergeOfflineAndLocalSongs(s, l);
    const byId = new Map<string, Song>(mergedSongs.map(song => [song.id, song]));
    const hydratedPlaylists = p.map(pl => ({
      ...pl,
      cover: pl.cover || pl.songs[0]?.thumbnail,
      songs: pl.songs.map(song => ({ ...song, ...(byId.get(song.id) || {}) })),
    }));
    setRecents(r); setFavorites(f); setPlaylists(hydratedPlaylists);
    setOfflineSongs(mergedSongs);
    setFavoritedIds(new Set(f.map((x:Song) => x.id)));
  };

  const showToast = useCallback((msg: string, type: 'success'|'error'|'info' = 'info') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  }, []);

  const closeTransientOverlays = useCallback(() => {
    setShowExpanded(false);
    setShowLyrics(false);
    setShowSpeedPanel(false);
    setShowSettings(false);
    setShowPermModal(false);
    setShowVideo(false);
    setShowLocal(false);
    setSelectedPlaylist(null);
    setShowNewPl(false);
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch {}
  }, []);

  useEffect(() => {
    setNativePipAuto(isFloating && !!currentSong).catch(() => {});
  }, [isFloating, currentSong?.id]);

  useEffect(() => {
    if (!selectedPlaylist) return;
    setSelectedPlaylist(playlists.find(pl => pl.id === selectedPlaylist.id) || null);
  }, [playlists, selectedPlaylist?.id]);

  useEffect(() => {
    const closeOnBackground = () => {
      if (document.visibilityState === 'hidden') closeTransientOverlays();
    };
    document.addEventListener('visibilitychange', closeOnBackground);
    document.addEventListener('pause', closeTransientOverlays);
    window.addEventListener('pagehide', closeTransientOverlays);
    return () => {
      document.removeEventListener('visibilitychange', closeOnBackground);
      document.removeEventListener('pause', closeTransientOverlays);
      window.removeEventListener('pagehide', closeTransientOverlays);
    };
  }, [closeTransientOverlays]);

  // ── WakeLock ─────────────────────────────────────────────────────────────
  const acquireWakeLock = useCallback(async () => {
    try {
      if (wakeLockRef.current) await wakeLockRef.current.release().catch(() => {});
      if ('wakeLock' in navigator) wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
    } catch {}
  }, []);

  // ── ForegroundService ─────────────────────────────────────────────────────
  const startService = useCallback((song: Song, playing: boolean) => {
    if (!(window as any).Capacitor?.isNativePlatform?.()) return;
    if (isNativeYouTubeSong(song)) return;
    try {
      const posMs = Math.round((audioRef.current?.currentTime || 0) * 1000);
      const durMs = Math.round((audioRef.current?.duration    || 0) * 1000);
      const payload = { title: song.title, artist: song.artist, thumbnail: song.thumbnail, isPlaying: playing, position: posMs, duration: durMs };
      const MB = (window as any).Capacitor?.Plugins?.MusicBridge;
      if (MB?.startMusicService) MB.startMusicService(payload);
      else if ((window as any).__nativeStartService)
        (window as any).__nativeStartService(song.title, song.artist, song.thumbnail, playing, posMs, durMs);
    } catch {}
  }, []);

  const stopService = useCallback(() => {
    try {
      const MB = (window as any).Capacitor?.Plugins?.MusicBridge;
      if (MB?.stopMusicService) MB.stopMusicService({});
    } catch {}
  }, []);

  // ── MediaSession ──────────────────────────────────────────────────────────
  const updateMediaSession = useCallback((song: Song, playing: boolean) => {
    if (!('mediaSession' in navigator)) return;
    const artUrl = song.isLocal ? song.thumbnail : `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title, artist: song.artist, album: 'G4T0XX Music Player',
      artwork: [{ src: artUrl, sizes: '480x360', type: 'image/jpeg' }],
    });
    navigator.mediaSession.setActionHandler('play',           () => { isNativeYouTubeSong(song) ? resumeNativeYouTubeAudio().catch(()=>{}) : audioRef.current?.play().catch(()=>{}); setIsPlaying(true); });
    navigator.mediaSession.setActionHandler('pause',          () => { isNativeYouTubeSong(song) ? pauseNativeYouTubeAudio().catch(()=>{}) : audioRef.current?.pause(); setIsPlaying(false); });
    navigator.mediaSession.setActionHandler('previoustrack',  () => playPrevious());
    navigator.mediaSession.setActionHandler('nexttrack',      () => playNext());
    navigator.mediaSession.setActionHandler('seekto', d => {
      if (d.seekTime != null && isNativeYouTubeSong(song)) seekNativeYouTubeAudio(d.seekTime).catch(()=>{});
      else if (d.seekTime != null && audioRef.current) audioRef.current.currentTime = d.seekTime;
    });
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  }, [playNext, playPrevious]);

  // ── Load stream via NewPipe nativo no Android ────────────────────────────
  // Este é o ponto crítico: usa <audio> nativo em vez de IFrame YT
  // <audio> nativo continua tocando com tela desligada — IFrame YT pausa
  useEffect(() => {
    if (!currentSong) {
      setAudioUrl(prev => { if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev); return null; });
      stopNativeYouTubeAudio().catch(() => {});
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    setProgress(0); setDuration(0); setAudioLoading(true);
    const providerAttempt = streamSongRef.current === currentSong.id ? streamAttempt : 0;
    streamSongRef.current = currentSong.id;

    // Offline / local → blob direto
    if ((currentSong.isLocal || currentSong.isDownloaded) && currentSong.blob) {
      const url = URL.createObjectURL(currentSong.blob);
      setAudioUrl(url); setAudioLoading(false);
      return () => URL.revokeObjectURL(url);
    }

    if ((currentSong.isLocal || currentSong.isDownloaded) && currentSong.localPath) {
      let cancelled = false;
      (async () => {
        try {
          const src = await prepareNativeAudio(currentSong);
          if (!cancelled) { setAudioUrl(src); setAudioLoading(false); }
        } catch (err: any) {
          if (!cancelled) {
            setAudioLoading(false);
            showToast(err?.message || 'Nao foi possivel abrir a musica local.', 'error');
          }
        }
      })();
      return () => { cancelled = true; };
    }

    if (currentSong.isLocal || currentSong.isDownloaded) {
      setAudioLoading(false);
      showToast('Arquivo local indisponivel. Importe a musica novamente.', 'error');
      return;
    }

    // Online fallback: NewPipe nativo, sem servidores externos de stream
    if (isNativeYouTubeSong(currentSong)) {
      let cancelled = false;
      setAudioUrl(null);
      const shouldAutoplay = shouldAutoplayCurrentRef.current;
      shouldAutoplayCurrentRef.current = true;
      if (!shouldAutoplay) {
        setAudioLoading(false);
        return () => { cancelled = true; };
      }
      (async () => {
        try {
          await playNativeYouTubeAudio(currentSong, {
            volume: isMuted ? 0 : volume,
            speed: playbackSpeed,
          });
          if (!cancelled) {
            setAudioLoading(false);
            const idx = queue.findIndex(s => s.id === currentSong.id);
            const nextIds = queue
              .slice(Math.max(0, idx + 1), idx + 4)
              .filter(s => !s.isLocal && !s.isDownloaded)
              .map(s => s.id);
            prefetchNativeYouTubeAudio(nextIds);
          }
        } catch (err: any) {
          if (!cancelled) {
            setAudioLoading(false);
            showToast(err?.message || 'NewPipe falhou para esta musica.', 'error');
            playNext();
          }
        }
      })();
      return () => { cancelled = true; };
    }

    let cancelled = false;
    (async () => {
      try {
        const { audioUrl: url, provider } = await getAudioStream(currentSong.id, providerAttempt);
        if (!cancelled) {
          setAudioUrl(url); setAudioLoading(false);
          if (providerAttempt > 0 && provider) showToast(`Usando servidor ${provider}`, 'info');
        }
      } catch (err: any) {
        if (!cancelled) {
          setAudioLoading(false);
          showToast('NewPipe nao conseguiu abrir esta musica.', 'error');
          playNext();
        }
      }
    })();
    return () => { cancelled = true; };
  }, [currentSong?.id, streamAttempt]);

  // ── Play/pause o <audio> ──────────────────────────────────────────────────
  const playAudio = useCallback(async () => {
    if (!audioRef.current) return;
    try {
      if (eqCtxRef.current?.state === 'suspended') await eqCtxRef.current.resume();
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.volume = isMuted ? 0 : volume;
      await audioRef.current.play();
    } catch {
      setTimeout(async () => {
        try {
          if (eqCtxRef.current?.state === 'suspended') await eqCtxRef.current.resume();
          await audioRef.current?.play();
        } catch {}
      }, 400);
    }
  }, [playbackSpeed, isMuted, volume]);

  useEffect(() => {
    if (isNativeYouTubeSong(currentSong)) {
      if (isPlaying) resumeNativeYouTubeAudio().catch(() => {});
      else pauseNativeYouTubeAudio().catch(() => {});
      return;
    }
    if (!audioUrl || !audioRef.current) return;
    if (isPlaying) {
      playAudio();
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, audioUrl, playAudio]);

  useEffect(() => {
    if (!isNativeYouTubeSong(currentSong)) return;
    let stopped = false;
    let endedHandled = false;
    let lastError = '';
    const sync = async () => {
      try {
        const state = await getNativeYouTubeState();
        if (stopped || state.videoId !== currentSong?.id) return;
        setProgress((state.positionMs || 0) / 1000);
        if (state.durationMs > 0) setDuration(state.durationMs / 1000);
        setAudioLoading(!!state.loading);
        if (state.error && state.error !== lastError) {
          lastError = state.error;
          showToast(state.error, 'error');
        }
        if (state.ended && !endedHandled) {
          endedHandled = true;
          playNext();
        }
      } catch {}
    };
    sync();
    const id = setInterval(sync, 1000);
    return () => { stopped = true; clearInterval(id); };
  }, [currentSong?.id, playNext, showToast]);

  // ── ForegroundService + WakeLock ─────────────────────────────────────────
  useEffect(() => {
    if (!currentSong) return;
    if (isNativeYouTubeSong(currentSong)) return;
    startService(currentSong, isPlaying);
    if (isPlaying) {
      acquireWakeLock();
      silentRef.current?.play().catch(() => {});
    }
  }, [isPlaying, currentSong?.id]);

  // Atualiza progresso na notificação a cada 5s
  useEffect(() => {
    if (!currentSong || !isPlaying) return;
    if (isNativeYouTubeSong(currentSong)) return;
    const id = setInterval(() => startService(currentSong, true), 5000);
    return () => clearInterval(id);
  }, [currentSong?.id, isPlaying]);

  // ── Velocidade ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isNativeYouTubeSong(currentSong)) setNativeYouTubeSpeed(playbackSpeed).catch(() => {});
    if (audioRef.current) audioRef.current.playbackRate = playbackSpeed;
    if (settingsLoaded) saveSetting('playback_speed', playbackSpeed);
  }, [playbackSpeed, audioUrl, settingsLoaded, currentSong?.id]); // re-aplica quando URL muda

  // ── Volume ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isNativeYouTubeSong(currentSong)) setNativeYouTubeVolume(isMuted ? 0 : volume).catch(() => {});
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted, currentSong?.id]);

  // ── EQ via Web Audio API ─────────────────────────────────────────────────
  // Reconecta quando a URL muda (novo elemento <audio> = novo source node)
  useEffect(() => {
    if (isNativeAndroid()) return;
    if (!audioRef.current) return;
    // MediaElementAudioSourceNode is bound to the <audio> element, not the src.
    // Reuse it across src changes; creating a second node for the same element fails.
    if (eqSrcRef.current) {
      try { eqSrcRef.current.disconnect(); } catch {}
    }
    // Pequeno delay para garantir que o <audio> está montado no DOM
    const t = setTimeout(() => applyEQ(eqPreset), 80);
    return () => clearTimeout(t);
  }, [audioUrl]);

  const createBitCrusher = useCallback((ctx: AudioContext, bits: number) => {
    const depth = Math.max(4, Math.min(24, Math.round(bits)));
    const node = ctx.createScriptProcessor(1024, 2, 2);
    const steps = Math.max(2, Math.pow(2, depth));
    node.onaudioprocess = event => {
      for (let channel = 0; channel < event.outputBuffer.numberOfChannels; channel++) {
        const input = event.inputBuffer.getChannelData(Math.min(channel, event.inputBuffer.numberOfChannels - 1));
        const output = event.outputBuffer.getChannelData(channel);
        for (let i = 0; i < output.length; i++) {
          output[i] = Math.round(input[i] * steps) / steps;
        }
      }
    };
    return node;
  }, []);

  const applyEQ = useCallback((preset: string) => {
    if (isNativeAndroid()) {
      setNativeEqualizerPreset(preset).then(enabled => {
        if (!enabled && preset !== 'Normal') showToast('Equalizador nativo indisponível neste aparelho.', 'info');
      });
      return;
    }
    if (!audioRef.current) return;
    try {
      if (preset === 'Normal' && !eqSrcRef.current) return;
      if (!eqCtxRef.current) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        eqCtxRef.current = new AC();
      }
      const ctx = eqCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      if (!eqSrcRef.current) {
        eqSrcRef.current = ctx.createMediaElementSource(audioRef.current);
      }

      // Para animação 8D/9D anterior
      if (eqNodeRef.current?._panInterval) {
        clearInterval(eqNodeRef.current._panInterval);
      }
      if (eqNodeRef.current?._osc) {
        try { eqNodeRef.current._osc.stop(); } catch {}
        try { eqNodeRef.current._osc.disconnect(); } catch {}
      }
      // Desconecta tudo
      try { eqSrcRef.current.disconnect(); } catch {}

      const filter = ctx.createBiquadFilter();
      switch (preset) {
        case 'Bass Boost': filter.type='lowshelf';  filter.frequency.value=200;  filter.gain.value=12; break;
        case 'Treble':     filter.type='highshelf'; filter.frequency.value=4000; filter.gain.value=9;  break;
        case 'Vocal':      filter.type='peaking';   filter.frequency.value=1000; filter.gain.value=7;  break;
        case 'Club':       filter.type='bandpass';  filter.frequency.value=1000; filter.Q.value=0.5;   break;
        case 'Rock':       filter.type='peaking';   filter.frequency.value=3000; filter.gain.value=7;  break;
        case 'Pop':        filter.type='peaking';   filter.frequency.value=2000; filter.gain.value=5;  break;
        case 'Deep Bass':  filter.type='lowshelf';  filter.frequency.value=100;  filter.gain.value=15; break;
        case 'Soft':       filter.type='highshelf'; filter.frequency.value=6000; filter.gain.value=-6; break;
        case 'Night':      filter.type='lowshelf';  filter.frequency.value=180;  filter.gain.value=-4; break;
        case 'Live':       filter.type='peaking';   filter.frequency.value=1600; filter.gain.value=6; filter.Q.value=0.7; break;
        case 'Normal':
          if (bitDepth < 16) {
            const crusher = createBitCrusher(ctx, bitDepth);
            eqNodeRef.current = crusher;
            eqSrcRef.current.connect(crusher);
            crusher.connect(ctx.destination);
          } else {
            eqSrcRef.current.connect(ctx.destination);
          }
          return;
        default:           filter.type='allpass'; break;
      }
      eqNodeRef.current = filter;

      const inputNode = bitDepth < 16 ? createBitCrusher(ctx, bitDepth) : null;
      if (inputNode) {
        eqNodeRef.current = inputNode;
        eqSrcRef.current.connect(inputNode);
        inputNode.connect(filter);
      } else {
        eqSrcRef.current.connect(filter);
      }

      if (preset === '8D Audio' || preset === '9D Audio') {
        const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

        const delay = ctx.createDelay(0.5);
        const feedback = ctx.createGain();
        delay.delayTime.value = preset === '9D Audio' ? 0.22 : 0.12;
        feedback.gain.value   = preset === '9D Audio' ? 0.38 : 0.22;
        delay.connect(feedback); feedback.connect(delay);
        delay.connect(ctx.destination);

        filter.connect(delay);
        if (panner) {
          filter.connect(panner);
          panner.connect(ctx.destination);
        } else {
          filter.connect(ctx.destination);
        }

        let osc: OscillatorNode | null = null;
        if (preset === '9D Audio') {
          const tremolo = ctx.createGain();
          const depth = ctx.createGain();
          osc = ctx.createOscillator();
          tremolo.gain.value = 0.76;
          osc.frequency.value = 2.4;
          depth.gain.value = 0.18;
          osc.connect(depth);
          depth.connect(tremolo.gain);
          filter.disconnect();
          filter.connect(delay);
          filter.connect(tremolo);
          tremolo.connect(panner || ctx.destination);
          osc.start();
        }

        let angle = 0;
        const speed = preset === '9D Audio' ? 0.09 : 0.055;
        const interval = setInterval(() => {
          angle += speed;
          if (panner) panner.pan.setTargetAtTime(Math.sin(angle) * (preset === '9D Audio' ? 1 : 0.82), ctx.currentTime, 0.04);
        }, 50);
        eqNodeRef.current._panInterval = interval;
        eqNodeRef.current._osc = osc;
      } else {
        filter.connect(ctx.destination);
      }
    } catch {}
  }, [bitDepth, createBitCrusher, showToast]);

  useEffect(() => {
    applyEQ(eqPreset);
    if (settingsLoaded) saveSetting('eq_preset', eqPreset);
    if (settingsLoaded) saveSetting('audio_bit_depth', bitDepth);
  }, [eqPreset, bitDepth, applyEQ, settingsLoaded]);

  // ── Seek ──────────────────────────────────────────────────────────────────
  const handleSeek = useCallback((v: number) => {
    setProgress(v);
    if (isNativeYouTubeSong(currentSong)) seekNativeYouTubeAudio(v).catch(() => {});
    else if (audioRef.current) audioRef.current.currentTime = v;
  }, [currentSong?.id]);

  const togglePlayPause = useCallback(() => {
    if (currentSong) setIsPlaying(!isPlaying);
  }, [currentSong, isPlaying]);

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    if (isOffline) { showToast('Você está offline', 'error'); return; }
    setIsSearching(true); setActiveTab('search'); setSearchStatus('Buscando...'); setSearchError('');
    try {
      const songs = await searchYoutube(searchQuery);
      setSearchResults(songs);
      if (!songs.length) setSearchError('Nenhuma musica encontrada. Tente outro nome ou artista.');
    } catch (err: any) {
      showToast(err?.message || 'Erro na busca.', 'error');
      setSearchError(err?.message || 'Falha na busca.');
    } finally { setIsSearching(false); setSearchStatus(''); }
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const saveOfflineSong = async (song: Song) => {
    if (downloadingIds.has(song.id) || song.isDownloaded || song.isLocal) return;
    if (isOffline) { showToast('Sem conexão', 'error'); return; }
    setDownloadingIds(prev => new Set(prev).add(song.id));
    setDlPct(prev => ({ ...prev, [song.id]: 1 }));
    showToast(`Baixando "${song.title.slice(0, 22)}"...`, 'info');
    try {
      const offline = await downloadAudioOffline(song.id, pct => setDlPct(prev => ({ ...prev, [song.id]: pct })));
      await saveSong({
        ...song,
        isDownloaded: true,
        blob: offline.blob,
        localPath: offline.localPath,
        fileName: offline.fileName,
        mimeType: offline.mimeType,
        timestamp: Date.now(),
      });
      showToast(`✓ "${song.title.slice(0, 22)}" salva offline!`, 'success');
      await loadLibrary();
    } catch (err: any) {
      showToast(err?.message || 'Falha ao baixar.', 'error');
      throw err;
    } finally {
      setDownloadingIds(prev => { const s = new Set(prev); s.delete(song.id); return s; });
      setDlPct(prev => { const s = { ...prev }; delete s[song.id]; return s; });
    }
  };

  const handleDownload = async (song: Song, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDownloaderSong(song);
    await saveOfflineSong(song).catch(() => {});
  };

  const handleDownloadPlaylist = async (songs: Song[]) => {
    if (playlistDownloading || isOffline) {
      if (isOffline) showToast('Sem conexÃ£o', 'error');
      return;
    }
    const saved = new Set(offlineSongs.map(s => s.id));
    const targets = songs.filter(song => !song.isLocal && !song.isDownloaded && !saved.has(song.id));
    if (!targets.length) { showToast('Playlist ja esta offline.', 'info'); return; }

    setPlaylistDownloading(true);
    setPlaylistDone(0);
    setPlaylistTotal(targets.length);
    try {
      for (let i = 0; i < targets.length; i++) {
        setPlaylistDone(i);
        await saveOfflineSong(targets[i]).catch(() => {});
      }
      setPlaylistDone(targets.length);
      showToast(`Playlist offline: ${targets.length} musicas processadas.`, 'success');
      await loadLibrary();
    } finally {
      setPlaylistDownloading(false);
      setPlaylistTotal(0);
      setPlaylistDone(0);
    }
  };

  const handleToggleFavorite = async (song: Song, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const added = await addToFavorites(song);
    if (added) { setFavoritedIds(prev => new Set(prev).add(song.id)); showToast('Adicionado ❤️', 'success'); }
    else { setFavoritedIds(prev => { const s = new Set(prev); s.delete(song.id); return s; }); showToast('Removido', 'info'); }
    loadLibrary();
  };

  const handleRemoveFavorite = async (song: Song, e?: React.MouseEvent) => {
    e?.stopPropagation();
    await removeFavorite(song.id);
    setFavoritedIds(prev => { const s = new Set(prev); s.delete(song.id); return s; });
    await loadLibrary();
    showToast('Removido dos favoritos', 'info');
  };

  const handlePlaySong = (song: Song, list?: Song[]) => {
    shouldAutoplayCurrentRef.current = true;
    if (isNativeYouTubeSong(currentSong) && !isNativeYouTubeSong(song)) {
      stopNativeYouTubeAudio().catch(() => {});
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    setAudioUrl(prev => { if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev); return null; });
    setStreamAttempt(0);
    streamSongRef.current = null;
    setProgress(0);
    setDuration(0);
    setAudioLoading(true);
    setCurrentSong(song);
    setQueue(list?.length ? list : [song]);
    setIsPlaying(true);
    if (!isNativeYouTubeSong(song)) {
      silentRef.current?.play().catch(() => {});
      acquireWakeLock();
    }
  };

  const handleBgFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (bgObjectUrl) URL.revokeObjectURL(bgObjectUrl);
    const objUrl = URL.createObjectURL(file); setBgObjectUrl(objUrl);
    const isVid = file.type.startsWith('video/');
    if (isVid) { setBgVideo(objUrl); setBgImage(''); } else { setBgImage(objUrl); setBgVideo(''); }
    const reader = new FileReader();
    reader.onload = async ev => saveSetting('custom_theme', { type: isVid ? 'video' : 'image', data: ev.target?.result });
    reader.readAsDataURL(file);
    showToast('Fundo atualizado!', 'success'); e.target.value = '';
  };

  const handleAppIconFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (appIconObjectUrl) URL.revokeObjectURL(appIconObjectUrl);
    setAppIconObjectUrl(URL.createObjectURL(file));
    const isVid = file.type.startsWith('video/');
    const reader = new FileReader();
    reader.onload = async ev => {
      const data = ev.target?.result;
      if (!data) return;
      if (isVid) { setAppIconVideo(String(data)); setAppIconImage(''); }
      else { setAppIconImage(String(data)); setAppIconVideo(''); }
      await saveSetting('app_icon_media', { type: isVid ? 'video' : 'image', data });
      showToast('Icone do app atualizado!', 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const markPermissionsAsked = async () => {
    localStorage.setItem('perms_asked','1');
    await saveSetting('perms_asked', true);
  };

  const closeFloatingWindow = useCallback(() => {
    setIsFloating(false);
    setNativePipAuto(false).catch(() => {});
  }, []);

  const toggleFloatingWindow = useCallback(() => {
    setIsFloating(prev => {
      const next = !prev;
      setNativePipAuto(next && !!currentSong).catch(() => {});
      if (next && currentSong && isNativeAndroid()) {
        showToast('Popup ativado. Minimize o app para abrir a janela.', 'info');
      }
      return next;
    });
  }, [currentSong, showToast]);

  const handleEnterPip = () => {
    setIsFloating(true);
    setNativePipAuto(!!currentSong).catch(() => {});
    enterNativePip()
      .then(result => {
        if (!result.active) {
          try { (window as any).Capacitor?.Plugins?.App?.minimizeApp?.(); } catch {}
        }
      })
      .catch(() => {
        try { (window as any).Capacitor?.Plugins?.App?.minimizeApp?.(); } catch {}
      });
  };

  const openCinemaTab = () => {
    if (!currentSong || currentSong.isLocal) {
      showToast('Toque uma música do YouTube antes de abrir o Modo Cinema.', 'info');
      setActiveTab('cinema');
      return;
    }
    audioRef.current?.pause();
    setIsPlaying(false);
    setAudioMode(false);
    setActiveTab('cinema');
  };

  const handleCinemaSong = (song: Song, list: Song[]) => {
    shouldAutoplayCurrentRef.current = false;
    stopNativeYouTubeAudio().catch(() => {});
    audioRef.current?.pause();
    setAudioUrl(prev => { if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev); return null; });
    setCurrentSong(song);
    setQueue(list.length ? list : [song]);
    setProgress(0);
    setDuration(0);
    setAudioLoading(false);
    setIsPlaying(false);
    setAudioMode(false);
    setActiveTab('cinema');
  };

  const toggleVideoAudioMode = () => {
    setAudioMode(v => {
      const next = !v;
      if (!next) {
        audioRef.current?.pause();
        setIsPlaying(false);
      }
      return next;
    });
  };

  const handleImportPlaylist = async () => {
    if (!ytImportUrl.trim()) return;
    const match = ytImportUrl.match(/[?&]list=([^&]+)/);
    setIsImporting(true);
    try {
      let songs: Song[] = [], title = 'Playlist importada';
      if (!match) {
        const lines = ytImportUrl
          .split(/\r?\n|;/)
          .map(line => line.trim())
          .filter(line => line.length > 2);
        if (!lines.length) throw new Error('Cole uma playlist do YouTube ou uma lista Artista - Musica.');
        title = `Playlist importada ${new Date().toLocaleDateString()}`;
        for (let i = 0; i < lines.length; i++) {
          const query = lines[i].replace(/^https?:\/\/\S+/i, '').trim() || lines[i];
          const found = await searchYoutube(query).catch(() => []);
          if (found[0]) songs.push({ ...found[0], timestamp: Date.now() + i });
        }
      } else {
        const imported = await importYoutubePlaylist(ytImportUrl);
        songs = imported.songs.map((song, i) => ({ ...song, timestamp: Date.now() + i }));
        title = imported.title || title;
      }
      if (!songs.length) throw new Error('Playlist vazia ou inacessível');
      await savePlaylist({ id: match?.[1] || `import_${Date.now()}`, name: title, songs, isCustom: false, cover: songs[0]?.thumbnail });
      loadLibrary(); setYtImportUrl('');
      showToast(`${songs.length} músicas importadas!`, 'success');
    } catch (err: any) { showToast(err?.message || 'Erro ao importar', 'error'); }
    finally { setIsImporting(false); }
  };

  const currentIsDownloading = currentSong ? downloadingIds.has(currentSong.id) : false;
  const currentDlPct = currentSong ? dlPct[currentSong.id] : undefined;

  return (
    <div className="flex flex-col bg-brand-black text-white overflow-hidden relative"
      style={{ height: '100dvh', minHeight: '-webkit-fill-available' }}>

      {/* Silent audio — mantém WebView vivo com tela desligada */}
      <audio ref={silentRef} loop preload="auto" style={{ position:'absolute', width:0, height:0, opacity:0 }}
        src="data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZCBUb29scy9BdWRpb0dlbgAAAAAAAAAAAAAA//uQwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7AAAAA//uQxAAAAAAAAAAAAAAAAAAAAFhpbmcAAAAPAAAAAgAAAYYAu7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7AAAAA=" />

      {/* Áudio principal — nativo, toca com tela desligada, EQ e velocidade funcionam */}
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        style={{ position:'absolute', width:0, height:0, opacity:0 }}
        preload="auto"
        playsInline
        onTimeUpdate={() => audioRef.current && setProgress(audioRef.current.currentTime)}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration);
            audioRef.current.playbackRate = playbackSpeed;
            audioRef.current.volume = isMuted ? 0 : volume;
            if (!isNativeAndroid()) applyEQ(eqPreset);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={playNext}
        onError={() => {
          setAudioLoading(false);
          if (currentSong?.isLocal || currentSong?.isDownloaded) {
            showToast('Este arquivo não é suportado pelo player do Android.', 'error');
            return;
          }
          if (streamAttempt < 7) {
            showToast('Stream falhou. Tentando outro servidor...', 'info');
            setAudioLoading(true);
            setStreamAttempt(v => v + 1);
            return;
          }
          showToast('Nenhum servidor conseguiu tocar esta música. Pulando...', 'error');
          setStreamAttempt(0);
          playNext();
        }}
      />

      {/* Background */}
      {bgImage && <div className="absolute inset-0 z-0 pointer-events-none"
        style={{ backgroundImage:`url(${bgImage})`, backgroundSize:'cover', backgroundPosition:'center', opacity:bgOpacity/100, filter:`blur(${bgBlur}px)` }}/>}
      {bgVideo && <video autoPlay loop muted playsInline src={bgVideo}
        className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
        style={{ opacity:bgOpacity/100, filter:`blur(${bgBlur}px)` }}/>}
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-black/60 via-black/20 to-black/80"/>

      {/* Header */}
      <header className="relative z-10 flex items-center gap-2 bg-brand-dark/70 backdrop-blur-md border-b border-white/5 flex-shrink-0"
        style={{ padding:'10px 12px', paddingTop:'max(10px,env(safe-area-inset-top))' }}>
        <BrandIcon image={appIconImage} video={appIconVideo} className="w-9 h-9 flex-shrink-0"/>
        <span className="font-black tracking-tighter text-sm hidden xs:block flex-shrink-0" style={{ color:'var(--accent,#e11d48)' }}>G4T0XX</span>
        <form onSubmit={handleSearch} className="flex-1 relative min-w-0">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none"/>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Pesquisar músicas..."
            className="w-full bg-white/8 border border-white/10 rounded-full pl-9 pr-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-all"/>
        </form>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isOffline && <span className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-[9px] font-bold rounded-full"><WifiOff className="w-2.5 h-2.5"/>OFF</span>}
          <button onClick={() => setShowLocal(true)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10" title="Arquivos locais">
            <FolderOpen className="w-4 h-4 text-zinc-400"/>
          </button>
          <button onClick={() => setShowSettings(true)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10">
            <SettingsIcon className="w-4 h-4 text-zinc-400"/>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="relative z-10 flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar nav */}
        <nav className="flex-shrink-0 bg-brand-dark/80 border-r border-white/5 flex flex-col" style={{ width:52 }}>
          <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-0.5 items-center">
            {[
              { id:'home',      icon:<Music size={20}/>,      label:'Início' },
              { id:'search',    icon:<SearchIcon size={20}/>, label:'Buscar' },
              { id:'recents',   icon:<History size={20}/>,    label:'Recentes' },
              { id:'favorites', icon:<Star size={20}/>,       label:'Favoritos' },
              { id:'offline',   icon:<Download size={20}/>,   label:'Offline' },
              { id:'cinema',    icon:<Video size={20}/>,      label:'Cinema' },
              { id:'web',       icon:<Download size={20}/>,   label:'Baixar' },
              { id:'playlists', icon:<ListMusic size={20}/>,  label:'Playlists' },
            ].map(item => (
              <button key={item.id} onClick={() => item.id === 'cinema' ? openCinemaTab() : setActiveTab(item.id)} title={item.label}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab===item.id?'text-white':'text-zinc-500 hover:bg-brand-gray hover:text-white'}`}
                style={activeTab===item.id?{backgroundColor:'var(--accent,#e11d48)'}:{}}>
                {item.icon}
              </button>
            ))}
          </div>
          <div className="pb-2 flex flex-col items-center border-t border-white/5 pt-2">
            <button onClick={() => setActiveTab('support')} title="Apoiar"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab==='support'?'text-white':'text-zinc-500 hover:text-white'}`}
              style={activeTab==='support'?{backgroundColor:'var(--accent,#e11d48)'}:{}}>
              <Coffee size={20}/>
            </button>
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0" style={{ WebkitOverflowScrolling:'touch' }}>
          <div className="p-3 pb-2">
            <AnimatePresence mode="wait">

              {activeTab==='home' && (
                <motion.div key="home" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-5">
                  <div><h2 className="text-xl font-bold">Bem-vindo! 👋</h2><p className="text-zinc-500 text-xs mt-0.5">O que vamos ouvir hoje?</p></div>
                  <div className="grid grid-cols-4 gap-2">
                    <QuickCard title="Favoritos" count={favorites.length} color="var(--accent,#e11d48)" icon={<Star size={15}/>} onClick={() => setActiveTab('favorites')}/>
                    <QuickCard title="Recentes"  count={recents.length}   color="#3b82f6"             icon={<History size={15}/>} onClick={() => setActiveTab('recents')}/>
                    <QuickCard title="Offline"   count={offlineSongs.length} color="#22c55e"          icon={<Download size={15}/>} onClick={() => setActiveTab('offline')}/>
                    <QuickCard title="Cinema"    count={currentSong && !currentSong.isLocal ? 1 : 0} color="#a855f7" icon={<Video size={15}/>} onClick={openCinemaTab}/>
                  </div>
                  {recents.length > 0 ? (
                    <section>
                      <h2 className="text-sm font-bold mb-3 text-zinc-300">Tocadas recentemente</h2>
                      <div className="grid gap-3" style={{ gridTemplateColumns:'repeat(auto-fill,minmax(95px,1fr))' }}>
                        {recents.slice(0,12).map(song => (
                          <SongCard key={song.id} song={song} isFav={favoritedIds.has(song.id)}
                            onClick={() => handlePlaySong(song, recents)} onFav={e => handleToggleFavorite(song, e)}/>
                        ))}
                      </div>
                    </section>
                  ) : (
                    <div className="flex flex-col items-center py-14 text-zinc-600">
                      <Music size={48} className="mb-3 opacity-20"/><p className="text-sm">Pesquise uma música para começar</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab==='search' && (
                <motion.div key="search" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-zinc-400">{searchResults.length>0?`${searchResults.length} resultados`:'Buscar'}</h2>
                    {searchStatus && <span className="flex items-center gap-1 text-xs text-zinc-500"><RefreshCw size={10} className="animate-spin"/> {searchStatus}</span>}
                  </div>
                  {isSearching ? (
                    <div className="flex flex-col items-center py-14 gap-3">
                      <div className="w-9 h-9 border-4 border-t-transparent rounded-full animate-spin" style={{borderColor:`var(--accent,#e11d48) transparent transparent transparent`}}/>
                      <p className="text-xs text-zinc-500">Buscando...</p>
                    </div>
                  ) : searchResults.length===0 ? (
                    <div className="flex flex-col items-center py-14 text-zinc-600 gap-2">
                      <SearchIcon size={44} className="opacity-20"/><p className="text-sm">Use a barra de pesquisa acima</p>
                      {searchError && (
                        <div className="mt-2 w-full bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-center">
                          <p className="text-xs text-red-400 mb-2">{searchError}</p>
                          <button onClick={() => handleSearch()} className="px-4 py-2 bg-red-600 rounded-lg text-xs font-bold text-white flex items-center gap-2 mx-auto">
                            <RefreshCw size={12}/> Tentar novamente
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">{searchResults.map(song => (
                      <SongRow key={song.id} song={song} isFav={favoritedIds.has(song.id)}
                        isDownloading={downloadingIds.has(song.id)} dlPct={dlPct[song.id]}
                        isActive={currentSong?.id===song.id} isLoading={audioLoading&&currentSong?.id===song.id}
                        onClick={() => handlePlaySong(song, searchResults)}
                        onFav={e => handleToggleFavorite(song, e)} onDownload={e => handleDownload(song, e)}/>
                    ))}</div>
                  )}
                </motion.div>
              )}

              {activeTab==='favorites' && (
                <motion.div key="fav" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-3">
                  <h2 className="text-base font-bold">Favoritos ♥</h2>
                  {favorites.length===0 ? <EmptyState icon={<Star size={44} className="opacity-20"/>} msg="Nenhuma música favoritada"/> : (
                    <div className="space-y-1">{favorites.map(song => (
                      <SongRow key={song.id} song={song} isFav
                        isDownloading={downloadingIds.has(song.id)} dlPct={dlPct[song.id]}
                        isActive={currentSong?.id===song.id} isLoading={audioLoading&&currentSong?.id===song.id}
                        onClick={() => handlePlaySong(song, favorites)}
                        onFav={e => handleRemoveFavorite(song, e)} onDownload={e => handleDownload(song, e)}
                        favoriteAction="delete"/>
                    ))}</div>
                  )}
                </motion.div>
              )}

              {activeTab==='recents' && (
                <motion.div key="rec" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold">Histórico</h2>
                    {recents.length>0 && <button onClick={async () => { await clearRecents(); loadLibrary(); showToast('Limpo','info'); }}
                      className="text-xs text-zinc-500 hover:text-red-400 flex items-center gap-1"><Trash2 size={11}/> Limpar</button>}
                  </div>
                  {recents.length===0 ? <EmptyState icon={<History size={44} className="opacity-20"/>} msg="Histórico vazio"/> : (
                    <div className="space-y-1">{recents.map(song => (
                      <SongRow key={song.id} song={song} isFav={favoritedIds.has(song.id)}
                        isDownloading={downloadingIds.has(song.id)} dlPct={dlPct[song.id]}
                        isActive={currentSong?.id===song.id} isLoading={audioLoading&&currentSong?.id===song.id}
                        onClick={() => handlePlaySong(song, recents)}
                        onFav={e => handleToggleFavorite(song, e)} onDownload={e => handleDownload(song, e)}/>
                    ))}</div>
                  )}
                </motion.div>
              )}

              {activeTab==='offline' && (
                <motion.div key="off" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-3">
                  <h2 className="text-base font-bold">Músicas Offline</h2>
                  {offlineSongs.length===0
                    ? <EmptyState icon={<Download size={44} className="opacity-20"/>} msg="Pressione ↓ em qualquer música para salvar offline"/>
                    : <div className="space-y-1">{offlineSongs.map(song => (
                        <SongRow key={song.id} song={song} isFav={favoritedIds.has(song.id)} isDownloading={false}
                          isActive={currentSong?.id===song.id} isLoading={false}
                          onClick={() => handlePlaySong(song, offlineSongs)} onFav={e => handleToggleFavorite(song, e)}/>
                      ))}</div>
                  }
                </motion.div>
              )}

              {activeTab==='cinema' && (
                <motion.div key="cinema" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-3">
                  <VideoTab song={currentSong} startAt={progress} playlist={queue} autoplay
                    onOpenPlayer={() => setShowVideo(true)} onSelectSong={handleCinemaSong} />
                </motion.div>
              )}

              {activeTab==='web' && (
                <NativeDownloadTab currentSong={currentSong} downloaderSong={downloaderSong}
                  onDownload={handleDownload} downloadingIds={downloadingIds} dlPct={dlPct}
                  offlineIds={new Set(offlineSongs.map(song => song.id))} />
              )}

              {activeTab==='playlists' && (
                <motion.div key="pl" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-4">
                  <h2 className="text-base font-bold">Playlists</h2>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Importar do YouTube</p>
                    <div className="flex gap-2">
                      <input value={ytImportUrl} onChange={e => setYtImportUrl(e.target.value)} placeholder="YouTube playlist ou lista Artista - Musica"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs placeholder-zinc-600 focus:outline-none min-w-0"/>
                      <button onClick={handleImportPlaylist} disabled={isImporting}
                        className="px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50 flex-shrink-0 text-white"
                        style={{ backgroundColor:'var(--accent,#e11d48)' }}>{isImporting ? '...' : 'Import'}</button>
                    </div>
                  </div>
                  {showNewPl ? (
                    <div className="flex gap-2">
                      <input value={newPlName} onChange={e => setNewPlName(e.target.value)} placeholder="Nome da playlist" autoFocus
                        onKeyDown={async e => { if (e.key==='Enter'&&newPlName.trim()) { await savePlaylist({id:Date.now().toString(),name:newPlName.trim(),songs:[],isCustom:true});setNewPlName('');setShowNewPl(false);loadLibrary();showToast('Criada!','success'); }}}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none min-w-0"/>
                      <button onClick={async () => { if (!newPlName.trim()) return; await savePlaylist({id:Date.now().toString(),name:newPlName.trim(),songs:[],isCustom:true});setNewPlName('');setShowNewPl(false);loadLibrary();showToast('Criada!','success'); }}
                        className="px-3 py-2 rounded-lg text-xs font-bold flex-shrink-0 text-white" style={{ backgroundColor:'var(--accent,#e11d48)' }}>Criar</button>
                      <button onClick={() => setShowNewPl(false)} className="px-3 py-2 bg-white/5 rounded-lg text-xs flex-shrink-0"><X size={13}/></button>
                    </div>
                  ) : (
                    <button onClick={() => setShowNewPl(true)} className="flex items-center gap-2 text-sm font-bold" style={{ color:'var(--accent,#e11d48)' }}><Plus size={15}/> Nova playlist</button>
                  )}
                  <div className="space-y-2">
                    {playlists.map(pl => (
                      <div key={pl.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/8"
                        onClick={() => setSelectedPlaylist(pl)}>
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-brand-gray">
                          {pl.cover ? <img src={pl.cover} className="w-full h-full object-cover"/> : <ListMusic className="m-auto mt-2 text-zinc-600" size={17}/>}
                        </div>
                        <div className="flex-1 min-w-0"><p className="font-bold text-sm truncate">{pl.name}</p><p className="text-xs text-zinc-500">{pl.songs.length} músicas</p></div>
                        <button onClick={async e => { e.stopPropagation(); await deletePlaylist(pl.id); loadLibrary(); }} className="text-zinc-600 hover:text-red-400 p-1"><Trash2 size={13}/></button>
                      </div>
                    ))}
                    {playlists.length===0 && <EmptyState icon={<ListMusic size={44} className="opacity-20"/>} msg="Nenhuma playlist"/>}
                  </div>
                </motion.div>
              )}

              {activeTab==='support' && (
                <motion.div key="sup" initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
                  <div className="max-w-sm mx-auto space-y-4">
                    <div className="text-center pt-2">
                      <BrandIcon image={appIconImage} video={appIconVideo} className="w-16 h-16 mx-auto mb-3"/>
                      <h2 className="text-xl font-black">Apoie o <span style={{color:'var(--accent,#e11d48)'}}>Criador</span></h2>
                      <p className="text-zinc-400 text-sm mt-1">Feito com ❤️ por <strong className="text-white">G4T0XX</strong>.</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-500/20 to-red-500/5 rounded-2xl p-4 border border-red-500/30">
                      <div className="bg-black/40 rounded-xl p-2.5 flex items-center justify-between gap-2">
                        <span className="text-xs font-mono text-zinc-300 truncate">gatoxxplayers@gmail.com</span>
                        <button onClick={() => { navigator.clipboard.writeText('gatoxxplayers@gmail.com').then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
                          className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold ${copied?'bg-green-500 text-white':'bg-white/10 text-white'}`}>
                          {copied ? <><Check size={11}/> Copiado!</> : <><Copy size={11}/> Copiar PIX</>}
                        </button>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                      <div className="flex items-center gap-2 mb-2"><Github size={17} className="text-zinc-300"/><span className="font-bold text-sm">GitHub</span></div>
                      <a href="https://github.com/GABRIELMSORENSEN" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-bold hover:underline break-all" style={{color:'var(--accent,#e11d48)'}}>
                        github.com/GABRIELMSORENSEN <ExternalLink size={10}/>
                      </a>
                    </div>
                    <p className="text-center text-zinc-700 text-xs">G4T0XX Music Player v1.0</p>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* ── Player Bar ── */}
      <footer className="relative z-20 bg-brand-dark/97 backdrop-blur-xl border-t border-white/5 flex-shrink-0"
        style={{ paddingBottom:'env(safe-area-inset-bottom,0px)' }}>
        <div className="flex items-center gap-2 px-3 py-2.5">
          {/* Song info */}
          <div className="flex items-center gap-2 flex-shrink-0 min-w-0" style={{ width:'clamp(100px,25%,180px)' }}>
            {currentSong ? (
              <>
                <div className="relative cursor-pointer flex-shrink-0" onClick={() => setShowExpanded(true)}>
                  <img src={currentSong.thumbnail} alt="" className="w-11 h-11 rounded-lg object-cover"
                    style={{ boxShadow:isPlaying?`0 0 12px var(--accent,#e11d48)55`:undefined }}/>
                  {audioLoading && <div className="absolute inset-0 rounded-lg bg-black/60 flex items-center justify-center"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/></div>}
                  {isPlaying && !audioLoading && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center" style={{backgroundColor:'var(--accent,#e11d48)'}}><div className="w-1 h-1 bg-white rounded-full animate-pulse"/></div>}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden cursor-pointer" onClick={() => setShowExpanded(true)}>
                  <p className="font-bold truncate text-xs leading-tight">{currentSong.title}</p>
                  <p className="text-[10px] text-zinc-500 truncate">{currentSong.artist}</p>
                  {playbackSpeed !== 1.0 && <span className="text-[9px] font-bold" style={{color:'var(--accent,#e11d48)'}}>{playbackSpeed}x</span>}
                </div>
                <button onClick={e => handleToggleFavorite(currentSong, e)}
                  className={`flex-shrink-0 p-1 ${favoritedIds.has(currentSong.id)?'':'text-zinc-600 hover:text-red-400'}`}
                  style={favoritedIds.has(currentSong.id)?{color:'var(--accent,#e11d48)'}:{}}>
                  <Heart className={`w-4 h-4 ${favoritedIds.has(currentSong.id)?'fill-current':''}`}/>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-11 h-11 bg-brand-gray rounded-lg flex items-center justify-center flex-shrink-0"><Music className="text-zinc-600" size={16}/></div>
                <span className="text-zinc-600 text-xs">Nenhuma</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsShuffle(!isShuffle)} style={isShuffle?{color:'var(--accent,#e11d48)'}:{}} className={isShuffle?'':'text-zinc-600 hover:text-white'}><Shuffle className="w-3.5 h-3.5"/></button>
              <button onClick={playPrevious} className="text-zinc-300 hover:text-white"><SkipBack className="w-5 h-5 fill-current"/></button>
              <button onClick={togglePlayPause}
                className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg flex-shrink-0">
                {audioLoading
                  ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"/>
                  : isPlaying ? <Pause className="w-4 h-4 fill-current"/> : <Play className="w-4 h-4 fill-current ml-0.5"/>
                }
              </button>
              <button onClick={playNext} className="text-zinc-300 hover:text-white"><SkipForward className="w-5 h-5 fill-current"/></button>
              <button onClick={() => setRepeatMode(repeatMode==='none'?'all':repeatMode==='all'?'one':'none')}
                style={repeatMode!=='none'?{color:'var(--accent,#e11d48)'}:{}} className={repeatMode!=='none'?'':'text-zinc-600 hover:text-white'}>
                {repeatMode==='one' ? <Repeat1 className="w-3.5 h-3.5"/> : <Repeat className="w-3.5 h-3.5"/>}
              </button>
            </div>
            {/* Mini seek bar no player bar — também com drag */}
            <div className="flex items-center gap-1.5 w-full max-w-xs">
              <span className="text-[9px] text-zinc-600 w-6 text-right flex-shrink-0">{fmtSecs(progress)}</span>
              <div className="flex-1 relative h-3 flex items-center cursor-pointer"
                onClick={e => { const r = e.currentTarget.getBoundingClientRect(); handleSeek(((e.clientX-r.left)/r.width)*(duration||0)); }}>
                <div className="absolute left-0 right-0 h-1 bg-zinc-800 rounded-full">
                  <div className="h-full rounded-full" style={{width:`${duration?Math.min(100,(progress/duration)*100):0}%`,backgroundColor:'var(--accent,#e11d48)',transition:'width 0.4s linear'}}/>
                </div>
              </div>
              <span className="text-[9px] text-zinc-600 w-6 flex-shrink-0">{fmtSecs(duration)}</span>
            </div>
          </div>

          {/* Right: mute + speed + float */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setIsMuted(!isMuted)} className="text-zinc-500 hover:text-white">
              {isMuted||volume===0 ? <VolumeX className="w-4 h-4"/> : <Volume2 className="w-4 h-4"/>}
            </button>
            <button onClick={() => setShowSpeedPanel(true)}
              className={`text-xs font-black px-1 py-0.5 rounded ${playbackSpeed!==1.0?'':'text-zinc-600 hover:text-white'}`}
              style={playbackSpeed!==1.0?{color:'var(--accent,#e11d48)'}:{}}>
              {playbackSpeed!==1.0 ? `${playbackSpeed}x` : <Gauge className="w-4 h-4"/>}
            </button>
            <button onClick={toggleFloatingWindow} className={isFloating ? 'text-white' : 'text-zinc-600 hover:text-white'}>
              <Maximize2 className="w-4 h-4"/>
            </button>
          </div>
        </div>
      </footer>

      {/* ── Expanded Player ── */}
      <AnimatePresence>
        {showExpanded && currentSong && (
          <ExpandedPlayer
            isOpen={showExpanded} song={currentSong} isPlaying={isPlaying}
            progress={progress} duration={duration}
            isFav={favoritedIds.has(currentSong.id)} isLoading={audioLoading}
            onClose={() => setShowExpanded(false)} onTogglePlay={togglePlayPause}
            onSeek={handleSeek} onNext={playNext} onPrev={playPrevious}
            onFav={() => handleToggleFavorite(currentSong)}
            onShowLyrics={() => { setShowExpanded(false); setShowLyrics(true); }}
            onShowVideo={() => { setShowExpanded(false); setShowVideo(true); }}
            onDownload={() => handleDownload(currentSong)}
            isDownloading={currentIsDownloading} dlPct={currentDlPct}
            isDownloaded={!!currentSong.isDownloaded}/>
        )}
      </AnimatePresence>

      {/* ── Video Player (IFrame YT — só para ver o clipe) ── */}
      <AnimatePresence>
        {showVideo && (
          <VideoPlayer song={currentSong} isOpen={showVideo} isPlaying={isPlaying}
            audioMode={audioMode}
            playlist={queue}
            onClose={() => setShowVideo(false)} onTogglePlay={togglePlayPause}
            onNext={playNext} onPrev={playPrevious}
            onToggleAudioMode={toggleVideoAudioMode}
            onEnterPip={handleEnterPip}/>
        )}
      </AnimatePresence>

      {/* ── Lyrics ── */}
      <LyricsPanel song={currentSong} isOpen={showLyrics} progress={progress} onClose={() => setShowLyrics(false)}/>

      {/* ── Playlist View ── */}
      <PlaylistView playlist={selectedPlaylist} isOpen={!!selectedPlaylist} onClose={() => setSelectedPlaylist(null)}
        onPlaySong={handlePlaySong} onDownload={handleDownload} onDownloadPlaylist={handleDownloadPlaylist} onFav={song => handleToggleFavorite(song)}
        currentSongId={currentSong?.id} favIds={favoritedIds} downloadingIds={downloadingIds} dlPct={dlPct}
        isDownloadingPlaylist={playlistDownloading} playlistDone={playlistDone} playlistTotal={playlistTotal}/>

      {/* ── Local Library ── */}
      <LocalLibrary isOpen={showLocal} onClose={() => setShowLocal(false)}
        onPlay={handlePlaySong} currentSongId={currentSong?.id}/>

      {/* ── Floating mini-player ── */}
      <AnimatePresence>
        {isFloating && currentSong && (
          <motion.div drag dragMomentum={false}
            dragConstraints={{ left:-300, right:0, top:-500, bottom:0 }}
            dragElastic={0.1}
            initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.8}}
            className="fixed bottom-24 right-3 z-[400] cursor-move select-none touch-none"
            style={{ width:'min(180px,48vw)' }}>
            <div className="bg-brand-dark rounded-2xl shadow-2xl overflow-hidden relative border"
              style={{ borderColor:`var(--accent,#e11d48)44` }}>
              <button onClick={closeFloatingWindow} className="absolute top-2 right-2 z-10 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-zinc-400"><Minimize2 size={11}/></button>
              <img src={currentSong.thumbnail} className="w-full object-cover" style={{aspectRatio:'16/9'}}/>
              <div className="p-2.5 bg-gradient-to-t from-black/90 to-transparent -mt-7 relative">
                <p className="text-xs font-bold truncate">{currentSong.title}</p>
                <p className="text-[10px] text-zinc-400 truncate mb-1.5">{currentSong.artist}</p>
                <div className="flex items-center justify-between">
                  <button onClick={playPrevious}><SkipBack size={14} className="fill-current text-zinc-400"/></button>
                  <button onClick={togglePlayPause} className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center">
                    {audioLoading ? <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"/> : isPlaying ? <Pause size={12} className="fill-current"/> : <Play size={12} className="fill-current ml-0.5"/>}
                  </button>
                  <button onClick={playNext}><SkipForward size={14} className="fill-current text-zinc-400"/></button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Settings ── */}
      <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)}
        appIconImage={appIconImage} appIconVideo={appIconVideo}
        onAppIconPick={() => appIconFileRef.current?.click()}
        onAppIconRemove={async () => { if (appIconObjectUrl) URL.revokeObjectURL(appIconObjectUrl); setAppIconObjectUrl(''); setAppIconImage(''); setAppIconVideo(''); await saveSetting('app_icon_media', null); showToast('Icone removido', 'info'); }}
        appIconFileRef={appIconFileRef} onAppIconFileChange={handleAppIconFileChange}
        bgImage={bgImage} bgVideo={bgVideo} bgOpacity={bgOpacity} bgBlur={bgBlur}
        onBgOpacityChange={v => { setBgOpacity(v); saveSetting('bg_opacity', v); }}
        onBgBlurChange={v => { setBgBlur(v); saveSetting('bg_blur', v); }}
        onBgPick={() => bgFileRef.current?.click()}
        onBgRemove={async () => { if (bgObjectUrl) URL.revokeObjectURL(bgObjectUrl); setBgObjectUrl(''); setBgImage(''); setBgVideo(''); await saveSetting('custom_theme', null); showToast('Fundo removido', 'info'); }}
        bgFileRef={bgFileRef} onBgFileChange={handleBgFileChange}
        accentColor={accentColor} customColor={customColor}
        onAccentChange={setAccentColor} onCustomColorChange={v => { setCustomColor(v); if (settingsLoaded) saveSetting('custom_color', v); }}
        uiSize={uiSize} onUISizeChange={setUISize}
        eqPreset={eqPreset} onEQChange={setEqPreset}
        bitDepth={bitDepth} onBitDepthChange={setBitDepth}
        notifGranted
        onRequestPerms={() => { setShowSettings(false); setShowPermModal(true); }}/>

      <SpeedPanel isOpen={showSpeedPanel} speed={playbackSpeed} onClose={() => setShowSpeedPanel(false)} onChange={setPlaybackSpeed}/>

      <PermissionsModal isOpen={showPermModal}
        onRequest={async () => { await requestAll(); localStorage.setItem('perms_asked','1'); setShowPermModal(false); showToast('Permissões ativadas!','success'); }}
        onSkip={async () => { await markPermissionsAsked(); setShowPermModal(false); }}/>

      <AnimatePresence>{toast && <Toast msg={toast.msg} type={toast.type}/>}</AnimatePresence>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function QuickCard({ title, count, color, icon, onClick }: { title:string; count:number; color:string; icon:React.ReactNode; onClick:()=>void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 p-3 bg-brand-gray/50 rounded-xl hover:bg-brand-gray active:scale-95 transition-all text-center">
      <div className="p-2 bg-brand-black rounded-lg" style={{ color }}>{icon}</div>
      <span className="font-black text-sm leading-none">{count}</span>
      <span className="text-[9px] text-zinc-500 uppercase tracking-wider">{title}</span>
    </button>
  );
}

function BrandIcon({ image, video, className }: { image: string; video: string; className?: string }) {
  if (video) {
    return <video src={video} autoPlay loop muted playsInline className={`${className || ''} rounded-xl object-cover`} />;
  }
  if (image) {
    return <img src={image} alt="" className={`${className || ''} rounded-xl object-cover`} />;
  }
  return <GatoIcon className={className} />;
}

const NativeDownloadTab = memo(function NativeDownloadTab({
  currentSong, downloaderSong, onDownload, downloadingIds, dlPct, offlineIds,
}: {
  currentSong: Song | null;
  downloaderSong: Song | null;
  onDownload: (song: Song) => void;
  downloadingIds: Set<string>;
  dlPct: Record<string, number>;
  offlineIds: Set<string>;
}) {
  const targetSong = downloaderSong || currentSong;
  const [query, setQuery] = useState(targetSong ? nativeDownloadQuery(targetSong) : '');
  const [results, setResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (targetSong) setQuery(nativeDownloadQuery(targetSong));
  }, [targetSong?.id]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const term = query.trim();
    if (!term) return;
    setIsSearching(true);
    setError('');
    try {
      const songs = await searchYoutube(term);
      setResults(songs);
      if (!songs.length) setError('Nenhuma musica encontrada.');
    } catch (err: any) {
      setError(err?.message || 'Busca indisponivel agora.');
    } finally {
      setIsSearching(false);
    }
  };

  const renderDownloadButton = (song: Song) => {
    const saved = offlineIds.has(song.id) || song.isDownloaded || song.isLocal;
    const downloading = downloadingIds.has(song.id);
    return (
      <button onClick={() => !saved && !downloading && onDownload(song)}
        disabled={saved || downloading}
        className={`flex h-9 min-w-24 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold ${
          saved ? 'bg-green-500/15 text-green-400' : 'text-white disabled:opacity-60'
        }`}
        style={saved ? {} : {backgroundColor:'var(--accent,#e11d48)'}}>
        {downloading ? <RefreshCw size={13} className="animate-spin"/> : saved ? <Check size={13}/> : <Download size={13}/>}
        {downloading ? `${dlPct[song.id] || 1}%` : saved ? 'Offline' : 'Baixar'}
      </button>
    );
  };

  return (
    <motion.div key="web" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"/>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar para baixar"
              className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-9 pr-3 text-sm outline-none"/>
          </div>
          <button className="flex h-11 w-11 items-center justify-center rounded-xl text-white" style={{backgroundColor:'var(--accent,#e11d48)'}}>
            {isSearching ? <RefreshCw size={16} className="animate-spin"/> : <SearchIcon size={16}/>}
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      {targetSong && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <img src={targetSong.thumbnail} className="h-12 w-12 rounded-xl object-cover"/>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{targetSong.title}</p>
              <p className="truncate text-xs text-zinc-500">{targetSong.artist}</p>
              {downloadingIds.has(targetSong.id) && (
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full transition-all" style={{width:`${dlPct[targetSong.id] || 1}%`,backgroundColor:'var(--accent,#e11d48)'}}/>
                </div>
              )}
            </div>
            {renderDownloadButton(targetSong)}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {results.map(song => {
          const downloading = downloadingIds.has(song.id);
          return (
            <div key={song.id} className="rounded-2xl border border-white/10 bg-white/5 p-2">
              <div className="flex items-center gap-3">
                <img src={song.thumbnail} className="h-12 w-12 flex-shrink-0 rounded-xl object-cover"/>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{song.title}</p>
                  <p className="truncate text-xs text-zinc-500">{song.artist}</p>
                  {downloading && (
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-800">
                      <div className="h-full rounded-full transition-all" style={{width:`${dlPct[song.id] || 1}%`,backgroundColor:'var(--accent,#e11d48)'}}/>
                    </div>
                  )}
                </div>
                {renderDownloadButton(song)}
              </div>
            </div>
          );
        })}
      </div>

      {!targetSong && !results.length && !error && (
        <EmptyState icon={<Download size={44} className="opacity-20"/>} msg="Pesquise uma musica para salvar offline"/>
      )}
    </motion.div>
  );
});

function SongCard({ song, isFav, onClick, onFav }: { song:Song; isFav?:boolean; onClick:()=>void; onFav:(e:React.MouseEvent)=>void }) {
  return (
    <div className="group cursor-pointer" onClick={onClick}>
      <div className="relative aspect-square mb-1.5 overflow-hidden rounded-xl bg-zinc-900">
        <img src={song.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{backgroundColor:'var(--accent,#e11d48)'}}><Play className="w-4 h-4 fill-current ml-0.5"/></div>
        </div>
        <button onClick={onFav} className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 ${isFav?'':'text-white'}`}
          style={isFav?{color:'var(--accent,#e11d48)'}:{}}>
          <Heart size={10} className={isFav?'fill-current':''}/>
        </button>
      </div>
      <p className="font-bold text-[11px] truncate leading-tight">{song.title}</p>
      <p className="text-[9px] text-zinc-500 truncate">{song.artist}</p>
    </div>
  );
}
function SongRow({ song, isFav, isDownloading, dlPct, onClick, onFav, onDownload, isActive, isLoading, favoriteAction = 'heart' }: {
  song:Song; isFav?:boolean; isDownloading?:boolean; dlPct?:number;
  onClick:()=>void; onFav:(e:React.MouseEvent)=>void; onDownload?:(e:React.MouseEvent)=>void;
  isActive?:boolean; isLoading?:boolean; favoriteAction?: 'heart' | 'delete';
}) {
  return (
    <div onClick={onClick} className="flex items-center gap-3 p-2 rounded-xl transition-colors group cursor-pointer relative overflow-hidden hover:bg-brand-gray/50 active:bg-brand-gray/70"
      style={isActive?{backgroundColor:`var(--accent,#e11d48)18`}:{}}>
      {isDownloading&&dlPct!==undefined&&<div className="absolute inset-0 pointer-events-none" style={{background:`linear-gradient(to right,var(--accent,#e11d48)0a ${dlPct}%,transparent ${dlPct}%)`}}/>}
      <div className="relative w-11 h-11 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-900">
        <img src={song.thumbnail} className="w-full h-full object-cover"/>
        {isActive&&!isLoading&&<div className="absolute inset-0 flex items-center justify-center" style={{backgroundColor:`var(--accent,#e11d48)55`}}><div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"/></div>}
        {isLoading&&isActive&&<div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/></div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-xs truncate" style={isActive?{color:'var(--accent,#e11d48)'}:{}}>{song.title}</p>
          {song.isDownloaded&&<span className="px-1 py-0.5 bg-green-500/20 text-green-500 text-[8px] font-black rounded uppercase flex-shrink-0">OFF</span>}
          {song.isLocal&&<span className="px-1 py-0.5 bg-blue-500/20 text-blue-400 text-[8px] font-black rounded uppercase flex-shrink-0">LOCAL</span>}
        </div>
        <p className="text-[10px] text-zinc-400 truncate">{song.artist}</p>
        {isDownloading&&dlPct!==undefined&&(
          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex-1 h-0.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${dlPct}%`,backgroundColor:'var(--accent,#e11d48)',transition:'width 0.3s'}}/></div>
            <span className="text-[8px] text-zinc-500 flex-shrink-0">{dlPct}%</span>
          </div>
        )}
      </div>
      <span className="text-[10px] text-zinc-600 hidden sm:block flex-shrink-0">{song.duration}</span>
      <div className={`flex items-center transition-opacity flex-shrink-0 ${favoriteAction === 'delete' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <button onClick={onFav} className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 ${isFav?'':'text-zinc-600'}`}
          style={isFav && favoriteAction !== 'delete'?{color:'var(--accent,#e11d48)'}:{}}>
          {favoriteAction === 'delete'
            ? <Trash2 size={13} className="text-red-400"/>
            : <Heart size={13} className={isFav?'fill-current':''}/>
          }
        </button>
        {onDownload&&!song.isDownloaded&&!song.isLocal&&(
          <button onClick={onDownload} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-600 hover:text-white disabled:opacity-40" disabled={isDownloading}>
            {isDownloading?<div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"/>:<Download size={13}/>}
          </button>
        )}
      </div>
    </div>
  );
}
function EmptyState({ icon, msg }: { icon:React.ReactNode; msg:string }) {
  return <div className="flex flex-col items-center justify-center py-14 text-zinc-600 gap-3">{icon}<p className="text-sm text-center max-w-xs">{msg}</p></div>;
}
