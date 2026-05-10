import { useState } from 'react';
import { Icon, FormattedText } from '../components/Icons';
import { useNow, fmtHM, elapsed } from '../hooks/useClock';
import { toast } from '../components/Toast';

export function MobileScreen({ data }: { data: { activeEvent: { startedAt: number }; log: { urgent?: boolean; t: string; text: string; src: string }[] } }) {
  const [tab, setTab] = useState('feed');
  const now = useNow();
  const [reportText, setReportText] = useState('רכב לבן עם 3 נוסעים נצפה במהירות גבוהה ביציאה מהיישוב לכיוון ציר 55.');
  const [sending, setSending] = useState(false);

  const handleSubmitReport = async () => {
    if (!reportText.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: 'נטע פרץ', text: reportText }),
      });
      if (res.ok) {
        toast('הדיווח נשלח לאישור מוקדן', 'success');
        setReportText('');
      } else {
        toast('שגיאה בשליחת הדיווח', 'error');
      }
    } catch {
      toast('שגיאת תקשורת', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="phone-stage">
      <div style={{ maxWidth: 340, color: 'var(--ink-2)', fontSize: 13, lineHeight: 1.7 }}>
        <div className="uc" style={{ marginBottom: 8 }}>ממשק מדווח שטח</div>
        <h2 style={{ margin: '0 0 12px', fontSize: 20, color: 'var(--ink-1)', fontWeight: 600, letterSpacing: '-.01em' }}>
          אפליקציה לצופים ובעלי תפקידים
        </h2>
        <p>גרסה ניידת לצופים ובעלי תפקידים בשטח. מאפשרת יצירת דיווחים, העלאת מדיה (תמונות / וידאו עד 10MB), וצפייה במסך החירום בזמן אמת.</p>
        <ul style={{ paddingInlineStart: 18, marginTop: 10 }}>
          <li>תמונות מתכווצות בצד הלקוח לפני שליחה</li>
          <li>דיווחים מקומיים נשמרים במצב Offline ונשלחים אוטומטית עם חיבור הרשת</li>
          <li>2FA – קוד OTP לכניסה</li>
        </ul>
      </div>

      <div className="phone">
        <div className="phone-screen">
          <div className="phone-status">
            <span>{fmtHM(now)}</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Icon name="Wifi" />
            </span>
          </div>

          <div className="phone-app">
            {/* app header */}
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, background: '#11161e' }}>
              <div className="brand" style={{ fontSize: 13 }}>
                <div className="mark" style={{ width: 22, height: 22 }} />
                מוקד שומרון
              </div>
              <div style={{ marginRight: 'auto' }} />
              <div className="statepill alert" style={{ fontSize: 10, padding: '3px 8px' }}>
                <span className="led" />חירום
              </div>
            </div>

            {tab === 'feed' && (
              <>
                <div style={{ padding: '14px 16px', background: 'linear-gradient(180deg,#1a0e0e,#150909)', borderBottom: '1px solid #5a1f1f' }}>
                  <div style={{ fontSize: 11, color: '#ffaeae', letterSpacing: '.08em' }}>אירוע פעיל</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>פח"ע - חרמש</div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 8, alignItems: 'baseline' }}>
                    <div className="mono" style={{ fontSize: 18, color: '#fff' }}>
                      {elapsed(data.activeEvent.startedAt, now.getTime())}
                    </div>
                    <div style={{ fontSize: 11, color: '#ffaeae' }}>זמן חלוף</div>
                  </div>
                </div>
                <div style={{ padding: '10px 14px', fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                  זרם דיווחים
                </div>
                <div className="feed" style={{ flex: 1, overflow: 'auto' }}>
                  {data.log.slice(0, 5).map((it, i) => (
                    <div key={i} className={`item ${it.urgent ? 'urgent' : ''}`} style={{ gridTemplateColumns: '46px 1fr', padding: '10px 14px' }}>
                      <div className="t mono">{it.t}</div>
                      <div className="body" style={{ fontSize: 12.5 }}>
                        <FormattedText text={it.text} />
                        <span className="src">— {it.src}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'new' && (
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflow: 'auto' }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>דיווח חדש</div>
                <div className="field">
                  <label>תוכן</label>
                  <textarea
                    className="textarea"
                    placeholder="מה ראית? פרט מיקום, אנשים, חריגים..."
                    value={reportText}
                    onChange={e => setReportText(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>מיקום</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input mono" defaultValue='נ"צ 1672/1834' />
                    <button className="btn icon"><Icon name="Pin" /></button>
                  </div>
                </div>
                <div className="field">
                  <label>מדיה</label>
                  <div style={{ border: '1px dashed var(--line-2)', borderRadius: 8, padding: 18, display: 'grid', placeItems: 'center', gap: 6, color: 'var(--ink-3)', fontSize: 12 }}>
                    <Icon name="Image" lg />
                    <div>גרור קובץ או הקלק לבחירה</div>
                    <div className="mono" style={{ fontSize: 10 }}>מקס׳ 10MB · יכווץ אוטומטית</div>
                  </div>
                </div>
                <div style={{ padding: 10, background: 'rgba(245,165,36,.08)', border: '1px solid rgba(245,165,36,.3)', borderRadius: 6, fontSize: 11, color: '#ffd07a' }}>
                  <Icon name="Bell" /> הדיווח יישלח לאישור מוקדן לפני פרסום למסך
                </div>
                <button
                  className="btn primary"
                  style={{ justifyContent: 'center' }}
                  onClick={handleSubmitReport}
                  disabled={sending || !reportText.trim()}
                >
                  <Icon name="Send" /> {sending ? 'שולח...' : 'שלח דיווח לאישור'}
                </button>
              </div>
            )}

            {tab === 'me' && (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="av" style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#3b4a63,#1f2937)', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700, color: '#dbe4f0' }}>נפ</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>נטע פרץ</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>צופה · neta@idf.il</div>
                  </div>
                </div>
                <div style={{ padding: 12, background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 8, fontSize: 12, color: '#9be8b6', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="Check" /> מחובר · 2FA פעיל
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>גרסת אפליקציה: v2.4.0</div>
              </div>
            )}

            {/* tab bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid var(--line)', background: '#0c1118' }}>
              {[['feed', 'Pulse', 'אירוע'], ['new', 'Plus', 'דיווח'], ['me', 'User', 'אני']].map(([k, iconName, l]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className="btn ghost"
                  style={{ borderRadius: 0, border: 0, flexDirection: 'column', padding: '10px 0', gap: 3, color: tab === k ? 'var(--amber)' : 'var(--ink-3)', background: 'transparent' }}
                >
                  <Icon name={iconName} lg />
                  <span style={{ fontSize: 10 }}>{l}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
