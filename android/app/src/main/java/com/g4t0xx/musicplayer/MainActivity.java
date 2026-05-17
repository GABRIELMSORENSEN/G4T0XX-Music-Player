package com.g4t0xx.musicplayer;

import android.app.Activity;
import android.app.PictureInPictureParams;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Rational;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static volatile boolean autoPictureInPicture;

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(LocalMusicPlugin.class);
        registerPlugin(NativeAudioEffectsPlugin.class);
        registerPlugin(NewPipeAudioPlugin.class);
        registerPlugin(NativePipPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onUserLeaveHint() {
        if (autoPictureInPicture) enterPictureInPicture(this);
        super.onUserLeaveHint();
    }

    static void setAutoPictureInPicture(boolean enabled) {
        autoPictureInPicture = enabled;
    }

    static boolean isPictureInPictureSupported(Activity activity) {
        if (activity == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false;
        return activity.getPackageManager().hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE);
    }

    static boolean enterPictureInPicture(Activity activity) {
        if (!isPictureInPictureSupported(activity)) return false;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && activity.isInPictureInPictureMode()) {
                return true;
            }
            PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder()
                .setAspectRatio(new Rational(16, 9));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                builder.setAutoEnterEnabled(true);
            }
            activity.enterPictureInPictureMode(builder.build());
            return true;
        } catch (Exception ignored) {
            return false;
        }
    }
}
