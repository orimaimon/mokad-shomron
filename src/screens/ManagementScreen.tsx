import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { Icon, FormattedText } from '../components/Icons';
import { useNow, fmtHM } from '../hooks/useClock';
import { MokadData, ApprovalRequest } from '../types';
import { toast } from '../components/Toast';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbox, MediaThumb, MediaInline, isVideo } from '../components/MediaViewer';

const SRC_TYPE_META = {
  internal: { label: 'מוקד', cls: 'blue' },
  osint:    { label: 'OSINT', cls: 'amber' },
  field:    { label: 'שטח', cls: 'green' },
} as const;

function SrcBadge({ type }: { type?: string }) {
  if (!type || type === 'internal') return null;
  const meta = SRC_TYPE_META[type as keyof typeof SRC_TYPE_META];
  if (!meta) return null;
  return <span className={`tag sm ${meta.cls}`}>{meta.label}</span>;
}

async function processMediaFile(file: File): Promise<string> {
  if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1400;
          let w = img.width, h = img.height;
          if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
          else if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
        img.src = ev.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
  if (!res.ok) throw new Error('upload failed');
  const { url } = await res.json();
  return url as string;
}

function waitingSince(createdAt?: string): string {
  if (!createdAt) return '';
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins < 1) return 'עכשיו';
  if (mins < 60) return `${mins} דק׳`;
  return `${Math.floor(mins / 60)} שע׳`;
}

export function ManagementScreen({ data }: { data: MokadData }) {
  const now = useNow();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [feedFilter, setFeedFilter] = useState<'all' | 'internal' | 'osint' | 'field'>('all');
  const [report, setReport] = useState({
    time: fmtHM(now),
    author: 'מוקדן',
    text: '',
    scene: 'זירת חפ"ק ראשית',
    urgent: false,
    src_type: 'internal' as 'internal' | 'osint' | 'field',
    media: null as string | null,
  });
  const [sending, setSending] = useState(false);

  const fetchApprovals = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/approvals', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setApprovals(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchApprovals();
    const socket = io({ transports: ['websocket', 'polling'] });
    socket.on('approvals:changed', fetchApprovals);
    socket.on('feed:changed', fetchApprovals);
    const fallback = setInterval(fetchApprovals, 30000);
    return () => { socket.disconnect(); clearInterval(fallback); };
  }, [fetchApprovals]);

  useEffect(() => {
    if (!report.text) {
      setReport(r => ({ ...r, time: fmtHM(new Date()) }));
    }
  }, [now, report.text]);

  const handleMediaFile = async (file: File) => {
    const allowed = file.type.startsWith('image/') || file.type.startsWith('video/');
    if (!allowed) { toast('רק תמונות וסרטונים נתמכים', 'error'); return; }
    if (file.size > 200 * 1024 * 1024) { toast('קובץ גדול מדי (מקס 200MB)', 'error'); return; }
    setMediaUploading(true);
    try {
      const result = await processMediaFile(file);
      setReport(r => ({ ...r, media: result }));
    } catch {
      toast('שגיאה בעיבוד/העלאת הקובץ', 'error');
    } finally {
      setMediaUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleMediaFile(file);
    e.target.value = '';
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const file = Array.from(e.clipboardData.items)
      .find(item => item.kind === 'file' && item.type.startsWith('image/'))
      ?.getAsFile();
    if (file) {
      e.preventDefault();
      await handleMediaFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await handleMediaFile(file);
  };

  const handleSendReport = async () => {
    if (!report.text.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          src: report.author || 'מוקדן',
          text: report.text,
          urgent: report.urgent,
          src_type: report.src_type,
          ...(report.media ? { media: report.media } : {}),
        }),
      });
      if (res.ok) {
        toast('הדיווח נשלח ליומן המבצעים', 'success');
        setReport(r => ({ ...r, text: '', urgent: false, src_type: 'internal', time: fmtHM(new Date()), media: null }));
      } else {
        toast('שגיאה בשליחת דיווח', 'error');
      }
    } catch {
      toast('שגיאת תקשורת', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleApprove = async (a: ApprovalRequest) => {
    const textOverride = editingId === a.id ? editedText : undefined;
    if (textOverride !== undefined && !textOverride.trim()) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/approvals/${a.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(textOverride !== undefined ? { text: textOverride } : {}),
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

  const handleReject = async (id: string) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`/api/approvals/${id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
    toast('הדיווח נדחה', 'info');
    setApprovals(prev => prev.filter(p => p.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const filteredLog = data.log.filter(item => feedFilter === 'all' || (item.src_type ?? 'internal') === feedFilter);

  return (
    <>
    <div style={{ height: '100%', padding: 15, display: 'grid', gridTemplateColumns: '1fr 390px', gap: 15, minHeight: 0 }}>
      {/* Left Column: Feed & Manual Report */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>

        {/* Feed Viewer */}
        <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="panel-h">
            <Icon name="List" />
            <h3>יומן מבצעים</h3>
            <span className="tag sm" style={{ marginRight: 6 }}>{filteredLog.length}</span>
            <div className="spacer" />
            <div className="tabs-row sm">
              {(['all', 'internal', 'field', 'osint'] as const).map(f => (
                <button
                  key={f}
                  className={cn('tab', feedFilter === f && 'on')}
                  onClick={() => setFeedFilter(f)}
                >
                  {f === 'all' ? 'הכל' : SRC_TYPE_META[f].label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--bg-1)' }}>
            {filteredLog.map(item => (
              <div key={item.id || Math.random().toString()} style={{
                background: item.src_type === 'osint'
                  ? 'rgba(245,165,36,0.04)'
                  : item.urgent ? 'rgba(239,68,68,0.05)' : 'transparent',
                borderBottom: '1px solid var(--line)',
                borderRight: item.urgent ? '3px solid var(--red)' : item.src_type === 'osint' ? '3px solid var(--amber)' : '3px solid transparent',
                padding: '10px 14px 10px 11px',
                display: 'flex', gap: 12, alignItems: 'flex-start',
                transition: 'background 0.1s',
              }}>
                <span style={{ color: 'var(--ink-4)', fontSize: 11, fontFamily: 'var(--mono)', paddingTop: 2, flexShrink: 0 }}>{item.t || item.time}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: item.system ? 'var(--blue)' : 'var(--ink-2)' }}>{item.src}</span>
                    <SrcBadge type={item.src_type} />
                    {item.urgent ? <span className="tag red sm">דחוף</span> : null}
                    {item.system ? <span className="tag blue sm">מערכת</span> : null}
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--ink-1)', lineHeight: 1.45 }}><FormattedText text={item.text} /></div>
                </div>
                {item.media && (
                  <MediaThumb src={item.media} onClick={() => setLightbox(item.media!)} />
                )}
              </div>
            ))}
            {filteredLog.length === 0 && (
              <div className="empty-state"><Icon name="List" className="empty-icon" style={{ width: 28, height: 28 }} /><div>אין דיווחים</div></div>
            )}
          </div>
        </div>

        {/* Add Report Form */}
        <div
          className="panel"
          style={{ flex: '0 0 auto', outline: isDragging ? '2px dashed var(--amber)' : '2px dashed transparent', outlineOffset: -2, transition: 'outline-color .15s' }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="panel-h">
            <Icon name="Edit3" />
            <h3>הזנת דיווח ידני</h3>
            <div className="spacer" />
            {isDragging && <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600 }}>שחרר להעלאה</span>}
            <div className="tabs-row sm">
              {(['internal', 'field', 'osint'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  className={cn('tab', report.src_type === t && 'on')}
                  onClick={() => setReport(r => ({ ...r, src_type: t }))}
                >
                  {SRC_TYPE_META[t].label}
                </button>
              ))}
            </div>
          </div>
          <div className="panel-b" style={{ padding: '12px 14px' }}>
            <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileChange} />
            <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: 8, alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: 10, color: 'var(--ink-4)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>מדווח</label>
                <input className="input" value={report.author} onChange={e => setReport({ ...report, author: e.target.value })} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: 'var(--ink-4)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>תוכן הדיווח</label>
                <input
                  className="input"
                  placeholder='*הדגשה* · $אדום$ · Enter לשליחה'
                  value={report.text}
                  onChange={e => setReport({ ...report, text: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && report.text.trim()) {
                      e.preventDefault();
                      handleSendReport();
                    }
                  }}
                  onPaste={handlePaste}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                <button
                  type="button"
                  className={cn('btn icon', report.media ? 'brand' : 'ghost')}
                  onClick={() => report.media ? setReport(r => ({ ...r, media: null })) : fileRef.current?.click()}
                  data-tooltip={report.media ? 'הסר מדיה' : 'צרף תמונה/סרטון'}
                  disabled={mediaUploading}
                >
                  <Icon name={mediaUploading ? 'Clock' : report.media ? 'X' : 'Camera'} style={{ width: 14 }} />
                </button>
                <button
                  type="button"
                  className={cn('btn icon', report.urgent ? 'danger' : 'ghost')}
                  onClick={() => setReport({ ...report, urgent: !report.urgent })}
                  data-tooltip="סמן כדחוף"
                >
                  <Icon name="AlertTriangle" style={{ width: 14 }} />
                </button>
                <button
                  className="btn brand"
                  onClick={handleSendReport}
                  disabled={sending || !report.text.trim() || mediaUploading}
                >
                  <Icon name="Send" style={{ width: 14 }} />{sending ? 'שולח...' : 'פרסם'}
                </button>
              </div>
            </div>
            {report.media && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <MediaThumb src={report.media} onClick={() => setLightbox(report.media!)} />
                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 500 }}>
                    {isVideo(report.media) ? 'סרטון מצורף' : 'תמונה מצורפת'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>לחץ להצגה מלאה</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Approvals */}
      <div className="panel" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="panel-h">
          <Icon name="CheckSquare" />
          <h3>ממתינים לאישור</h3>
          {approvals.length > 0 && <span className="tag amber" style={{ marginRight: 4 }}>{approvals.length}</span>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence>
            {approvals.map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div style={{
                  background: a.urgent ? 'rgba(239,68,68,0.05)' : 'var(--bg-2)',
                  border: `1px solid ${a.urgent ? 'rgba(239,68,68,0.3)' : 'var(--line-2)'}`,
                  borderRadius: 10, overflow: 'hidden',
                }}>
                  {a.urgent && <div style={{ height: 2, background: 'var(--red)', width: '100%' }} />}
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div className="av" style={{ width: 30, height: 30, fontSize: 12, flexShrink: 0 }}>{a.author.slice(0, 2)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--amber)', lineHeight: 1 }}>{a.author}</div>
                        <div style={{ color: 'var(--ink-4)', fontSize: 10, marginTop: 3, fontFamily: 'var(--mono)' }}>{a.time}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        {a.urgent && <span className="tag red sm">דחוף</span>}
                        {a.created_at && <span className="time-since stale">ממתין {waitingSince(a.created_at)}</span>}
                      </div>
                    </div>

                    {editingId === a.id ? (
                      <textarea
                        className="textarea"
                        value={editedText}
                        onChange={e => setEditedText(e.target.value)}
                        style={{ minHeight: 80, fontSize: 13, resize: 'vertical' }}
                        autoFocus
                      />
                    ) : (
                      <div style={{ fontSize: 13.5, color: 'var(--ink-1)', lineHeight: 1.5, background: 'rgba(0,0,0,0.18)', padding: '8px 12px', borderRadius: 7, border: '1px solid var(--line)' }}>
                        <FormattedText text={a.text} />
                      </div>
                    )}
                    {a.media && (
                      <MediaInline src={a.media} onClick={() => setLightbox(a.media!)} maxHeight={200} />
                    )}

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn brand sm transition-spring" style={{ flex: 1 }} onClick={() => handleApprove(a)}>
                        <Icon name="Check" style={{ width: 13 }} /> אשר ופרסם
                      </button>
                      {editingId === a.id ? (
                        <button className="btn ghost sm transition-fast" onClick={() => setEditingId(null)}>ביטול</button>
                      ) : (
                        <button className="btn ghost sm transition-fast" onClick={() => { setEditingId(a.id); setEditedText(a.text.replace(/[*$]/g, '')); }}>
                          <Icon name="Edit" style={{ width: 13 }} /> ערוך
                        </button>
                      )}
                      <button className="btn ghost-red sm transition-fast" data-tooltip="דחה" onClick={() => handleReject(a.id)}>
                        <Icon name="X" style={{ width: 13 }} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {approvals.length === 0 && (
            <div className="empty-state" style={{ paddingTop: 50 }}>
              <Icon name="CheckCircle" className="empty-icon" style={{ width: 36, height: 36 }} />
              <div style={{ fontSize: 13 }}>אין דיווחים ממתינים לאישור</div>
            </div>
          )}
        </div>
      </div>
    </div>
    {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}
