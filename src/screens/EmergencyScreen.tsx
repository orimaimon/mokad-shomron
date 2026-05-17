import { useState, useEffect } from 'react';
import { Icon, FormattedText } from '../components/Icons';
import { useNow, fmtTime, elapsed } from '../hooks/useClock';
import { MokadData, ActiveEvent } from '../types';
import { cn, parseMapCoords } from '../lib/utils';
import { motion } from 'motion/react';
import { toast } from '../components/Toast';
import { MapPicker } from '../components/MapPicker';

interface EmergencyScreenProps {
  data: MokadData;
  onClose: () => void;
}

// ── helpers ───────────────────────────────────────────────────────────────

function osmEmbedUrl(coords: string): string {
  const [lat, lng] = coords.split(',').map(Number);
  const d = 0.006;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`;
}

// ── CasualtyCard ─────────────────────────────────────────────────────────

function CasualtyCard({ label, value, color, wide = false }: {
  label: string; value: number; color: string; wide?: boolean;
}) {
  const active = value > 0;
  return (
    <div
      className={cn('cas-card', active && 'active', wide && 'wide')}
      style={active ? { '--cas-col': color, '--cas-bg': color + '14' } as React.CSSProperties : {}}
    >
      <div className="num">{value}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}

// ── UpdateSituationModal ──────────────────────────────────────────────────

function UpdateSituationModal({ event, onClose, onSave }: {
  event: ActiveEvent; onClose: () => void; onSave: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [formData, setFormData] = useState({
    dead: event.dead || 0,
    critical: event.critical || 0,
    serious: event.serious || 0,
    light: event.light || 0,
    untreated: event.untreated || 0,
    missing: event.missing || 0,
    trapped: event.trapped || 0,
    description: event.description || '',
    map_coords: event.map_coords || '',
  });

  const numField = (label: string, key: keyof typeof formData, color?: string) => (
    <div className="field">
      <label style={color ? { color } : {}}>{label}</label>
      <input
        autoFocus={key === 'dead'}
        type="number" min={0} className="input"
        value={formData[key] as number}
        onChange={e => setFormData({ ...formData, [key]: parseInt(e.target.value) || 0 })}
      />
    </div>
  );

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/emergency/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: event.id, ...formData, version: event.version }),
      });
      if (res.ok) {
        onSave();
        toast('תמונת מצב עודכנה בהצלחה', 'success');
      } else if (res.status === 409) {
        toast('האירוע עודכן על ידי משתמש אחר. אנא סגור ורענן.', 'error');
      } else {
        toast('שגיאה בעדכון תמונת מצב', 'error');
      }
    } catch { toast('שגיאה בעדכון תמונת מצב', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className="scrim" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
          <div className="h"><Icon name="Edit" /><h3>עדכון תמונת מצב — {event.id}</h3></div>
          <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
            <div className="b" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {numField('הרוגים', 'dead', '#94a3b8')}
                {numField('אנושים', 'critical', '#ef4444')}
                {numField('בינוני', 'serious', '#f97316')}
                {numField('קל', 'light', '#eab308')}
                {numField('נעדרים', 'missing', '#3b82f6')}
                {numField('לכודים', 'trapped', '#8b5cf6')}
              </div>
              {numField('טרם טופלו', 'untreated')}
              <div className="field">
                <label>תיאור ופרטים</label>
                <textarea
                  className="textarea" style={{ height: 90 }}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="field">
                <label>נ"צ / קואורדינטות</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    className={cn("input mono", formData.map_coords && !parseMapCoords(formData.map_coords) && "invalid-input")}
                    style={{ flex: 1, ...(formData.map_coords && !parseMapCoords(formData.map_coords) ? { borderColor: 'var(--red)' } : {}) }}
                    placeholder="32.085, 34.781 או קישור Maps"
                    value={formData.map_coords}
                    onChange={e => setFormData({ ...formData, map_coords: e.target.value })}
                  />
                  <button type="button" className="btn icon ghost" onClick={() => setShowMapPicker(true)} data-tooltip="בחר מהמפה">
                    <Icon name="Map" />
                  </button>
                </div>
                <div style={{ fontSize: 11, color: formData.map_coords && !parseMapCoords(formData.map_coords) ? 'var(--red)' : 'var(--ink-4)', marginTop: 4 }}>
                  {formData.map_coords && parseMapCoords(formData.map_coords) ? '✅ פורמט זוהה ותקין' : 'הדבק קישור שיתוף מ-Google Maps או לחץ לבחירה מהמפה'}
                </div>
              </div>
            </div>
            <div className="f">
              <button type="submit" className="btn brand" disabled={loading}>{loading ? 'שומר...' : 'שמור שינויים'}</button>
              <button type="button" className="btn ghost" onClick={onClose}>ביטול</button>
            </div>
          </form>
        </div>
      </div>
      {showMapPicker && (
        <MapPicker 
          initialCoords={formData.map_coords ? parseMapCoords(formData.map_coords) : undefined} 
          onSelect={(c) => { setFormData({ ...formData, map_coords: c }); setShowMapPicker(false); }} 
          onClose={() => setShowMapPicker(false)} 
        />
      )}
    </>
  );
}

// ── AddEvacModal ──────────────────────────────────────────────────────────

function AddEvacModal({ eventId, onClose, onSave }: {
  eventId: string; onClose: () => void; onSave: () => void;
}) {
  const [form, setForm] = useState({ who: '', by: '', to: '', state: 'בדרך' });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.who.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/evac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, ...form }),
      });
      if (res.ok) {
        onSave();
        toast('הפינוי הוסף בהצלחה', 'success');
      }
    } catch { toast('שגיאה בהוספת פינוי', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal sm" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="h"><Icon name="Truck" /><h3>הוספת פינוי</h3></div>
        <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
          <div className="b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label>נפגעים (תיאור)</label>
              <input autoFocus className="input" placeholder="2 פצועים בינוני" value={form.who} onChange={e => setForm({ ...form, who: e.target.value })} />
            </div>
            <div className="field">
              <label>גורם מפנה</label>
              <input className="input" placeholder='מד"א / מסוק 669 / נט"ן' value={form.by} onChange={e => setForm({ ...form, by: e.target.value })} />
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
            <button type="submit" className="btn brand" disabled={loading || !form.who.trim()}>{loading ? 'מוסיף...' : 'הוסף פינוי'}</button>
            <button type="button" className="btn ghost" disabled={loading} onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── SopPanel ──────────────────────────────────────────────────────────────

function SopPanel({ eventId, eventType }: { eventId: string; eventType: string }) {
  const [steps, setSteps] = useState<string[]>([]);
  const [progress, setProgress] = useState<Record<number, boolean>>({});
  const [collapsed, setCollapsed] = useState(false);

  const token = localStorage.getItem('token');
  const userName = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').name || ''; } catch { return ''; } })();

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    fetch(`/api/sop/template/${encodeURIComponent(eventType)}`, { headers })
      .then(r => r.json()).then(setSteps).catch(() => {});
    fetch(`/api/sop/progress/${encodeURIComponent(eventId)}`, { headers })
      .then(r => r.json()).then((rows: { step_idx: number; done: number }[]) => {
        const p: Record<number, boolean> = {};
        rows.forEach(r => { if (r.done) p[r.step_idx] = true; });
        setProgress(p);
      }).catch(() => {});
  }, [eventId, eventType, token]);

  if (steps.length === 0) return null;

  const doneCount = steps.filter((_, i) => progress[i]).length;
  const allDone = doneCount === steps.length;

  const toggle = async (idx: number) => {
    const newDone = !progress[idx];
    setProgress(p => ({ ...p, [idx]: newDone }));
    try {
      await fetch(`/api/sop/progress/${encodeURIComponent(eventId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ step_idx: idx, done: newDone, done_by: userName }),
      });
    } catch {}
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="panel" style={{ flex: '0 0 auto' }}>
      <div
        className="panel-h"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setCollapsed(c => !c)}
      >
        <Icon name="ClipboardList" style={{ width: 15 }} />
        <h3 style={{ flex: 1 }}>נוהל אירוע</h3>
        {/* progress bar */}
        <div style={{ width: 80, height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden', margin: '0 8px' }}>
          <div style={{
            height: '100%',
            width: `${(doneCount / steps.length) * 100}%`,
            background: allDone ? '#22c55e' : 'var(--amber)',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: allDone ? '#22c55e' : 'var(--amber)', minWidth: 30, textAlign: 'left' }}>
          {doneCount}/{steps.length}
        </span>
        <Icon name="ChevronDown" style={{ width: 13, marginRight: 4, transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
      </div>
      {!collapsed && (
        <div className="panel-b" style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {steps.map((step, i) => (
            <div
              key={i}
              onClick={() => toggle(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                padding: '5px 8px', borderRadius: 6,
                background: progress[i] ? 'rgba(34,197,94,0.07)' : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: `1.5px solid ${progress[i] ? '#22c55e' : 'var(--line-2)'}`,
                background: progress[i] ? '#22c55e' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                {progress[i] && <Icon name="Check" style={{ width: 10, color: '#000' }} />}
              </div>
              <span style={{
                fontSize: 12, flex: 1, lineHeight: 1.4,
                color: progress[i] ? 'var(--ink-3)' : 'var(--ink-1)',
                textDecoration: progress[i] ? 'line-through' : 'none',
                transition: 'color 0.15s',
              }}>
                {step}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────

export function EmergencyScreen({ data, onClose }: EmergencyScreenProps) {
  const ev = data.activeEvent;
  const now = useNow();
  const elapsedStr = elapsed(ev.startedAt, now.getTime());
  const [showUpdate, setShowUpdate] = useState(false);
  const [showEvac, setShowEvac] = useState(false);
  const [reportText, setReportText] = useState('');
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());

  const eventFeed = data.log.filter(it =>
    !deletedIds.has(it.id) && (!it.event_id || it.event_id === ev.id)
  );

  const handleDeleteFeedItem = async (id: number) => {
    setDeletedIds(prev => new Set(prev).add(id));
    await fetch(`/api/feed/${id}`, { method: 'DELETE' }).catch(() => {
      setDeletedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    });
  };

  const handleSendReport = async () => {
    if (!reportText.trim()) return;
    try {
      await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src: 'מוקדן', text: reportText, event_id: ev.id }),
      });
      setReportText('');
    } catch { toast('שגיאה בשליחת דיווח', 'error'); }
  };

  const totalCas = (ev.dead || 0) + (ev.critical || 0) + (ev.serious || 0) + (ev.light || 0) + (ev.untreated || 0);
  const totalMissing = (ev.trapped || 0) + (ev.missing || 0);
  const mapCoords = parseMapCoords(ev.map_coords || '');

  const handleGenerateSitRep = async () => {
    const report = `[תמונת מצב מבצעית - מוקד שומרון]
זמן הפקה: ${new Date().toLocaleString('he-IL')}
אירוע: ${ev.type} (מזהה: ${ev.id})
מיקום: ${ev.location} ${ev.sceneName ? `- ${ev.sceneName}` : ''} ${ev.grid ? `(נ"צ ${ev.grid})` : ''}

סטטוס נפגעים (סה"כ ${totalCas}):
הרוגים: ${ev.dead || 0} | אנוש: ${ev.critical || 0} | קשה: ${ev.serious || 0} | קל: ${ev.light || 0} | טרם טופלו: ${ev.untreated || 0}
לכודים/נעדרים: ${totalMissing}

כוחות בשטח:
${(ev.forces || []).map(f => `- ${f.name} (x${f.count})`).join('\n') || 'אין כוחות מוזנים'}

סטטוס פינויים:
${(ev.evac || []).map((e: { who: string; by: string; to: string; state: string }) => `- ${e.who} מפונה ע"י ${e.by} אל ${e.to} (מצב: ${e.state})`).join('\n') || 'אין פינויים פעילים'}

תיאור ופרטים נוספים:
${ev.description || 'לא הוזן תיאור'}
`;

    try {
      await navigator.clipboard.writeText(report);
      toast('תמונת המצב הועתקה ללוח (מוכן להדבקה בווטסאפ)', 'success');
    } catch {
      toast('שגיאה בהעתקה ללוח', 'error');
    }
  };

  return (
    <div className="emerg-grid">
      {showUpdate && (
        <UpdateSituationModal event={ev} onClose={() => setShowUpdate(false)} onSave={() => setShowUpdate(false)} />
      )}
      {showEvac && (
        <AddEvacModal eventId={ev.id} onClose={() => setShowEvac(false)} onSave={() => setShowEvac(false)} />
      )}

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="emerg-header" style={{ gridColumn: '1/-1' }}>
        <div className="event-title" style={{ flex: 1 }}>
          <div className="siren"><Icon name="Siren" lg /></div>
          <div className="meta">
            <div className="ttl">
              <span>{ev.type}</span>
              <span className="tag red">{ev.id}</span>
              <span className="tag amber">פעיל</span>
            </div>
            <div className="sub">{ev.location}{ev.grid ? ` · נ"צ ${ev.grid}` : ''} · {ev.sceneName}</div>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginRight: 8 }}>
              <button className="btn brand sm" onClick={handleGenerateSitRep} style={{ whiteSpace: 'nowrap' }} data-tooltip="העתק דו״ח תמונת מצב ללוח">
                <Icon name="FileText" style={{ width: 13 }} /> הפק תמונת מצב (SitRep)
              </button>
              <button className="btn primary sm" onClick={() => setShowUpdate(true)} style={{ whiteSpace: 'nowrap' }}>
                <Icon name="Edit" style={{ width: 13 }} /> עדכון תמונת מצב
              </button>
              <button className="btn danger sm" onClick={onClose} style={{ whiteSpace: 'nowrap' }}>
                <Icon name="X" style={{ width: 13 }} /> סגירת אירוע
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── COL 1: SOP + SITUATION + EVAC ───────────────────── */}
      <div className="col">
        <SopPanel eventId={ev.id} eventType={ev.type} />
        {(!ev.forces || ev.forces.length === 0) && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', padding: '10px 14px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10, color: '#ffb4b4', fontSize: 13, marginBottom: 15, animation: 'urgentGlow 2s infinite' }}>
            <Icon name="AlertTriangle" style={{ width: 16 }} />
            <div><strong>התרעה:</strong> לא הוזנו כוחות לאירוע! אנא עדכן תמונת מצב.</div>
          </div>
        )}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="panel" style={{ flex: '0 0 auto' }}>
          <div className="panel-h">
            <h3>תמונת מצב</h3>
            <span className={cn("time-since", "recent")} style={{ marginRight: 4 }}>עודכן ב-{ev.snapshotAt}</span>
          </div>
          <div className="panel-b" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* summary row */}
            <div className="sit-grid">
              <div className="metric danger">
                <div className="lbl">נפגעים – סה"כ</div>
                <div className="num">{totalCas}</div>
              </div>
              <div className={cn("metric", totalMissing > 0 && 'amber')}>
                <div className="lbl">לכודים / נעדרים</div>
                <div className="num">{totalMissing}</div>
              </div>
            </div>
            {/* casualty cards */}
            <div className="cas-cards">
              <CasualtyCard label="הרוגים" value={ev.dead || 0} color="#94a3b8" />
              <CasualtyCard label="אנושים" value={ev.critical || 0} color="#ef4444" />
              <CasualtyCard label="בינוני" value={ev.serious || 0} color="#f97316" />
              <CasualtyCard label="קל" value={ev.light || 0} color="#eab308" />
              <CasualtyCard label="נעדרים" value={ev.missing || 0} color="#3b82f6" />
              <CasualtyCard label="לכודים" value={ev.trapped || 0} color="#8b5cf6" />
              <CasualtyCard label="טרם טופלו" value={ev.untreated || 0} color="#6b7280" wide />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h">
            <h3>פינוי</h3>
            <div className="spacer" />
            <button className="btn sm" onClick={() => setShowEvac(true)}><Icon name="Plus" /> הוספת פינוי</button>
          </div>
          <div className="panel-b" style={{ padding: 16, overflowY: 'auto' }}>
            {(ev.evac || []).length === 0 ? (
              <div className="empty-state" style={{ padding: 20 }}>
                <Icon name="Truck" className="empty-icon" style={{ width: 24, height: 24 }} />
                <span>אין פינויים רשומים</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {(ev.evac || []).map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 16, borderBottom: i < ev.evac.length - 1 ? '1px dashed var(--border-1)' : 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-3)', border: '1px solid var(--border-1)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)' }}>
                      {e.by?.includes('מסוק') ? <Icon name="Activity" style={{ width: 14 }} /> : <Icon name="Truck" style={{ width: 14 }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: 'var(--ink-1)', fontSize: 14 }}>{e.who}</span>
                        <span className={cn("tag", e.state === 'בדרך' ? 'amber' : 'green')}>{e.state}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--ink-3)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="Shield" style={{ width: 11 }} /> {e.by}</span>
                        <span>→</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="Map" style={{ width: 11 }} /> {e.to}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── COL 2: MAP + DESCRIPTION ─────────────────────────── */}
      <div className="col">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="panel" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-h">
            <h3>מפה ומיקום</h3>
            {mapCoords && (
              <a
                href={`https://www.google.com/maps?q=${mapCoords}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn sm"
                style={{ marginRight: 'auto' }}
              >
                <Icon name="Map" style={{ width: 13 }} /> Google Maps
              </a>
            )}
            {!mapCoords && (
              <button className="btn sm ghost" style={{ marginRight: 'auto' }} onClick={() => setShowUpdate(true)}>
                <Icon name="Map" style={{ width: 13 }} /> הגדר נ"צ
              </button>
            )}
          </div>
          <div className="realmap">
            {mapCoords ? (
              <iframe
                src={osmEmbedUrl(mapCoords)}
                title="מפה"
                loading="lazy"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            ) : (
              <div className="realmap-empty">
                <Icon name="Map" style={{ width: 36, opacity: 0.3 }} />
                <div style={{ fontSize: 13 }}>אין נ"צ מוגדר לאירוע</div>
                <div style={{ fontSize: 11 }}>לחץ "עדכון תמונת מצב" והדבק קישור מ-Google Maps</div>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="panel" style={{ flex: '0 0 auto', maxHeight: 150 }}>
          <div className="panel-h"><h3>תיאור אירוע</h3></div>
          <div className="panel-b" style={{ fontSize: 13, lineHeight: 1.6, overflow: 'auto', maxHeight: 100 }}>
            {ev.description
              ? <FormattedText text={ev.description} />
              : <span style={{ color: 'var(--ink-4)' }}>לא הוזן תיאור</span>
            }
          </div>
        </motion.div>
      </div>

      {/* ── COL 3: FORCES + FEED ─────────────────────────────── */}
      <div className="col">
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }} className="panel" style={{ flex: '0 0 auto' }}>
          <div className="panel-h">
            <h3>כוחות פועלים</h3>
            <div className="spacer" />
            <span className="tag">{(ev.forces || []).reduce((s, f) => s + f.count, 0)} סה"כ</span>
          </div>
          <div className="panel-b" style={{ padding: 0 }}>
            <div className="roster" style={{ maxHeight: 160, overflow: 'auto' }}>
              {(ev.forces || []).map((f, i) => (
                <div className="r" key={i}>
                  <div className="av"><Icon name={f.icon || 'Shield'} /></div>
                  <div><div className="name">{f.name}</div></div>
                  <div className="meta mono">×{f.count}</div>
                </div>
              ))}
              {(ev.forces || []).length === 0 && (
                <div style={{ padding: 14, color: 'var(--ink-4)', fontSize: 12, textAlign: 'center' }}>אין כוחות רשומים</div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="panel" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-h">
            <h3>זרם דיווחים</h3>
            <span className="tag amber">חי</span>
          </div>
          <div className="panel-b" style={{ padding: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="feed" style={{ flex: 1, overflow: 'auto' }}>
              {eventFeed.map((it, i) => (
                <div key={it.id ?? i} className={cn('item', it.urgent && 'urgent', it.system && 'system')} style={{ position: 'relative' }}>
                  <div className="t mono">{it.t}</div>
                  <div className="body">
                    <FormattedText text={it.text} />
                    <span className="src">— {it.src}</span>
                  </div>
                  <button
                    className="btn ghost-red icon-sm"
                    style={{ position: 'absolute', top: 6, left: 6, opacity: 0.35, transition: 'opacity .15s', padding: '2px 4px' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.35')}
                    onClick={() => handleDeleteFeedItem(it.id)}
                    title="מחק רשומה"
                  >
                    <Icon name="Trash" style={{ width: 11 }} />
                  </button>
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
