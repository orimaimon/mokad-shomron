import { useState, useEffect } from 'react';
import { Icon } from './Icons';
import { motion, AnimatePresence } from 'motion/react';

// --- Regular Toast ---
let addToastFn: (msg: string, type: 'success' | 'error' | 'info') => void;
export const toast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
  if (addToastFn) addToastFn(msg, type);
};

// --- Confirm Dialog ---
let confirmFn: (title: string, msg: string, onConfirm: () => void) => void;
export const confirmDialog = (title: string, msg: string, onConfirm: () => void) => {
  if (confirmFn) confirmFn(title, msg, onConfirm);
};

// --- Alert Banner ---
export type AlertType = 'approval' | 'emergency' | 'incident';

interface AlertBannerItem {
  id: number;
  type: AlertType;
  msg: string;
  onClick?: () => void;
}

let addAlertFn: (type: AlertType, msg: string, onClick?: () => void) => void;
export const alertBanner = (type: AlertType, msg: string, onClick?: () => void) => {
  if (addAlertFn) addAlertFn(type, msg, onClick);
};

function AlertBanner({ item, onDismiss }: { item: AlertBannerItem; onDismiss: () => void }) {
  const isEmergency = item.type === 'emergency';
  const color = isEmergency ? '#ef4444' : '#f59e0b';
  const bg = isEmergency ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)';
  const border = isEmergency ? 'rgba(239,68,68,0.5)' : 'rgba(245,158,11,0.5)';
  const iconName = isEmergency ? 'Siren' : 'Bell';

  return (
    <motion.div
      initial={{ y: -60, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -60, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      style={{
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 10,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        backdropFilter: 'blur(14px)',
        boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px ${border} inset`,
        cursor: item.onClick ? 'pointer' : 'default',
        width: 440,
        maxWidth: 'calc(100vw - 48px)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={() => { item.onClick?.(); onDismiss(); }}
    >
      {/* countdown bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 2,
        background: color,
        opacity: 0.6,
        animation: 'alertProgress 8s linear forwards',
        pointerEvents: 'none',
      }} />
      <div style={{ color, flexShrink: 0 }}>
        <Icon name={iconName} style={{ width: 20, height: 20 }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{item.msg}</div>
        {item.onClick && (
          <div style={{ fontSize: 11, color, marginTop: 2, opacity: 0.8 }}>לחץ לעבור →</div>
        )}
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDismiss(); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4, flexShrink: 0, display: 'flex', alignItems: 'center' }}
      >
        <Icon name="X" style={{ width: 14, height: 14 }} />
      </button>
    </motion.div>
  );
}

export function ToastProvider() {
  const [toasts, setToasts] = useState<{ id: number, msg: string, type: string }[]>([]);
  const [confirmState, setConfirmState] = useState<{ title: string, msg: string, onConfirm: () => void } | null>(null);
  const [alerts, setAlerts] = useState<AlertBannerItem[]>([]);

  const dismissAlert = (id: number) => setAlerts(p => p.filter(a => a.id !== id));

  useEffect(() => {
    addToastFn = (msg, type) => {
      const id = Date.now();
      setToasts(p => [...p, { id, msg, type }]);
      setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
    };
    confirmFn = (title, msg, onConfirm) => {
      setConfirmState({ title, msg, onConfirm });
    };
    addAlertFn = (type, msg, onClick) => {
      const id = Date.now();
      setAlerts(p => [...p, { id, type, msg, onClick }]);
      setTimeout(() => setAlerts(p => p.filter(a => a.id !== id)), 8000);
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
      {/* Alert Banners — top center, high priority */}
      <div style={{
        position: 'fixed',
        top: 72,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9990,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignItems: 'center',
        pointerEvents: 'none',
      }}>
        <AnimatePresence>
          {alerts.map(a => (
            <div key={a.id} style={{ pointerEvents: 'auto' }}>
              <AlertBanner item={a} onDismiss={() => dismissAlert(a.id)} />
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Regular Toasts — bottom left */}
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
