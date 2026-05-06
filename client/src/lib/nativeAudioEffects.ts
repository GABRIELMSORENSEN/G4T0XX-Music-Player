import { Capacitor, registerPlugin } from '@capacitor/core';

interface NativeAudioEffectsPlugin {
  setPreset(options: { preset: string }): Promise<{ enabled: boolean }>;
}

const NativeAudioEffects = registerPlugin<NativeAudioEffectsPlugin>('NativeAudioEffects');

export function supportsNativeAudioEffects() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function setNativeEqualizerPreset(preset: string) {
  if (!supportsNativeAudioEffects()) return false;
  try {
    const result = await NativeAudioEffects.setPreset({ preset });
    return !!result.enabled;
  } catch {
    return false;
  }
}
