import { useState, useEffect, useCallback } from 'react';
import { MOKAD_DATA } from './data/mockData';
import { Icon } from './components/Icons';
import { useNow, fmtTime, fmtDate } from './hooks/useClock';
import { EmergencyScreen } from './screens/EmergencyScreen';
import { RoutineScreen } from './screens/RoutineScreen';
import { ManagementScreen } from './screens/ManagementScreen';
import { ArchiveScreen } from './screens/ArchiveScreen';
import { MobileScreen } from './screens/MobileScreen';
import { LoginScreen } from './screens/LoginScreen';
import { AdminScreen } from './screens/AdminScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { ShiftScreen } from './screens/ShiftScreen';
import { OfflineBanner } from './components/OfflineBanner';
import { HotkeyHelp } from './components/HotkeyHelp';
import { CommandPalette } from './components/CommandPalette';
import { MapPicker } from './components/MapPicker';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { MokadData, User, NavItem, OpenEventFormData, DBFeedItem, DBIncident, DBRosterMember, DBActiveEventRaw } from './types';
import { io } from 'socket.io-client';
import { ToastProvider, toast, confirmDialog } from './components/Toast';
import { playNotificationSound, initAudio } from './lib/sounds';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './App.css';

const data = MOKAD_DATA as unknown as MokadData;

const NAV_ITEMS = [
  { k: 'routine', label: 'שגרה', icon: 'Pulse', cls: 'routine', hotkey: '1' },
  { k: 'emergency', label: 'אירוע חירום', icon: 'Siren', hotkey: '' },
  { k: 'dashboard', label: 'מצב חמ"ל', icon: 'Monitor', cls: 'brand-nav', hotkey: '2' },
  { k: 'manage', label: 'ניהול מוקד', icon: 'Settings', hotkey: '3' },
  { k: 'shifts', label: 'יומן משמרת', icon: 'Clock', hotkey: '' },
  { k: 'archive', label: 'ארכיון ודוחות', icon: 'Archive', hotkey: '4' },
  { k: 'analytics', label: 'סטטיסטיקות', icon: 'BarChart2', hotkey: '' },
  { k: 'mobile', label: 'ממשק מדווח', icon: 'User', hotkey: '' },
  { k: 'admin', label: 'ניהול מערכת', icon: 'Shield', admin: true, hotkey: '' },
];

function Sidebar({ screen, onScreen, user }: { screen: string; onScreen: (s: string) => void; user: User | null }) {
  return (
    <>
      <div className="sidebar-placeholder" />
      <div className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <div className="mark" />
            <div className="text-group">
              <span>מוקד שומרון</span>
              <small>· שו"ב v3.0</small>
            </div>
          </div>
        </div>
        <nav className="nav">
          {NAV_ITEMS.map((it: NavItem) => {
            if (it.admin && user?.role !== 'admin') return null;
            return (
              <a key={it.k} className={cn(screen === it.k && 'on', it.cls)} onClick={() => onScreen(it.k)} data-tooltip={it.label}>
                <div className="icon-wrap">
                  <span className="dot" />
                  <Icon name={it.icon} />
                </div>
                <span className="label">{it.label}</span>
                {it.hotkey && <span className="kbd mono">{it.hotkey}</span>}
              </a>
            );
          })}
        </nav>
      </div>
    </>
  );
}

function TopHeader({ emergency, user, onLogout, pendingApprovals, activeShift, onOpenSearch }: {
  emergency: boolean, user: User | null, onLogout: () => void,
  pendingApprovals?: number, activeShift?: { manager_name: string; start_time: string } | null,
  onOpenSearch?: () => void,
}) {
  const now = useNow();

  const shiftElapsed = activeShift?.start_time
    ? (() => {
        const mins = Math.floor((Date.now() - new Date(activeShift.start_time).getTime()) / 60000);
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m} דק'`;
      })()
    : null;

  return (
    <div className="topheader">
      <div className="right">
        {activeShift && (
          <div className="shift-indicator" data-tooltip={`מנהל: ${activeShift.manager_name}`}>
            <span className="dot" />
            <span>משמרת פעילה</span>
            {shiftElapsed && <span className="mono" style={{ fontSize: 10 }}>{shiftElapsed}</span>}
          </div>
        )}
        <div className={cn("statepill", emergency && 'alert')}>
          <span className="led" />
          {emergency ? 'מצב חירום פעיל' : 'שגרה · המערכת תקינה'}
        </div>
        <div className="clock">
          <span className="muted">{fmtDate(now)}</span>
          <b className="mono">{fmtTime(now)}</b>
        </div>
        <button className="btn icon ghost" onClick={onOpenSearch} data-tooltip="חיפוש · Ctrl+K" style={{ position: 'relative' }}>
          <Icon name="Search" />
        </button>
        <button className="btn icon ghost" data-tooltip="התראות" style={{ position: 'relative' }}>
          <Icon name="Bell" />
          {(pendingApprovals || 0) > 0 && (
            <span className="badge" style={{ position: 'absolute', top: -4, left: -4 }}>{pendingApprovals}</span>
          )}
        </button>
        <button className="btn icon ghost" onClick={() => document.dispatchEvent(new CustomEvent('open-settings'))} data-tooltip="הגדרות תצוגה">
          <Icon name="Settings" />
        </button>
        <div className="user" style={{ cursor: 'pointer' }} onClick={onLogout}>
          <div className="av">{user?.name?.slice(0, 2) || '??'}</div>
          <div>
            <div style={{ color: 'var(--ink-1)', fontSize: 12 }}>{user?.name}</div>
            <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>{user?.role === 'admin' ? 'מנהל מערכת' : 'מוקדן'} · <span style={{ color: 'var(--red)' }}>התנתק</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ThemeDef {
  id: string;
  name: string;
  desc: string;
  p: { bg: string; surface: string; header: string; border: string; ink1: string; ink3: string; accent: string; red: string };
}

const THEMES: ThemeDef[] = [
  {
    id: 'default', name: 'ברירת מחדל', desc: 'כחול כהה · ניגודיות רגילה',
    p: { bg: '#080b10', surface: '#0e131b', header: '#0e131b', border: 'rgba(255,255,255,0.08)', ink1: '#f1f5f9', ink3: '#64748b', accent: '#f5a524', red: '#ef4444' },
  },
  {
    id: 'tactical', name: 'מראה טקטי', desc: 'ירוק זית · משמרות לילה',
    p: { bg: '#101410', surface: '#161c16', header: '#1d251d', border: 'rgba(255,255,255,0.12)', ink1: '#e2e8e2', ink3: '#8a968a', accent: '#d4b855', red: '#d32f2f' },
  },
  {
    id: 'contrast', name: 'ניגודיות גבוהה', desc: 'OLED שחור · מסכי חמ"ל',
    p: { bg: '#000000', surface: '#111111', header: '#111111', border: 'rgba(255,255,255,0.3)', ink1: '#ffffff', ink3: '#aaaaaa', accent: '#ffaa00', red: '#ff3333' },
  },
  {
    id: 'light', name: 'מראה מואר', desc: 'בהיר · שעות היום',
    p: { bg: '#f4f7fa', surface: '#ffffff', header: '#ffffff', border: '#e2e8f0', ink1: '#0f172a', ink3: '#64748b', accent: '#ea580c', red: '#ef4444' },
  },
];

function ThemePreview({ p }: { p: ThemeDef['p'] }) {
  return (
    <div style={{ background: p.bg, padding: 10, height: 96, overflow: 'hidden', position: 'relative', borderRadius: '8px 8px 0 0' }}>
      {/* Simulated header bar */}
      <div style={{ background: p.header, border: `1px solid ${p.border}`, borderRadius: 5, padding: '4px 8px', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: p.accent }} />
        <div style={{ height: 3, width: 38, background: p.ink1, borderRadius: 2, opacity: 0.7 }} />
        <div style={{ flex: 1 }} />
        <div style={{ height: 6, width: 28, background: p.accent, opacity: 0.8, borderRadius: 3 }} />
        <div style={{ height: 6, width: 18, background: p.border, borderRadius: 3 }} />
      </div>
      {/* Two mini panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <div style={{ background: p.surface, border: `1px solid ${p.border}`, borderRadius: 5, padding: '6px 7px' }}>
          <div style={{ height: 3, width: '55%', background: p.ink1, borderRadius: 2, marginBottom: 5 }} />
          <div style={{ height: 3, width: '80%', background: p.ink3, borderRadius: 2, marginBottom: 4 }} />
          <div style={{ height: 3, width: '40%', background: p.ink3, borderRadius: 2, marginBottom: 4 }} />
          <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
            <div style={{ height: 7, width: 22, background: p.red, borderRadius: 3, opacity: 0.85 }} />
            <div style={{ height: 7, width: 22, background: p.border, borderRadius: 3 }} />
          </div>
        </div>
        <div style={{ background: p.surface, border: `1px solid ${p.border}`, borderRadius: 5, padding: '6px 7px' }}>
          <div style={{ display: 'flex', gap: 3, marginBottom: 5 }}>
            <div style={{ height: 7, width: 26, background: p.accent, borderRadius: 3 }} />
            <div style={{ height: 7, width: 20, background: p.border, borderRadius: 3 }} />
          </div>
          <div style={{ height: 3, width: '65%', background: p.ink1, borderRadius: 2, marginBottom: 3 }} />
          <div style={{ height: 3, width: '45%', background: p.ink3, borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ currentTheme, onChangeTheme, onClose }: { currentTheme: string, onChangeTheme: (t: string) => void, onClose: () => void }) {
  return (
    <div className="scrim" onClick={onClose} style={{ zIndex: 10000 }}>
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 8 }}
        transition={{ duration: 0.18 }}
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{ width: 520 }}
      >
        <div className="h">
          <Icon name="Settings" />
          <h3>הגדרות תצוגה</h3>
        </div>
        <div className="b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {THEMES.map(t => {
            const selected = currentTheme === t.id;
            return (
              <div
                key={t.id}
                onClick={() => onChangeTheme(t.id)}
                style={{
                  border: `2px solid ${selected ? 'var(--amber)' : 'var(--line-2)'}`,
                  borderRadius: 10, cursor: 'pointer', overflow: 'hidden',
                  background: selected ? 'rgba(245,165,36,0.04)' : 'transparent',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxShadow: selected ? '0 0 0 1px rgba(245,165,36,0.2)' : 'none',
                  position: 'relative',
                }}
              >
                <ThemePreview p={t.p} />
                {selected && (
                  <div style={{
                    position: 'absolute', top: 8, left: 8, width: 20, height: 20,
                    background: 'var(--amber)', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.5)'
                  }}>
                    <Icon name="Check" style={{ width: 11, color: '#000' }} />
                  </div>
                )}
                <div style={{ padding: '10px 12px', borderTop: `1px solid var(--line)` }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: selected ? 'var(--amber)' : 'var(--ink-1)', marginBottom: 2 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{t.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="f" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>סגור</button>
        </div>
      </motion.div>
    </div>
  );
}

function OpenEventModal({ onConfirm, onClose }: { onConfirm: (data: OpenEventFormData) => Promise<void> | void, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [formData, setFormData] = useState<OpenEventFormData>({
    type: 'פח"ע - ישוב',
    scene_name: '',
    location: '',
    grid: '',
    description: '',
    map_coords: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.scene_name) return;
    setLoading(true);
    try {
      await onConfirm(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
          className="modal danger"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h">
            <Icon name="Siren" lg />
            <h2>פתיחת אירוע חירום חדש</h2>
          </div>
          <form onSubmit={handleSubmit}>
          <div className="b">
            <div className="fieldrow">
              <div className="field">
                <label>סוג אירוע</label>
                <select 
                  className="input" 
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                >
                  <option>פח"ע - ישוב</option>
                  <option>פח"ע ציר</option>
                  <option>ת"ד</option>
                  <option>אר"ן</option>
                  <option>אסון טבע</option>
                  <option>אחר</option>
                </select>
              </div>
              <div className="field">
                <label>שם זירה (חובה)</label>
                <input 
                  autoFocus
                  className="input" 
                  placeholder='לדוגמה: זירת חפ"ק' 
                  value={formData.scene_name}
                  onChange={e => setFormData({ ...formData, scene_name: e.target.value })}
                />
              </div>
            </div>
            <div className="fieldrow">
              <div className="field">
                <label>מיקום</label>
                <input 
                  className="input" 
                  placeholder="יישוב / ציר" 
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="field">
                <label>נ"צ / קואורדינטות</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input 
                    className="input mono" 
                    placeholder='נ"צ או lat,lng' 
                    value={formData.map_coords || formData.grid}
                    onChange={e => setFormData({ ...formData, map_coords: e.target.value, grid: e.target.value })}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn icon ghost" onClick={() => setShowMapPicker(true)} data-tooltip="בחר מהמפה">
                    <Icon name="Map" />
                  </button>
                </div>
              </div>
            </div>
          <div className="field">
            <label>תיאור ראשוני</label>
            <textarea 
              className="textarea" 
              placeholder="פרטים מהשטח, מי דיווח, סוג האירוע..." 
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div style={{ padding: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 6, fontSize: 12, color: '#ffb4b4', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="Bell" /> פעולה זו תפעיל את מסך החירום עבור כל המוקדנים והצופים המחוברים
          </div>
        </div>
        <div className="f">
          <button
            type="submit"
            className="btn danger"
            disabled={loading || !formData.scene_name}
          >
            <Icon name="Siren" /> {loading ? 'פותח אירוע...' : 'פתח אירוע'}
          </button>
          <button type="button" className="btn ghost" disabled={loading} onClick={onClose}>בטל</button>
        </div>
        </form>
      </motion.div>
    </motion.div>
      {showMapPicker && (
        <MapPicker 
          initialCoords={formData.map_coords} 
          onSelect={(c) => { setFormData({ ...formData, map_coords: c }); setShowMapPicker(false); }} 
          onClose={() => setShowMapPicker(false)} 
        />
      )}
    </>
  );
}

function App() {
  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      if (window.confirm('גרסה חדשה של המערכת זמינה. לרענן עכשיו?')) updateServiceWorker(true);
    },
  });

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [screen, setScreen] = useState(window.location.pathname === '/mobile' ? 'mobile' : 'routine');
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showHotkeyHelp, setShowHotkeyHelp] = useState(false);
  const [showNewRoutineIncident, setShowNewRoutineIncident] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [activeShift, setActiveShift] = useState<{ manager_name: string; start_time: string } | null>(null);

  const [activeEvent, setActiveEvent] = useState<DBActiveEventRaw | null>(null);
  const [incidents, setIncidents] = useState<DBIncident[]>([]);
  const [feed, setFeed] = useState<DBFeedItem[]>([]);
  const [roster, setRoster] = useState<DBRosterMember[]>([]);

  // Theme & Settings
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('mokad_theme') || 'default');

  useEffect(() => {
    document.documentElement.className = theme === 'default' ? '' : `theme-${theme}`;
    localStorage.setItem('mokad_theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleOpenSettings = () => setShowSettings(true);
    document.addEventListener('open-settings', handleOpenSettings);
    return () => document.removeEventListener('open-settings', handleOpenSettings);
  }, []);

  // Initialize audio on first click
  useEffect(() => {
    const initHandler = () => { initAudio(); document.removeEventListener('click', initHandler); };
    document.addEventListener('click', initHandler);
    return () => document.removeEventListener('click', initHandler);
  }, []);

  // Auth check
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, [token]);

  const fetchRoster = useCallback(async () => {
    try {
      const res = await fetch('/api/roster');
      if (res.ok) setRoster(await res.json());
    } catch {}
  }, []);

  const refreshRoster = fetchRoster;

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/feed');
      if (res.ok) setFeed(await res.json());
    } catch {}
  }, []);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/incidents');
      if (res.ok) {
        const data = await res.json();
        // Support both paginated {items, total} and raw array format
        setIncidents(Array.isArray(data) ? data : data.items || []);
      }
    } catch {}
  }, []);

  const fetchEmergency = useCallback(async () => {
    try {
      const res = await fetch('/api/emergency/active');
      if (!res.ok) return;
      const eventData = await res.json();
      setActiveEvent(eventData);
      setEmergencyActive(!!eventData);
      if (eventData && screen === 'routine') setScreen('emergency');
    } catch {}
  }, [screen]);

  // Initial load + 30s fallback polling
  useEffect(() => {
    if (!token) return;

    const fetchAll = async () => {
      try {
        const [eventRes, incRes, feedRes, rosterRes] = await Promise.all([
          fetch('/api/emergency/active'),
          fetch('/api/incidents'),
          fetch('/api/feed'),
          fetch('/api/roster'),
        ]);

        if ([eventRes, incRes, feedRes, rosterRes].some(r => r.status === 401)) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
          toast('פג תוקף החיבור, התחבר מחדש', 'error');
          return;
        }

        const eventData = await eventRes.json();
        setActiveEvent(eventData);
        setEmergencyActive(!!eventData);
        if (eventData && screen === 'routine') setScreen('emergency');
        const incData = await incRes.json();
        setIncidents(Array.isArray(incData) ? incData : incData.items || []);
        setFeed(await feedRes.json());
        setRoster(await rosterRes.json());
      } catch (err) {
        console.error('Failed to fetch data', err);
      }
    };

    fetchAll();
    const fallback = setInterval(fetchAll, 30000);
    return () => clearInterval(fallback);
  }, [token]);

  // WebSocket listeners — instant updates on any mutation
  useEffect(() => {
    if (!token) return;
    const socket = io({ transports: ['websocket', 'polling'] });
    socket.on('roster:changed', fetchRoster);
    socket.on('feed:changed', () => { fetchFeed(); playNotificationSound('info'); });
    socket.on('incidents:changed', () => { fetchIncidents(); playNotificationSound('warning'); });
    socket.on('emergency:changed', () => { fetchEmergency(); playNotificationSound('critical'); });
    socket.on('approvals:changed', fetchApprovalCount);
    return () => { socket.disconnect(); };
  }, [token, fetchRoster, fetchFeed, fetchIncidents, fetchEmergency]);

  // Fetch pending approval count
  const fetchApprovalCount = useCallback(async () => {
    try {
      const res = await fetch('/api/approvals', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setPendingApprovals(Array.isArray(data) ? data.length : 0); }
    } catch {}
  }, [token]);

  // Fetch active shift
  const fetchActiveShift = useCallback(async () => {
    try {
      const res = await fetch('/api/shifts/active');
      if (res.ok) { const data = await res.json(); setActiveShift(data); }
      else setActiveShift(null);
    } catch { setActiveShift(null); }
  }, []);

  useEffect(() => {
    if (token) { fetchApprovalCount(); fetchActiveShift(); }
  }, [token, fetchApprovalCount, fetchActiveShift]);

  useEffect(() => {
    document.body.classList.toggle('emergency', emergencyActive);
    if (emergencyActive) {
      playNotificationSound('critical');
    }
  }, [emergencyActive]);

  // Hotkeys
  useEffect(() => {
    if (!token) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + E for emergency
      if (e.ctrlKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setShowOpenModal(true);
      }
      // Ctrl + N for new routine incident
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowNewRoutineIncident(true);
        setScreen('routine');
      }
      // Ctrl + / for hotkey help
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        setShowHotkeyHelp(prev => !prev);
      }
      // Ctrl + K for command palette
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      // Number keys for navigation
      if (!e.ctrlKey && !e.metaKey && e.target instanceof HTMLElement && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        if (e.key === '1') setScreen('routine');
        if (e.key === '2') setScreen('dashboard');
        if (e.key === '3') setScreen('manage');
        if (e.key === '4') setScreen('archive');
      }
      
      if (e.key === 'Escape') {
        setShowOpenModal(false);
        setShowHotkeyHelp(false);
        setShowCommandPalette(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [token]);

  const handleLogin = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(token);
    setUser(userData);
  };

  const handleLogout = () => {
    confirmDialog('התנתקות מהמערכת', 'האם אתה בטוח שברצונך להתנתק?', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      toast('התנתקת בהצלחה', 'info');
    });
  };

  if (!token) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const handleOpenEmergency = () => setShowOpenModal(true);
  
  const confirmOpenEmergency = async (formData: OpenEventFormData) => {
    try {
      const res = await fetch('/api/emergency/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowOpenModal(false);
        toast('אירוע חירום נפתח בהצלחה', 'success');
        // Polling will catch the update
      }
    } catch (err) {
      toast('שגיאה בפתיחת אירוע', 'error');
    }
  };

  const handleCloseEmergency = async () => {
    confirmDialog('סגירת אירוע', 'האם אתה בטוח שברצונך לסגור את האירוע ולהחזיר את המערכת לשגרה?', async () => {
      try {
        await fetch('/api/emergency/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: activeEvent!.id })
        });
        setEmergencyActive(false);
        setScreen('routine');
        toast('אירוע נסגר בהצלחה', 'info');
      } catch (err) {
        toast('שגיאה בסגירת אירוע', 'error');
      }
    });
  };

  // Normalize DB snake_case → camelCase for active event
  const mappedEvent = activeEvent ? {
    ...activeEvent,
    sceneName: activeEvent.scene_name,
    startedAt: activeEvent.started_at,
    snapshotAt: activeEvent.snapshot_at,
  } : data.activeEvent;

  const mappedFeed = feed.map(it => ({ ...it, t: it.time }));

  // Construct data object for screens
  const fullData: MokadData = {
    ...data,
    activeEvent: mappedEvent,
    log: mappedFeed,
    routine: {
      incidents: incidents.map(i => ({
        ...i,
        loc: i.location,
        t: new Date(i.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        sev: i.severity,
      })),
      feed: mappedFeed,
      roster: roster.map(r => ({ ...r, out: r.out_time, returnTime: r.return_time, isOutOfSector: !!r.is_out_of_sector })),
      metrics: {
        ...data.routine.metrics,
        open: incidents.filter(i => i.status !== 'הסתיים').length,
        today: incidents.filter(i => new Date(i.created_at).toDateString() === new Date().toDateString()).length,
        total: roster.length
      }
    }
  };

  let body;
  if (screen === 'emergency') {
    if (emergencyActive) {
      body = <EmergencyScreen data={fullData} onClose={handleCloseEmergency} />;
    } else {
      body = (
        <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div className="panel" style={{ maxWidth: 520 }}>
            <div className="panel-h"><h3>אין אירוע חירום פעיל</h3></div>
            <div className="panel-b" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 24, alignItems: 'flex-start' }}>
              <p className="muted" style={{ margin: 0, lineHeight: 1.6 }}>
                כאשר נפתח אירוע חירום, מסך זה יעבור אוטומטית לתצוגת 4 העמודות: תמונת מצב, מדיה וזרם דיווחים.
                במצב שגרה, המערכת ממשיכה לאסוף עדכונים שוטפים.
              </p>
              <button className="btn danger" onClick={handleOpenEmergency}>
                <Icon name="Siren" /> פתיחת אירוע חירום חדש
              </button>
            </div>
          </div>
        </div>
      );
    }
  } else if (screen === 'routine') {
    body = <RoutineScreen data={fullData} onOpenEmergency={handleOpenEmergency} onRosterChange={refreshRoster} showNewIncidentModal={showNewRoutineIncident} onCloseNewIncidentModal={() => setShowNewRoutineIncident(false)} />;
  } else if (screen === 'manage') {
    body = <ManagementScreen data={fullData} />;
  } else if (screen === 'archive') {
    body = <ArchiveScreen data={fullData} />;
  } else if (screen === 'mobile') {
    body = <MobileScreen data={fullData} />;
  } else if (screen === 'admin') {
    body = <AdminScreen roster={roster} onRosterChange={refreshRoster} />;
  } else if (screen === 'dashboard') {
    body = <DashboardScreen />;
  } else if (screen === 'analytics') {
    body = <AnalyticsScreen />;
  } else if (screen === 'shifts') {
    body = <ShiftScreen data={fullData} user={user!} />;
  }

  const isStandaloneMobile = window.location.pathname === '/mobile';

  if (isStandaloneMobile && screen === 'mobile') {
    return (
      <div className="standalone-mobile-root" style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg-0)' }}>
        <OfflineBanner />
        <MobileScreen data={fullData} />
        <ToastProvider />
      </div>
    );
  }

  return (
    <div className="app">
      <OfflineBanner />
      <Sidebar
        screen={screen}
        onScreen={setScreen}
        user={user}
      />
      <div className="content-area">
        <TopHeader
          emergency={emergencyActive}
          user={user}
          onLogout={handleLogout}
          pendingApprovals={pendingApprovals}
          activeShift={activeShift}
          onOpenSearch={() => setShowCommandPalette(true)}
        />
        <main style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={screen + emergencyActive}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              style={{ height: '100%' }}
            >
              {body}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {showOpenModal && (
          <OpenEventModal onConfirm={confirmOpenEmergency} onClose={() => setShowOpenModal(false)} />
        )}
        {showHotkeyHelp && (
          <HotkeyHelp onClose={() => setShowHotkeyHelp(false)} />
        )}
        {showSettings && (
          <SettingsModal 
            currentTheme={theme} 
            onChangeTheme={setTheme} 
            onClose={() => setShowSettings(false)} 
          />
        )}
      </AnimatePresence>

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        incidents={incidents.map(i => ({ id: i.id, type: i.type, location: i.location, status: i.status, severity: i.severity }))}
        roster={roster.map(r => ({ id: r.id, name: r.name, role: r.role, task: r.task, phone: r.phone, state: r.state }))}
        feed={feed.map(f => ({ id: f.id, text: f.text, src: f.src, time: f.time }))}
        onNavigate={(s) => { setScreen(s); setShowCommandPalette(false); }}
      />

      <ToastProvider />
    </div>
  );
}

export default App;
