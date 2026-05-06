import { useState } from 'react';
import { Icon, FormattedText } from '../components/Icons';
import { useNow, fmtHM } from '../hooks/useClock';

export function ManagementScreen({ data }) {
  const [editingId, setEditingId] = useState(null);
  const now = useNow();
  const [report, setReport] = useState({
    time: fmtHM(now),
    author: 'יונתן כהן (מוקדן)',
    text: '',
    scene: 'זירת חפ"ק ראשית',
  });

  return (
    <div style={{ height: '100%', padding: 10, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 10, minHeight: 0 }}>
      {/* approvals */}
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <h3>דיווחים ממתינים לאישור</h3>
          <span className="tag amber">{data.approvals.length} ממתינים</span>
          <div className="spacer" />
          <div className="seg">
            <button className="on">הכל</button>
            <button>דחוף</button>
            <button>עם מדיה</button>
          </div>
        </div>
        <div className="panel-b" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.approvals.map((a) => (
            <div key={a.id} className={`approval ${a.urgent ? 'urgent' : ''}`}>
              <div className="top">
                <span className="mono" style={{ color: 'var(--ink-3)' }}>{a.time}</span>
                <span style={{ color: 'var(--ink-1)', fontWeight: 600 }}>{a.author}</span>
                {a.urgent && <span className="tag red">דחוף</span>}
                {a.attachments > 0 && (
                  <span className="tag blue"><Icon name="Image" /> {a.attachments} מצורפים</span>
                )}
                <span className="muted right" style={{ fontSize: 11 }}>
                  ממתין {Math.floor(Math.random() * 5) + 1} דק׳
                </span>
              </div>
              {editingId === a.id ? (
                <textarea className="textarea" defaultValue={a.text.replace(/[*$]/g, '')} />
              ) : (
                <div className="body"><FormattedText text={a.text} /></div>
              )}
              <div className="actions">
                <span className="muted" style={{ fontSize: 11, marginLeft: 'auto' }}>שייך לזירה:</span>
                <select className="input" style={{ maxWidth: 200, padding: '6px 10px', fontSize: 12 }}>
                  <option>זירת חפ"ק ראשית</option>
                  <option>נקודת איסוף נפגעים</option>
                  <option>שער מערבי</option>
                  <option>אזור החיץ</option>
                  <option>+ זירה חדשה</option>
                </select>
                <button className="btn primary sm">
                  <Icon name="Check" /> אשר ושלח למסך
                </button>
                <button className="btn sm" onClick={() => setEditingId(editingId === a.id ? null : a.id)}>
                  <Icon name="Edit" /> ערוך
                </button>
                <button className="btn ghost sm"><Icon name="X" /> דחה</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* new report + users */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        <div className="panel" style={{ flex: '0 0 auto' }}>
          <div className="panel-h"><h3>הוספת דיווח</h3></div>
          <div className="panel-b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="fieldrow">
              <div className="field">
                <label>שעת דיווח</label>
                <input
                  className="input mono"
                  value={report.time}
                  onChange={(e) => setReport({ ...report, time: e.target.value })}
                  maxLength={5}
                />
              </div>
              <div className="field">
                <label>זירה</label>
                <select
                  className="input"
                  value={report.scene}
                  onChange={(e) => setReport({ ...report, scene: e.target.value })}
                >
                  <option>זירת חפ"ק ראשית</option>
                  <option>נקודת איסוף</option>
                  <option>שער מערבי</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>מדווח</label>
              <input
                className="input"
                value={report.author}
                onChange={(e) => setReport({ ...report, author: e.target.value })}
              />
            </div>
            <div className="field">
              <label>תוכן הדיווח</label>
              <textarea
                className="textarea"
                placeholder='הקלד דיווח... ניתן להשתמש ב-*טקסט מודגש* או $טקסט אדום$'
                value={report.text}
                onChange={(e) => setReport({ ...report, text: e.target.value })}
              />
              <div style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--ink-3)' }}>
                <span className="kbd">*טקסט*</span> מודגש
                <span style={{ margin: '0 6px' }}>·</span>
                <span className="kbd">$טקסט$</span> אדום
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn primary" style={{ flex: 1 }}><Icon name="Send" /> שלח למסך אירוע</button>
              <button className="btn icon" title="צרף מדיה"><Icon name="Image" /></button>
            </div>
          </div>
        </div>

        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h">
            <h3>משתמשים ובקרת הרשאות</h3>
            <div className="spacer" />
            <button className="btn sm"><Icon name="Plus" /></button>
          </div>
          <div className="panel-b" style={{ padding: 0, overflow: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>שם</th><th>הרשאה</th><th>2FA</th></tr>
              </thead>
              <tbody>
                {data.users.map((u, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>{u.email}</div>
                    </td>
                    <td>
                      <span className={`tag ${u.role === 'מוקד' ? 'amber' : u.role === 'מנהל מוקד' ? 'violet' : 'blue'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className="check" title="2FA פעיל"><Icon name="Check" /></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
