package com.g4t0xx.musicplayer;

import org.schabi.newpipe.extractor.Image;
import org.schabi.newpipe.extractor.InfoItem;
import org.schabi.newpipe.extractor.ListExtractor;
import org.schabi.newpipe.extractor.MediaFormat;
import org.schabi.newpipe.extractor.NewPipe;
import org.schabi.newpipe.extractor.Page;
import org.schabi.newpipe.extractor.ServiceList;
import org.schabi.newpipe.extractor.linkhandler.SearchQueryHandler;
import org.schabi.newpipe.extractor.localization.ContentCountry;
import org.schabi.newpipe.extractor.localization.Localization;
import org.schabi.newpipe.extractor.playlist.PlaylistInfo;
import org.schabi.newpipe.extractor.search.SearchInfo;
import org.schabi.newpipe.extractor.services.youtube.linkHandler.YoutubeSearchQueryHandlerFactory;
import org.schabi.newpipe.extractor.stream.AudioStream;
import org.schabi.newpipe.extractor.stream.StreamInfo;
import org.schabi.newpipe.extractor.stream.StreamInfoItem;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class NewPipeExtractorManager {
    private static final Pattern WATCH_ID = Pattern.compile("(?:v=|youtu\\.be/|embed/|shorts/)([A-Za-z0-9_-]{6,})");
    private static final Pattern RAW_ID = Pattern.compile("^[A-Za-z0-9_-]{6,}$");
    private static final Pattern JSON_VIDEO_ID = Pattern.compile("\"videoId\"\\s*:\\s*\"([A-Za-z0-9_-]{11})\"");
    private static final Pattern JSON_PLAYLIST_TITLE = Pattern.compile("\"title\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern HEX_ESCAPE = Pattern.compile("\\\\x([0-9A-Fa-f]{2})");
    private static final Pattern UNICODE_ESCAPE = Pattern.compile("\\\\u([0-9A-Fa-f]{4})");
    private static final int SEARCH_PAGE_SAFETY_LIMIT = 1000;
    private static final int PLAYLIST_PAGE_SAFETY_LIMIT = 5000;
    private static final int HTML_SCRAPE_SAFETY_LIMIT = 5000;
    private static final int MAX_PAGE_REQUESTS = 80;

    private static boolean initialized;

    private static final Map<String, AudioResult> AUDIO_CACHE =
        Collections.synchronizedMap(new LinkedHashMap<String, AudioResult>(32, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, AudioResult> eldest) {
                return size() > 40;
            }
        });

    private NewPipeExtractorManager() {}

    public static synchronized void ensureInitialized() {
        if (initialized) return;
        NewPipe.init(
            NewPipeDownloader.getInstance(),
            new Localization("pt", "BR"),
            new ContentCountry("BR")
        );
        initialized = true;
    }

    public static AudioResult extractAudio(String videoIdOrUrl) throws Exception {
        ensureInitialized();
        String videoId = extractVideoId(videoIdOrUrl);
        AudioResult cached = AUDIO_CACHE.get(videoId);
        if (cached != null) return cached;

        String url = watchUrl(videoId);
        StreamInfo info = StreamInfo.getInfo(ServiceList.YouTube, url);
        AudioStream best = chooseAudioStream(info.getAudioStreams());
        if (best == null || !best.isUrl()) {
            throw new IllegalStateException("Nenhum stream de audio valido foi encontrado.");
        }

        MediaFormat format = best.getFormat();
        String mimeType = format != null ? format.getMimeType() : "audio/webm";
        String extension = format != null ? format.getSuffix() : "webm";
        int bitrate = best.getAverageBitrate() > 0 ? best.getAverageBitrate() : best.getBitrate();

        AudioResult result = new AudioResult(
            videoId,
            best.getContent(),
            mimeType,
            extension,
            safe(info.getName(), "YouTube"),
            safe(info.getUploaderName(), "YouTube"),
            bestImage(info.getThumbnails(), thumbnail(videoId)),
            info.getDuration(),
            bitrate
        );
        AUDIO_CACHE.put(videoId, result);
        return result;
    }

    public static List<SongResult> search(String query, int limit) throws Exception {
        ensureInitialized();
        List<SongResult> songs = new ArrayList<>();
        try {
            songs = searchWithFilter(query, "", limit);
            if (songs.isEmpty()) {
                songs = searchWithFilter(query, YoutubeSearchQueryHandlerFactory.VIDEOS, limit);
            }
            if (songs.isEmpty()) {
                songs = searchWithFilter(query, YoutubeSearchQueryHandlerFactory.MUSIC_SONGS, limit);
            }
        } catch (Exception ignored) {}
        if (songs.isEmpty()) songs = scrapeSearch(query, limit);
        return songs;
    }

    public static PlaylistResult playlist(String playlistUrl) throws Exception {
        ensureInitialized();
        String url = playlistUrl.startsWith("http")
            ? playlistUrl
            : "https://www.youtube.com/playlist?list=" + playlistUrl;
        try {
            PlaylistInfo info = PlaylistInfo.getInfo(ServiceList.YouTube, url);
            List<SongResult> songs = collectPlaylist(info, url);
            if (!songs.isEmpty()) return new PlaylistResult(safe(info.getName(), "Playlist importada"), songs);
        } catch (Exception ignored) {}

        return scrapePlaylist(url, 0);
    }

    private static List<SongResult> scrapeSearch(String query, int limit) throws Exception {
        String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8.name());
        String html = NewPipeDownloader.getInstance().getText(
            "https://www.youtube.com/results?search_query=" + encoded
        );
        return scrapeSongsFromHtml(html, limit);
    }

    private static PlaylistResult scrapePlaylist(String url, int limit) throws Exception {
        String html = NewPipeDownloader.getInstance().getText(url);
        List<SongResult> songs = scrapeSongsFromHtml(html, limit);
        String title = firstMatch(JSON_PLAYLIST_TITLE, html, "Playlist importada");
        return new PlaylistResult(decodeJsonString(title), songs);
    }

    private static List<SongResult> scrapeSongsFromHtml(String html, int limit) {
        List<SongResult> songs = new ArrayList<>();
        if (html == null || html.isEmpty()) return songs;

        int max = effectiveLimit(limit, HTML_SCRAPE_SAFETY_LIMIT);
        String normalized = normalizeEscapedHtml(html);
        Map<String, SongResult> unique = new LinkedHashMap<>();
        collectRendererSongs(normalized, "videoWithContextRenderer", unique, max);
        collectRendererSongs(normalized, "videoRenderer", unique, max);
        collectRendererSongs(normalized, "compactVideoRenderer", unique, max);
        collectRendererSongs(normalized, "playlistVideoRenderer", unique, max);

        Matcher matcher = JSON_VIDEO_ID.matcher(normalized);
        while (matcher.find() && unique.size() < max) {
            String id = matcher.group(1);
            if (unique.containsKey(id)) continue;

            int from = Math.max(0, matcher.start() - 900);
            int to = Math.min(normalized.length(), matcher.end() + 2600);
            String chunk = normalized.substring(from, to);
            String title = pickTitle(chunk);
            if (title.isEmpty() || title.equals(id) || isNoiseTitle(title)) continue;

            String artist = pickArtist(chunk);
            unique.put(id, new SongResult(
                id,
                title,
                artist.isEmpty() ? "YouTube" : artist,
                thumbnail(id),
                0,
                watchUrl(id)
            ));
        }
        songs.addAll(unique.values());
        return songs;
    }

    private static void collectRendererSongs(String html, String rendererName, Map<String, SongResult> unique, int limit) {
        Pattern rendererPattern = Pattern.compile("\"" + rendererName + "\"\\s*:\\s*\\{");
        Matcher matcher = rendererPattern.matcher(html);
        while (matcher.find() && unique.size() < limit) {
            int start = html.indexOf('{', matcher.start());
            if (start < 0) continue;
            int end = findMatchingBrace(html, start);
            if (end <= start) continue;

            SongResult song = songFromRenderer(html.substring(start, end + 1));
            if (song == null || unique.containsKey(song.id)) continue;
            unique.put(song.id, song);
        }
    }

    private static SongResult songFromRenderer(String renderer) {
        String id = firstMatch(JSON_VIDEO_ID, renderer, "");
        if (id.isEmpty()) {
            id = firstMatch(Pattern.compile("\"url\"\\s*:\\s*\"[^\"]*(?:v=|youtu\\.be/)([A-Za-z0-9_-]{11})"), renderer, "");
        }
        if (id.isEmpty()) return null;

        String title = pickTitle(renderer);
        if (title.isEmpty() || title.equals(id) || isNoiseTitle(title)) return null;

        String artist = pickArtist(renderer);
        return new SongResult(
            id,
            title,
            artist.isEmpty() ? "YouTube" : artist,
            pickThumbnail(renderer, id),
            pickDurationSeconds(renderer),
            watchUrl(id)
        );
    }

    private static int findMatchingBrace(String text, int start) {
        int depth = 0;
        boolean inString = false;
        boolean escaped = false;
        for (int i = start; i < text.length(); i++) {
            char c = text.charAt(i);
            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (c == '\\') {
                    escaped = true;
                } else if (c == '"') {
                    inString = false;
                }
                continue;
            }
            if (c == '"') {
                inString = true;
            } else if (c == '{') {
                depth++;
            } else if (c == '}') {
                depth--;
                if (depth == 0) return i;
            }
        }
        return -1;
    }

    private static String pickTitle(String chunk) {
        String[] patterns = new String[] {
            "\"title\"\\s*:\\s*\\{\\s*\"runs\"\\s*:\\s*\\[\\s*\\{\\s*\"text\"\\s*:\\s*\"([^\"]+)\"",
            "\"title\"\\s*:\\s*\\{\\s*\"simpleText\"\\s*:\\s*\"([^\"]+)\"",
            "\"headline\"\\s*:\\s*\\{\\s*\"runs\"\\s*:\\s*\\[\\s*\\{\\s*\"text\"\\s*:\\s*\"([^\"]+)\"",
            "\"headline\"\\s*:\\s*\\{\\s*\"simpleText\"\\s*:\\s*\"([^\"]+)\""
        };
        for (String pattern : patterns) {
            String value = firstMatch(Pattern.compile(pattern), chunk, "");
            if (!value.isEmpty()) return decodeJsonString(value);
        }
        return "";
    }

    private static String pickArtist(String chunk) {
        String[] patterns = new String[] {
            "\"ownerText\"\\s*:\\s*\\{\\s*\"runs\"\\s*:\\s*\\[\\s*\\{\\s*\"text\"\\s*:\\s*\"([^\"]+)\"",
            "\"longBylineText\"\\s*:\\s*\\{\\s*\"runs\"\\s*:\\s*\\[\\s*\\{\\s*\"text\"\\s*:\\s*\"([^\"]+)\"",
            "\"shortBylineText\"\\s*:\\s*\\{\\s*\"runs\"\\s*:\\s*\\[\\s*\\{\\s*\"text\"\\s*:\\s*\"([^\"]+)\""
        };
        for (String pattern : patterns) {
            String value = firstMatch(Pattern.compile(pattern), chunk, "");
            if (!value.isEmpty()) return decodeJsonString(value);
        }
        return "YouTube";
    }

    private static String pickThumbnail(String renderer, String id) {
        Matcher matcher = Pattern.compile("\"url\"\\s*:\\s*\"([^\"]*i\\.ytimg\\.com[^\"]+)\"").matcher(renderer);
        String best = thumbnail(id);
        while (matcher.find()) {
            String url = decodeJsonString(matcher.group(1));
            if (!url.contains("/vi/" + id + "/")) continue;
            best = url;
            if (url.contains("hqdefault") || url.contains("hq720")) return url;
        }
        return best;
    }

    private static long pickDurationSeconds(String renderer) {
        String value = firstMatch(
            Pattern.compile("\"lengthText\"\\s*:\\s*\\{\\s*\"runs\"\\s*:\\s*\\[\\s*\\{\\s*\"text\"\\s*:\\s*\"([^\"]+)\""),
            renderer,
            ""
        );
        if (value.isEmpty()) {
            value = firstMatch(
                Pattern.compile("\"lengthText\"\\s*:\\s*\\{\\s*\"simpleText\"\\s*:\\s*\"([^\"]+)\""),
                renderer,
                ""
            );
        }
        return parseDurationSeconds(value);
    }

    private static long parseDurationSeconds(String value) {
        if (value == null || value.trim().isEmpty()) return 0L;
        String[] parts = value.trim().split(":");
        long seconds = 0L;
        for (String part : parts) {
            try {
                seconds = seconds * 60L + Long.parseLong(part.trim());
            } catch (NumberFormatException e) {
                return 0L;
            }
        }
        return seconds;
    }

    private static String firstMatch(Pattern pattern, String input, String fallback) {
        Matcher matcher = pattern.matcher(input);
        return matcher.find() ? matcher.group(1) : fallback;
    }

    private static boolean isNoiseTitle(String title) {
        String clean = title.toLowerCase(Locale.US);
        return clean.contains("youtube") && clean.length() < 12
            || clean.contains("sign in")
            || clean.contains("cookie")
            || clean.contains("privacy");
    }

    private static String decodeJsonString(String value) {
        if (value == null) return "";
        return value
            .replace("\\u0026", "&")
            .replace("\\\"", "\"")
            .replace("\\/", "/")
            .replace("\\&", "&")
            .replace("\\\\", "\\")
            .trim();
    }

    private static String normalizeEscapedHtml(String html) {
        String decoded = replaceEscapes(HEX_ESCAPE, html, 16);
        decoded = replaceEscapes(UNICODE_ESCAPE, decoded, 16);
        return decoded
            .replace("\\\"", "\"")
            .replace("\\/", "/")
            .replace("\\&", "&");
    }

    private static String replaceEscapes(Pattern pattern, String input, int radix) {
        Matcher matcher = pattern.matcher(input);
        StringBuffer output = new StringBuffer(input.length());
        while (matcher.find()) {
            try {
                char value = (char) Integer.parseInt(matcher.group(1), radix);
                matcher.appendReplacement(output, Matcher.quoteReplacement(String.valueOf(value)));
            } catch (NumberFormatException e) {
                matcher.appendReplacement(output, Matcher.quoteReplacement(matcher.group(0)));
            }
        }
        matcher.appendTail(output);
        return output.toString();
    }

    public static void prefetch(List<String> ids) {
        for (String id : ids) {
            try {
                String videoId = extractVideoId(id);
                if (!AUDIO_CACHE.containsKey(videoId)) extractAudio(videoId);
            } catch (Exception ignored) {}
        }
    }

    public static String extractVideoId(String value) {
        if (value == null) throw new IllegalArgumentException("videoId ausente");
        String cleaned = value.trim();
        Matcher raw = RAW_ID.matcher(cleaned);
        if (raw.matches()) return cleaned;
        Matcher matcher = WATCH_ID.matcher(cleaned);
        if (matcher.find()) return matcher.group(1);
        throw new IllegalArgumentException("URL ou videoId do YouTube invalido");
    }

    public static String watchUrl(String videoId) {
        return "https://www.youtube.com/watch?v=" + videoId;
    }

    private static List<SongResult> searchWithFilter(String query, String filter, int limit) throws Exception {
        int max = effectiveLimit(limit, SEARCH_PAGE_SAFETY_LIMIT);
        List<String> filters = filter == null || filter.isEmpty()
            ? Collections.emptyList()
            : Collections.singletonList(filter);
        SearchQueryHandler handler = ServiceList.YouTube.getSearchQHFactory().fromQuery(query, filters, "");
        SearchInfo info = SearchInfo.getInfo(ServiceList.YouTube, handler);
        Map<String, SongResult> unique = new LinkedHashMap<>();
        collectSearchItems(info.getRelatedItems(), unique, max);

        Page nextPage = info.getNextPage();
        int pages = 0;
        while (Page.isValid(nextPage) && unique.size() < max && pages < MAX_PAGE_REQUESTS) {
            String previousPage = pageKey(nextPage);
            ListExtractor.InfoItemsPage<InfoItem> page =
                SearchInfo.getMoreItems(ServiceList.YouTube, handler, nextPage);
            collectSearchItems(page.getItems(), unique, max);
            if (!page.hasNextPage()) break;
            nextPage = page.getNextPage();
            if (!Page.isValid(nextPage) || previousPage.equals(pageKey(nextPage))) break;
            pages++;
        }

        return new ArrayList<>(unique.values());
    }

    private static List<SongResult> collectPlaylist(PlaylistInfo info, String url) throws Exception {
        int max = PLAYLIST_PAGE_SAFETY_LIMIT;
        Map<String, SongResult> unique = new LinkedHashMap<>();
        collectStreamItems(info.getRelatedItems(), unique, max);

        Page nextPage = info.getNextPage();
        int pages = 0;
        while (Page.isValid(nextPage) && unique.size() < max && pages < MAX_PAGE_REQUESTS) {
            String previousPage = pageKey(nextPage);
            ListExtractor.InfoItemsPage<StreamInfoItem> page =
                PlaylistInfo.getMoreItems(ServiceList.YouTube, url, nextPage);
            collectStreamItems(page.getItems(), unique, max);
            if (!page.hasNextPage()) break;
            nextPage = page.getNextPage();
            if (!Page.isValid(nextPage) || previousPage.equals(pageKey(nextPage))) break;
            pages++;
        }

        return new ArrayList<>(unique.values());
    }

    private static void collectSearchItems(List<InfoItem> items, Map<String, SongResult> unique, int limit) {
        if (items == null) return;
        for (InfoItem item : items) {
            if (!(item instanceof StreamInfoItem)) continue;
            SongResult song = toSong((StreamInfoItem) item);
            addSong(unique, song, limit);
            if (unique.size() >= limit) break;
        }
    }

    private static void collectStreamItems(List<StreamInfoItem> items, Map<String, SongResult> unique, int limit) {
        if (items == null) return;
        for (StreamInfoItem item : items) {
            addSong(unique, toSong(item), limit);
            if (unique.size() >= limit) break;
        }
    }

    private static void addSong(Map<String, SongResult> unique, SongResult song, int limit) {
        if (song == null || unique.size() >= limit || unique.containsKey(song.id)) return;
        unique.put(song.id, song);
    }

    private static int effectiveLimit(int requested, int fallback) {
        if (requested <= 0) return fallback;
        return Math.min(requested, fallback);
    }

    private static String pageKey(Page page) {
        if (page == null) return "";
        if (page.getUrl() != null && !page.getUrl().isEmpty()) return page.getUrl();
        if (page.getId() != null && !page.getId().isEmpty()) return page.getId();
        return String.valueOf(page.getIds());
    }

    private static SongResult toSong(StreamInfoItem item) {
        try {
            String id = extractVideoId(item.getUrl());
            return new SongResult(
                id,
                safe(item.getName(), "Sem titulo"),
                safe(item.getUploaderName(), "YouTube"),
                bestImage(item.getThumbnails(), thumbnail(id)),
                item.getDuration(),
                watchUrl(id)
            );
        } catch (Exception ignored) {
            return null;
        }
    }

    private static AudioStream chooseAudioStream(List<AudioStream> streams) {
        if (streams == null || streams.isEmpty()) return null;
        AudioStream best = null;
        int bestScore = Integer.MIN_VALUE;
        for (AudioStream stream : streams) {
            if (stream == null || !stream.isUrl() || stream.getContent() == null) continue;
            int score = score(stream);
            if (score > bestScore) {
                best = stream;
                bestScore = score;
            }
        }
        return best;
    }

    private static int score(AudioStream stream) {
        MediaFormat format = stream.getFormat();
        int bitrate = stream.getAverageBitrate() > 0 ? stream.getAverageBitrate() : stream.getBitrate();
        int score = Math.max(0, bitrate);
        if (format == MediaFormat.M4A) score += 10000;
        else if (format == MediaFormat.WEBMA_OPUS || format == MediaFormat.OPUS) score += 9000;
        else if (format == MediaFormat.WEBMA || format == MediaFormat.OGG) score += 8000;
        else score += 2000;

        String delivery = String.valueOf(stream.getDeliveryMethod()).toLowerCase(Locale.US);
        if (delivery.contains("progressive")) score += 500;
        return score;
    }

    private static String bestImage(List<Image> images, String fallback) {
        if (images == null || images.isEmpty()) return fallback;
        Image best = images.get(0);
        int bestPixels = 0;
        for (Image image : images) {
            if (image == null || image.getUrl() == null || image.getUrl().isEmpty()) continue;
            int pixels = Math.max(0, image.getWidth()) * Math.max(0, image.getHeight());
            if (pixels >= bestPixels) {
                best = image;
                bestPixels = pixels;
            }
        }
        return best.getUrl() == null || best.getUrl().isEmpty() ? fallback : best.getUrl();
    }

    private static String thumbnail(String videoId) {
        return "https://i.ytimg.com/vi/" + videoId + "/mqdefault.jpg";
    }

    private static String safe(String value, String fallback) {
        return value == null || value.trim().isEmpty() ? fallback : value;
    }

    public static final class AudioResult {
        public final String videoId;
        public final String audioUrl;
        public final String mimeType;
        public final String extension;
        public final String title;
        public final String artist;
        public final String thumbnail;
        public final long durationSeconds;
        public final int bitrate;

        AudioResult(String videoId, String audioUrl, String mimeType, String extension, String title,
                    String artist, String thumbnail, long durationSeconds, int bitrate) {
            this.videoId = videoId;
            this.audioUrl = audioUrl;
            this.mimeType = mimeType;
            this.extension = extension;
            this.title = title;
            this.artist = artist;
            this.thumbnail = thumbnail;
            this.durationSeconds = durationSeconds;
            this.bitrate = bitrate;
        }
    }

    public static final class SongResult {
        public final String id;
        public final String title;
        public final String artist;
        public final String thumbnail;
        public final long durationSeconds;
        public final String url;

        SongResult(String id, String title, String artist, String thumbnail, long durationSeconds, String url) {
            this.id = id;
            this.title = title;
            this.artist = artist;
            this.thumbnail = thumbnail;
            this.durationSeconds = durationSeconds;
            this.url = url;
        }
    }

    public static final class PlaylistResult {
        public final String title;
        public final List<SongResult> songs;

        PlaylistResult(String title, List<SongResult> songs) {
            this.title = title;
            this.songs = songs;
        }
    }
}
