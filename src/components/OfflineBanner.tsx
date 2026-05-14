import { useState, useEffect } from 'react';
import { Icon } from './Icons';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Full-width banner that appears when the browser loses network connectivity.
 * Uses navigator.onLine + online/offline events for detection.
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          style={{
            background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)',
            color: 'white',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            fontSize: 14,
            fontWeight: 600,
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          <Icon name="WifiOff" />
          <span>⚠️ אין חיבור לרשת — המערכת עובדת במצב לא מקוון. נתונים עלולים שלא להתעדכן.</span>
          <span style={{ 
            background: 'rgba(255,255,255,0.2)', 
            padding: '2px 10px', 
            borderRadius: 4, 
            fontSize: 11,
            fontWeight: 400,
          }}>
            OFFLINE
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
