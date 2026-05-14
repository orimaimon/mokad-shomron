import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Icon } from './Icons';
import { motion, AnimatePresence } from 'motion/react';

interface SearchItem {
  type: 'incident' | 'person' | 'feed';
  typeLabel: string;
  title: string;
  subtitle?: string;
  id: number | string;
  action?: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: { id: number; type: string; location: string; status: string; severity: string }[];
  roster: { id: number; name: string; role: string; task: string; phone?: string; state: string }[];
  feed: { id: number; text: string; src: string; time: string }[];
  onNavigate?: (screen: string) => void;
}

export function CommandPalette({ isOpen, onClose, incidents, roster, feed, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const results = useMemo((): SearchItem[] => {
    if (!query.trim()) {
      // Show recent / quick actions when empty
      return [
        { type: 'incident', typeLabel: 'פעולה', title: 'פתיחת אירוע שגרה חדש', subtitle: 'Ctrl+N', id: 'new-incident' },
        { type: 'incident', typeLabel: 'פעולה', title: 'פתיחת אירוע חירום', subtitle: 'Ctrl+E', id: 'new-emergency' },
        { type: 'feed', typeLabel: 'ניווט', title: 'מסך שגרה', subtitle: '1', id: 'nav-routine' },
        { type: 'feed', typeLabel: 'ניווט', title: 'תצוגת חמ"ל', subtitle: '2', id: 'nav-dashboard' },
        { type: 'feed', typeLabel: 'ניווט', title: 'ניהול מוקד', subtitle: '3', id: 'nav-manage' },
      ];
    }

    const q = query.toLowerCase();
    const items: SearchItem[] = [];

    // Search incidents
    incidents.forEach(inc => {
      if (inc.type?.toLowerCase().includes(q) || inc.location?.toLowerCase().includes(q)) {
        items.push({
          type: 'incident',
          typeLabel: 'אירוע',
          title: `${inc.type} — ${inc.location}`,
          subtitle: inc.status,
          id: inc.id,
        });
      }
    });

    // Search roster
    roster.forEach(p => {
      if (p.name?.toLowerCase().includes(q) || p.role?.toLowerCase().includes(q) || p.task?.toLowerCase().includes(q)) {
        items.push({
          type: 'person',
          typeLabel: 'בעל תפקיד',
          title: p.name,
          subtitle: `${p.role} · ${p.task}`,
          id: p.id,
        });
      }
    });

    // Search feed
    feed.slice(0, 50).forEach(f => {
      if (f.text?.toLowerCase().includes(q) || f.src?.toLowerCase().includes(q)) {
        items.push({
          type: 'feed',
          typeLabel: 'דיווח',
          title: f.text.slice(0, 80),
          subtitle: `${f.src} · ${f.time}`,
          id: f.id,
        });
      }
    });

    return items.slice(0, 12);
  }, [query, incidents, roster, feed]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      const item = results[selectedIndex];
      if (item.id === 'nav-routine') onNavigate?.('routine');
      else if (item.id === 'nav-dashboard') onNavigate?.('dashboard');
      else if (item.id === 'nav-manage') onNavigate?.('manage');
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [results, selectedIndex, onClose, onNavigate]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="cmd-palette"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="cmd-box"
          initial={{ scale: 0.95, y: -10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: -10, opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', borderBottom: '1px solid var(--line)' }}>
            <Icon name="Search" style={{ width: 18, color: 'var(--ink-3)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              className="cmd-input"
              placeholder="חיפוש אירועים, בעלי תפקידים, דיווחים..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ padding: '16px 0', borderBottom: 'none' }}
            />
            <kbd style={{
              fontFamily: 'var(--mono)', fontSize: '10px', padding: '2px 6px',
              borderRadius: 4, background: 'var(--bg-4)', border: '1px solid var(--line)',
              color: 'var(--ink-4)', whiteSpace: 'nowrap'
            }}>ESC</kbd>
          </div>

          <div className="cmd-results">
            {results.length === 0 && query && (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
                לא נמצאו תוצאות עבור "{query}"
              </div>
            )}
            {results.map((item, i) => (
              <div
                key={`${item.type}-${item.id}`}
                className={`cmd-item ${i === selectedIndex ? 'selected' : ''}`}
                onClick={() => {
                  if (typeof item.id === 'string' && item.id.startsWith('nav-')) {
                    onNavigate?.(item.id.replace('nav-', ''));
                  }
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <Icon
                  name={item.type === 'incident' ? 'Siren' : item.type === 'person' ? 'User' : 'Doc'}
                  style={{ width: 16, color: 'var(--ink-4)', flexShrink: 0 }}
                />
                <span className="cmd-type">{item.typeLabel}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </span>
                {item.subtitle && (
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', flexShrink: 0 }}>{item.subtitle}</span>
                )}
              </div>
            ))}
          </div>

          <div className="cmd-footer">
            <span><kbd>↑↓</kbd> ניווט</span>
            <span><kbd>Enter</kbd> בחירה</span>
            <span><kbd>Esc</kbd> סגירה</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
