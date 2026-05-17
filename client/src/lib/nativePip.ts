import { Capacitor, registerPlugin } from '@capacitor/core';

interface NativePipPlugin {
  enter(): Promise<{ active: boolean; supported: boolean }>;
  setAuto(options: { enabled: boolean }): Promise<{ enabled: boolean; supported: boolean }>;
  isSupported(): Promise<{ supported: boolean }>;
}

const NativePip = registerPlugin<NativePipPlugin>('NativePip');

export function canUseNativePip() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function enterNativePip() {
  if (!canUseNativePip()) return { active: false, supported: false };
  return NativePip.enter();
}

export async function setNativePipAuto(enabled: boolean) {
  if (!canUseNativePip()) return { enabled: false, supported: false };
  return NativePip.setAuto({ enabled });
}

export async function isNativePipSupported() {
  if (!canUseNativePip()) return false;
  const result = await NativePip.isSupported();
  return !!result.supported;
}
