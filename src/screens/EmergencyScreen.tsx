import { useState } from 'react';
import { Icon, FormattedText } from '../components/Icons';
import { useNow, fmtTime, elapsed } from '../hooks/useClock';
import { MokadData } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { toast } from '../components/Toast';

interface EmergencyScreenProps {
  data: MokadData;
  onClose: () => void;
}

// ── helpers ───────────────────────────────────────────────────────────────

function parseMapCoords(raw: string): string {
  if (!raw?.trim()) return '';
  const direct = raw.trim().match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (direct) return `${direct[1]},${direct[2]}`;
  const atCoords = raw.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atCoords) return `${atCoords[1]},${atCoords[2]}`;
  const qCoords = raw.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (qCoords) return `${qCoords[1]},${qCoords[2]}`;
  return '';
}

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
      style={active ? { '--cas-col': color, '--cas-bg': color + '14' } as any : {}}
    >
      <div className="num">{value}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}

// ── UpdateSituationModal ──────────────────────────────────────────────────

function UpdateSituationModal({ event, onClose, onSave }: {
  event: any; onClose: () => void; onSave: () => void;
}) {
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
  const [loading, setLoading] = useState(false);

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
        body: JSON.stringify({ id: event.id, ...formData }),
      });
      if (res.ok) {
        onSave();
        toast('תמונת מצב עודכנה בהצלחה', 'success');
      }
    } catch { toast('שגיאה בעדכון תמונת מצב', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="scrim" onClick={onClose} style={{ zIndex: 1000 }}>
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
              <label>נ"צ / קישור Google Maps</label>
              <input
                className={cn("input", formData.map_coords && !parseMapCoords(formData.map_coords) && "invalid-input")}
                style={formData.map_coords && !parseMapCoords(formData.map_coords) ? { borderColor: 'var(--red)' } : {}}
                placeholder="32.0853, 34.7818  או הדבק קישור מ-Google Maps"
                value={formData.map_coords}
                onChange={e => setFormData({ ...formData, map_coords: e.target.value })}
              />
              <div style={{ fontSize: 11, color: formData.map_coords && !parseMapCoords(formData.map_coords) ? 'var(--red)' : 'var(--ink-4)', marginTop: 4 }}>
                {formData.map_coords && parseMapCoords(formData.map_coords) ? '✅ פורמט זוהה ותקין' : 'הדבק קישור שיתוף מ-Google Maps או קואורדינטות lat, lng'}
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
    <div className="scrim" onClick={onClose} style={{ zIndex: 1000 }}>
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

// ── Main screen ───────────────────────────────────────────────────────────

export function EmergencyScreen({ data, onClose }: EmergencyScreenProps) {
  const ev = data.activeEvent;
  const now = useNow();
  const elapsedStr = elapsed(ev.startedAt, now.getTime());
  const [showUpdate, setShowUpdate] = useState(false);
  const [showEvac, setShowEvac] = useState(false);
  const [reportText, setReportText] = useState('');
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());

  const eventFeed = data.log.filter((it: any) =>
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

      {/* ── COL 1: SITUATION + EVAC ──────────────────────────── */}
      <div className="col">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="panel" style={{ flex: '0 0 auto' }}>
          <div className="panel-h">
            <h3>תמונת מצב</h3>
            <span className="tag" style={{ marginRight: 4 }}>עודכן {ev.snapshotAt}</span>
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
                        {e.by?.includes('מסוק') ? <Icon name="Activity" /> : <Icon name="Truck" />}
                        {e.by}
                      </span>
                    </td>
                    <td>{e.to}</td>
                    <td><span className="tag green">{e.state}</span></td>
                  </tr>
                ))}
                {(ev.evac || []).length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-4)', padding: 16 }}>אין פינויים רשומים</td></tr>
                )}
              </tbody>
            </table>
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
            <span className="tag">{(ev.forces || []).reduce((s: number, f: any) => s + f.count, 0)} סה"כ</span>
          </div>
          <div className="panel-b" style={{ padding: 0 }}>
            <div className="roster" style={{ maxHeight: 160, overflow: 'auto' }}>
              {(ev.forces || []).map((f: any, i: number) => (
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
              {eventFeed.map((it: any, i: number) => (
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
