/**
 * lyrics.ts v5 — LRCLIB (primary, synced) → Lyrics.ovh → Happi fallback.
 * LRCLIB é open-source, gratuito e tem letras sincronizadas (.lrc).
 */

export interface LyricLine {
  time: number;  // segundos; -1 = não sincronizado
  text: string;
}

export interface LyricsResult {
  lyrics: string;
  source: string;
  synced: boolean;
  lines: LyricLine[];
}

function clean(title: string, artist: string) {
  const t = title
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/official|video|lyrics|audio|hq|hd|ft\.|feat\./gi, '')
    .trim();
  const a = artist.replace(/\s*-\s*Topic$|\s*VEVO$/i, '').trim();
  return { t, a };
}

function parseLRC(lrc: string): LyricLine[] {
  return lrc.split('\n').flatMap(line => {
    const m = line.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
    if (!m) return [];
    const t = parseInt(m[1]) * 60 + parseFloat(m[2]);
    const text = m[3].trim();
    return text ? [{ time: t, text }] : [];
  });
}

function plainLines(text: string): LyricLine[] {
  return text.split('\n').map(t => ({ time: -1, text: t }));
}

// 1) LRCLIB — melhor opção: open-source, synced, sem API key
async function fromLRCLib(title: string, artist: string): Promise<LyricsResult> {
  const { t, a } = clean(title, artist);
  // Tenta search por artista + título
  const url = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(a)}&track_name=${encodeURIComponent(t)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error('lrclib not ok');
  const data = await r.json();
  if (!Array.isArray(data) || !data.length) throw new Error('lrclib: no results');
  const track = data[0];
  const raw = track.syncedLyrics || track.plainLyrics;
  if (!raw) throw new Error('lrclib: no lyrics');
  const synced = !!track.syncedLyrics;
  return {
    lyrics: raw, source: 'LRCLib', synced,
    lines: synced ? parseLRC(raw) : plainLines(raw),
  };
}

async function fromLRCLibQuery(title: string, artist: string): Promise<LyricsResult> {
  const { t, a } = clean(title, artist);
  const r = await fetch(
    `https://lrclib.net/api/search?q=${encodeURIComponent(`${a} ${t}`)}`,
    { signal: AbortSignal.timeout(9000) }
  );
  if (!r.ok) throw new Error('lrclib query not ok');
  const data = await r.json();
  if (!Array.isArray(data) || !data.length) throw new Error('lrclib query: no results');
  const track = data.find((x: any) => x.syncedLyrics || x.plainLyrics) ?? data[0];
  const raw = track.syncedLyrics || track.plainLyrics;
  if (!raw) throw new Error('lrclib query: no lyrics');
  const synced = !!track.syncedLyrics;
  return {
    lyrics: raw, source: 'LRCLib Search', synced,
    lines: synced ? parseLRC(raw) : plainLines(raw),
  };
}

// 2) Lyrics.ovh — simples, sem key
async function fromLyricsOvh(title: string, artist: string): Promise<LyricsResult> {
  const { t, a } = clean(title, artist);
  const r = await fetch(
    `https://api.lyrics.ovh/v1/${encodeURIComponent(a)}/${encodeURIComponent(t)}`,
    { signal: AbortSignal.timeout(9000) }
  );
  if (!r.ok) throw new Error('lyrics.ovh not ok');
  const data = await r.json();
  if (!data.lyrics) throw new Error('lyrics.ovh: empty');
  return { lyrics: data.lyrics, source: 'Lyrics.ovh', synced: false, lines: plainLines(data.lyrics) };
}

async function fromTextyl(title: string, artist: string): Promise<LyricsResult> {
  const { t, a } = clean(title, artist);
  const r = await fetch(
    `https://api.textyl.co/api/lyrics?q=${encodeURIComponent(`${a} ${t}`)}`,
    { signal: AbortSignal.timeout(9000) }
  );
  if (!r.ok) throw new Error('textyl not ok');
  const data = await r.json();
  const text = Array.isArray(data)
    ? data.map((line: any) => line?.lyrics || line?.text || '').filter(Boolean).join('\n')
    : data?.lyrics;
  if (!text) throw new Error('textyl: empty');
  return { lyrics: text, source: 'Textyl', synced: false, lines: plainLines(text) };
}

// 3) Happi — sem key para resultados básicos
async function fromHappi(title: string, artist: string): Promise<LyricsResult> {
  const { t, a } = clean(title, artist);
  const r = await fetch(
    `https://api.happi.dev/v1/music?q=${encodeURIComponent(a + ' ' + t)}&limit=1`,
    { signal: AbortSignal.timeout(9000) }
  );
  if (!r.ok) throw new Error('happi not ok');
  const d = await r.json();
  const item = d?.result?.[0];
  if (!item?.api_lyrics) throw new Error('happi: no item');
  const lr = await fetch(item.api_lyrics, { signal: AbortSignal.timeout(9000) });
  if (!lr.ok) throw new Error('happi: fetch fail');
  const ld = await lr.json();
  if (!ld?.result?.lyrics) throw new Error('happi: no lyrics');
  return { lyrics: ld.result.lyrics, source: 'Happi', synced: false, lines: plainLines(ld.result.lyrics) };
}

export async function fetchLyrics(title: string, artist: string): Promise<LyricsResult> {
  const providers = [fromLRCLib, fromLRCLibQuery, fromLyricsOvh, fromTextyl, fromHappi];
  let lastErr = '';
  for (const fn of providers) {
    try { return await fn(title, artist); }
    catch (e: any) { lastErr = e.message; }
  }
  throw new Error('Letra não encontrada. ' + lastErr);
}
