import { useState, useEffect, useCallback } from 'react';
import { Icon } from '../components/Icons';
import { toast } from '../components/Toast';
import { useNow } from '../hooks/useClock';
import { MokadData, DBShiftLog, ShiftHardware, User } from '../types';
import { cn } from '../lib/utils';

interface ShiftScreenProps {
  data: MokadData;
  user: User;
}

type HwKey = Exclude<keyof ShiftHardware, 'other'>;

const HW_ITEMS: { key: HwKey; label: string }[] = [
  { key: 'cameras', label: 'מצלמות' },
  { key: 'vehicles', label: 'רכבים' },
  { key: 'comms', label: 'קשר' },
];

function parseHardware(raw: string): ShiftHardware {
  try { return JSON.parse(raw); }
  catch { return { cameras: true, vehicles: true, comms: true, other: '' }; }
}

function fmtDuration(start: string, end: string | null): string {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}:${String(m).padStart(2, '0')} שע'`;
}

function fmtDt(iso: string): string {
  return new Date(iso).toLocaleString('he-IL', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function HardwareBadges({ raw }: { raw: string }) {
  const hw = parseHardware(raw);
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {HW_ITEMS.map(({ key, label }) => (
        <span key={key} className={cn('tag sm', hw[key] ? 'green' : 'red')} title={label}>
          {label}
        </span>
      ))}
      {hw.other && (
        <span className="tag sm" title={hw.other}
          style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {hw.other}
        </span>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px', borderRadius: 8,
  background: 'var(--bg-2)', border: '1px solid var(--border-1)', color: 'white', fontSize: 13,
};

export function ShiftScreen({ data, user }: ShiftScreenProps) {
  const now = useNow();
  const [activeShift, setActiveShift] = useState<DBShiftLog | null>(null);
  const [history, setHistory] = useState<DBShiftLog[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [hardware, setHardware] = useState<ShiftHardware>({ cameras: true, vehicles: true, comms: true, other: '' });
  const [loading, setLoading] = useState(false);
  const [expandedNote, setExpandedNote] = useState<number | null>(null);

  const openIncidentsCount = data.routine.incidents.filter(i => i.status !== 'הסתיים').length;
  const outOfSectorCount = data.routine.roster.filter(r => r.isOutOfSector).length;

  const fetchShifts = useCallback(async () => {
    try {
      const [activeRes, histRes] = await Promise.all([
        fetch('/api/shifts/active'),
        fetch('/api/shifts'),
      ]);
      if (activeRes.ok) setActiveShift(await activeRes.json());
      if (histRes.ok) {
        const all = (await histRes.json()) as DBShiftLog[];
        setHistory(all.filter(s => s.status === 'closed'));
      }
    } catch {
      // silent on background poll failures
    }
  }, []);

  useEffect(() => {
    fetchShifts();
    const interval = setInterval(fetchShifts, 5000);
    return () => clearInterval(interval);
  }, [fetchShifts]);

  // Live elapsed time
  const elapsedMs = activeShift ? now.getTime() - new Date(activeShift.start_time).getTime() : 0;
  const elapsedH = Math.floor(elapsedMs / 3600000);
  const elapsedM = Math.floor((elapsedMs % 3600000) / 60000);
  const elapsedStr = `${String(elapsedH).padStart(2, '0')}:${String(elapsedM).padStart(2, '0')}`;

  const handleStartShift = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shifts/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_name: user.name || 'מוקדן' }),
      });
      if (res.ok) {
        toast('משמרת התחילה בהצלחה', 'success');
        fetchShifts();
      } else {
        toast('שגיאה בתחילת משמרת', 'error');
      }
    } catch {
      toast('שגיאת תקשורת', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEndShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/shifts/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          open_incidents_count: openIncidentsCount,
          out_of_sector_count: outOfSectorCount,
          hardware_status: JSON.stringify(hardware),
          notes,
        }),
      });
      if (res.ok) {
        toast('משמרת הועברה. דוח חפיפה נשמר.', 'success');
        setShowModal(false);
        setNotes('');
        setHardware({ cameras: true, vehicles: true, comms: true, other: '' });
        fetchShifts();
      } else {
        const err = await res.json();
        toast(err.error || 'שגיאה בסגירת משמרת', 'error');
      }
    } catch {
      toast('שגיאת תקשורת', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 20, gap: 16, minHeight: 0 }}>

      {/* ── End Shift Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="scrim" onClick={() => setShowModal(false)}>
          <div className="modal lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="h">
              <Icon name="ClipboardCheck" />
              <h3>העברת משמרת — דוח חפיפה</h3>
            </div>
            <form onSubmit={handleEndShift}>
              <div className="b" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Snapshot metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{
                    background: openIncidentsCount > 0 ? 'rgba(239,68,68,.1)' : 'rgba(34,197,94,.08)',
                    border: `1px solid ${openIncidentsCount > 0 ? 'rgba(239,68,68,.25)' : 'rgba(34,197,94,.25)'}`,
                    borderRadius: 10, padding: 15,
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: openIncidentsCount > 0 ? 'var(--red)' : 'var(--green)' }}>
                      {openIncidentsCount}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>אירועים פתוחים</div>
                  </div>
                  <div style={{
                    background: outOfSectorCount > 0 ? 'rgba(245,158,11,.1)' : 'rgba(34,197,94,.08)',
                    border: `1px solid ${outOfSectorCount > 0 ? 'rgba(245,158,11,.25)' : 'rgba(34,197,94,.25)'}`,
                    borderRadius: 10, padding: 15,
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: outOfSectorCount > 0 ? 'var(--amber)' : 'var(--green)' }}>
                      {outOfSectorCount}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>כוחות מחוץ לגזרה</div>
                  </div>
                </div>

                {/* Hardware */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 13, color: 'var(--ink-2)' }}>סטטוס אמצעים</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {HW_ITEMS.map(({ key, label }) => (
                      <label key={key} style={{
                        display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer',
                        background: 'var(--bg-2)', padding: '10px 12px', borderRadius: 8,
                        border: `1px solid ${hardware[key] ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`,
                      }}>
                        <input type="checkbox" checked={hardware[key]}
                          onChange={e => setHardware({ ...hardware, [key]: e.target.checked })} />
                        <span style={{ color: hardware[key] ? 'var(--green)' : 'var(--red)' }}>{label}</span>
                        <span style={{ marginRight: 'auto', fontSize: 11 }}>{hardware[key] ? '✓ תקין' : '✗ תקלה'}</span>
                      </label>
                    ))}
                  </div>
                  <input style={{ ...inputStyle, marginTop: 8 }}
                    placeholder="הערות ציוד / תקלות נוספות..."
                    value={hardware.other}
                    onChange={e => setHardware({ ...hardware, other: e.target.value })} />
                </div>

                {/* Handover notes */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 13, color: 'var(--ink-2)' }}>דגשים למשמרת הבאה</h4>
                  <textarea
                    style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                    placeholder="אירועים שנפתחו, מעקבים להמשך, שינויים בגזרה..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="f">
                <button type="submit" className="btn brand" disabled={loading}>
                  <Icon name="Check" style={{ width: 14 }} />
                  {loading ? 'שומר...' : 'אשר והעבר משמרת'}
                </button>
                <button type="button" className="btn ghost" disabled={loading} onClick={() => setShowModal(false)}>
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Active Shift Banner ───────────────────────────────────────────── */}
      <div className="panel" style={{ padding: 0, flexShrink: 0 }}>
        {activeShift ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 20, padding: '18px 24px',
            background: 'linear-gradient(90deg, rgba(59,130,246,.12) 0%, var(--bg-1) 100%)',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 24, background: 'var(--brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: '#fff', fontWeight: 700, flexShrink: 0,
            }}>
              {activeShift.manager_name.slice(0, 2)}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                משמרת פעילה — {activeShift.manager_name}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                החלה: {fmtDt(activeShift.start_time)}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 12 }}>
                <span style={{ color: openIncidentsCount > 0 ? 'var(--red)' : 'var(--green)' }}>
                  {openIncidentsCount} אירועים פתוחים
                </span>
                <span style={{ color: 'var(--ink-4)' }}>·</span>
                <span style={{ color: outOfSectorCount > 0 ? 'var(--amber)' : 'var(--green)' }}>
                  {outOfSectorCount} מחוץ לגזרה
                </span>
              </div>
            </div>

            {/* Live elapsed clock */}
            <div style={{
              textAlign: 'center', padding: '10px 22px',
              background: 'rgba(59,130,246,.1)', borderRadius: 10,
              border: '1px solid rgba(59,130,246,.25)', flexShrink: 0,
            }}>
              <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--brand)', letterSpacing: '.06em' }}>
                {elapsedStr}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>שעות במשמרת</div>
            </div>

            <button className="btn brand" style={{ flexShrink: 0 }} onClick={() => setShowModal(true)}>
              <Icon name="LogOut" /> העברת משמרת
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink-2)' }}>אין משמרת פעילה כרגע</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                התחל משמרת כדי לתעד חפיפה מסודרת ולאפשר מעקב אחר אחריות.
              </div>
            </div>
            <button className="btn brand" onClick={handleStartShift} disabled={loading}>
              <Icon name="Play" /> {loading ? 'מתחיל...' : 'התחל משמרת'}
            </button>
          </div>
        )}
      </div>

      {/* ── History Table ─────────────────────────────────────────────────── */}
      <div className="panel" style={{ flex: 1, minHeight: 0 }}>
        <div className="panel-h">
          <Icon name="History" />
          <h3>היסטוריית משמרות</h3>
          <span className="tag" style={{ marginRight: 4 }}>{history.length}</span>
        </div>
        <div className="panel-b" style={{ padding: 0, overflowY: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>אחראי משמרת</th>
                <th>התחלה</th>
                <th>סיום</th>
                <th>משך</th>
                <th>אירועים</th>
                <th>מחוץ לגזרה</th>
                <th>אמצעים</th>
                <th>דגשים</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--ink-4)' }}>
                    אין היסטוריית משמרות
                  </td>
                </tr>
              )}
              {history.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.manager_name}</td>
                  <td className="mono" style={{ color: 'var(--ink-3)', fontSize: 12 }}>{fmtDt(s.start_time)}</td>
                  <td className="mono" style={{ color: 'var(--ink-3)', fontSize: 12 }}>
                    {s.end_time ? fmtDt(s.end_time) : '—'}
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>{fmtDuration(s.start_time, s.end_time)}</td>
                  <td>
                    <span className={cn('tag sm', s.open_incidents_count > 0 ? 'red' : 'green')}>
                      {s.open_incidents_count}
                    </span>
                  </td>
                  <td>
                    <span className={cn('tag sm', s.out_of_sector_count > 0 ? 'amber' : 'green')}>
                      {s.out_of_sector_count}
                    </span>
                  </td>
                  <td>
                    {s.hardware_status
                      ? <HardwareBadges raw={s.hardware_status} />
                      : <span style={{ color: 'var(--ink-4)' }}>—</span>}
                  </td>
                  <td style={{ maxWidth: 240 }}>
                    {s.notes ? (
                      <div
                        style={{ cursor: 'pointer', fontSize: 12, color: 'var(--ink-2)' }}
                        title={s.notes}
                        onClick={() => setExpandedNote(expandedNote === s.id ? null : s.id)}
                      >
                        {expandedNote === s.id ? (
                          s.notes
                        ) : (
                          <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.notes}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--ink-4)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
