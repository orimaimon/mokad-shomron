import { motion } from 'motion/react';

interface HotkeyHelpProps {
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['1'], description: 'מעבר למסך שגרה' },
  { keys: ['2'], description: 'מעבר לתצוגת חמ"ל' },
  { keys: ['3'], description: 'מעבר לניהול מוקד' },
  { keys: ['4'], description: 'מעבר לארכיון ודוחות' },
  { keys: ['Ctrl', 'E'], description: 'פתיחת אירוע חירום' },
  { keys: ['Ctrl', 'N'], description: 'פתיחת אירוע שגרה חדש' },
  { keys: ['Ctrl', '/'], description: 'הצגת קיצורי מקלדת (חלון זה)' },
  { keys: ['Esc'], description: 'סגירת חלון / ביטול' },
];

export function HotkeyHelp({ onClose }: HotkeyHelpProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="scrim"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="modal sm"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 440 }}
      >
        <div className="h">
          <h3>⌨️ קיצורי מקלדת</h3>
        </div>
        <div className="b" style={{ padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {SHORTCUTS.map((shortcut, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: i < SHORTCUTS.length - 1 ? '1px solid var(--border-1)' : 'none',
                  }}
                >
                  <td style={{ padding: '10px 16px', display: 'flex', gap: 4 }}>
                    {shortcut.keys.map((key, j) => (
                      <span key={j}>
                        <kbd style={{
                          background: 'var(--bg-2)',
                          border: '1px solid var(--border-1)',
                          borderRadius: 4,
                          padding: '2px 8px',
                          fontSize: 12,
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          color: 'var(--ink-1)',
                        }}>
                          {key}
                        </kbd>
                        {j < shortcut.keys.length - 1 && (
                          <span style={{ margin: '0 2px', color: 'var(--ink-4)', fontSize: 11 }}>+</span>
                        )}
                      </span>
                    ))}
                  </td>
                  <td style={{
                    padding: '10px 16px',
                    color: 'var(--ink-2)',
                    fontSize: 13,
                    textAlign: 'right',
                  }}>
                    {shortcut.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="f">
          <button className="btn ghost" onClick={onClose}>סגור</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
