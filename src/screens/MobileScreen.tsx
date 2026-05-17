import { useState, useEffect, useRef } from 'react';
import { Icon, FormattedText } from '../components/Icons';
import { useNow, fmtHM, elapsed } from '../hooks/useClock';
import { toast } from '../components/Toast';

export function MobileScreen({ data }: { data: { activeEvent: { startedAt: number }; log: { urgent?: boolean | number; t: string; text: string; src: string }[] } }) {
  const [tab, setTab] = useState('feed');
  const now = useNow();
  const [reportText, setReportText] = useState('');
  const [reportLocation, setReportLocation] = useState('');
  const [media, setMedia] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const isStandalone = window.location.pathname === '/mobile';

  // Auth State
  const [mobileUser, setMobileUser] = useState<{ name: string; email: string; role: string } | null>(() => {
    try { return JSON.parse(sessionStorage.getItem('mobile_user') || 'null'); } catch { return null; }
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Offline State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('offline_reports') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    // Read directly from localStorage to avoid stale closure over offlineQueue state
    const stored: any[] = JSON.parse(localStorage.getItem('offline_reports') || '[]');
    if (stored.length === 0) return;

    const flush = async () => {
      const token = sessionStorage.getItem('mobile_token');
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
      let q = [...stored];
      let synced = 0;
      for (let i = 0; i < q.length; i++) {
        try {
          await fetch('/api/approvals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify(q[i]),
          });
          q = q.slice(i + 1);
          i = -1;
          synced++;
          localStorage.setItem('offline_reports', JSON.stringify(q));
        } catch { break; }
      }
      setOfflineQueue(q);
      if (synced > 0) toast(`סונכרנו ${synced} דיווחים בהצלחה`, 'success');
    };
    flush();
  }, [isOnline]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/');
    if (!isImage && !isVid) { toast('רק תמונות וסרטונים נתמכים', 'error'); return; }

    try {
      if (isImage) {
        await new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_DIM = 1200;
              let w = img.width, h = img.height;
              if (w > h && w > MAX_DIM) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
              else if (h > MAX_DIM) { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
              canvas.width = w; canvas.height = h;
              canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
              setMedia(canvas.toDataURL('image/jpeg', 0.82));
              resolve();
            };
            img.onerror = reject;
            img.src = ev.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        // upload video to server
        const fd = new FormData();
        fd.append('file', file);
        const token = sessionStorage.getItem('mobile_token');
        const res = await fetch('/api/media/upload', {
          method: 'POST',
          body: fd,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('upload failed');
        const { url } = await res.json();
        setMedia(url as string);
      }
    } catch {
      toast('שגיאה בעיבוד הקובץ', 'error');
    }
    e.target.value = '';
  };

  const handleSubmitReport = async () => {
    if (!reportText.trim()) return;
    const payload = { author: mobileUser?.name || 'שדה', text: reportText + (reportLocation ? ` (מיקום: ${reportLocation})` : ''), media };

    if (!isOnline) {
      const newQueue = [...offlineQueue, payload];
      setOfflineQueue(newQueue);
      localStorage.setItem('offline_reports', JSON.stringify(newQueue));
      toast('אין קליטה - נשמר מקומית ויסונכרן אוטומטית כשתחזור הרשת', 'info');
      setReportText('');
      setReportLocation('');
      setMedia(null);
      return;
    }

    setSending(true);
    try {
      const token = sessionStorage.getItem('mobile_token');
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast('הדיווח נשלח לאישור מוקדן', 'success');
        setReportText('');
        setReportLocation('');
        setMedia(null);
      } else {
        toast('שגיאה בשליחת הדיווח', 'error');
      }
    } catch {
      toast('שגיאת תקשורת', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleMobileLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאת כניסה');
      sessionStorage.setItem('mobile_user', JSON.stringify(data.user));
      sessionStorage.setItem('mobile_token', data.token);
      setMobileUser(data.user);
      toast('ברוך הבא, ' + data.user.name, 'success');
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'שגיאה');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleMobileLogout = () => {
    sessionStorage.removeItem('mobile_user');
    sessionStorage.removeItem('mobile_token');
    setMobileUser(null);
  };

  if (!mobileUser) {
    return (
      <div className={isStandalone ? 'standalone-stage' : 'phone-stage'}>
        <div className={isStandalone ? 'standalone-phone' : 'phone'}>
          <div className={isStandalone ? 'standalone-screen' : 'phone-screen'} style={{ background: '#0a0f16', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
            <div className="brand" style={{ flexDirection: 'column', gap: 12, marginBottom: 28, alignItems: 'center' }}>
              <div className="mark" style={{ width: 52, height: 52 }} />
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink-1)' }}>מוקד שומרון</div>
              <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: -6 }}>אפליקציית שטח</div>
            </div>
            <form onSubmit={handleMobileLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>דוא"ל</label>
                <input
                  className="input"
                  type="email"
                  autoComplete="email"
                  placeholder="your@email.com"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>סיסמה</label>
                <input
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              {loginError && (
                <div style={{ fontSize: 12, color: 'var(--red)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, padding: '8px 10px' }}>
                  {loginError}
                </div>
              )}
              <button
                type="submit"
                className="btn brand"
                style={{ justifyContent: 'center', marginTop: 4 }}
                disabled={loginLoading}
              >
                <Icon name="LogIn" />
                {loginLoading ? 'מתחבר...' : 'כניסה למערכת'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isStandalone ? 'standalone-stage' : 'phone-stage'}>
      {!isStandalone && (
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
      )}

      <div className={isStandalone ? 'standalone-phone' : 'phone'}>
        <div className={isStandalone ? 'standalone-screen' : 'phone-screen'}>
          <div className="phone-status">
            <span>{fmtHM(now)}</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center', color: isOnline ? 'inherit' : '#ffb4b4' }}>
              {!isOnline && <span style={{ fontSize: 10 }}>Offline</span>}
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
              {offlineQueue.length > 0 && (
                <div className="statepill" style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(245,165,36,.1)', borderColor: 'rgba(245,165,36,.4)', color: '#ffd07a' }}>
                  ממתינים: {offlineQueue.length}
                </div>
              )}
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
                    <input className="input mono" placeholder='נ"צ או תיאור' value={reportLocation} onChange={e => setReportLocation(e.target.value)} />
                    <button className="btn icon" onClick={() => setReportLocation('נ"צ 1672/1834')}><Icon name="Pin" /></button>
                  </div>
                </div>
                <div className="field">
                  <label>מדיה</label>
                  <label style={{ border: '1px dashed var(--line-2)', borderRadius: 8, padding: 18, display: 'grid', placeItems: 'center', gap: 6, color: 'var(--ink-3)', fontSize: 12, cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
                    {media ? (
                      media.startsWith('data:video/') || /\.(mp4|webm|mov)$/i.test(media) ? (
                        <video src={media} muted style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 6 }} />
                      ) : (
                        <img src={media} style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }} />
                      )
                    ) : (
                      <>
                        <Icon name="Image" lg />
                        <div>הקלק לבחירת תמונה / סרטון</div>
                        <div className="mono" style={{ fontSize: 10 }}>תמונות מכווצות אוטומטית · סרטונים עד 200MB</div>
                      </>
                    )}
                    <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileChange} />
                  </label>
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
                  <div className="av" style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#3b4a63,#1f2937)', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700, color: '#dbe4f0' }}>{mobileUser.name.slice(0, 2)}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{mobileUser.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{mobileUser.role === 'admin' ? 'מנהל מערכת' : 'צופה'} · {mobileUser.email}</div>
                  </div>
                </div>
                <div style={{ padding: 12, background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 8, fontSize: 12, color: '#9be8b6', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="Check" /> מחובר
                </div>
                <button className="btn ghost" style={{ justifyContent: 'center' }} onClick={handleMobileLogout}>
                  <Icon name="LogOut" /> התנתק
                </button>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>גרסת אפליקציה: v2.5.0</div>
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
