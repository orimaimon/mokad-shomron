import { useState } from 'react';
import { Icon } from '../components/Icons';

export function ArchiveScreen({ data }) {
  const [selected, setSelected] = useState(data.archive[0]);

  return (
    <div className="arch-grid">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        <div className="panel" style={{ flex: '0 0 auto' }}>
          <div className="panel-h"><h3>סינון</h3></div>
          <div className="panel-b" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="field">
              <label>טווח תאריכים</label>
              <div className="fieldrow">
                <input className="input mono" defaultValue="01.04.2026" />
                <input className="input mono" defaultValue="06.05.2026" />
              </div>
            </div>
            <div className="field">
              <label>סוג אירוע</label>
              <select className="input">
                <option>הכל</option>
                <option>פח"ע - ישוב</option>
                <option>פח"ע ציר</option>
                <option>ת"ד</option>
                <option>אר"ן</option>
                <option>אסון טבע</option>
              </select>
            </div>
            <div className="field">
              <label>גזרה</label>
              <select className="input">
                <option>כל הגזרה</option>
                <option>גזרת חרמש</option>
                <option>גזרת איתמר</option>
                <option>גזרת קדומים</option>
              </select>
            </div>
            <button className="btn primary"><Icon name="Search" /> חפש</button>
          </div>
        </div>

        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h"><h3>דוחות שמורים</h3></div>
          <div className="panel-b" style={{ padding: 0, overflow: 'auto' }}>
            {data.reports.map((rep, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
                <div style={{ width: 34, height: 34, borderRadius: 6, background: 'var(--bg-3)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)' }}>
                  <Icon name="Doc" />
                </div>
                <div>
                  <div style={{ fontSize: 13 }}>{rep.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
                    {rep.date} · {rep.size} · {rep.kind}
                  </div>
                </div>
                <button className="btn sm icon"><Icon name="Download" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateRows: '1fr auto', gap: 10, minHeight: 0 }}>
        <div className="panel" style={{ minHeight: 0 }}>
          <div className="panel-h">
            <h3>היסטוריית אירועים</h3>
            <span className="tag">{data.archive.length} אירועים</span>
            <div className="spacer" />
            <span className="muted" style={{ fontSize: 11 }}>קריאה בלבד</span>
          </div>
          <div className="panel-b" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr><th>מזהה</th><th>תאריך</th><th>סוג</th><th>מיקום</th><th>משך</th><th>נפגעים</th><th></th></tr>
              </thead>
              <tbody>
                {data.archive.map((ev) => (
                  <tr
                    key={ev.id}
                    onClick={() => setSelected(ev)}
                    style={{ cursor: 'pointer', background: selected.id === ev.id ? 'rgba(245,165,36,.06)' : '' }}
                  >
                    <td className="mono" style={{ color: 'var(--amber)' }}>{ev.id}</td>
                    <td className="mono" style={{ color: 'var(--ink-2)' }}>{ev.date}</td>
                    <td>{ev.type}</td>
                    <td style={{ color: 'var(--ink-2)' }}>{ev.loc}</td>
                    <td className="mono">{ev.dur}</td>
                    <td className="mono">{ev.cas}</td>
                    <td><button className="btn sm ghost"><Icon name="Doc" /> דוח</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel" style={{ flex: '0 0 auto' }}>
          <div className="panel-h">
            <h3>סקירה: {selected.id}</h3>
            <div className="spacer" />
            <button className="btn sm"><Icon name="Download" /> PDF</button>
            <button className="btn sm"><Icon name="Download" /> Excel</button>
          </div>
          <div className="panel-b" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <div className="metric">
              <div className="lbl">סוג</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{selected.type}</div>
            </div>
            <div className="metric">
              <div className="lbl">תאריך</div>
              <div className="num mono" style={{ fontSize: 18 }}>{selected.date}</div>
            </div>
            <div className="metric">
              <div className="lbl">משך אירוע</div>
              <div className="num">{selected.dur}</div>
            </div>
            <div className="metric">
              <div className="lbl">נפגעים</div>
              <div className="num">{selected.cas}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
