import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, HardDrive, Shield, Check } from 'lucide-react';

interface PermissionsModalProps {
  isOpen: boolean;
  onRequest: () => Promise<void>;
  onSkip: () => void;
}

export function PermissionsModal({ isOpen, onRequest, onSkip }: PermissionsModalProps) {
  const [loading, setLoading] = React.useState(false);

  const handleRequest = async () => {
    setLoading(true);
    await onRequest();
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-end justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="bg-[#111] rounded-3xl w-full max-w-sm border border-white/10 overflow-hidden"
            style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
          >
            <div className="p-6 space-y-5">
              {/* Icon + title */}
              <div className="text-center">
                <div className="w-16 h-16 bg-brand-red/15 border border-brand-red/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield size={28} className="text-brand-red" />
                </div>
                <h2 className="text-lg font-black">Permissões necessárias</h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Para funcionar como um player nativo completo
                </p>
              </div>

              {/* Permissions list */}
              <div className="space-y-3">
                <PermItem
                  icon={<Bell size={16} className="text-yellow-400" />}
                  title="Notificações"
                  desc="Controles de música na barra de status e tela de bloqueio"
                />
                <PermItem
                  icon={<HardDrive size={16} className="text-green-400" />}
                  title="Armazenamento"
                  desc="Salvar músicas offline no seu dispositivo"
                />
              </div>

              {/* Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleRequest}
                  disabled={loading}
                  className="w-full py-3.5 bg-brand-red rounded-2xl font-black text-sm hover:bg-red-700 active:scale-95 transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Solicitando...
                    </span>
                  ) : (
                    'Permitir tudo'
                  )}
                </button>
                <button
                  onClick={onSkip}
                  className="w-full py-2.5 text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
                >
                  Pular por agora
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PermItem({
  icon, title, desc,
}: {
  icon: React.ReactNode; title: string; desc: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
      <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-bold text-sm">{title}</p>
        <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
