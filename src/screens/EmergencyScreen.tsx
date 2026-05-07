import { useState } from 'react';
import { Icon, FormattedText } from '../components/Icons';
import { useNow, fmtTime, elapsed } from '../hooks/useClock';
import { MokadData } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface EmergencyScreenProps {
  data: MokadData;
  onClose: () => void;
}

function UpdateSituationModal({ event, onClose, onSave }: { event: any, onClose: () => void, onSave: () => void }) {
  const [formData, setFormData] = useState({
    dead: event.dead || 0,
    critical: event.critical || 0,
    serious: event.serious || 0,
    light: event.light || 0,
    untreated: event.untreated || 0,
    missing: event.missing || 0,
    trapped: event.trapped || 0,
    description: event.description || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/emergency/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: event.id, ...formData })
      });
      if (res.ok) onSave();
    } catch {
      alert('שגיאה בעדכון');
    } finally {
      setLoading(false);
    }
  };

  const numField = (label: string, key: keyof typeof formData, color?: string) => (
    <div className="field">
      <label style={color ? { color } : {}}>{label}</label>
      <input
        type="number" min={0} className="input"
        value={formData[key] as number}
        onChange={e => setFormData({ ...formData, [key]: parseInt(e.target.value) || 0 })}
      />
    </div>
  );

  return (
    <div className="scrim" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
        <div className="h">
          <Icon name="Edit" />
          <h3>עדכון תמונת מצב – {event.id}</h3>
        </div>
        <div className="b" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {numField('הרוגים', 'dead', 'var(--red)')}
            {numField('אנושים', 'critical', 'var(--amber)')}
            {numField('בינוני', 'serious', 'var(--amber)')}
            {numField('קל', 'light')}
            {numField('נעדרים', 'missing')}
            {numField('לכודים', 'trapped')}
          </div>
          <div className="field">
            <label>תיאור ופרטים נוספים</label>
            <textarea
              className="textarea" style={{ height: 100 }}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>
        <div className="f">
          <button className="btn brand" onClick={handleSave} disabled={loading}>{loading ? 'שומר...' : 'שמור שינויים'}</button>
          <button className="btn ghost" onClick={onClose}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

function AddEvacModal({ eventId, onClose, onSave }: { eventId: string, onClose: () => void, onSave: () => void }) {
  const [form, setForm] = useState({ who: '', by: '', to: '', state: 'בדרך' });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.who.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/evac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, ...form })
      });
      if (res.ok) onSave();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scrim" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal sm" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="h"><Icon name="Truck" /><h3>הוספת פינוי</h3></div>
        <div className="b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label>נפגעים (תיאור)</label>
            <input className="input" placeholder="לדוגמה: 2 פצועים בינוני" value={form.who} onChange={e => setForm({ ...form, who: e.target.value })} />
          </div>
          <div className="field">
            <label>גורם מפנה</label>
            <input className="input" placeholder="מד&quot;א / מסוק 669 / נט&quot;ן" value={form.by} onChange={e => setForm({ ...form, by: e.target.value })} />
          </div>
          <div className="field">
            <label>יעד</label>
            <input className="input" placeholder="בית חולים / נקודת איסוף" value={form.to} onChange={e => setForm({ ...form, to: e.target.value })} />
          </div>
          <div className="field">
            <label>מצב</label>
            <select className="input" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}>
              <option>בדרך</option>
              <option>התקבל</option>
              <option>מטופלים, יציבים</option>
              <option>קריטי</option>
            </select>
          </div>
        </div>
        <div className="f">
          <button className="btn brand" onClick={handleSave} disabled={loading || !form.who.trim()}>הוסף פינוי</button>
          <button className="btn ghost" onClick={onClose}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

export function EmergencyScreen({ data, onClose }: EmergencyScreenProps) {
  const ev = data.activeEvent;
  const now = useNow();
  const elapsedStr = elapsed(ev.startedAt, now.getTime());
  const [showUpdate, setShowUpdate] = useState(false);
  const [showEvac, setShowEvac] = useState(false);
  const [reportText, setReportText] = useState('');

  const eventFeed = data.log.filter((it: any) => !it.event_id || it.event_id === ev.id);

  const handleSendReport = async () => {
    if (!reportText.trim()) return;
    try {
      await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src: 'מוקדן', text: reportText, event_id: ev.id })
      });
      setReportText('');
    } catch { /* silent */ }
  };

  return (
    <div className="emerg-grid">
      {showUpdate && (
        <UpdateSituationModal event={ev} onClose={() => setShowUpdate(false)} onSave={() => setShowUpdate(false)} />
      )}
      {showEvac && (
        <AddEvacModal eventId={ev.id} onClose={() => setShowEvac(false)} onSave={() => setShowEvac(false)} />
      )}

      {/* HEADER */}
      <div className="emerg-header" style={{ gridColumn: '1/-1' }}>
        <div className="event-title" style={{ flex: 1 }}>
          <div className="siren"><Icon name="Siren" lg /></div>
          <div className="meta">
            <div className="ttl">
              <span>{ev.type}</span>
              <span className="tag red">{ev.id}</span>
              <span className="tag amber">פעיל</span>
            </div>
            <div className="sub">{ev.location} · {ev.grid} · {ev.sceneName}</div>
          </div>
          <div className="clocks">
            <div className="bigclock">
              <div className="v">{elapsedStr}</div>
              <div className="l">זמן חלוף</div>
            </div>
            <div className="bigclock">
              <div className="v">{fmtTime(now)}</div>
              <div className="l">שעה נוכחית</div>
            </div>
            <button className="btn ghost" onClick={onClose} style={{ marginRight: 8 }}>
              <Icon name="X" /> סגירת אירוע
            </button>
          </div>
        </div>
      </div>

      {/* COL 1: SITUATION */}
      <div className="col">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="panel" style={{ flex: '0 0 auto' }}>
          <div className="panel-h">
            <h3>תמונת מצב עדכנית</h3>
            <span className="tag">עודכן {ev.snapshotAt}</span>
            <div className="spacer" />
            <button className="btn primary sm" onClick={() => setShowUpdate(true)}><Icon name="Edit" /> עדכון תמונת מצב</button>
          </div>
          <div className="panel-b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="sit-grid">
              <div className="metric danger">
                <div className="lbl">נפגעים – סה"כ</div>
                <div className="num">{(ev.dead || 0) + (ev.critical || 0) + (ev.serious || 0) + (ev.light || 0) + (ev.untreated || 0)}</div>
              </div>
              <div className="metric amber">
                <div className="lbl">לכודים / נעדרים</div>
                <div className="num">{(ev.trapped || 0) + (ev.missing || 0)}</div>
              </div>
            </div>
            <div className="cas-table">
              <div className="row dead"><span>הרוגים</span><span>{ev.dead || 0}</span></div>
              <div className="row crit"><span>אנושים</span><span>{ev.critical || 0}</span></div>
              <div className="row serious"><span>בינוני</span><span>{ev.serious || 0}</span></div>
              <div className="row light"><span>קל</span><span>{ev.light || 0}</span></div>
              <div className="row"><span>טרם טופלו</span><span>{ev.untreated || 0}</span></div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="panel" style={{ flex: '1 1 auto', minHeight: 0 }}>
          <div className="panel-h">
            <h3>פינוי</h3>
            <div className="spacer" />
            <button className="btn sm" onClick={() => setShowEvac(true)}><Icon name="Plus" /> הוספת פינוי</button>
          </div>
          <div className="panel-b" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr><th>נפגעים</th><th>גורם</th><th>יעד</th><th>מצב</th></tr>
              </thead>
              <tbody>
                {(ev.evac || []).map((e: any, i: number) => (
                  <tr key={i}>
                    <td>{e.who}</td>
                    <td>
                      <span className="row-flex">
                        {e.by.includes('מסוק') ? <Icon name="Activity" /> : <Icon name="Truck" />}
                        {e.by}
                      </span>
                    </td>
                    <td>{e.to}</td>
                    <td><span className="tag green">{e.state}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="panel" style={{ flex: '0 0 auto' }}>
          <div className="panel-h">
            <h3>כוחות פועלים</h3>
            <div className="spacer" />
            <span className="tag">{(ev.forces || []).reduce((s: number, f: any) => s + f.count, 0)} סה"כ</span>
          </div>
          <div className="panel-b" style={{ padding: 0 }}>
            <div className="roster" style={{ maxHeight: 200, overflow: 'auto' }}>
              {(ev.forces || []).map((f: any, i: number) => (
                <div className="r" key={i}>
                  <div className="av"><Icon name={f.icon || 'Shield'} /></div>
                  <div><div className="name">{f.name}</div></div>
                  <div className="meta mono">×{f.count}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="panel" style={{ flex: '0 0 auto' }}>
          <div className="panel-h"><h3>מיקום ותיאור</h3></div>
          <div className="panel-b">
            <div className="minimap">
              <svg viewBox="0 0 400 160" preserveAspectRatio="none">
                <defs>
                  <pattern id="grid-e" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a3326" strokeWidth=".5" />
                  </pattern>
                </defs>
                <rect width="400" height="160" fill="url(#grid-e)" />
                <path d="M0 90 Q 100 40 200 75 T 400 60" stroke="#2d5a3f" strokeWidth="2" fill="none" />
                <path d="M0 130 Q 120 110 240 125 T 400 115" stroke="#2d5a3f" strokeWidth="1.4" fill="none" />
                <path d="M210 0 L 195 60 L 230 95 L 200 160" stroke="#5a4a1a" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
                <text x="20" y="22" fill="#3a5a4a" fontSize="9" fontFamily="monospace">חרמש</text>
                <text x="320" y="22" fill="#3a5a4a" fontSize="9" fontFamily="monospace">ציר 55</text>
                <text x="220" y="155" fill="#3a5a4a" fontSize="9" fontFamily="monospace">ואדי קנה</text>
              </svg>
              <div className="pin" style={{ top: '42%', left: '48%' }}>
                <span className="lbl">חפ"ק</span>
              </div>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55, color: 'var(--ink-1)' }}>
              <FormattedText text={ev.description} />
            </div>
          </div>
        </div>
      </div>

      {/* COL 2: MEDIA */}
      <div className="col">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h">
            <h3>מדיה מהשטח</h3>
            <span className="tag">{(ev.media || []).length} פריטים</span>
            <div className="spacer" />
            <div className="seg">
              <button className="on">הכל</button>
              <button>תמונות</button>
              <button>וידאו</button>
            </div>
          </div>
          <div className="panel-b" style={{ padding: 0 }}>
            <div className="media-grid">
              {(ev.media || []).map((m: any) => (
                <div key={m.i ?? m.id} className={cn("media-card", m.kind === 'video' && 'video', m.cls)}>
                  {m.kind === 'photo' && (
                    <svg className="ph" viewBox="0 0 100 75" preserveAspectRatio="none"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: .35 }}>
                      <circle cx="70" cy="22" r="6" fill="#5a6878" />
                      <path d="M0 60 L 30 35 L 55 50 L 80 30 L 100 45 L 100 75 L 0 75 Z" fill="#2a3344" />
                    </svg>
                  )}
                  <div className="badge mono">{m.kind === 'video' ? m.dur : m.t || m.time}</div>
                  <div className="cap">
                    {m.cap}<br />
                    <span style={{ opacity: .7, fontFamily: 'var(--mono)', fontSize: 10 }}>{m.t || m.time}</span>
                  </div>
                </div>
              ))}
              {(ev.media || []).length === 0 && (
                <div style={{ padding: 20, color: 'var(--ink-4)', textAlign: 'center', gridColumn: '1/-1' }}>אין מדיה לאירוע זה</div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* COL 3: LOG */}
      <div className="col">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="panel" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-h">
            <h3>זרם דיווחים</h3>
            <span className="tag amber">חי</span>
            <div className="spacer" />
            <button className="btn sm icon" title="חיפוש"><Icon name="Search" /></button>
            <button className="btn sm icon" title="סינון"><Icon name="Filter" /></button>
          </div>
          <div className="panel-b" style={{ padding: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="feed" style={{ flex: 1, overflow: 'auto' }}>
              {eventFeed.map((it, i) => (
                <div key={i} className={cn("item", it.urgent && 'urgent', it.system && 'system')}>
                  <div className="t mono">{it.t}</div>
                  <div className="body">
                    <FormattedText text={it.text} />
                    <span className="src">— {it.src}</span>
                  </div>
                </div>
              ))}
              {eventFeed.length === 0 && (
                <div style={{ padding: 20, color: 'var(--ink-4)', textAlign: 'center' }}>אין דיווחים עדיין</div>
              )}
            </div>
            <div style={{ padding: 10, borderTop: '1px solid var(--border-1)', background: 'var(--bg-1)' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text" className="input"
                  placeholder="הוסף דיווח לאירוע..."
                  value={reportText}
                  onChange={e => setReportText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendReport()}
                />
                <button className="btn brand icon" onClick={handleSendReport}><Icon name="Send" /></button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
