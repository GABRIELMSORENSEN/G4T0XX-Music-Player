package com.g4t0xx.musicplayer;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

import java.lang.reflect.Method;
import java.util.List;

public class NewPipeExtractorManagerTest {
    @Test
    public void scrapeSearchDecodesEscapedMobileYoutubeData() throws Exception {
        String html =
            "\\x7b\\x22videoWithContextRenderer\\x22:\\x7b" +
            "\\x22title\\x22:\\x7b\\x22runs\\x22:\\x5b\\x7b\\x22text\\x22:\\x22Musica Teste\\x22\\x7d\\x5d\\x7d," +
            "\\x22longBylineText\\x22:\\x7b\\x22runs\\x22:\\x5b\\x7b\\x22text\\x22:\\x22Artista Teste\\x22\\x7d\\x5d\\x7d," +
            "\\x22watchEndpoint\\x22:\\x7b\\x22videoId\\x22:\\x22abc123XYZ90\\x22\\x7d" +
            "\\x7d\\x7d";

        Method method = NewPipeExtractorManager.class.getDeclaredMethod("scrapeSongsFromHtml", String.class, int.class);
        method.setAccessible(true);

        @SuppressWarnings("unchecked")
        List<NewPipeExtractorManager.SongResult> songs =
            (List<NewPipeExtractorManager.SongResult>) method.invoke(null, html, 5);

        assertEquals(1, songs.size());
        assertEquals("abc123XYZ90", songs.get(0).id);
        assertEquals("Musica Teste", songs.get(0).title);
        assertEquals("Artista Teste", songs.get(0).artist);
    }

    @Test
    public void scrapeSearchZeroLimitMeansCollectEveryFoundResult() throws Exception {
        StringBuilder html = new StringBuilder();
        for (int i = 0; i < 205; i++) {
            String id = String.format("vid%08d", i);
            html.append("{\"playlistVideoRenderer\":{")
                .append("\"videoId\":\"").append(id).append("\",")
                .append("\"title\":{\"runs\":[{\"text\":\"Musica ").append(i).append("\"}]},")
                .append("\"shortBylineText\":{\"runs\":[{\"text\":\"Artista ").append(i).append("\"}]}")
                .append("}}");
        }

        Method method = NewPipeExtractorManager.class.getDeclaredMethod("scrapeSongsFromHtml", String.class, int.class);
        method.setAccessible(true);

        @SuppressWarnings("unchecked")
        List<NewPipeExtractorManager.SongResult> songs =
            (List<NewPipeExtractorManager.SongResult>) method.invoke(null, html.toString(), 0);

        assertEquals(205, songs.size());
        assertEquals("vid00000000", songs.get(0).id);
        assertEquals("vid00000204", songs.get(204).id);
    }
}
