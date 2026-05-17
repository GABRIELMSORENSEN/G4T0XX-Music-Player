package com.g4t0xx.musicplayer;

import org.schabi.newpipe.extractor.downloader.Downloader;
import org.schabi.newpipe.extractor.downloader.Request;
import org.schabi.newpipe.extractor.downloader.Response;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import okhttp3.Headers;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.RequestBody;

public final class NewPipeDownloader extends Downloader {
    private static final String USER_AGENT =
        "Mozilla/5.0 (Linux; Android 14; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0";

    private static final NewPipeDownloader INSTANCE = new NewPipeDownloader();

    private final OkHttpClient client = new OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS)
        .writeTimeout(25, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .retryOnConnectionFailure(true)
        .build();

    private NewPipeDownloader() {}

    public static NewPipeDownloader getInstance() {
        return INSTANCE;
    }

    public String getText(String url) throws IOException {
        okhttp3.Request request = new okhttp3.Request.Builder()
            .url(url)
            .header("User-Agent", USER_AGENT)
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            .header("Accept-Language", "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7")
            .header("Referer", "https://www.youtube.com/")
            .build();

        try (okhttp3.Response response = client.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("HTTP " + response.code() + " ao carregar " + url);
            }
            return response.body() == null ? "" : response.body().string();
        }
    }

    @Override
    public Response execute(Request request) throws IOException {
        okhttp3.Request.Builder builder = new okhttp3.Request.Builder()
            .url(request.url())
            .header("User-Agent", USER_AGENT)
            .header("Accept", "*/*")
            .header("Accept-Language", "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7")
            .header("Origin", "https://www.youtube.com")
            .header("Referer", "https://www.youtube.com/");

        Headers headers = buildHeaders(request.headers());
        for (String name : headers.names()) {
            builder.removeHeader(name);
            for (String value : headers.values(name)) {
                builder.addHeader(name, value);
            }
        }

        String method = request.httpMethod() == null ? "GET" : request.httpMethod().toUpperCase();
        byte[] data = request.dataToSend();
        if ("GET".equals(method)) {
            builder.get();
        } else if ("HEAD".equals(method)) {
            builder.head();
        } else {
            MediaType mediaType = null;
            String contentType = headers.get("Content-Type");
            if (contentType != null && !contentType.isEmpty()) {
                mediaType = MediaType.parse(contentType);
            }
            RequestBody body = RequestBody.create(data == null ? new byte[0] : data, mediaType);
            builder.method(method, body);
        }

        try (okhttp3.Response response = client.newCall(builder.build()).execute()) {
            String body = response.body() == null ? "" : response.body().string();
            return new Response(
                response.code(),
                response.message(),
                response.headers().toMultimap(),
                body,
                response.request().url().toString()
            );
        }
    }

    private Headers buildHeaders(Map<String, List<String>> source) {
        Headers.Builder builder = new Headers.Builder();
        if (source == null) return builder.build();

        for (Map.Entry<String, List<String>> entry : source.entrySet()) {
            String name = entry.getKey();
            if (name == null || entry.getValue() == null) continue;
            for (String value : entry.getValue()) {
                if (value != null) builder.add(name, value);
            }
        }
        return builder.build();
    }
}
