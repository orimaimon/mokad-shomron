import { useState, useEffect } from 'react';
import { Icon, FormattedText } from '../components/Icons';
import { useNow, fmtHM } from '../hooks/useClock';
import { MokadData, ApprovalRequest } from '../types';
import { toast } from '../components/Toast';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function ManagementScreen({ data }: { data: MokadData }) {
  const now = useNow();
  const [approvals, setApprovals] = useState(data.approvals || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  
  const [report, setReport] = useState({
    time: fmtHM(now),
    author: 'מוקדן',
    text: '',
    scene: 'זירת חפ"ק ראשית',
    urgent: false
  });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Keep time updated if user hasn't typed anything yet
    if (!report.text) {
      setReport(r => ({ ...r, time: fmtHM(new Date()) }));
    }
  }, [now, report.text]);

  const handleSendReport = async () => {
    if (!report.text.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src: report.author || 'מוקדן', text: report.text, urgent: report.urgent })
      });
      if (res.ok) {
        toast('הדיווח נשלח ליומן המבצעים', 'success');
        setReport(r => ({ ...r, text: '', urgent: false, time: fmtHM(new Date()) }));
      } else {
        toast('שגיאה בשליחת דיווח', 'error');
      }
    } catch (err) {
      toast('שגיאת תקשורת', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleApprove = async (a: ApprovalRequest) => {
    const textToApprove = editingId === a.id ? editedText : a.text;
    if (!textToApprove.trim()) return;
    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src: a.author, text: textToApprove, urgent: a.urgent })
      });
      if (res.ok) {
        toast('הדיווח אושר ופורסם ביומן', 'success');
        setApprovals(prev => prev.filter(p => p.id !== a.id));
        setEditingId(null);
      } else {
        toast('שגיאה באישור דיווח', 'error');
      }
    } catch {
      toast('שגיאת תקשורת', 'error');
    }
  };

  const handleReject = (id: string) => {
    toast('הדיווח נדחה', 'info');
    setApprovals(prev => prev.filter(p => p.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <div style={{ height: '100%', padding: 15, display: 'grid', gridTemplateColumns: '1fr 400px', gap: 15, minHeight: 0 }}>
      {/* Left Column: Feed & Manual Report */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15, minHeight: 0 }}>
        
        {/* Feed Viewer */}
        <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="panel-h">
            <Icon name="List" />
            <h3>יומן מבצעים לייב</h3>
            <span className="tag sm" style={{ marginRight: 8 }}>{data.log.length} רשומות</span>
          </div>
          <div className="panel-b" style={{ flex: 1, overflowY: 'auto', padding: '10px 15px', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-1)' }}>
            {data.log.map(item => (
              <div key={item.id || Math.random().toString()} style={{ 
                background: item.urgent ? 'rgba(239,68,68,0.08)' : 'var(--bg-2)', 
                border: `1px solid ${item.urgent ? 'rgba(239,68,68,0.2)' : 'var(--border-1)'}`,
                padding: '10px 14px', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'flex-start'
              }}>
                <div style={{ color: 'var(--ink-3)', fontSize: 11, fontFamily: 'var(--mono)', marginTop: 2 }}>{item.t || item.time}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: item.system ? 'var(--brand)' : 'var(--ink-2)' }}>{item.src}</span>
                    {item.urgent ? <span className="tag red sm">דחוף</span> : null}
                    {item.system ? <span className="tag blue sm">מערכת</span> : null}
                  </div>
                  <div style={{ fontSize: 14, color: '#fff', lineHeight: 1.4 }}><FormattedText text={item.text} /></div>
                </div>
              </div>
            ))}
            {data.log.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--ink-4)', marginTop: 40 }}>אין דיווחים ביומן</div>
            )}
          </div>
        </div>

        {/* Add Report Form */}
        <div className="panel" style={{ flex: '0 0 auto' }}>
          <div className="panel-h">
            <Icon name="Edit3" />
            <h3>הזנת דיווח ידני</h3>
          </div>
          <div className="panel-b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>מדווח</label>
                <input className="input" value={report.author} onChange={e => setReport({ ...report, author: e.target.value })} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--ink-3)', display: 'block', marginBottom: 4 }}>תוכן הדיווח</label>
                <input 
                  className="input" 
                  placeholder='ניתן להשתמש ב-*טקסט* להדגשה או $טקסט$ לאדום...' 
                  value={report.text} 
                  onChange={e => setReport({ ...report, text: e.target.value })} 
                  onKeyDown={e => {
                    if (e.key === 'Enter' && report.text.trim()) {
                      e.preventDefault();
                      handleSendReport();
                    }
                  }}
                  style={{ width: '100%', fontFamily: 'inherit' }} 
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <button 
                  type="button"
                  className={cn("btn sm", report.urgent ? "brand" : "ghost")}
                  onClick={() => setReport({ ...report, urgent: !report.urgent })}
                  title="סמן כדחוף"
                  style={{ height: 36, padding: '0 12px' }}
                >
                  <Icon name="AlertTriangle" style={{ width: 14, color: report.urgent ? '#fff' : 'var(--red)' }} />
                </button>
                <button 
                  className="btn brand" 
                  onClick={handleSendReport} 
                  disabled={sending || !report.text.trim()}
                  style={{ height: 36, padding: '0 20px' }}
                >
                  <Icon name="Send" style={{ width: 14 }} /> {sending ? 'שולח...' : 'פרסם'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Approvals */}
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <Icon name="CheckSquare" />
          <h3>ממתינים לאישור</h3>
          <span className="tag amber">{approvals.length}</span>
        </div>
        <div className="panel-b" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 12, overflowY: 'auto' }}>
          <AnimatePresence>
            {approvals.map((a) => (
              <motion.div 
                key={a.id} 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ 
                  background: a.urgent ? 'linear-gradient(180deg, rgba(239,68,68,.06), var(--bg-2))' : 'var(--bg-2)', 
                  border: `1px solid ${a.urgent ? '#5a1f1f' : 'var(--border-1)'}`,
                  borderRadius: 10, padding: 14,
                  marginBottom: 12,
                  display: 'flex', flexDirection: 'column'
                }}>
                  <div className="top" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <span className="mono" style={{ color: 'var(--ink-3)', fontSize: 11 }}>{a.time}</span>
                    <span style={{ color: 'var(--brand)', fontWeight: 600, fontSize: 13 }}>{a.author}</span>
                    {a.urgent && <span className="tag red sm">דחוף</span>}
                    <div style={{ flex: 1 }}></div>
                    <span className="muted" style={{ fontSize: 10, opacity: 0.7 }}>ממתין 2 דק׳</span>
                  </div>
                  
                  {editingId === a.id ? (
                    <textarea 
                      className="textarea" 
                      value={editedText}
                      onChange={e => setEditedText(e.target.value)}
                      style={{ minHeight: 90, marginBottom: 14, fontSize: 13, resize: 'vertical' }} 
                      autoFocus
                    />
                  ) : (
                    <div style={{ fontSize: 14, color: '#fff', lineHeight: 1.5, marginBottom: 16 }}>
                      <FormattedText text={a.text} />
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border-1)', paddingTop: 12 }}>
                    <button className="btn brand sm" style={{ flex: 1 }} onClick={() => handleApprove(a)}>
                      <Icon name="Check" style={{ width: 14 }} /> אשר
                    </button>
                    {editingId === a.id ? (
                      <button className="btn ghost sm" onClick={() => setEditingId(null)}>ביטול</button>
                    ) : (
                      <button className="btn ghost sm" onClick={() => { setEditingId(a.id); setEditedText(a.text.replace(/[*$]/g, '')); }}>
                        <Icon name="Edit" style={{ width: 14 }} /> ערוך
                      </button>
                    )}
                    <button className="btn ghost-red sm" onClick={() => handleReject(a.id)}>
                      <Icon name="X" style={{ width: 14 }} /> דחה
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {approvals.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--ink-4)', padding: '40px 0' }}>
              <Icon name="CheckCircle" style={{ width: 32, height: 32, opacity: 0.2, margin: '0 auto 10px' }} />
              <div>אין דיווחים ממתינים לאישור</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
