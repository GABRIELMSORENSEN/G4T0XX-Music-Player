package com.g4t0xx.musicplayer;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativePip")
public class NativePipPlugin extends Plugin {
    @PluginMethod
    public void enter(PluginCall call) {
        boolean supported = MainActivity.isPictureInPictureSupported(getActivity());
        boolean active = supported && MainActivity.enterPictureInPicture(getActivity());
        JSObject ret = new JSObject();
        ret.put("supported", supported);
        ret.put("active", active);
        call.resolve(ret);
    }

    @PluginMethod
    public void setAuto(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        MainActivity.setAutoPictureInPicture(enabled);
        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        ret.put("supported", MainActivity.isPictureInPictureSupported(getActivity()));
        call.resolve(ret);
    }

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("supported", MainActivity.isPictureInPictureSupported(getActivity()));
        call.resolve(ret);
    }
}
