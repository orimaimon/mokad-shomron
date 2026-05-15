import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Icon } from '../components/Icons';
import { cn } from '../lib/utils';
import { MokadData, DBRosterMember, DBIncident, DBFeedItem, Force, Evacuation } from '../types';

type ReportType = 'daily' | 'event' | 'roster' | 'shift' | 'osint';

interface ReportHeaderProps {
  title: string;
  subtitle?: string;
  date: string;
  generatedAt: string;
}

interface DailyReportData {
  reportKind: 'daily' | 'roster';
  generated_at: string;
  date: string;
  roster: DBRosterMember[];
  incidents: DBIncident[];
  feed: DBFeedItem[];
}

interface EventReportData {
  reportKind: 'event';
  id: string;
  type: string;
  location: string;
  grid: string;
  scene_name: string;
  started_at: number;
  snapshot_at: string;
  description: string;
  is_active: number;
  dead: number;
  critical: number;
  serious: number;
  light: number;
  untreated: number;
  missing: number;
  trapped: number;
  map_coords?: string;
  forces: Force[];
  evac: Evacuation[];
  feed: DBFeedItem[];
  media: DBMediaRow[];
}

interface DBMediaRow {
  id: number;
  event_id: string;
  kind: string;
  cap: string;
  time: string;
  cls: string;
  dur: string | null;
}

interface OsintReportData {
  reportKind: 'osint';
  generated_at: string;
  date: string;
  filtered_date: string | null;
  items: DBFeedItem[];
}

type ReportData = DailyReportData | EventReportData | ShiftReportData | OsintReportData;

interface ArchivedEvent {
  id: string;
  type: string;
  location: string;
  scene_name: string;
  started_at: number;
  is_active: number;
}

interface ArchivedShift {
  id: number;
  manager_name: string;
  start_time: string;
  end_time: string | null;
  status: string;
  dispatchers: string[];
}

interface ShiftReportData {
  reportKind: 'shift';
  id: number;
  manager_name: string;
  start_time: string;
  end_time: string | null;
  status: string;
  open_incidents_count: number;
  out_of_sector_count: number;
  hardware_status: string;
  notes: string;
  dispatchers: string[];
  incidents: DBIncident[];
}

// ── Report content components ─────────────────────────────────────────────

function ReportHeader({ title, subtitle, date, generatedAt }: ReportHeaderProps) {
  return (
    <div className="rp-header">
      <div>
        <h1>מוקד שומרון – שו"ב</h1>
        <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4 }}>{title}</div>
        {subtitle && <div className="rp-meta">{subtitle}</div>}
      </div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontWeight: 600 }}>{date}</div>
        <div className="rp-meta">הופק: {generatedAt}</div>
        <div className="rp-meta" style={{ marginTop: 4, letterSpacing: '.05em', opacity: .6 }}>MOKAD SHOMRON · C2</div>
      </div>
    </div>
  );
}

function StateLabel({ state }: { state: string }) {
  const map: Record<string, string> = { field: 'בשטח', brief: 'תדריך', return: 'בחזרה', out: 'מחוץ לגזרה' };
  return <span>{map[state] ?? state}</span>;
}

function SevLabel({ sev }: { sev: string }) {
  if (sev === 'red') return <span className="sev-red">גבוהה</span>;
  if (sev === 'amber') return <span className="sev-amber">בינונית</span>;
  return <span className="sev-green">נמוכה</span>;
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'הסתיים' ? 'status-done' : status === 'בכוח' ? 'status-active' : 'status-open';
  return <span className={`status-badge ${cls}`}>{status}</span>;
}

// ── Daily Report ──────────────────────────────────────────────────────────

function DailyReportContent({ data }: { data: DailyReportData }) {
  const inSector = data.roster.filter(r => !r.is_out_of_sector);
  const outOfSector = data.roster.filter(r => r.is_out_of_sector);
  const openInc = data.incidents.filter(i => i.status !== 'הסתיים');

  return (
    <>
      <ReportHeader
        title="דוח שגרה יומי"
        date={data.date}
        generatedAt={data.generated_at}
      />

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20, padding: '12px 0', borderBottom: '1px solid #ddd' }}>
        {[
          { l: 'בעלי תפקידים סה"כ', v: data.roster.length },
          { l: 'בשטח', v: inSector.filter(r => r.state === 'field').length },
          { l: 'מחוץ לגזרה', v: outOfSector.length },
          { l: 'אירועים פתוחים', v: openInc.length },
        ].map(s => (
          <div key={s.l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Roster */}
      <h2>1. מצב בעלי תפקידים</h2>
      <table>
        <thead><tr><th>שם</th><th>תפקיד</th><th>משימה</th><th>מצב</th><th>טלפון</th><th>טלפון מבצעי</th></tr></thead>
        <tbody>
          {data.roster.map(r => (
            <tr key={r.id}>
              <td style={{ fontWeight: 600 }}>{r.name}</td>
              <td>{r.role}</td>
              <td>{r.task}</td>
              <td><StateLabel state={r.state} /></td>
              <td style={{ fontFamily: 'monospace' }}>{r.phone || '—'}</td>
              <td style={{ fontFamily: 'monospace' }}>{r.operational_phone || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Out of sector */}
      {outOfSector.length > 0 && (
        <>
          <h2>2. יציאות מגזרה</h2>
          <table>
            <thead><tr><th>שם</th><th>תפקיד</th><th>מחליף</th><th>טלפון מחליף</th><th>זמן חזרה משוער</th></tr></thead>
            <tbody>
              {outOfSector.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td>{r.role}</td>
                  <td>{r.replacement || '—'}</td>
                  <td style={{ fontFamily: 'monospace' }}>{r.replacement_phone || '—'}</td>
                  <td style={{ fontFamily: 'monospace' }}>{r.return_time || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Incidents */}
      <h2>{outOfSector.length > 0 ? '3' : '2'}. אירועים חריגים</h2>
      {data.incidents.length === 0
        ? <p style={{ color: '#666' }}>לא נרשמו אירועים</p>
        : (
          <table>
            <thead><tr><th>שעה</th><th>סוג</th><th>מיקום</th><th>סטטוס</th><th>חומרה</th></tr></thead>
            <tbody>
              {data.incidents.map(i => (
                <tr key={i.id}>
                  <td style={{ fontFamily: 'monospace' }}>{new Date(i.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{i.type}</td>
                  <td>{i.location}</td>
                  <td><StatusBadge status={i.status} /></td>
                  <td><SevLabel sev={i.severity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      {/* Feed */}
      {data.feed.length > 0 && (
        <>
          <h2>{outOfSector.length > 0 ? '4' : '3'}. יומן עדכונים (אחרון)</h2>
          <table>
            <thead><tr><th>שעה</th><th>מקור</th><th>תוכן</th></tr></thead>
            <tbody>
              {data.feed.slice(0, 30).map(f => (
                <tr key={f.id}>
                  <td style={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{f.time}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{f.src}</td>
                  <td>{f.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <Signature />
    </>
  );
}

// ── Emergency Event Report ────────────────────────────────────────────────

function EventReportContent({ data }: { data: EventReportData }) {
  const start = data.started_at ? new Date(data.started_at) : null;
  const startStr = start ? start.toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const totalCas = (data.dead || 0) + (data.critical || 0) + (data.serious || 0) + (data.light || 0) + (data.untreated || 0);

  return (
    <>
      <ReportHeader
        title="דוח אירוע חירום"
        subtitle={`מזהה: ${data.id} · ${data.is_active ? 'פעיל' : 'סגור'}`}
        date={startStr}
        generatedAt={new Date().toLocaleString('he-IL')}
      />

      {/* Event details */}
      <table style={{ marginBottom: 16 }}>
        <tbody>
          <tr><td style={{ fontWeight: 700, width: '20%' }}>סוג אירוע</td><td>{data.type}</td><td style={{ fontWeight: 700 }}>מיקום</td><td>{data.location}</td></tr>
          <tr><td style={{ fontWeight: 700 }}>שם זירה</td><td>{data.scene_name}</td><td style={{ fontWeight: 700 }}>נ"צ</td><td style={{ fontFamily: 'monospace' }}>{data.grid || '—'}</td></tr>
          <tr><td style={{ fontWeight: 700 }}>פתיחה</td><td style={{ fontFamily: 'monospace' }}>{startStr}</td><td style={{ fontWeight: 700 }}>עדכון אחרון</td><td style={{ fontFamily: 'monospace' }}>{data.snapshot_at}</td></tr>
        </tbody>
      </table>

      {/* Casualties summary */}
      <h2>1. תמונת מצב – נפגעים</h2>
      <div className="cas-summary">
        {[
          { l: 'הרוגים', v: data.dead || 0, c: '#555' },
          { l: 'אנושים', v: data.critical || 0, c: '#dc2626' },
          { l: 'בינוני', v: data.serious || 0, c: '#d97706' },
          { l: 'קל', v: data.light || 0, c: '#ca8a04' },
          { l: 'טרם טופלו', v: data.untreated || 0, c: '#6b7280' },
          { l: 'נעדרים', v: data.missing || 0, c: '#2563eb' },
          { l: 'לכודים', v: data.trapped || 0, c: '#7c3aed' },
        ].map(c => (
          <div key={c.l} className="cas-box">
            <div className="n" style={{ color: c.v > 0 ? c.c : '#ccc' }}>{c.v}</div>
            <div className="l">{c.l}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 12, color: '#444' }}>סה"כ נפגעים: <strong>{totalCas}</strong> · לכודים ונעדרים: <strong>{(data.trapped || 0) + (data.missing || 0)}</strong></p>

      {/* Description */}
      {data.description && (
        <>
          <h2>2. תיאור האירוע</h2>
          <p style={{ background: '#f5f5f5', padding: '10px 14px', borderRadius: 4, fontSize: 13 }}>{data.description}</p>
        </>
      )}

      {/* Evac */}
      <h2>{data.description ? '3' : '2'}. פינויים</h2>
      {(!data.evac || data.evac.length === 0)
        ? <p style={{ color: '#666' }}>לא בוצעו פינויים</p>
        : (
          <table>
            <thead><tr><th>נפגעים</th><th>גורם מפנה</th><th>יעד</th><th>מצב</th></tr></thead>
            <tbody>
              {data.evac.map((e, i) => (
                <tr key={i}><td>{e.who}</td><td>{e.by}</td><td>{e.to}</td><td>{e.state}</td></tr>
              ))}
            </tbody>
          </table>
        )}

      {/* Forces */}
      {data.forces && data.forces.length > 0 && (
        <>
          <h2>{data.description ? '4' : '3'}. כוחות שפעלו</h2>
          <table>
            <thead><tr><th>כוח</th><th>כמות</th></tr></thead>
            <tbody>
              {data.forces.map((f, i) => (
                <tr key={i}><td>{f.name}</td><td>{f.count}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Media */}
      {data.media && data.media.length > 0 && (
        <>
          <h2>תיעוד מדיה</h2>
          <table>
            <thead><tr><th>שעה</th><th>סוג</th><th>תיאור</th><th>סיווג</th><th>משך</th></tr></thead>
            <tbody>
              {data.media.map(m => (
                <tr key={m.id}>
                  <td style={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{m.time}</td>
                  <td>{m.kind === 'photo' ? 'תמונה' : m.kind === 'video' ? 'וידאו' : m.kind}</td>
                  <td>{m.cap || '—'}</td>
                  <td>{m.cls || '—'}</td>
                  <td style={{ fontFamily: 'monospace' }}>{m.dur || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Feed timeline */}
      {data.feed && data.feed.length > 0 && (
        <>
          <h2>ציר זמן דיווחים</h2>
          <table>
            <thead><tr><th>שעה</th><th>מקור</th><th>דיווח</th></tr></thead>
            <tbody>
              {data.feed.map(f => (
                <tr key={f.id}>
                  <td style={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{f.time}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{f.src}</td>
                  <td>{f.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <Signature />
    </>
  );
}

// ── Roster Report ─────────────────────────────────────────────────────────

function RosterReportContent({ data }: { data: DailyReportData }) {
  const outOfSector = data.roster.filter(r => r.is_out_of_sector);
  return (
    <>
      <ReportHeader
        title="דוח מצב כוח אדם"
        date={data.date}
        generatedAt={data.generated_at}
      />

      <h2>רשימת בעלי תפקידים</h2>
      <table>
        <thead>
          <tr><th>שם</th><th>תפקיד</th><th>משימה</th><th>מצב</th><th>טלפון</th><th>טלפון מבצעי</th></tr>
        </thead>
        <tbody>
          {data.roster.map(r => (
            <tr key={r.id} style={{ background: r.is_out_of_sector ? '#fff3f3' : undefined }}>
              <td style={{ fontWeight: 600 }}>{r.name}</td>
              <td>{r.role}</td>
              <td>{r.task}</td>
              <td style={{ fontWeight: r.is_out_of_sector ? 700 : undefined, color: r.is_out_of_sector ? '#dc2626' : undefined }}>
                <StateLabel state={r.state} />
              </td>
              <td style={{ fontFamily: 'monospace' }}>{r.phone || '—'}</td>
              <td style={{ fontFamily: 'monospace' }}>{r.operational_phone || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {outOfSector.length > 0 && (
        <>
          <h2>מחוץ לגזרה – פירוט מחליפים</h2>
          <table>
            <thead><tr><th>שם</th><th>תפקיד</th><th>מחליף</th><th>טלפון מחליף</th><th>זמן חזרה</th></tr></thead>
            <tbody>
              {outOfSector.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td>{r.role}</td>
                  <td>{r.replacement || '—'}</td>
                  <td style={{ fontFamily: 'monospace' }}>{r.replacement_phone || '—'}</td>
                  <td style={{ fontFamily: 'monospace' }}>{r.return_time || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <Signature />
    </>
  );
}

// ── OSINT Report ─────────────────────────────────────────────────────────

function OsintReportContent({ data }: { data: OsintReportData }) {
  const bySrc = data.items.reduce<Record<string, number>>((acc, item) => {
    acc[item.src] = (acc[item.src] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <ReportHeader
        title="דוח מודיעין פתוח (OSINT)"
        date={data.date}
        generatedAt={data.generated_at}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20, padding: '12px 0', borderBottom: '1px solid #ddd' }}>
        {[
          { l: 'רשומות OSINT', v: data.items.length },
          { l: 'מקורות שונים', v: Object.keys(bySrc).length },
          { l: 'דחופות', v: data.items.filter(i => i.urgent).length },
        ].map(s => (
          <div key={s.l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {data.items.length === 0 ? (
        <p style={{ color: '#666' }}>לא נרשמו רשומות OSINT לתאריך זה</p>
      ) : (
        <>
          <h2>1. רשומות מקורות פתוחים</h2>
          <table>
            <thead>
              <tr><th>שעה</th><th>מקור</th><th>תוכן</th><th>דחיפות</th></tr>
            </thead>
            <tbody>
              {data.items.map(item => (
                <tr key={item.id} style={{ background: item.urgent ? '#fff3f3' : undefined }}>
                  <td style={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{item.time}</td>
                  <td style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{item.src}</td>
                  <td>{item.text}</td>
                  <td style={{ textAlign: 'center' }}>{item.urgent ? '⚠️' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>2. התפלגות לפי מקור</h2>
          <table>
            <thead><tr><th>מקור</th><th>כמות</th></tr></thead>
            <tbody>
              {Object.entries(bySrc).sort((a, b) => b[1] - a[1]).map(([src, count]) => (
                <tr key={src}>
                  <td style={{ fontWeight: 600 }}>{src}</td>
                  <td style={{ fontFamily: 'monospace' }}>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <Signature />
    </>
  );
}

// ── Shift Report ─────────────────────────────────────────────────────────

function ShiftReportContent({ data }: { data: ShiftReportData }) {
  const start = new Date(data.start_time);
  const end = data.end_time ? new Date(data.end_time) : null;
  const fmtDt = (d: Date) => d.toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const duration = end
    ? (() => { const m = Math.round((end.getTime() - start.getTime()) / 60000); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} שע׳`; })()
    : 'פעילה';

  let hw: Record<string, unknown> = {};
  try { hw = JSON.parse(data.hardware_status); } catch {}

  const openInc = data.incidents.filter(i => i.status !== 'הסתיים');

  return (
    <>
      <ReportHeader
        title="דוח סיכום משמרת"
        subtitle={`מזהה: ${data.id} · ${data.status === 'active' ? 'פעילה' : 'סגורה'}`}
        date={fmtDt(start)}
        generatedAt={new Date().toLocaleString('he-IL')}
      />

      <table style={{ marginBottom: 16 }}>
        <tbody>
          <tr>
            <td style={{ fontWeight: 700, width: '20%' }}>קצין תורן</td>
            <td>{data.manager_name}</td>
            <td style={{ fontWeight: 700 }}>מוקדנים</td>
            <td>{data.dispatchers.length > 0 ? data.dispatchers.join(', ') : '—'}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 700 }}>תחילת משמרת</td>
            <td style={{ fontFamily: 'monospace' }}>{fmtDt(start)}</td>
            <td style={{ fontWeight: 700 }}>סיום משמרת</td>
            <td style={{ fontFamily: 'monospace' }}>{end ? fmtDt(end) : '—'}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 700 }}>משך</td>
            <td>{duration}</td>
            <td style={{ fontWeight: 700 }}>סטטוס</td>
            <td>{data.status === 'active' ? 'פעילה' : 'סגורה'}</td>
          </tr>
        </tbody>
      </table>

      <h2>1. סיכום כמותי</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20, padding: '12px 0', borderBottom: '1px solid #ddd' }}>
        {[
          { l: 'אירועים סה"כ', v: data.incidents.length },
          { l: 'אירועים פתוחים בסיום', v: data.open_incidents_count },
          { l: 'מחוץ לגזרה בסיום', v: data.out_of_sector_count },
        ].map(s => (
          <div key={s.l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{s.v}</div>
            <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <h2>2. מצב ציוד</h2>
      <table style={{ marginBottom: 16 }}>
        <tbody>
          <tr>
            {['cameras', 'vehicles', 'comms'].map(k => (
              <td key={k} style={{ textAlign: 'center', padding: '6px 14px' }}>
                <div style={{ fontWeight: 700, color: hw[k] ? '#16a34a' : '#dc2626' }}>{hw[k] ? '✓' : '✗'}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{k === 'cameras' ? 'מצלמות' : k === 'vehicles' ? 'רכבים' : 'קשר'}</div>
              </td>
            ))}
            {!!hw['other'] && (
              <td style={{ padding: '6px 14px' }}>
                <div style={{ fontSize: 12 }}>{String(hw['other'])}</div>
              </td>
            )}
          </tr>
        </tbody>
      </table>

      {data.notes && (
        <>
          <h2>3. הערות מסירת משמרת</h2>
          <p style={{ background: '#f5f5f5', padding: '10px 14px', borderRadius: 4, fontSize: 13, whiteSpace: 'pre-wrap' }}>{data.notes}</p>
        </>
      )}

      {data.incidents.length > 0 && (
        <>
          <h2>{data.notes ? '4' : '3'}. אירועים במהלך המשמרת</h2>
          <table>
            <thead><tr><th>שעה</th><th>סוג</th><th>מיקום</th><th>סטטוס</th><th>חומרה</th></tr></thead>
            <tbody>
              {data.incidents.map(i => (
                <tr key={i.id} style={{ background: openInc.includes(i) ? '#fff3f3' : undefined }}>
                  <td style={{ fontFamily: 'monospace' }}>{new Date(i.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{i.type}</td>
                  <td>{i.location}</td>
                  <td><StatusBadge status={i.status} /></td>
                  <td><SevLabel sev={i.severity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <Signature />
    </>
  );
}

// ── Signature block ───────────────────────────────────────────────────────

function Signature() {
  return (
    <div className="rp-sig" style={{ marginTop: 40 }}>
      <div className="line">חתימת קצין מוקד</div>
      <div className="line">חתימת מפקד שו"ב</div>
      <div className="line">חותמת</div>
    </div>
  );
}

// ── Print wrapper (hidden on screen, shown during print) ──────────────────

function ReportContent({ data }: { data: ReportData }) {
  if (data.reportKind === 'daily') return <DailyReportContent data={data} />;
  if (data.reportKind === 'event') return <EventReportContent data={data} />;
  if (data.reportKind === 'roster') return <RosterReportContent data={data} />;
  if (data.reportKind === 'shift') return <ShiftReportContent data={data} />;
  if (data.reportKind === 'osint') return <OsintReportContent data={data} />;
  return null;
}

function PrintWrap({ data }: { data: ReportData }) {
  return (
    <div className="print-wrap">
      <div className="report-paper" style={{ background: 'none', padding: 0 }}>
        <ReportContent data={data} />
      </div>
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────

export function ArchiveScreen({ data: _data }: { data: MokadData }) {
  const [tab, setTab] = useState<'generate' | 'archive'>('generate');
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState<ArchivedEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveStatus, setArchiveStatus] = useState('');
  const [archiveKind, setArchiveKind] = useState<'events' | 'shifts'>('events');
  const [dailyDate, setDailyDate] = useState('');
  const [shifts, setShifts] = useState<ArchivedShift[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState('');

  useEffect(() => {
    fetch('/api/reports/events').then(r => r.json()).then(setEvents).catch(() => {});
    fetch('/api/reports/shifts').then(r => r.json()).then(setShifts).catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      let res: Response;
      if (reportType === 'daily' || reportType === 'roster') {
        const qs = dailyDate ? `?date=${dailyDate}` : '';
        res = await fetch(`/api/reports/daily${qs}`);
      } else if (reportType === 'event') {
        if (!selectedEventId) return;
        res = await fetch(`/api/reports/event/${selectedEventId}`);
      } else if (reportType === 'shift') {
        if (!selectedShiftId) return;
        res = await fetch(`/api/reports/shift/${selectedShiftId}`);
      } else {
        const qs = dailyDate ? `?date=${dailyDate}` : '';
        res = await fetch(`/api/reports/osint${qs}`);
      }
      if (!res.ok) throw new Error(`שגיאת שרת ${res.status}`);
      const json = await res.json();
      setReportData({ reportKind: reportType, ...json });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בהפקת הדוח');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!reportData) return;
    window.print();
  };

  const handleExportXlsx = () => {
    if (!reportData) return;
    const wb = XLSX.utils.book_new();

    const stateMap: Record<string, string> = { field: 'בשטח', brief: 'תדריך', return: 'בחזרה', out: 'מחוץ לגזרה', unavailable: 'לא זמין' };
    const sevMap: Record<string, string> = { red: 'גבוהה', amber: 'בינונית', green: 'נמוכה' };

    if (reportData.reportKind === 'daily' || reportData.reportKind === 'roster') {
      const rosterRows = reportData.roster.map(r => ({
        'שם': r.name,
        'תפקיד': r.role,
        'משימה': r.task || '',
        'מצב': stateMap[r.state] ?? r.state,
        'מחוץ לגזרה': r.is_out_of_sector ? 'כן' : 'לא',
        'מחליף': r.replacement || '',
        'טלפון מחליף': r.replacement_phone || '',
        'זמן חזרה': r.return_time || '',
        'טלפון': r.phone || '',
        'טלפון מבצעי': r.operational_phone || '',
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rosterRows), 'בעלי תפקידים');

      if (reportData.incidents?.length) {
        const incRows = reportData.incidents.map(i => ({
          'שעה': new Date(i.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
          'תאריך': new Date(i.created_at).toLocaleDateString('he-IL'),
          'סוג': i.type,
          'מיקום': i.location,
          'סטטוס': i.status,
          'חומרה': sevMap[i.severity] ?? i.severity,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incRows), 'אירועים');
      }

      if (reportData.feed?.length) {
        const feedRows = reportData.feed.map(f => ({
          'שעה': f.time,
          'מקור': f.src,
          'תוכן': f.text,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(feedRows), 'יומן');
      }

    } else if (reportData.reportKind === 'event') {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
        'מזהה': reportData.id,
        'סוג': reportData.type,
        'מיקום': reportData.location,
        'שם זירה': reportData.scene_name,
        'רשת': reportData.grid,
        'נפגעים קטלנים': reportData.dead,
        'קשה': reportData.critical,
        'בינוני': reportData.serious,
        'קל': reportData.light,
        'לא מטופל': reportData.untreated,
        'נעדרים': reportData.missing,
        'כלואים': reportData.trapped,
      }]), 'פרטי אירוע');

      if (reportData.feed?.length) {
        const feedRows = reportData.feed.map(f => ({ 'שעה': f.time, 'מקור': f.src, 'תוכן': f.text }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(feedRows), 'יומן אירוע');
      }

      if (reportData.forces?.length) {
        const forceRows = (reportData.forces as Force[]).map(f => ({ 'כוח': f.name, 'כמות': f.count }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(forceRows), 'כוחות');
      }

      if (reportData.evac?.length) {
        const evacRows = (reportData.evac as Evacuation[]).map(e => ({ 'מי': e.who, 'על ידי': e.by, 'לאן': e.to, 'מצב': e.state }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(evacRows), 'פינויים');
      }

    } else if (reportData.reportKind === 'shift') {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
        'קצין תורן': reportData.manager_name,
        'מוקדנים': reportData.dispatchers.join(', '),
        'תחילת משמרת': reportData.start_time,
        'סיום משמרת': reportData.end_time ?? 'פעילה',
        'סטטוס': reportData.status,
        'הערות': reportData.notes,
      }]), 'משמרת');

      if (reportData.incidents?.length) {
        const incRows = reportData.incidents.map(i => ({
          'שעה': new Date(i.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
          'סוג': i.type, 'מיקום': i.location, 'סטטוס': i.status, 'חומרה': sevMap[i.severity] ?? i.severity,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incRows), 'אירועים');
      }

    } else if (reportData.reportKind === 'osint') {
      const rows = reportData.items.map(i => ({
        'שעה': i.time, 'מקור': i.src, 'תוכן': i.text, 'דחוף': i.urgent ? 'כן' : 'לא',
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'OSINT');
    }

    const kindLabel: Record<string, string> = {
      daily: 'שגרה-יומי', roster: 'כוח-אדם', event: 'אירוע', shift: 'משמרת', osint: 'OSINT',
    };
    const dateStr = new Date().toLocaleDateString('he-IL').replace(/\//g, '-');
    XLSX.writeFile(wb, `mokad-shomron_${kindLabel[reportData.reportKind]}_${dateStr}.xlsx`);
  };

  const openEventReport = async (id: string) => {
    setLoading(true);
    setTab('generate');
    try {
      const res = await fetch(`/api/reports/event/${id}`);
      setReportData({ reportKind: 'event', ...(await res.json()) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="arch-grid">
      {/* Print area — only visible during print */}
      {reportData && <PrintWrap data={reportData} />}

      {/* ── Sidebar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        <div className="panel" style={{ flex: '0 0 auto' }}>
          <div className="panel-b" style={{ padding: '10px 14px' }}>
            <div className="tabs-row">
              <button className={cn('tab', tab === 'generate' && 'on')} onClick={() => setTab('generate')}>יצירת דוח</button>
              <button className={cn('tab', tab === 'archive' && 'on')} onClick={() => setTab('archive')}>ארכיון אירועים</button>
            </div>
          </div>
        </div>

        {tab === 'generate' && (
          <div className="panel" style={{ flex: 1 }}>
            <div className="panel-h"><Icon name="Doc" /><h3>בחר סוג דוח</h3></div>
            <div className="panel-b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {([
                { v: 'daily', icon: 'Pulse', l: 'דוח שגרה יומי', d: 'אירועים, כוח אדם, יומן' },
                { v: 'event', icon: 'Siren', l: 'דוח אירוע חירום', d: 'סיכום מלא לאירוע ספציפי' },
                { v: 'roster', icon: 'Users', l: 'דוח כוח אדם', d: 'רשימת בעלי תפקידים ומחליפים' },
                { v: 'shift', icon: 'Clock', l: 'דוח סיכום משמרת', d: 'אירועים, ציוד והערות מסירה' },
        { v: 'osint', icon: 'Globe', l: 'דוח מודיעין פתוח', d: 'רשומות OSINT מיומן המבצעים' },
              ] as const).map(opt => (
                <label
                  key={opt.v}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
                    background: reportType === opt.v ? 'rgba(33,150,243,.1)' : 'var(--bg-2)',
                    border: `1px solid ${reportType === opt.v ? 'rgba(33,150,243,.4)' : 'var(--border-1)'}`,
                    borderRadius: 8, padding: '10px 12px', transition: 'all .15s',
                  }}
                >
                  <input
                    type="radio" name="rtype" value={opt.v}
                    checked={reportType === opt.v}
                    onChange={() => setReportType(opt.v)}
                    style={{ marginTop: 3 }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{opt.l}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{opt.d}</div>
                  </div>
                </label>
              ))}

              {(reportType === 'daily' || reportType === 'roster' || reportType === 'osint') && (
                <div className="field">
                  <label>תאריך (ריק = היום)</label>
                  <input
                    type="date"
                    className="input"
                    value={dailyDate}
                    onChange={e => setDailyDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </div>
              )}

              {reportType === 'event' && (
                <div className="field">
                  <label>בחר אירוע</label>
                  <select className="input" value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}>
                    <option value="">— בחר אירוע —</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.started_at ? new Date(ev.started_at).toLocaleDateString('he-IL') + ' · ' : ''}{ev.type} · {ev.location} {!ev.is_active ? '(סגור)' : '(פעיל)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {reportType === 'shift' && (
                <div className="field">
                  <label>בחר משמרת</label>
                  <select className="input" value={selectedShiftId} onChange={e => setSelectedShiftId(e.target.value)}>
                    <option value="">— בחר משמרת —</option>
                    {shifts.map(s => (
                      <option key={s.id} value={String(s.id)}>
                        {new Date(s.start_time).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {s.manager_name} {s.status === 'active' ? '(פעילה)' : '(סגורה)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                className="btn brand"
                onClick={generate}
                disabled={loading || (reportType === 'event' && !selectedEventId) || (reportType === 'shift' && !selectedShiftId)}
                style={{ justifyContent: 'center', padding: '10px' }}
              >
                <Icon name="Doc" /> {loading ? 'מכין דוח...' : 'הפק תצוגה מקדימה'}
              </button>
              {error && (
                <div style={{ background: 'rgba(220,38,38,.12)', border: '1px solid rgba(220,38,38,.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="X" style={{ width: 12, flexShrink: 0 }} />{error}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'archive' && (
          <div className="panel" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="panel-h">
              <Icon name="Archive" />
              <h3>{archiveKind === 'events' ? 'אירועי חירום' : 'משמרות'}</h3>
              <span className="tag" style={{ marginRight: 4 }}>{archiveKind === 'events' ? events.length : shifts.length}</span>
              <div className="spacer" />
              <div className="tabs-row" style={{ gap: 4 }}>
                <button className={cn('tab sm', archiveKind === 'events' && 'on')} onClick={() => setArchiveKind('events')}>אירועים</button>
                <button className={cn('tab sm', archiveKind === 'shifts' && 'on')} onClick={() => setArchiveKind('shifts')}>משמרות</button>
              </div>
            </div>

            {archiveKind === 'events' && (
              <>
                <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-1)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Icon name="Search" style={{ width: 14, color: 'var(--ink-4)', alignSelf: 'center', flexShrink: 0 }} />
                    <input
                      className="input" style={{ fontSize: 12, padding: '4px 8px' }}
                      placeholder="חיפוש לפי סוג / מיקום / מזהה..."
                      value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select className="input" style={{ fontSize: 12, padding: '4px 6px', flex: 1 }} value={archiveStatus} onChange={e => setArchiveStatus(e.target.value)}>
                      <option value="">כל האירועים</option>
                      <option value="active">פעיל</option>
                      <option value="closed">סגור</option>
                    </select>
                    {(archiveSearch || archiveStatus) && (
                      <button className="btn ghost-red icon-sm" onClick={() => { setArchiveSearch(''); setArchiveStatus(''); }} title="נקה">
                        <Icon name="X" style={{ width: 11 }} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="panel-b" style={{ padding: 0, overflow: 'auto', flex: 1 }}>
                  {(() => {
                    const q = archiveSearch.toLowerCase();
                    const filtered = events.filter(ev => {
                      if (q && !ev.id?.toLowerCase().includes(q) && !ev.type?.toLowerCase().includes(q) && !ev.location?.toLowerCase().includes(q)) return false;
                      if (archiveStatus === 'active' && !ev.is_active) return false;
                      if (archiveStatus === 'closed' && ev.is_active) return false;
                      return true;
                    });
                    if (filtered.length === 0) return (
                      <div style={{ padding: 20, color: 'var(--ink-4)', textAlign: 'center', fontSize: 13 }}>אין תוצאות</div>
                    );
                    return filtered.map(ev => (
                      <div
                        key={ev.id}
                        style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-1)', cursor: 'pointer', transition: 'background .12s' }}
                        onClick={() => openEventReport(ev.id)}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.03)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="mono" style={{ fontSize: 11, color: 'var(--amber)' }}>{ev.id}</span>
                          <span className={cn('tag sm', ev.is_active ? 'red' : 'green')}>{ev.is_active ? 'פעיל' : 'סגור'}</span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 13, marginTop: 3 }}>{ev.type}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{ev.location} · {ev.scene_name}</div>
                        {ev.started_at ? (
                          <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2, fontFamily: 'var(--mono)' }}>
                            {new Date(ev.started_at).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        ) : null}
                      </div>
                    ));
                  })()}
                </div>
              </>
            )}

            {archiveKind === 'shifts' && (
              <div className="panel-b" style={{ padding: 0, overflow: 'auto', flex: 1 }}>
                {shifts.length === 0 ? (
                  <div style={{ padding: 20, color: 'var(--ink-4)', textAlign: 'center', fontSize: 13 }}>אין משמרות</div>
                ) : shifts.map(s => (
                  <div
                    key={s.id}
                    style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-1)', cursor: 'pointer', transition: 'background .12s' }}
                    onClick={async () => {
                      setLoading(true); setError(''); setTab('generate');
                      try {
                        const res = await fetch(`/api/reports/shift/${s.id}`);
                        if (!res.ok) throw new Error(`שגיאת שרת ${res.status}`);
                        setReportData({ reportKind: 'shift', ...(await res.json()) });
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'שגיאה');
                      } finally { setLoading(false); }
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{s.manager_name}</span>
                      <span className={cn('tag sm', s.status === 'active' ? 'red' : 'green')}>{s.status === 'active' ? 'פעילה' : 'סגורה'}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>
                      {new Date(s.start_time).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      {s.end_time ? ` — ${new Date(s.end_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}` : ' (פעילה)'}
                    </div>
                    {s.dispatchers.length > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>{s.dispatchers.join(', ')}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Main: Report Preview ── */}
      <div className="panel" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {reportData ? (
          <>
            <div className="panel-h no-print">
              <Icon name="Doc" />
              <h3>
                {reportData.reportKind === 'daily' && 'דוח שגרה יומי'}
                {reportData.reportKind === 'event' && `דוח אירוע · ${reportData.id}`}
                {reportData.reportKind === 'roster' && 'דוח כוח אדם'}
                {reportData.reportKind === 'shift' && `דוח משמרת · ${reportData.manager_name}`}
                {reportData.reportKind === 'osint' && `דוח OSINT · ${reportData.date}`}
              </h3>
              <div className="spacer" />
              <button className="btn ghost" onClick={handleExportXlsx} style={{ gap: 6 }}>
                <Icon name="Table" style={{ width: 14 }} /> XLSX
              </button>
              <button className="btn brand" onClick={handlePrint} style={{ gap: 8 }}>
                <Icon name="Download" style={{ width: 14 }} /> PDF
              </button>
            </div>
            <div className="panel-b" style={{ flex: 1, overflow: 'auto', padding: '28px 24px', background: '#d0d4da' }}>
              <div className="report-paper">
                <ReportContent data={reportData} />
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--ink-4)' }}>
            <Icon name="Doc" style={{ width: 48, opacity: .2 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-3)' }}>בחר סוג דוח והפק תצוגה מקדימה</div>
            <div style={{ fontSize: 13 }}>הדוח יוצג כאן לפני הדפסה / שמירה כ-PDF</div>
          </div>
        )}
      </div>
    </div>
  );
}
