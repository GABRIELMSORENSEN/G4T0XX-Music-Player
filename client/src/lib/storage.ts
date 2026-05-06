import { openDB, IDBPDatabase } from 'idb';

export interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  url: string;
  timestamp: number;
  isDownloaded?: boolean;
  isLocal?: boolean;        // arquivo local do dispositivo
  localPath?: string;       // caminho no sistema de arquivos
  fileName?: string;
  mimeType?: string;
  blob?: Blob;
}

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
  isCustom: boolean;
  cover?: string;
}

const DB_NAME = 'g4toxx_music_db';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('songs'))     db.createObjectStore('songs',     { keyPath: 'id' });
        if (!db.objectStoreNames.contains('playlists')) db.createObjectStore('playlists', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('favorites')) db.createObjectStore('favorites', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('recents'))   db.createObjectStore('recents',   { keyPath: 'id' });
        if (!db.objectStoreNames.contains('settings'))  db.createObjectStore('settings');
        if (!db.objectStoreNames.contains('local'))     db.createObjectStore('local',     { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
};

export const saveSong       = async (song: Song)       => { const db = await initDB(); await db.put('songs', song); };
export const getSongs       = async (): Promise<Song[]> => { const db = await initDB(); return db.getAll('songs'); };
export const deleteSong     = async (id: string)        => { const db = await initDB(); await db.delete('songs', id); };
export const savePlaylist   = async (p: Playlist)       => { const db = await initDB(); await db.put('playlists', p); };
export const getPlaylists   = async (): Promise<Playlist[]> => { const db = await initDB(); return db.getAll('playlists'); };
export const deletePlaylist = async (id: string)        => { const db = await initDB(); await db.delete('playlists', id); };

export const saveLocalSong  = async (song: Song) => { const db = await initDB(); await db.put('local', song); };
export const getLocalSongs  = async (): Promise<Song[]> => { const db = await initDB(); return db.getAll('local'); };
export const deleteLocalSong = async (id: string) => { const db = await initDB(); await db.delete('local', id); };

export const addToFavorites = async (song: Song): Promise<boolean> => {
  const db = await initDB();
  const existing = await db.get('favorites', song.id);
  if (existing) { await db.delete('favorites', song.id); return false; }
  await db.put('favorites', { id: song.id, title: song.title, artist: song.artist, thumbnail: song.thumbnail, duration: song.duration, url: song.url, timestamp: Date.now(), isDownloaded: song.isDownloaded || false, isLocal: song.isLocal || false });
  return true;
};

export const getFavorites = async (): Promise<Song[]> => {
  const db = await initDB();
  return (await db.getAll('favorites')).sort((a, b) => b.timestamp - a.timestamp);
};

export const addToRecents = async (song: Song) => {
  try {
    const db = await initDB();
    const all = await db.getAll('recents');
    if (all.length >= 50) {
      const oldest = all.sort((a, b) => a.timestamp - b.timestamp)[0];
      await db.delete('recents', oldest.id);
    }
    await db.put('recents', { id: song.id, title: song.title, artist: song.artist, thumbnail: song.thumbnail, duration: song.duration, url: song.url, timestamp: Date.now(), isDownloaded: song.isDownloaded || false, isLocal: song.isLocal || false });
  } catch {}
};

export const getRecents   = async (): Promise<Song[]> => { const db = await initDB(); return (await db.getAll('recents')).sort((a, b) => b.timestamp - a.timestamp); };
export const clearRecents = async () => { const db = await initDB(); await db.clear('recents'); };
export const saveSetting  = async (key: string, value: any) => { const db = await initDB(); await db.put('settings', value, key); };
export const getSetting   = async (key: string): Promise<any> => { const db = await initDB(); return db.get('settings', key); };
