import { useState, useEffect } from 'react';
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
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { MokadData } from './types';
import { ToastProvider, toast, confirmDialog } from './components/Toast';
import './App.css';

const data = MOKAD_DATA as unknown as MokadData;

const NAV_ITEMS = [
  { k: 'routine', label: 'שגרה', icon: 'Pulse', cls: 'routine' },
  { k: 'emergency', label: 'אירוע חירום', icon: 'Siren' },
  { k: 'dashboard', label: 'מצב חמ"ל', icon: 'Monitor', cls: 'brand-nav' },
  { k: 'manage', label: 'ניהול מוקד', icon: 'Settings' },
  { k: 'archive', label: 'ארכיון ודוחות', icon: 'Archive' },
  { k: 'mobile', label: 'ממשק מדווח', icon: 'User' },
  { k: 'admin', label: 'ניהול מערכת', icon: 'Shield', admin: true },
];

function TopBar({ screen, onScreen, emergency, user, onLogout }: { screen: string, onScreen: (s: string) => void, emergency: boolean, user: any, onLogout: () => void }) {
  const now = useNow();
  return (
    <div className="topbar">
      <div className="brand">
        <div className="mark" />
        <span>מוקד שומרון</span>
        <small>· שו"ב v2.5</small>
      </div>
      <nav className="nav">
        {NAV_ITEMS.map((it: any) => {
          if (it.admin && user?.role !== 'admin') return null;
          return (
            <a key={it.k} className={cn(screen === it.k && 'on', it.cls)} onClick={() => onScreen(it.k)}>
              <span className="dot" />
              <Icon name={it.icon} />
              <span>{it.label}</span>
            </a>
          );
        })}
      </nav>
      <div className="right">
        <div className={cn("statepill", emergency && 'alert')}>
          <span className="led" />
          {emergency ? 'מצב חירום פעיל' : 'שגרה · המערכת תקינה'}
        </div>
        <div className="clock">
          <span className="muted">{fmtDate(now)}</span>
          <b className="mono">{fmtTime(now)}</b>
        </div>
        <button className="btn icon" title="התראות"><Icon name="Bell" /></button>
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

function OpenEventModal({ onConfirm, onClose }: { onConfirm: (data: any) => Promise<void> | void, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'פח"ע - ישוב',
    scene_name: '',
    location: '',
    grid: '',
    description: ''
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
        className="modal"
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
              <label>נ"צ</label>
              <input 
                className="input mono" 
                placeholder="0000/0000" 
                value={formData.grid}
                onChange={e => setFormData({ ...formData, grid: e.target.value })}
              />
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
  );
}

function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [screen, setScreen] = useState('routine');
  const [showOpenModal, setShowOpenModal] = useState(false);
  
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);

  // Auth check
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, [token]);

  // Data Polling
  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const [eventRes, incRes, feedRes, rosterRes] = await Promise.all([
          fetch('/api/emergency/active'),
          fetch('/api/incidents'),
          fetch('/api/feed'),
          fetch('/api/roster')
        ]);

        const eventData = await eventRes.json();
        const incData = await incRes.json();
        const feedData = await feedRes.json();
        const rosterData = await rosterRes.json();

        setActiveEvent(eventData);
        setEmergencyActive(!!eventData);
        setIncidents(incData);
        setFeed(feedData);
        setRoster(rosterData);

        // Auto-switch to emergency if just started
        if (eventData && screen === 'routine') {
          setScreen('emergency');
        }
      } catch (err) {
        console.error('Failed to fetch data', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, [token, screen]);

  useEffect(() => {
    document.body.classList.toggle('emergency', emergencyActive);
    if (emergencyActive) {
      try {
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg');
        audio.volume = 0.4;
        audio.play().catch(e => console.warn('Audio play failed due to browser policies:', e));
      } catch (e) {
        // silent fallback
      }
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
      // Number keys for navigation
      if (!e.ctrlKey && !e.metaKey && e.target instanceof HTMLElement && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        if (e.key === '1') setScreen('routine');
        if (e.key === '2') setScreen('dashboard');
        if (e.key === '3') setScreen('manage');
        if (e.key === '4') setScreen('archive');
      }
      
      if (e.key === 'Escape') {
        setShowOpenModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [token]);

  const handleLogin = (token: string, userData: any) => {
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
  
  const confirmOpenEmergency = async (formData: any) => {
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
          body: JSON.stringify({ id: activeEvent.id })
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

  const mappedFeed = feed.map((it: any) => ({ ...it, t: it.time }));

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
      roster: roster.map(r => ({ ...r, out: r.out_time, isOutOfSector: !!r.is_out_of_sector })),
      metrics: {
        ...data.routine.metrics,
        open: incidents.filter(i => i.status !== 'הסתיים').length,
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
    body = <RoutineScreen data={fullData} onOpenEmergency={handleOpenEmergency} />;
  } else if (screen === 'manage') {
    body = <ManagementScreen data={fullData} />;
  } else if (screen === 'archive') {
    body = <ArchiveScreen data={fullData} />;
  } else if (screen === 'mobile') {
    body = <MobileScreen data={fullData} />;
  } else if (screen === 'admin') {
    body = <AdminScreen />;
  } else if (screen === 'dashboard') {
    body = <DashboardScreen />;
  }

  return (
    <div className="app">
      <TopBar screen={screen} onScreen={setScreen} emergency={emergencyActive} user={user} onLogout={handleLogout} />
      <main style={{ minHeight: 0, overflow: 'hidden', position: 'relative' }}>
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

      <AnimatePresence>
        {showOpenModal && (
          <OpenEventModal onConfirm={confirmOpenEmergency} onClose={() => setShowOpenModal(false)} />
        )}
      </AnimatePresence>
      <ToastProvider />
    </div>
  );
}

export default App;
