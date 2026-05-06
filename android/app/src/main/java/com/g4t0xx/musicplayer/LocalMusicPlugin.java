package com.g4t0xx.musicplayer;

import android.Manifest;
import android.content.ContentResolver;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.webkit.MimeTypeMap;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

@CapacitorPlugin(
    name = "LocalMusic",
    permissions = {
        @Permission(alias = "audio", strings = { Manifest.permission.READ_MEDIA_AUDIO }),
        @Permission(alias = "legacyStorage", strings = { Manifest.permission.READ_EXTERNAL_STORAGE })
    }
)
public class LocalMusicPlugin extends Plugin {
    private boolean hasAudioPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return getPermissionState("audio") == PermissionState.GRANTED;
        }
        return getPermissionState("legacyStorage") == PermissionState.GRANTED;
    }

    @PluginMethod
    public void requestAudioPermission(PluginCall call) {
        if (hasAudioPermission()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        requestPermissionForAlias(
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ? "audio" : "legacyStorage",
            call,
            "audioPermissionCallback"
        );
    }

    @PermissionCallback
    private void audioPermissionCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasAudioPermission());
        call.resolve(ret);
    }

    @PluginMethod
    public void listAudio(PluginCall call) {
        if (!hasAudioPermission()) {
            call.reject("Permissao de audio negada");
            return;
        }

        JSArray songs = new JSArray();
        ContentResolver resolver = getContext().getContentResolver();
        Uri collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;

        String[] projection = new String[] {
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.DISPLAY_NAME,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.MIME_TYPE
        };

        String selection = MediaStore.Audio.Media.MIME_TYPE + " LIKE ?";
        String[] selectionArgs = new String[] { "audio/%" };
        String sortOrder = MediaStore.Audio.Media.DATE_ADDED + " DESC";

        try (Cursor cursor = resolver.query(collection, projection, selection, selectionArgs, sortOrder)) {
            if (cursor != null) {
                int idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID);
                int titleCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE);
                int artistCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST);
                int nameCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME);
                int durationCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION);
                int mimeCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.MIME_TYPE);

                while (cursor.moveToNext()) {
                    long id = cursor.getLong(idCol);
                    Uri contentUri = Uri.withAppendedPath(collection, String.valueOf(id));

                    JSObject item = new JSObject();
                    item.put("id", String.valueOf(id));
                    item.put("title", safe(cursor.getString(titleCol)));
                    item.put("artist", safe(cursor.getString(artistCol)));
                    item.put("displayName", safe(cursor.getString(nameCol)));
                    item.put("durationMs", cursor.getLong(durationCol));
                    item.put("mimeType", safe(cursor.getString(mimeCol)));
                    item.put("uri", contentUri.toString());
                    songs.put(item);
                }
            }

            JSObject ret = new JSObject();
            ret.put("songs", songs);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao ler musicas locais", e);
        }
    }

    @PluginMethod
    public void prepareAudio(PluginCall call) {
        String uriValue = call.getString("uri", "");
        if (uriValue.isEmpty()) {
            call.reject("URI de audio ausente");
            return;
        }
        if (!hasAudioPermission()) {
            call.reject("Permissao de audio negada");
            return;
        }

        try {
            Uri sourceUri = Uri.parse(uriValue);
            String id = sanitize(call.getString("id", String.valueOf(System.currentTimeMillis())));
            String extension = extensionFor(call.getString("fileName", ""), call.getString("mimeType", ""));
            File dir = new File(getContext().getCacheDir(), "local-music");
            if (!dir.exists() && !dir.mkdirs()) {
                call.reject("Nao foi possivel criar cache de audio");
                return;
            }

            File outFile = new File(dir, id + extension);
            if (!outFile.exists() || outFile.length() == 0) {
                try (
                    InputStream in = getContext().getContentResolver().openInputStream(sourceUri);
                    FileOutputStream out = new FileOutputStream(outFile, false)
                ) {
                    if (in == null) {
                        call.reject("Nao foi possivel abrir arquivo de audio");
                        return;
                    }
                    byte[] buffer = new byte[1024 * 64];
                    int read;
                    while ((read = in.read(buffer)) != -1) {
                        out.write(buffer, 0, read);
                    }
                }
            }

            JSObject ret = new JSObject();
            ret.put("fileUri", Uri.fromFile(outFile).toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao preparar audio local", e);
        }
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private String sanitize(String value) {
        return value == null ? "audio" : value.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private String extensionFor(String fileName, String mimeType) {
        if (fileName != null) {
            int dot = fileName.lastIndexOf('.');
            if (dot >= 0 && dot < fileName.length() - 1) {
                String ext = fileName.substring(dot).replaceAll("[^A-Za-z0-9.]", "");
                if (ext.length() > 1 && ext.length() <= 8) return ext;
            }
        }
        if (mimeType == null || mimeType.isEmpty()) return ".mp3";
        String ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType);
        return ext == null || ext.isEmpty() ? ".mp3" : "." + ext;
    }
}
