import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Image, Trash2, Monitor, Palette, Sliders, Check } from 'lucide-react';

export const ACCENT_COLORS = [
  { id: 'red',    hex: '#e11d48' }, { id: 'rose',   hex: '#f43f5e' },
  { id: 'orange', hex: '#f97316' }, { id: 'amber',  hex: '#f59e0b' },
  { id: 'green',  hex: '#22c55e' }, { id: 'blue',   hex: '#3b82f6' },
  { id: 'violet', hex: '#8b5cf6' }, { id: 'pink',   hex: '#ec4899' },
  { id: 'cyan',   hex: '#06b6d4' }, { id: 'white',  hex: '#ffffff' },
  { id: 'gray',   hex: '#6b7280' }, { id: 'black',  hex: '#1a1a1a' },
];

export const EQ_PRESETS = [
  'Normal', 'Bass Boost', 'Treble', 'Vocal', 'Club', 'Rock', 'Pop',
  '8D Audio', '9D Audio', 'Deep Bass', 'Soft',
];

export type UISize = 'small' | 'normal' | 'large';

interface Props {
  isOpen: boolean; onClose: () => void;
  bgImage: string; bgVideo: string; bgOpacity: number; bgBlur: number;
  onBgOpacityChange: (v: number) => void; onBgBlurChange: (v: number) => void;
  onBgPick: () => void; onBgRemove: () => void;
  bgFileRef: React.RefObject<HTMLInputElement | null>;
  onBgFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  accentColor: string; customColor: string;
  onAccentChange: (hex: string) => void; onCustomColorChange: (hex: string) => void;
  uiSize: UISize; onUISizeChange: (s: UISize) => void;
  eqPreset: string; onEQChange: (preset: string) => void;
  notifGranted: boolean; onRequestPerms: () => void;
}

export function SettingsPanel({
  isOpen, onClose, bgImage, bgVideo, bgOpacity, bgBlur,
  onBgOpacityChange, onBgBlurChange, onBgPick, onBgRemove, bgFileRef, onBgFileChange,
  accentColor, customColor, onAccentChange, onCustomColorChange,
  uiSize, onUISizeChange, eqPreset, onEQChange, notifGranted, onRequestPerms,
}: Props) {
  const [storageText, setStorageText] = useState('');

  useEffect(() => {
    if (!isOpen || !navigator.storage?.estimate) return;
    navigator.storage.estimate().then(estimate => {
      const used = estimate.usage ? estimate.usage / 1024 / 1024 : 0;
      const quota = estimate.quota ? estimate.quota / 1024 / 1024 : 0;
      if (quota > 0) setStorageText(`${used.toFixed(0)} MB usados de ${quota.toFixed(0)} MB`);
    }).catch(() => {});
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[400] flex items-end justify-center bg-black/70 backdrop-blur-sm"
          onClick={onClose}>
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="bg-[#111] rounded-t-3xl w-full max-w-sm border-t border-white/10 overflow-hidden"
            style={{ maxHeight: '92dvh', paddingBottom: 'max(24px,env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-white/20 rounded-full"/></div>
            <div className="flex items-center justify-between px-5 pb-3 border-b border-white/5">
              <h3 className="font-black text-lg">Configurações</h3>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/8 text-zinc-400"><X size={16}/></button>
            </div>

            <div className="overflow-y-auto px-5 py-4 space-y-6" style={{ maxHeight: 'calc(92dvh - 80px)', WebkitOverflowScrolling: 'touch' }}>

              {/* UI Size */}
              <Section icon={<Monitor size={14}/>} title="TAMANHO DA INTERFACE">
                <div className="grid grid-cols-3 gap-2">
                  {(['small','normal','large'] as UISize[]).map(s=>(
                    <button key={s} onClick={()=>onUISizeChange(s)}
                      className={`py-3 rounded-2xl text-sm font-bold transition-all capitalize ${uiSize===s?'text-white':'bg-white/8 text-zinc-400 hover:bg-white/12'}`}
                      style={uiSize===s?{backgroundColor:'var(--accent,#e11d48)'}:{}}>
                      {s==='small'?'Pequeno':s==='normal'?'Normal':'Grande'}
                    </button>
                  ))}
                </div>
              </Section>

              {/* BG */}
              <Section icon={<Image size={14}/>} title="PLANO DE FUNDO">
                <button onClick={onBgPick}
                  className="w-full py-3 bg-white/8 border border-dashed border-white/15 rounded-2xl text-sm text-zinc-400 hover:bg-white/12 flex items-center justify-center gap-2 mb-2">
                  <Image size={15}/> Escolher imagem/vídeo
                </button>
                <input ref={bgFileRef} type="file" accept="image/*,video/*,.gif" className="hidden" onChange={onBgFileChange}/>
                {(bgImage||bgVideo)&&(
                  <button onClick={onBgRemove}
                    className="w-full py-2.5 bg-white/5 rounded-2xl text-sm text-zinc-400 hover:bg-white/10 flex items-center justify-center gap-2 mb-3">
                    <Trash2 size={13}/> Remover fundo
                  </button>
                )}
                <SliderRow label="Opacidade" value={bgOpacity} min={0} max={100} unit="%" onChange={onBgOpacityChange}/>
                <SliderRow label="Desfoque" value={bgBlur} min={0} max={20} unit="px" onChange={onBgBlurChange}/>
              </Section>

              {/* Accent */}
              <Section icon={<Palette size={14}/>} title="COR DE DESTAQUE">
                <div className="grid grid-cols-6 gap-2 mb-3">
                  {ACCENT_COLORS.map(c=>(
                    <button key={c.id} onClick={()=>onAccentChange(c.hex)}
                      className="aspect-square rounded-2xl flex items-center justify-center transition-transform active:scale-90"
                      style={{backgroundColor:c.hex,border:accentColor===c.hex?'2px solid white':'2px solid transparent'}}>
                      {accentColor===c.hex&&<Check size={14} className={c.hex==='#ffffff'?'text-black':'text-white'}/>}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">Customizado:</span>
                  <div className="relative">
                    <div className="w-8 h-8 rounded-lg cursor-pointer border-2 border-white/20" style={{backgroundColor:customColor}}
                      onClick={()=>document.getElementById('clr-pick')?.click()}/>
                    <input id="clr-pick" type="color" value={customColor}
                      onChange={e=>{onCustomColorChange(e.target.value);onAccentChange(e.target.value);}}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"/>
                  </div>
                </div>
              </Section>

              {/* EQ */}
              <Section icon={<Sliders size={14}/>} title="EQUALIZAÇÃO / EFEITOS">
                <div className="grid grid-cols-3 gap-2">
                  {EQ_PRESETS.map(preset=>(
                    <button key={preset} onClick={()=>onEQChange(preset)}
                      className={`py-2.5 rounded-2xl text-xs font-bold transition-all ${eqPreset===preset?'text-white':'bg-white/8 text-zinc-400 hover:bg-white/12'}`}
                      style={eqPreset===preset?{backgroundColor:'var(--accent,#e11d48)'}:{}}>
                      {preset==='8D Audio'?'🎧 8D':preset==='9D Audio'?'🌀 9D':preset}
                    </button>
                  ))}
                </div>
                {(eqPreset==='8D Audio'||eqPreset==='9D Audio')&&(
                  <p className="text-[10px] text-zinc-500 mt-2">
                    {eqPreset==='8D Audio'?'Efeito de som ao redor (pan automático + reverb)':'Efeito 9D — pan + reverb + tremolo intenso'}
                  </p>
                )}
              </Section>

              {/* Permissions */}
              <Section icon={<Check size={14}/>} title="PERMISSÕES">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl mb-2">
                  <span className="text-xs text-zinc-300">Notificações</span>
                  <span className={`text-xs font-bold ${notifGranted?'text-green-400':'text-zinc-500'}`}>
                    {notifGranted?'✓ Ativas':'Inativas'}
                  </span>
                </div>
                {!notifGranted&&(
                  <button onClick={onRequestPerms}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white"
                    style={{backgroundColor:'var(--accent,#e11d48)'}}>
                    Ativar notificações
                  </button>
                )}
                <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-xl p-3 space-y-1 text-xs">
                  <p className="font-bold text-green-400">✓ Áudio nativo — toca com tela desligada</p>
                  <p className="font-bold text-blue-400">✓ MediaSession — controles no shade</p>
                  <p className="font-bold text-yellow-400">✓ Multi-provider: Piped + Invidious + Cobalt</p>
                  {storageText && <p className="font-bold text-zinc-300">Offline: {storageText}</p>}
                </div>
              </Section>

              <p className="text-center text-zinc-700 text-xs pb-2">G4T0XX Music Player v1.0</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-zinc-500">{icon}</span>
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{title}</span>
      </div>
      {children}
    </div>
  );
}

function SliderRow({ label, value, min, max, unit, onChange }: {
  label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-zinc-400">{label}</span>
        <span className="text-xs text-zinc-500">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right,var(--accent,#e11d48) ${pct}%,#27272a ${pct}%)` }}/>
    </div>
  );
}
