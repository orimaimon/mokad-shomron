import { useState, useEffect } from 'react';
import { Icon } from '../components/Icons';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { LiveMap } from '../components/LiveMap';
import { RosterMember, DBRosterMember, DBIncident, DBFeedItem, ActiveEvent } from '../types';

interface DashboardIncident {
  id: number;
  type: string;
  loc: string;
  time: string;
  status: string;
  sev: 'high' | 'mid' | 'low';
}

interface DashboardData {
  incidents: DashboardIncident[];
  alerts: number;
}

export function DashboardScreen() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [feed, setFeed] = useState<DBFeedItem[]>([]);
  const [time, setTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);

  const fetchData = async () => {
    try {
      const [resRoster, resInc, resFeed, resEmergency] = await Promise.all([
        fetch('/api/roster').then(r => r.json()),
        fetch('/api/incidents').then(r => r.json()),
        fetch('/api/feed').then(r => r.json()),
        fetch('/api/emergency/active').then(r => r.json()).catch(() => null),
      ]);

      // Set active emergency event
      if (resEmergency && resEmergency.id) {
        setActiveEvent(resEmergency);
      } else {
        setActiveEvent(null);
      }

      setRoster((resRoster as DBRosterMember[]).map((item) => ({
        ...item,
        out: item.out_time,
        returnTime: item.return_time,
        isOutOfSector: !!item.is_out_of_sector
      })));

      setFeed(resFeed || []);

      const incItems = Array.isArray(resInc) ? resInc : resInc.items || [];
      const active = (incItems as DBIncident[]).filter(i => i.status !== 'הסתיים');
      setData({
        incidents: active.map(i => ({
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
    
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => { 
      clearInterval(itv); 
      clearInterval(clock); 
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const activeInSector = roster.filter(p => !p.isOutOfSector && p.state === 'field').length;
  const outCount = roster.filter(p => p.isOutOfSector).length;

  return (
    <div className="dashboard-root" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0d14' }}>
      {/* Header */}
      <header className="dash-h" style={{ flex: '0 0 auto' }}>
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
            <span className={cn("val", data?.alerts ? "red pulse" : "green")}>{data?.incidents.length || 0}</span>
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

        <div className="clock-block" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn icon ghost" onClick={toggleFullscreen} data-tooltip="מסך מלא (F11)">
              <Icon name={isFullscreen ? "X" : "Monitor"} />
            </button>
            <button className="btn icon ghost-red" onClick={() => window.location.href = '/'} data-tooltip="יציאה מחמ&quot;ל">
              <Icon name="X" />
            </button>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div className="time">{time.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
            <div className="date">{time.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="dash-grid" style={{ flex: 1, minHeight: 0, padding: 15, paddingBottom: 0 }}>
        {/* INTERACTIVE MAP */}
        <div className="dash-card video-grid" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-t">
            <Icon name="Map" />
            <span>מפת גזרה חיה</span>
            <div className="spacer" />
            <span className="live-tag" style={{ background: 'var(--blue)', color: '#fff' }}>LIVE</span>
          </div>
          <div style={{ flex: 1, position: 'relative', background: '#111', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
            {data ? <LiveMap incidents={data.incidents as any} roster={roster} activeEvent={activeEvent} /> : null}
          </div>
        </div>

        {/* ACTIVE INCIDENTS */}
        <div className="dash-card incidents-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-t">
            <Icon name="AlertTriangle" />
            <span>אירועים בטיפול</span>
          </div>
          <div className="incident-list" style={{ flex: 1, overflowY: 'auto' }}>
            <AnimatePresence>
              {data?.incidents.map((inc) => (
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
                      <span className="time mono">{inc.time}</span>
                    </div>
                    <div className="loc">{inc.loc}</div>
                  </div>
                  <div className="status-badge" style={{ animation: 'urgentGlow 2s infinite' }}>בטיפול</div>
                </motion.div>
              ))}
              {data?.incidents.length === 0 && (
                <div className="empty-state" style={{ padding: 40 }}>
                  <Icon name="CheckCircle" style={{ width: 32, height: 32, opacity: 0.3 }} />
                  <div>אין אירועים פעילים</div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ROSTER / PERSONNEL */}
        <div className="dash-card roster-mini" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-t">
            <Icon name="Users" />
            <span>בעלי תפקידים מחוץ לגזרה</span>
          </div>
          <div className="mini-roster" style={{ flex: 1, overflowY: 'auto' }}>
            {roster.filter(p => p.isOutOfSector).map((p, i) => (
              <div key={i} className="mini-r">
                <div className="av" style={{ background: 'var(--red)', color: 'white' }}>{p.name[0]}</div>
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

      {/* Ticker Bottom Bar */}
      <div className="ticker" style={{ flex: '0 0 auto' }}>
        <div className="ticker-inner">
          {feed.slice(0, 10).map((f, i) => (
            <span key={f.id} className={cn("ticker-item", f.urgent && "urgent")}>
              <span className="mono" style={{ opacity: 0.7, marginRight: 8 }}>{f.time}</span>
              <span style={{ fontWeight: 600, color: 'var(--brand)', margin: '0 6px' }}>{f.src}:</span>
              {f.text}
              {i < 9 && <span style={{ opacity: 0.3, margin: '0 20px' }}>•</span>}
            </span>
          ))}
          {feed.length === 0 && <span className="ticker-item">אין דיווחים אחרונים</span>}
        </div>
      </div>
    </div>
  );
}
