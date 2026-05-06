import { useState, useEffect } from 'react';
import { MOKAD_DATA } from './data/mockData';
import { Icon } from './components/Icons';
import { useNow, fmtTime, fmtDate } from './hooks/useClock';
import { EmergencyScreen } from './screens/EmergencyScreen';
import { RoutineScreen } from './screens/RoutineScreen';
import { ManagementScreen } from './screens/ManagementScreen';
import { ArchiveScreen } from './screens/ArchiveScreen';
import { MobileScreen } from './screens/MobileScreen';
import './App.css';

const NAV_ITEMS = [
  { k: 'routine', label: 'שגרה', icon: 'Pulse', cls: 'routine' },
  { k: 'emergency', label: 'אירוע חירום', icon: 'Siren' },
  { k: 'manage', label: 'ניהול מוקד', icon: 'Settings' },
  { k: 'archive', label: 'ארכיון ודוחות', icon: 'Archive' },
  { k: 'mobile', label: 'ממשק מדווח', icon: 'User' },
];

function TopBar({ screen, onScreen, emergency }) {
  const now = useNow();
  return (
    <div className="topbar">
      <div className="brand">
        <div className="mark" />
        <span>מוקד שומרון</span>
        <small>· שו"ב v2.4</small>
      </div>
      <nav className="nav">
        {NAV_ITEMS.map((it) => (
          <a key={it.k} className={`${screen === it.k ? 'on' : ''} ${it.cls || ''}`} onClick={() => onScreen(it.k)}>
            <span className="dot" />
            <Icon name={it.icon} />
            <span>{it.label}</span>
          </a>
        ))}
      </nav>
      <div className="right">
        <div className={`statepill ${emergency ? 'alert' : ''}`}>
          <span className="led" />
          {emergency ? 'מצב חירום פעיל' : 'שגרה · המערכת תקינה'}
        </div>
        <div className="clock">
          <span className="muted">{fmtDate(now)}</span>
          <b className="mono">{fmtTime(now)}</b>
        </div>
        <button className="btn icon" title="התראות"><Icon name="Bell" /></button>
        <div className="user">
          <div className="av">יכ</div>
          <div>
            <div style={{ color: 'var(--ink-1)', fontSize: 12 }}>יונתן כהן</div>
            <div style={{ fontSize: 10, color: 'var(--ink-3)' }}>מוקדן ראשי</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OpenEventModal({ onConfirm, onClose }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
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
      </div>
    </div>
  );
}

function App() {
  const [emergencyActive, setEmergencyActive] = useState(true);
  const [screen, setScreen] = useState('emergency');
  const [showOpenModal, setShowOpenModal] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('emergency', emergencyActive);
  }, [emergencyActive]);

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
      body = <EmergencyScreen data={MOKAD_DATA} onClose={closeEmergency} />;
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
    body = <RoutineScreen data={MOKAD_DATA} onOpenEmergency={handleOpenEmergency} />;
  } else if (screen === 'manage') {
    body = <ManagementScreen data={MOKAD_DATA} />;
  } else if (screen === 'archive') {
    body = <ArchiveScreen data={MOKAD_DATA} />;
  } else if (screen === 'mobile') {
    body = <MobileScreen data={MOKAD_DATA} />;
  }

  return (
    <div className="app">
      <TopBar screen={screen} onScreen={setScreen} emergency={emergencyActive} />
      <div style={{ minHeight: 0, overflow: 'hidden' }}>{body}</div>

      {showOpenModal && (
        <OpenEventModal onConfirm={confirmOpenEmergency} onClose={() => setShowOpenModal(false)} />
      )}
    </div>
  );
}

export default App;
