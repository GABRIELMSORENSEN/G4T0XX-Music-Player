package com.g4t0xx.musicplayer;

import android.content.Intent;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "NewPipeAudio")
public class NewPipeAudioPlugin extends Plugin {
    private final ExecutorService executor = Executors.newCachedThreadPool();

    @PluginMethod
    public void play(PluginCall call) {
        String videoId = call.getString("videoId", "");
        if (videoId.isEmpty()) {
            call.reject("videoId ausente");
            return;
        }

        Intent intent = new Intent(getContext(), NewPipePlaybackService.class)
            .setAction(NewPipePlaybackService.ACTION_PLAY)
            .putExtra(NewPipePlaybackService.EXTRA_VIDEO_ID, videoId)
            .putExtra(NewPipePlaybackService.EXTRA_TITLE, call.getString("title", "YouTube"))
            .putExtra(NewPipePlaybackService.EXTRA_ARTIST, call.getString("artist", "YouTube"))
            .putExtra(NewPipePlaybackService.EXTRA_THUMBNAIL, call.getString("thumbnail", ""))
            .putExtra(NewPipePlaybackService.EXTRA_POSITION_MS, Math.round(call.getDouble("positionMs", 0.0)))
            .putExtra(NewPipePlaybackService.EXTRA_VOLUME, call.getFloat("volume", 1f))
            .putExtra(NewPipePlaybackService.EXTRA_SPEED, call.getFloat("speed", 1f));

        try {
            ContextCompat.startForegroundService(getContext(), intent);
            call.resolve(stateObject());
        } catch (Exception e) {
            call.reject("Nao foi possivel iniciar o player nativo", e);
        }
    }

    @PluginMethod
    public void pause(PluginCall call) {
        NewPipePlaybackService.pausePlayback();
        call.resolve(stateObject());
    }

    @PluginMethod
    public void resume(PluginCall call) {
        NewPipePlaybackService.resumePlayback();
        call.resolve(stateObject());
    }

    @PluginMethod
    public void stop(PluginCall call) {
        NewPipePlaybackService.stopPlayback();
        call.resolve(stateObject());
    }

    @PluginMethod
    public void seek(PluginCall call) {
        long positionMs = Math.round(call.getDouble("positionMs", 0.0));
        NewPipePlaybackService.seekTo(positionMs);
        call.resolve(stateObject());
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        NewPipePlaybackService.setVolume(call.getFloat("volume", 1f));
        call.resolve(stateObject());
    }

    @PluginMethod
    public void setSpeed(PluginCall call) {
        NewPipePlaybackService.setSpeed(call.getFloat("speed", 1f));
        call.resolve(stateObject());
    }

    @PluginMethod
    public void getState(PluginCall call) {
        call.resolve(stateObject());
    }

    @PluginMethod
    public void extract(PluginCall call) {
        String videoId = call.getString("videoId", "");
        if (videoId.isEmpty()) {
            call.reject("videoId ausente");
            return;
        }

        executor.execute(() -> {
            try {
                NewPipeExtractorManager.AudioResult result = NewPipeExtractorManager.extractAudio(videoId);
                JSObject ret = new JSObject();
                ret.put("videoId", result.videoId);
                ret.put("audioUrl", result.audioUrl);
                ret.put("mimeType", result.mimeType);
                ret.put("extension", result.extension);
                ret.put("title", result.title);
                ret.put("artist", result.artist);
                ret.put("thumbnail", result.thumbnail);
                ret.put("duration", result.durationSeconds);
                ret.put("bitrate", result.bitrate);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Falha ao extrair com NewPipe", e);
            }
        });
    }

    @PluginMethod
    public void search(PluginCall call) {
        String query = call.getString("query", "");
        int limit = Math.max(0, call.getInt("limit", 0));
        if (query.trim().isEmpty()) {
            call.reject("Busca vazia");
            return;
        }

        executor.execute(() -> {
            try {
                JSArray songs = new JSArray();
                for (NewPipeExtractorManager.SongResult song : NewPipeExtractorManager.search(query, limit)) {
                    songs.put(songObject(song));
                }
                JSObject ret = new JSObject();
                ret.put("songs", songs);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Busca NewPipe falhou", e);
            }
        });
    }

    @PluginMethod
    public void playlist(PluginCall call) {
        String url = call.getString("url", "");
        if (url.trim().isEmpty()) {
            call.reject("URL da playlist ausente");
            return;
        }

        executor.execute(() -> {
            try {
                NewPipeExtractorManager.PlaylistResult playlist = NewPipeExtractorManager.playlist(url);
                JSArray songs = new JSArray();
                for (NewPipeExtractorManager.SongResult song : playlist.songs) {
                    songs.put(songObject(song));
                }
                JSObject ret = new JSObject();
                ret.put("title", playlist.title);
                ret.put("songs", songs);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Falha ao importar playlist com NewPipe", e);
            }
        });
    }

    @PluginMethod
    public void prefetch(PluginCall call) {
        String csv = call.getString("videoIds", "");
        executor.execute(() -> {
            List<String> ids = new ArrayList<>();
            for (String part : csv.split(",")) {
                String id = part.trim();
                if (!id.isEmpty()) ids.add(id);
            }
            NewPipeExtractorManager.prefetch(ids);
        });
        call.resolve();
    }

    private JSObject stateObject() {
        NewPipePlaybackService.PlaybackSnapshot state = NewPipePlaybackService.snapshot();
        JSObject ret = new JSObject();
        ret.put("videoId", state.videoId);
        ret.put("title", state.title);
        ret.put("artist", state.artist);
        ret.put("thumbnail", state.thumbnail);
        ret.put("streamUrl", state.streamUrl);
        ret.put("playing", state.playing);
        ret.put("loading", state.loading);
        ret.put("ended", state.ended);
        ret.put("error", state.error);
        ret.put("positionMs", state.positionMs);
        ret.put("durationMs", state.durationMs);
        ret.put("playbackState", state.playbackState);
        return ret;
    }

    private JSObject songObject(NewPipeExtractorManager.SongResult song) {
        JSObject item = new JSObject();
        item.put("id", song.id);
        item.put("title", song.title);
        item.put("artist", song.artist);
        item.put("thumbnail", song.thumbnail);
        item.put("duration", formatDuration(song.durationSeconds));
        item.put("url", song.url);
        item.put("timestamp", System.currentTimeMillis());
        return item;
    }

    private String formatDuration(long seconds) {
        if (seconds <= 0) return "";
        return (seconds / 60) + ":" + String.format("%02d", seconds % 60);
    }
}
