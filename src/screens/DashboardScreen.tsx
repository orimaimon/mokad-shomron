import { useState, useEffect } from 'react';
import { Icon } from '../components/Icons';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { RosterMember } from '../types';

export function DashboardScreen() {
  const [data, setData] = useState<any>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [time, setTime] = useState(new Date());

  const fetchData = async () => {
    try {
      const [resRoster, resInc] = await Promise.all([
        fetch('/api/roster').then(r => r.json()),
        fetch('/api/incidents').then(r => r.json()),
      ]);

      setRoster(resRoster.map((item: any) => ({
        ...item,
        out: item.out_time,
        returnTime: item.return_time,
        isOutOfSector: !!item.is_out_of_sector
      })));

      const active = resInc.filter((i: any) => i.status !== 'הסתיים');
      setData({
        incidents: active.map((i: any) => ({
          id: i.id,
          type: i.type,
          loc: i.location,
          time: new Date(i.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
          status: i.status,
          sev: i.severity === 'red' ? 'high' : i.severity === 'amber' ? 'mid' : 'low',
        })),
        alerts: active.length
      });
    } catch (e) {
      console.error("Poll error", e);
    }
  };

  useEffect(() => {
    fetchData();
    const itv = setInterval(fetchData, 5000); // Poll every 5s
    const clock = setInterval(() => setTime(new Date()), 1000);
    return () => { clearInterval(itv); clearInterval(clock); };
  }, []);

  const activeInSector = roster.filter(p => !p.isOutOfSector && p.state === 'field').length;
  const outCount = roster.filter(p => p.isOutOfSector).length;

  return (
    <div className="dashboard-root">
      <button className="exit-dash btn ghost sm" onClick={() => window.location.href = '/'}>
        <Icon name="X" style={{ width: 14 }} />
        יציאה ממצב חמ"ל
      </button>
      {/* Header */}
      <header className="dash-h">
        <div className="brand">
          <div className="logo">M</div>
          <div>
            <h1>מערכת שו"ב מרכזית</h1>
            <p>מרכז מבצעים שומרון - חמ"ל אחוד</p>
          </div>
        </div>
        
        <div className="stats-row">
          <div className="dash-stat">
            <span className="lbl">אירועים פעילים</span>
            <span className="val red pulse">{data?.incidents.length || 0}</span>
          </div>
          <div className="dash-stat">
            <span className="lbl">כוחות בשטח</span>
            <span className="val green">{activeInSector}</span>
          </div>
          <div className="dash-stat">
            <span className="lbl">מחוץ לגזרה</span>
            <span className="val yellow">{outCount}</span>
          </div>
        </div>

        <div className="spacer" />

        <div className="clock-block">
          <div className="time">{time.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
          <div className="date">{time.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="dash-grid">
        {/* VIDEO FEEDS */}
        <div className="dash-card video-grid">
          <div className="card-t">
            <Icon name="Camera" />
            <span>תצוגת מצלמות חיה</span>
            <div className="spacer" />
            <span className="live-tag">LIVE</span>
          </div>
          <div className="video-container">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="cam-feed">
                <div className="cam-label">CAM-{String(i).padStart(2,'0')} | {['חווארה','צומת תפוח','שער אריאל','מחסום בקעות','מעלה שומרון','יצהר'][i-1]}</div>
                <div className="cam-overlay">
                  <div className="noise" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ACTIVE INCIDENTS */}
        <div className="dash-card incidents-panel">
          <div className="card-t">
            <Icon name="AlertTriangle" />
            <span>אירועים בטיפול</span>
          </div>
          <div className="incident-list">
            <AnimatePresence>
              {data?.incidents.map((inc: any) => (
                <motion.div 
                  initial={{ x: 20, opacity: 0 }} 
                  animate={{ x: 0, opacity: 1 }}
                  key={inc.id} 
                  className={cn("dash-inc-row", inc.sev)}
                >
                  <div className="sev-indicator" />
                  <div className="content">
                    <div className="top">
                      <span className="type">{inc.type}</span>
                      <span className="time">{inc.time}</span>
                    </div>
                    <div className="loc">{inc.loc}</div>
                  </div>
                  <div className="status-badge">בטיפול</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ROSTER / PERSONNEL */}
        <div className="dash-card roster-mini">
          <div className="card-t">
            <Icon name="Users" />
            <span>בעלי תפקידים מחוץ לגזרה</span>
          </div>
          <div className="mini-roster">
            {roster.filter(p => p.isOutOfSector).map((p, i) => (
              <div key={i} className="mini-r">
                <div className="av">{p.name[0]}</div>
                <div className="info">
                  <div className="n">{p.name}</div>
                  <div className="m">{p.role} · {p.reason || 'חופשה'}</div>
                </div>
                {p.replacement && (
                  <div className="repl">
                    <Icon name="User" />
                    {p.replacement}
                  </div>
                )}
              </div>
            ))}
            {roster.filter(p => p.isOutOfSector).length === 0 && (
              <div className="empty-state">אין בעלי תפקידים מחוץ לגזרה</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
