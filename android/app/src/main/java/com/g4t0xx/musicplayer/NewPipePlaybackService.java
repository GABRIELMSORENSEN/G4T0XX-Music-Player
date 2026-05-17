package com.g4t0xx.musicplayer;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.core.app.NotificationCompat;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.PlaybackParameters;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

public class NewPipePlaybackService extends MediaSessionService {
    public static final String ACTION_PLAY = "com.g4t0xx.musicplayer.newpipe.PLAY";
    public static final String ACTION_PAUSE = "com.g4t0xx.musicplayer.newpipe.PAUSE";
    public static final String ACTION_RESUME = "com.g4t0xx.musicplayer.newpipe.RESUME";
    public static final String ACTION_STOP = "com.g4t0xx.musicplayer.newpipe.STOP";
    public static final String ACTION_SEEK = "com.g4t0xx.musicplayer.newpipe.SEEK";

    public static final String EXTRA_VIDEO_ID = "videoId";
    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_ARTIST = "artist";
    public static final String EXTRA_THUMBNAIL = "thumbnail";
    public static final String EXTRA_POSITION_MS = "positionMs";
    public static final String EXTRA_VOLUME = "volume";
    public static final String EXTRA_SPEED = "speed";

    private static final int NOTIFICATION_ID = 4107;
    private static final String CHANNEL_ID = "g4t0xx_newpipe_playback";

    private static volatile NewPipePlaybackService instance;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService ioExecutor = Executors.newSingleThreadExecutor();
    private final AtomicLong requestSerial = new AtomicLong();

    private ExoPlayer player;
    private MediaSession mediaSession;
    private volatile boolean loading;
    private volatile boolean ended;
    private volatile String error = "";
    private volatile String currentVideoId = "";
    private volatile String currentTitle = "G4T0XX Music";
    private volatile String currentArtist = "YouTube";
    private volatile String currentThumbnail = "";
    private volatile String currentStreamUrl = "";

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        createNotificationChannel();

        player = new ExoPlayer.Builder(this).build();
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build();
        player.setAudioAttributes(audioAttributes, true);
        player.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int playbackState) {
                ended = playbackState == Player.STATE_ENDED;
                loading = playbackState == Player.STATE_BUFFERING;
                updateForegroundNotification();
            }

            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                updateForegroundNotification();
            }
        });

        mediaSession = new MediaSession.Builder(this, player).build();
    }

    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        super.onStartCommand(intent, flags, startId);
        if (intent == null || intent.getAction() == null) return START_STICKY;

        switch (intent.getAction()) {
            case ACTION_PLAY:
                startForegroundNow();
                playFromIntent(intent);
                break;
            case ACTION_PAUSE:
                pauseInternal();
                break;
            case ACTION_RESUME:
                resumeInternal();
                break;
            case ACTION_SEEK:
                seekInternal(intent.getLongExtra(EXTRA_POSITION_MS, 0L));
                break;
            case ACTION_STOP:
                stopInternal();
                break;
            default:
                break;
        }
        return START_STICKY;
    }

    private void playFromIntent(Intent intent) {
        long serial = requestSerial.incrementAndGet();
        currentVideoId = intent.getStringExtra(EXTRA_VIDEO_ID);
        currentTitle = valueOr(intent.getStringExtra(EXTRA_TITLE), "YouTube");
        currentArtist = valueOr(intent.getStringExtra(EXTRA_ARTIST), "YouTube");
        currentThumbnail = valueOr(intent.getStringExtra(EXTRA_THUMBNAIL), "");
        float volume = intent.getFloatExtra(EXTRA_VOLUME, 1f);
        float speed = intent.getFloatExtra(EXTRA_SPEED, 1f);
        long startPositionMs = Math.max(0L, intent.getLongExtra(EXTRA_POSITION_MS, 0L));

        loading = true;
        ended = false;
        error = "";
        updateForegroundNotification();

        ioExecutor.execute(() -> {
            try {
                NewPipeExtractorManager.AudioResult stream =
                    NewPipeExtractorManager.extractAudio(currentVideoId);
                if (serial != requestSerial.get()) return;

                mainHandler.post(() -> {
                    if (serial != requestSerial.get()) return;
                    currentStreamUrl = stream.audioUrl;
                    currentTitle = valueOr(currentTitle, stream.title);
                    currentArtist = valueOr(currentArtist, stream.artist);
                    currentThumbnail = valueOr(currentThumbnail, stream.thumbnail);

                    MediaMetadata metadata = new MediaMetadata.Builder()
                        .setTitle(currentTitle)
                        .setArtist(currentArtist)
                        .setArtworkUri(currentThumbnail.isEmpty() ? null : Uri.parse(currentThumbnail))
                        .build();
                    MediaItem item = new MediaItem.Builder()
                        .setUri(stream.audioUrl)
                        .setMimeType(stream.mimeType)
                        .setMediaMetadata(metadata)
                        .build();

                    player.setMediaItem(item, startPositionMs);
                    player.setVolume(Math.max(0f, Math.min(1f, volume)));
                    player.setPlaybackParameters(new PlaybackParameters(Math.max(0.25f, Math.min(2f, speed))));
                    player.prepare();
                    player.play();
                    loading = false;
                    updateForegroundNotification();
                });
            } catch (Exception e) {
                if (serial != requestSerial.get()) return;
                mainHandler.post(() -> {
                    loading = false;
                    error = e.getMessage() == null ? "Falha ao extrair audio" : e.getMessage();
                    updateForegroundNotification();
                });
            }
        });
    }

    private void pauseInternal() {
        if (player != null) player.pause();
        updateForegroundNotification();
    }

    private void resumeInternal() {
        if (player != null) player.play();
        updateForegroundNotification();
    }

    private void seekInternal(long positionMs) {
        if (player != null) player.seekTo(Math.max(0L, positionMs));
    }

    private void stopInternal() {
        requestSerial.incrementAndGet();
        loading = false;
        ended = false;
        error = "";
        if (player != null) {
            player.stop();
            player.clearMediaItems();
        }
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    public static void pausePlayback() {
        NewPipePlaybackService service = instance;
        if (service != null) service.mainHandler.post(service::pauseInternal);
    }

    public static void resumePlayback() {
        NewPipePlaybackService service = instance;
        if (service != null) service.mainHandler.post(service::resumeInternal);
    }

    public static void stopPlayback() {
        NewPipePlaybackService service = instance;
        if (service != null) service.mainHandler.post(service::stopInternal);
    }

    public static void seekTo(long positionMs) {
        NewPipePlaybackService service = instance;
        if (service != null) service.mainHandler.post(() -> service.seekInternal(positionMs));
    }

    public static void setVolume(float volume) {
        NewPipePlaybackService service = instance;
        if (service != null && service.player != null) {
            service.mainHandler.post(() -> service.player.setVolume(Math.max(0f, Math.min(1f, volume))));
        }
    }

    public static void setSpeed(float speed) {
        NewPipePlaybackService service = instance;
        if (service != null && service.player != null) {
            service.mainHandler.post(() ->
                service.player.setPlaybackParameters(new PlaybackParameters(Math.max(0.25f, Math.min(2f, speed))))
            );
        }
    }

    public static PlaybackSnapshot snapshot() {
        NewPipePlaybackService service = instance;
        if (service == null || service.player == null) return PlaybackSnapshot.empty();
        if (Looper.myLooper() == service.mainHandler.getLooper()) {
            return service.buildSnapshot();
        }

        AtomicReference<PlaybackSnapshot> ref = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);
        service.mainHandler.post(() -> {
            try {
                ref.set(service.player == null ? PlaybackSnapshot.empty() : service.buildSnapshot());
            } finally {
                latch.countDown();
            }
        });

        try {
            if (latch.await(900, TimeUnit.MILLISECONDS) && ref.get() != null) return ref.get();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return service.fallbackSnapshot();
    }

    private PlaybackSnapshot buildSnapshot() {
        long duration = player.getDuration();
        long position = player.getCurrentPosition();
        return new PlaybackSnapshot(
            currentVideoId,
            currentTitle,
            currentArtist,
            currentThumbnail,
            currentStreamUrl,
            player.isPlaying(),
            loading,
            ended,
            error,
            position < 0 ? 0 : position,
            duration == C.TIME_UNSET || duration < 0 ? 0 : duration,
            player.getPlaybackState()
        );
    }

    private PlaybackSnapshot fallbackSnapshot() {
        return new PlaybackSnapshot(
            currentVideoId,
            currentTitle,
            currentArtist,
            currentThumbnail,
            currentStreamUrl,
            false,
            loading,
            ended,
            error,
            0L,
            0L,
            Player.STATE_IDLE
        );
    }

    private void startForegroundNow() {
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void updateForegroundNotification() {
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(NOTIFICATION_ID, buildNotification());
    }

    private Notification buildNotification() {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String title = loading ? "Carregando audio..." : currentTitle;
        String text = error == null || error.isEmpty() ? currentArtist : error;

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_music_note)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(pendingIntent)
            .setOnlyAlertOnce(true)
            .setOngoing(player != null && player.isPlaying())
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "G4T0XX NewPipe Playback",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setSound(null, null);
        channel.enableVibration(false);
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager != null) manager.createNotificationChannel(channel);
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        if (player == null || !player.isPlaying()) stopInternal();
    }

    @Override
    public void onDestroy() {
        instance = null;
        requestSerial.incrementAndGet();
        if (mediaSession != null) {
            mediaSession.release();
            mediaSession = null;
        }
        if (player != null) {
            player.release();
            player = null;
        }
        ioExecutor.shutdownNow();
        super.onDestroy();
    }

    private String valueOr(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value;
    }

    public static final class PlaybackSnapshot {
        public final String videoId;
        public final String title;
        public final String artist;
        public final String thumbnail;
        public final String streamUrl;
        public final boolean playing;
        public final boolean loading;
        public final boolean ended;
        public final String error;
        public final long positionMs;
        public final long durationMs;
        public final int playbackState;

        PlaybackSnapshot(String videoId, String title, String artist, String thumbnail, String streamUrl,
                         boolean playing, boolean loading, boolean ended, String error, long positionMs,
                         long durationMs, int playbackState) {
            this.videoId = videoId;
            this.title = title;
            this.artist = artist;
            this.thumbnail = thumbnail;
            this.streamUrl = streamUrl;
            this.playing = playing;
            this.loading = loading;
            this.ended = ended;
            this.error = error;
            this.positionMs = positionMs;
            this.durationMs = durationMs;
            this.playbackState = playbackState;
        }

        static PlaybackSnapshot empty() {
            return new PlaybackSnapshot("", "", "", "", "", false, false, false, "", 0L, 0L, Player.STATE_IDLE);
        }
    }
}
