import { useState, useEffect } from 'react';
import { Icon } from './Icons';
import { motion, AnimatePresence } from 'motion/react';

let addToastFn: (msg: string, type: 'success' | 'error' | 'info') => void;
export const toast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
  if (addToastFn) addToastFn(msg, type);
};

let confirmFn: (title: string, msg: string, onConfirm: () => void) => void;
export const confirmDialog = (title: string, msg: string, onConfirm: () => void) => {
  if (confirmFn) confirmFn(title, msg, onConfirm);
};

export function ToastProvider() {
  const [toasts, setToasts] = useState<{ id: number, msg: string, type: string }[]>([]);
  const [confirmState, setConfirmState] = useState<{ title: string, msg: string, onConfirm: () => void } | null>(null);

  useEffect(() => {
    addToastFn = (msg, type) => {
      const id = Date.now();
      setToasts(p => [...p, { id, msg, type }]);
      setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
    };
    confirmFn = (title, msg, onConfirm) => {
      setConfirmState({ title, msg, onConfirm });
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && confirmState) {
        setConfirmState(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [confirmState]);

  return (
    <>
      <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 'var(--z-toast)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                background: t.type === 'error' ? 'rgba(220,38,38,0.95)' : t.type === 'success' ? 'rgba(22,163,74,0.95)' : 'rgba(14,19,27,0.95)',
                color: '#fff', padding: '12px 18px', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', gap: 10, backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <Icon name={t.type === 'error' ? 'AlertTriangle' : t.type === 'success' ? 'CheckCircle' : 'Info'} />
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {confirmState && (
          <div className="scrim" style={{ zIndex: 'var(--z-confirm)' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} className="modal sm" style={{ maxWidth: 400 }}>
              <div className="h"><Icon name="AlertTriangle" style={{ color: 'var(--amber)' }} /><h3>{confirmState.title}</h3></div>
              <div className="b" style={{ padding: '20px 20px 30px', fontSize: 14 }}>{confirmState.msg}</div>
              <div className="f">
                <button className="btn danger" onClick={() => { confirmState.onConfirm(); setConfirmState(null); }}>אישור</button>
                <button className="btn ghost" autoFocus onClick={() => setConfirmState(null)}>ביטול</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
