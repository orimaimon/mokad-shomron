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

function OpenEventModal({ onConfirm, onClose }: { onConfirm: () => void, onClose: () => void }) {
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
        <div className="b">
          <div className="fieldrow">
            <div className="field">
              <label>סוג אירוע</label>
              <select className="input">
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
              <input className="input" placeholder='לדוגמה: זירת חפ"ק' />
            </div>
          </div>
          <div className="fieldrow">
            <div className="field">
              <label>מיקום</label>
              <input className="input" placeholder="יישוב / ציר" />
            </div>
            <div className="field">
              <label>נ"צ</label>
              <input className="input mono" placeholder="0000/0000" />
            </div>
          </div>
          <div className="field">
            <label>תיאור ראשוני</label>
            <textarea className="textarea" placeholder="פרטים מהשטח, מי דיווח, סוג האירוע..." />
          </div>
          <div style={{ padding: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 6, fontSize: 12, color: '#ffb4b4', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="Bell" /> פעולה זו תפעיל את מסך החירום עבור כל המוקדנים והצופים המחוברים
          </div>
        </div>
        <div className="f">
          <button className="btn danger" onClick={onConfirm}><Icon name="Siren" /> פתח אירוע</button>
          <button className="btn ghost" onClick={onClose}>בטל</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [emergencyActive, setEmergencyActive] = useState(true);
  const [screen, setScreen] = useState('emergency');
  const [showOpenModal, setShowOpenModal] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, [token]);

  useEffect(() => {
    document.body.classList.toggle('emergency', emergencyActive);
  }, [emergencyActive]);

  const handleLogin = (token: string, userData: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(token);
    setUser(userData);
  };

  const handleLogout = () => {
    if (!window.confirm('האם אתה בטוח שברצונך להתנתק?')) return;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const handleOpenEmergency = () => setShowOpenModal(true);
  const confirmOpenEmergency = () => {
    setShowOpenModal(false);
    setEmergencyActive(true);
    setScreen('emergency');
  };
  const closeEmergency = () => {
    setEmergencyActive(false);
    setScreen('routine');
  };

  let body;
  if (screen === 'emergency') {
    if (emergencyActive) {
      body = <EmergencyScreen data={data} onClose={closeEmergency} />;
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
    body = <RoutineScreen data={data} onOpenEmergency={handleOpenEmergency} />;
  } else if (screen === 'manage') {
    body = <ManagementScreen data={data} />;
  } else if (screen === 'archive') {
    body = <ArchiveScreen data={data} />;
  } else if (screen === 'mobile') {
    body = <MobileScreen data={data} />;
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
    </div>
  );
}

export default App;
