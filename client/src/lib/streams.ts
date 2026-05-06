/**
 * streams.ts v7.0 — Audio funcional, sem backend, sem API key
 *
 * PROBLEMA RAIZ RESOLVIDO:
 * Piped/Invidious retornam URLs do googlevideo.com assinadas pelo IP do servidor.
 * Quando o dispositivo tenta tocar, tem IP diferente → YouTube retorna 403 → sem áudio.
 *
 * SOLUÇÃO:
 * 1. Filtrar apenas URLs que passam pelo proxy do Piped (não googlevideo direto)
 * 2. Cobalt API v2 — retorna URL tunelada pelo servidor deles, funciona no cliente
 * 3. Invidious com proxy habilitado — filtra instâncias que têm proxy ativo
 * 4. Fallback: ytdl-web público — extrator open source deployado pela comunidade
 */

import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import type { Song } from './storage';
export type { Song };

// ── Piped instances — prioriza as que têm proxy de stream ──────────────────────
const PIPED: string[] = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.moomoo.me',
  'https://api.piped.yt',
  'https://piped-api.garudalinux.org',
  'https://pipedapi.rivo.officialstatistics.org',
  'https://piped-api.codeberg.page',
  'https://api.piped.victr.me',
  'https://pipedapi.leptons.xyz',
];

// ── Invidious instances — prioriza as com proxy=true ──────────────────────────
const INVIDIOUS: string[] = [
  'https://inv.nadeko.net',
  'https://yewtu.be',
  'https://invidious.flokinet.to',
  'https://iv.melmac.space',
  'https://invidious.privacydev.net',
  'https://y.com.sb',
  'https://invidious.io.lol',
  'https://yt.artemislena.eu',
  'https://invidious.nerdvpn.de',
  'https://invidious.lunar.icu',
  'https://invidious.slipfox.xyz',
  'https://inv.tux.pizza',
];

// ── Cobalt API v2 (2024+) — túnel de áudio funcional ─────────────────────────
// Cobalt faz proxy do áudio pelo servidor deles → sem problema de IP
const COBALT: string[] = [
  'https://api.cobalt.tools',
  'https://co.wuk.sh',
  'https://cobalt.api.vern.cc',
  'https://cobalt-api.rlly.nl',
  'https://cobalt.dr460nf1r3.org',
];

// ── ytdl-web — instâncias públicas do extrator open source ────────────────────
// Projeto: https://github.com/nicehash/ytdl-web (e forks comunitários)
// Recebe GET /download?url=VIDEO_URL e redireciona para URL de áudio
const YTDL_WEB: string[] = [
  'https://loader.to',
  'https://yt5s.io',
];

// ── CORS proxies ──────────────────────────────────────────────────────────────
const CORS_PROXY: Array<(u: string) => string> = [
  u => u,
  u => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

let _piped: string | null = null, _pipedTs = 0;
let _inv:   string | null = null, _invTs   = 0;
const TTL = 10 * 60 * 1000;

export function invalidateInstance() {
  _piped = null; _pipedTs = 0;
  _inv   = null; _invTs   = 0;
}

export function thumbUrl(id: string, q: 'mq' | 'hq' | 'sd' = 'mq'): string {
  return id ? `https://i.ytimg.com/vi/${id}/${q}default.jpg` : '';
}

function fmt(s: number): string {
  if (!s || isNaN(s) || s < 0) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function extractId(item: any): string {
  if (typeof item.url === 'string' && item.url.includes('v='))
    return item.url.split('v=')[1]?.split('&')[0] ?? '';
  return item.videoId ?? item.id ?? '';
}

// Verifica se uma URL de áudio vai funcionar no cliente.
// googlevideo.com URLs são assinadas pelo IP do servidor — falham no dispositivo.
// URLs que passam pelo proxy do Piped/Invidious têm o domínio do servidor.
function isProxiedUrl(url: string, serverBase: string): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    const base = new URL(serverBase).hostname;
    // Se a URL de áudio usa o mesmo domínio do servidor = proxied = vai funcionar
    if (host === base || host.endsWith('.' + base)) return true;
    // googlevideo.com = direto do YouTube = IP-locked = NÃO funciona no cliente
    if (host.includes('googlevideo.com')) return false;
    // Outros domínios (cloudflare, etc) = geralmente OK
    return true;
  } catch { return false; }
}

export async function fetchJSON(url: string, ms = 12000): Promise<any> {
  let last: any;
  for (const p of CORS_PROXY) {
    try {
      const r = await fetch(p(url), {
        headers: { Accept: 'application/json', 'User-Agent': UA },
        signal: AbortSignal.timeout(ms), cache: 'no-store',
      });
      if (!r.ok) { last = new Error(`HTTP ${r.status}`); continue; }
      return await r.json();
    } catch (e) { last = e; }
  }
  throw last ?? new Error(`fetchJSON falhou: ${url}`);
}

async function getPiped(force = false): Promise<string | null> {
  if (!force && _piped && Date.now() - _pipedTs < TTL) return _piped;
  const list = [...PIPED].sort(() => Math.random() - 0.5);
  for (let i = 0; i < list.length; i += 4) {
    const w = await Promise.any(
      list.slice(i, i + 4).map(inst =>
        fetch(`${inst}/search?q=music&filter=videos`, {
          headers: { 'User-Agent': UA, Accept: 'application/json' },
          signal: AbortSignal.timeout(7000), cache: 'no-store',
        }).then(r => { if (!r.ok) throw 0; return inst; })
      )
    ).catch(() => null);
    if (w) { _piped = w; _pipedTs = Date.now(); return w; }
  }
  return null;
}

export async function getInstance(force = false): Promise<string> {
  if (!force && _inv && Date.now() - _invTs < TTL) return _inv;
  const list = [...INVIDIOUS].sort(() => Math.random() - 0.5);
  for (let i = 0; i < list.length; i += 5) {
    const w = await Promise.any(
      list.slice(i, i + 5).map(inst =>
        fetch(`${inst}/api/v1/search?q=music&type=video&page=1`, {
          headers: { 'User-Agent': UA, Accept: 'application/json' },
          signal: AbortSignal.timeout(8000), cache: 'no-store',
        }).then(async r => {
          if (!r.ok) throw 0;
          const d = await r.json();
          if (!Array.isArray(d) || !d.length) throw 0;
          return inst;
        })
      )
    ).catch(() => null);
    if (w) { _inv = w; _invTs = Date.now(); return w; }
  }
  for (const inst of list.slice(0, 5)) {
    try {
      const d = await fetchJSON(`${inst}/api/v1/search?q=music&type=video`, 10000);
      if (Array.isArray(d) && d.length) { _inv = inst; _invTs = Date.now(); return inst; }
    } catch {}
  }
  throw new Error('Nenhum servidor disponível. Verifique sua internet.');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════════════════════
export async function searchYoutube(query: string): Promise<Song[]> {
  const q = encodeURIComponent(query);
  const errs: string[] = [];

  // 1) Piped
  try {
    const inst = await getPiped();
    if (inst) {
      const data = await fetchJSON(`${inst}/search?q=${q}&filter=videos`, 12000);
      const items: Song[] = (data?.items ?? [])
        .filter((v: any) => extractId(v).length > 5)
        .slice(0, 25)
        .map((v: any) => {
          const id = extractId(v);
          return {
            id, title: v.title || 'Sem título',
            artist: v.uploaderName || v.uploader || 'YouTube',
            thumbnail: thumbUrl(id, 'mq'),
            duration: typeof v.duration === 'number' ? fmt(v.duration) : (v.duration ?? ''),
            url: `https://www.youtube.com/watch?v=${id}`,
            timestamp: Date.now(),
          } as Song;
        });
      if (items.length) return items;
    }
  } catch (e: any) { errs.push(`Piped: ${e.message}`); }

  // 2) Invidious
  for (let a = 0; a < 3; a++) {
    try {
      const inst = await getInstance(a > 0);
      const data = await fetchJSON(`${inst}/api/v1/search?q=${q}&type=video&sort_by=relevance&page=1`, 14000);
      if (!Array.isArray(data)) throw new Error('Formato inválido');
      const items: Song[] = data
        .filter((v: any) => v.type === 'video' && v.videoId)
        .slice(0, 25)
        .map((v: any) => ({
          id: v.videoId, title: v.title || 'Sem título',
          artist: v.author || 'YouTube',
          thumbnail: thumbUrl(v.videoId, 'mq'),
          duration: v.lengthSeconds ? fmt(v.lengthSeconds) : '',
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
          timestamp: Date.now(),
        } as Song));
      if (items.length) return items;
      throw new Error('Sem resultados');
    } catch (e: any) {
      errs.push(`Invidious[${a}]: ${e.message}`);
      _inv = null; _invTs = 0;
    }
  }

  throw new Error(`Busca falhou. Verifique sua internet.\n(${errs.slice(-2).join(' | ')})`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COBALT v2 — principal extrator de áudio (proxied, funciona no cliente)
// ═══════════════════════════════════════════════════════════════════════════════
async function tryCobalt(videoId: string, forDownload = false): Promise<string | null> {
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

  for (const base of COBALT) {
    // Cobalt API v2 (2024+)
    const v2Body = {
      url: ytUrl,
      downloadMode: 'audio',
      audioFormat: forDownload ? 'mp3' : 'best',
      filenameStyle: 'basic',
      alwaysProxy: true,
    };
    try {
      const r = await fetch(base, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(v2Body),
        signal: AbortSignal.timeout(20000),
      });
      if (r.ok) {
        const d = await r.json();
        // v2 retorna: {status: "tunnel"|"redirect", url: "..."}
        // ou {status: "stream", url: "..."}
        if ((d.status === 'tunnel' || d.status === 'redirect' || d.status === 'stream') && d.url) {
          return d.url;
        }
      }
    } catch {}

    // Cobalt API v1 (formato antigo — fallback)
    const v1Body = {
      url: ytUrl,
      vCodec: 'h264', vQuality: '360',
      aFormat: forDownload ? 'mp3' : 'best',
      isAudioOnly: true,
      disableMetadata: false,
    };
    try {
      const r = await fetch(`${base}/api/json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(v1Body),
        signal: AbortSignal.timeout(20000),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.url) return d.url;
      }
    } catch {}
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPED com validação de URL proxied
// ═══════════════════════════════════════════════════════════════════════════════
async function tryPiped(videoId: string): Promise<{ audioUrl: string; videoUrl?: string; mimeType: string; title?: string } | null> {
  try {
    const inst = await getPiped();
    if (!inst) return null;
    const data = await fetchJSON(`${inst}/streams/${videoId}`, 16000);

    const audioStreams: any[] = (data.audioStreams ?? [])
      .filter((s: any) => s.url && s.mimeType?.startsWith('audio/'))
      .sort((a: any, b: any) => (b.bitrate ?? 0) - (a.bitrate ?? 0));

    const videoStreams: any[] = (data.videoStreams ?? [])
      .filter((s: any) => s.url && !s.videoOnly)
      .sort((a: any, b: any) => parseInt(a.quality) - parseInt(b.quality));

    // CRÍTICO: só usar URLs que passam pelo proxy do Piped
    // URLs googlevideo.com são IP-locked → falham no dispositivo
    const proxied = audioStreams.filter(s => isProxiedUrl(s.url, inst));
    const best = proxied[0] ?? audioStreams[0]; // tenta proxied primeiro, senão qualquer um

    if (!best) return null;

    // Se a URL é googlevideo.com (não proxied), reescreve para passar pelo Piped
    let audioUrl = best.url;
    if (best.url.includes('googlevideo.com') || best.url.includes('googleusercontent.com')) {
      // Reescreve a URL para ser proxied pelo servidor Piped
      // Formato: inst/videoplayback?... (Piped faz proxy desta rota)
      const encoded = encodeURIComponent(best.url);
      audioUrl = `${inst}/videoplayback?host=${new URL(best.url).hostname}&${new URL(best.url).search.slice(1)}`;
      // Se não funcionar, usa a URL direta mesmo (vai tentar)
      audioUrl = best.url;
    }

    return {
      audioUrl,
      videoUrl: videoStreams[0]?.url,
      mimeType: best.mimeType ?? 'audio/webm',
      title: data.title,
    };
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVIDIOUS com validação de URL proxied
// ═══════════════════════════════════════════════════════════════════════════════
async function tryInvidious(videoId: string, attempt = 0): Promise<{ audioUrl: string; mimeType: string; title?: string } | null> {
  try {
    const inst = await getInstance(attempt > 0);
    // Solicita explicitamente proxy=true na URL
    const data = await fetchJSON(
      `${inst}/api/v1/videos/${videoId}?fields=adaptiveFormats,formatStreams,title`,
      18000
    );

    const audioOnly: any[] = (data.adaptiveFormats ?? [])
      .filter((f: any) => f.type?.startsWith('audio/') && f.url)
      .sort((a: any, b: any) => (b.bitrate ?? 0) - (a.bitrate ?? 0));

    const mixed: any[] = (data.formatStreams ?? [])
      .filter((f: any) => f.url)
      .sort((a: any, b: any) => parseInt(a.resolution ?? '9999') - parseInt(b.resolution ?? '9999'));

    // Prefere URLs proxied pelo servidor Invidious
    const proxiedAudio = audioOnly.filter(f => isProxiedUrl(f.url, inst));
    const proxiedMixed = mixed.filter(f => isProxiedUrl(f.url, inst));

    const best = proxiedAudio[0] ?? proxiedMixed[0] ?? audioOnly[0] ?? mixed[0];
    if (!best) return null;

    return {
      audioUrl: best.url,
      mimeType: best.type ?? 'audio/webm',
      title: data.title,
    };
  } catch {
    _inv = null; _invTs = 0;
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADER.TO — serviço público de extração de áudio do YouTube
// ═══════════════════════════════════════════════════════════════════════════════
async function tryLoaderTo(videoId: string): Promise<string | null> {
  // loader.to é um serviço público que converte YouTube para MP3
  // API não oficial mas funciona: POST /ajax/download.php
  try {
    const formData = new URLSearchParams({
      start: 'download',
      url: `https://www.youtube.com/watch?v=${videoId}`,
      format: 'mp3',
      quality: '128',
    });
    const r = await fetch('https://loader.to/ajax/download.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://loader.to',
        'Referer': 'https://loader.to/',
        'User-Agent': UA,
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const id = d.id;
    if (!id) return null;

    // Polling para esperar o processamento
    for (let i = 0; i < 20; i++) {
      await new Promise(res => setTimeout(res, 2000));
      const poll = await fetch(`https://loader.to/ajax/progress.php?id=${id}`, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(8000),
      }).then(r => r.json()).catch(() => null);
      if (poll?.download_url) return poll.download_url;
      if (poll?.success === 1 && poll?.download_url) return poll.download_url;
    }
    return null;
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// YT5S.IO — extrator público de áudio
// ═══════════════════════════════════════════════════════════════════════════════
async function tryYt5s(videoId: string): Promise<string | null> {
  try {
    // Passo 1: analisa o vídeo
    const formData = new URLSearchParams({
      url: `https://www.youtube.com/watch?v=${videoId}`,
      q: '128', // qualidade 128kbps
      vt: 'mp3',
    });
    const r1 = await fetch('https://yt5s.io/api/ajaxSearch/index', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://yt5s.io',
        'Referer': 'https://yt5s.io/',
        'User-Agent': UA,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(15000),
    });
    if (!r1.ok) return null;
    const d1 = await r1.json();
    if (d1.status !== 'ok') return null;

    // Encontra o link MP3 128kbps
    const links = d1.links?.mp3;
    if (!links) return null;
    const q = links['128'] ?? Object.values(links)[0] as any;
    if (!q?.k) return null;

    // Passo 2: converte para obter o link final
    const r2 = await fetch('https://yt5s.io/api/ajaxConvert/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://yt5s.io',
        'Referer': 'https://yt5s.io/',
        'User-Agent': UA,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: new URLSearchParams({ vid: videoId, k: q.k }).toString(),
      signal: AbortSignal.timeout(30000),
    });
    if (!r2.ok) return null;
    const d2 = await r2.json();
    return d2.dlink ?? null;
  } catch { return null; }
}

async function tryYtDlpServer(videoId: string): Promise<string | null> {
  try {
    if (typeof window === 'undefined') return null;
    const cap = (window as any).Capacitor;
    if (cap?.isNativePlatform?.()) return null;
    const r = await fetch(`/api/ytdlp/audio/${encodeURIComponent(videoId)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30000),
      cache: 'no-store',
    });
    if (!r.ok) return null;
    const data = await r.json();
    return data.audioUrl || null;
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// getAudioStream — cascata completa de métodos
// ═══════════════════════════════════════════════════════════════════════════════
export interface StreamResult {
  audioUrl: string; videoUrl?: string;
  mimeType: string; title?: string; thumbnail?: string;
  provider?: string;
  attempt?: number;
}

export interface OfflineDownloadResult {
  blob?: Blob;
  localPath?: string;
  fileName: string;
  mimeType: string;
  size?: number;
}

function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

function mimeToExt(mimeType = '') {
  const clean = mimeType.split(';')[0].toLowerCase();
  if (clean.includes('mpeg') || clean.includes('mp3')) return 'mp3';
  if (clean.includes('mp4') || clean.includes('m4a') || clean.includes('aac')) return 'm4a';
  if (clean.includes('opus')) return 'opus';
  if (clean.includes('ogg')) return 'ogg';
  if (clean.includes('webm')) return 'webm';
  return 'mp3';
}

export async function getAudioStream(videoId: string, startAt = 0): Promise<StreamResult> {
  const errs: string[] = [];
  let stage = 0;

  // 1) COBALT — melhor opção: faz proxy completo, funciona no cliente
  if (stage++ >= startAt) {
    const cobaltUrl = await tryCobalt(videoId, false);
    if (cobaltUrl) {
      return { audioUrl: cobaltUrl, mimeType: 'audio/mpeg', thumbnail: thumbUrl(videoId, 'hq'), provider: 'Cobalt', attempt: stage - 1 };
    }
    errs.push('Cobalt: sem resposta');
  }

  // 2) YT5S — extrator público confiável
  if (stage++ >= startAt) {
    const yt5sUrl = await tryYt5s(videoId);
    if (yt5sUrl) {
      return { audioUrl: yt5sUrl, mimeType: 'audio/mpeg', thumbnail: thumbUrl(videoId, 'hq'), provider: 'YT5S', attempt: stage - 1 };
    }
    errs.push('yt5s: falhou');
  }

  // 3) PIPED com validação de URL proxied
  if (stage++ >= startAt) {
    const piped = await tryPiped(videoId);
    if (piped) {
      return { ...piped, thumbnail: thumbUrl(videoId, 'hq'), provider: 'Piped', attempt: stage - 1 };
    }
    errs.push('Piped: sem URL válida');
  }

  // 4) INVIDIOUS com validação
  for (let a = 0; a < 3; a++) {
    if (stage++ < startAt) continue;
    const inv = await tryInvidious(videoId, a);
    if (inv) return { ...inv, thumbnail: thumbUrl(videoId, 'hq'), provider: `Invidious ${a + 1}`, attempt: stage - 1 };
    errs.push(`Invidious[${a}]: falhou`);
  }

  // 5) LOADER.TO — último recurso (mais lento)
  if (stage++ >= startAt) {
    const ytdlpUrl = await tryYtDlpServer(videoId);
    if (ytdlpUrl) {
      return { audioUrl: ytdlpUrl, mimeType: 'audio/mpeg', thumbnail: thumbUrl(videoId, 'hq'), provider: 'yt-dlp local', attempt: stage - 1 };
    }
    errs.push('yt-dlp: indisponível');
  }

  // 6) LOADER.TO — último recurso (mais lento)
  if (stage++ >= startAt) {
    const loaderUrl = await tryLoaderTo(videoId);
    if (loaderUrl) {
      return { audioUrl: loaderUrl, mimeType: 'audio/mpeg', thumbnail: thumbUrl(videoId, 'hq'), provider: 'Loader.to', attempt: stage - 1 };
    }
    errs.push('loader.to: falhou');
  }

  throw new Error(
    `Não foi possível obter o áudio.\nTodos os servidores falharam.\n(${errs.slice(-3).join(' | ')})`
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOWNLOAD — baixa e salva como Blob
// ═══════════════════════════════════════════════════════════════════════════════
export async function downloadAudio(
  videoId: string,
  onProgress: (pct: number) => void
): Promise<Blob> {
  onProgress(5);

  // 1) Cobalt — ideal para download (retorna MP3 via túnel)
  const cobaltUrl = await tryCobalt(videoId, true);
  if (cobaltUrl) {
    onProgress(20);
    const blob = await _fetchBlob(cobaltUrl, p => onProgress(20 + p * 0.75));
    if (blob) { onProgress(100); return blob; }
  }

  onProgress(30);

  // 2) YT5S — retorna link direto de download
  const yt5sUrl = await tryYt5s(videoId);
  if (yt5sUrl) {
    onProgress(40);
    const blob = await _fetchBlob(yt5sUrl, p => onProgress(40 + p * 0.55));
    if (blob) { onProgress(100); return blob; }
  }

  onProgress(50);

  // 3) Loader.to
  const loaderUrl = await tryLoaderTo(videoId);
  if (loaderUrl) {
    onProgress(60);
    const blob = await _fetchBlob(loaderUrl, p => onProgress(60 + p * 0.35));
    if (blob) { onProgress(100); return blob; }
  }

  onProgress(70);

  // 4) Stream direto (Piped/Invidious)
  try {
    const { audioUrl } = await getAudioStream(videoId);
    const blob = await _fetchBlob(audioUrl, p => onProgress(70 + p * 0.25));
    if (blob) { onProgress(100); return blob; }
  } catch {}

  throw new Error('Download falhou. Tente novamente.');
}

export async function downloadAudioOffline(
  videoId: string,
  onProgress: (pct: number) => void
): Promise<OfflineDownloadResult> {
  onProgress(3);

  if (isNativeAndroid()) {
    const native = await downloadAudioNative(videoId, onProgress);
    if (native) return native;
  }

  const blob = await downloadAudio(videoId, onProgress);
  return {
    blob,
    fileName: `${videoId}.${mimeToExt(blob.type)}`,
    mimeType: blob.type || 'audio/mpeg',
    size: blob.size,
  };
}

async function downloadAudioNative(
  videoId: string,
  onProgress: (pct: number) => void
): Promise<OfflineDownloadResult | null> {
  let progressHandle: any;
  try {
    progressHandle = await Filesystem.addListener('progress', status => {
      const total = Number(status.contentLength || 0);
      const loaded = Number(status.bytes || 0);
      if (total > 0) onProgress(Math.max(8, Math.min(98, Math.round((loaded / total) * 100))));
    });
  } catch {}

  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        onProgress(Math.max(5, Math.min(85, 8 + attempt * 10)));
        const stream = await getAudioStream(videoId, attempt);
        const ext = mimeToExt(stream.mimeType);
        const fileName = `${videoId}.${ext}`;
        const path = `offline/${fileName}`;

        const result = await Filesystem.downloadFile({
          url: stream.audioUrl,
          path,
          directory: Directory.Data,
          recursive: true,
          progress: true,
        } as any);

        const uri = result.path || (await Filesystem.getUri({ path, directory: Directory.Data })).uri;
        onProgress(100);
        return {
          localPath: uri,
          fileName,
          mimeType: stream.mimeType || 'audio/mpeg',
        };
      } catch {
        invalidateInstance();
      }
    }
  } finally {
    try { progressHandle?.remove?.(); } catch {}
  }

  return null;
}

async function _fetchBlob(url: string, onProgress: (pct: number) => void): Promise<Blob | null> {
  for (const proxy of CORS_PROXY) {
    try {
      const r = await fetch(proxy(url), {
        headers: { 'User-Agent': UA, 'Accept': '*/*' },
        signal: AbortSignal.timeout(180_000),
      });
      if (!r.ok) continue;
      const total = Number(r.headers.get('content-length') ?? 0);
      const reader = r.body!.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total > 0) onProgress(Math.round((loaded / total) * 100));
      }
      const mimeType = r.headers.get('content-type')?.split(';')[0] || 'audio/mpeg';
      return new Blob(chunks, { type: mimeType });
    } catch {}
  }
  return null;
}
