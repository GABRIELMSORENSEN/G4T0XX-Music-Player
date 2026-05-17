package com.g4t0xx.musicplayer;

import android.media.audiofx.Equalizer;
import android.media.audiofx.BassBoost;
import android.media.audiofx.Virtualizer;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeAudioEffects")
public class NativeAudioEffectsPlugin extends Plugin {
    private Equalizer equalizer;
    private BassBoost bassBoost;
    private Virtualizer virtualizer;

    @PluginMethod
    public void setPreset(PluginCall call) {
        String preset = call.getString("preset", "Normal");
        JSObject ret = new JSObject();

        try {
            if ("Normal".equals(preset)) {
                releaseEqualizer();
                ret.put("enabled", false);
                call.resolve(ret);
                return;
            }

            ensureEqualizer();
            ensureSpatialEffects();
            applyPreset(preset);
            equalizer.setEnabled(true);

            ret.put("enabled", true);
            call.resolve(ret);
        } catch (Exception e) {
            releaseEqualizer();
            ret.put("enabled", false);
            call.resolve(ret);
        }
    }

    private void ensureEqualizer() {
        if (equalizer == null) {
            equalizer = new Equalizer(0, 0);
        }
    }

    private void releaseEqualizer() {
        if (equalizer != null) {
            try { equalizer.setEnabled(false); } catch (Exception ignored) {}
            try { equalizer.release(); } catch (Exception ignored) {}
            equalizer = null;
        }
        if (bassBoost != null) {
            try { bassBoost.setEnabled(false); } catch (Exception ignored) {}
            try { bassBoost.release(); } catch (Exception ignored) {}
            bassBoost = null;
        }
        if (virtualizer != null) {
            try { virtualizer.setEnabled(false); } catch (Exception ignored) {}
            try { virtualizer.release(); } catch (Exception ignored) {}
            virtualizer = null;
        }
    }

    private void ensureSpatialEffects() {
        if (bassBoost == null) {
            try { bassBoost = new BassBoost(0, 0); } catch (Exception ignored) {}
        }
        if (virtualizer == null) {
            try { virtualizer = new Virtualizer(0, 0); } catch (Exception ignored) {}
        }
    }

    private void applyPreset(String preset) {
        short bands = equalizer.getNumberOfBands();
        short[] range = equalizer.getBandLevelRange();
        int min = range[0];
        int max = range[1];

        for (short band = 0; band < bands; band++) {
            int hz = equalizer.getCenterFreq(band) / 1000;
            int gain = gainFor(preset, hz);
            short clamped = (short) Math.max(min, Math.min(max, gain * 100));
            equalizer.setBandLevel(band, clamped);
        }

        try {
            if (bassBoost != null) {
                boolean enabled = "Bass Boost".equals(preset) || "Deep Bass".equals(preset) || "8D Audio".equals(preset) || "9D Audio".equals(preset);
                bassBoost.setStrength((short) ("Deep Bass".equals(preset) ? 900 : enabled ? 650 : 0));
                bassBoost.setEnabled(enabled);
            }
        } catch (Exception ignored) {}

        try {
            if (virtualizer != null) {
                boolean spatial = "8D Audio".equals(preset) || "9D Audio".equals(preset) || "Live".equals(preset);
                virtualizer.setStrength((short) ("9D Audio".equals(preset) ? 1000 : spatial ? 750 : 0));
                virtualizer.setEnabled(spatial);
            }
        } catch (Exception ignored) {}
    }

    private int gainFor(String preset, int hz) {
        boolean low = hz < 250;
        boolean mid = hz >= 250 && hz < 4000;
        boolean high = hz >= 4000;

        switch (preset) {
            case "Bass Boost": return low ? 9 : mid ? 1 : -1;
            case "Deep Bass": return low ? 12 : mid ? 2 : -2;
            case "Treble": return high ? 8 : low ? -2 : 1;
            case "Vocal": return mid ? 7 : low ? -2 : 2;
            case "Club": return low ? 6 : mid ? 4 : 3;
            case "Rock": return low ? 5 : mid ? 2 : 7;
            case "Pop": return low ? 3 : mid ? 5 : 4;
            case "Soft": return high ? -4 : low ? 1 : -1;
            case "Night": return low ? -4 : high ? -2 : 1;
            case "Live": return low ? 4 : mid ? 5 : 3;
            case "8D Audio":
            case "9D Audio": return high ? 4 : low ? 3 : 2;
            default: return 0;
        }
    }
}
