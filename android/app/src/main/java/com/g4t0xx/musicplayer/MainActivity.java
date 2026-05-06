package com.g4t0xx.musicplayer;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(LocalMusicPlugin.class);
        registerPlugin(NativeAudioEffectsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
