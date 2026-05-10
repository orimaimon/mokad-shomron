import { useState, useEffect, useMemo } from 'react';
import { Icon, FormattedText } from '../components/Icons';
import { useNow, fmtDate } from '../hooks/useClock';
import { MokadData, RosterMember } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from '../components/Toast';

interface RoutineScreenProps {
  data: MokadData;
  onOpenEmergency: () => void;
}

const inputStyle = { width: '100%', padding: '10px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border-1)', color: 'white' };

function RosterUpdateModal({ person, onClose, onSave, onDelete }: { person: RosterMember, onClose: () => void, onSave: (p: RosterMember) => void, onDelete?: () => void }) {
  const [isOut, setIsOut] = useState(!!person.isOutOfSector);
  const [personState, setPersonState] = useState(person.state || 'field');
  const [name, setName] = useState(person.name || '');
  const [role, setRole] = useState(person.role || '');
  const [task, setTask] = useState((person as any).task || '');
  const [replacement, setReplacement] = useState((person as any).replacement || '');
  const [replacementPhone, setReplacementPhone] = useState((person as any).replacement_phone || '');
  const [returnTime, setReturnTime] = useState((person as any).returnTime || '');
  const [phone, setPhone] = useState((person as any).phone || '');
  const [operationalPhone, setOperationalPhone] = useState((person as any).operational_phone || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/replacements').then(r => r.json()).then(setSuggestions);
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      toast('שם מלא הוא שדה חובה', 'error');
      return;
    }
    setLoading(true);
    try {
      await fetch(`/api/roster/${person.id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, task, phone, operational_phone: operationalPhone, state: isOut ? 'out' : personState })
      });
      const res = await fetch('/api/roster/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: person.id,
          is_out_of_sector: isOut,
          replacement,
          replacement_phone: replacementPhone,
          return_time: returnTime,
          phone,
          operational_phone: operationalPhone,
          state: isOut ? 'out' : personState
        }),
      });
      if (res.ok) {
        onSave({ ...person, name, role, task, isOutOfSector: isOut, replacement, returnTime, phone, operational_phone: operationalPhone, state: isOut ? 'out' : personState } as any);
        toast('בעל התפקיד עודכן בהצלחה', 'success');
      } else {
        toast('שגיאה בעדכון בעל התפקיד', 'error');
      }
    } catch (e) {
      toast('שגיאת תקשורת', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal sm" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="h">
          <Icon name="User" />
          <h3>עריכת בעל תפקיד</h3>
        </div>
        <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
        <div className="b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: 5, fontSize: 12, color: 'var(--ink-3)' }}>שם מלא</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            </div>
            <div className="input-group">
              <label style={{ display: 'block', marginBottom: 5, fontSize: 12, color: 'var(--ink-3)' }}>תפקיד</label>
              <input type="text" value={role} onChange={e => setRole(e.target.value)} style={inputStyle} />
            </div>
            <div className="input-group">
              <label style={{ display: 'block', marginBottom: 5, fontSize: 12, color: 'var(--ink-3)' }}>משימה נוכחית</label>
              <input type="text" value={task} onChange={e => setTask(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* פרטי קשר */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group">
              <label style={{ display: 'block', marginBottom: 5, fontSize: 12, color: 'var(--ink-3)' }}>טלפון</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="050-0000000" style={inputStyle} />
            </div>
            <div className="input-group">
              <label style={{ display: 'block', marginBottom: 5, fontSize: 12, color: 'var(--ink-3)' }}>טלפון מבצעי</label>
              <input type="tel" value={operationalPhone} onChange={e => setOperationalPhone(e.target.value)} placeholder="רדיו / מוצפן" style={inputStyle} />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-1)', paddingTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="input-group">
              <label style={{ display: 'block', marginBottom: 5, fontSize: 12, color: 'var(--ink-3)' }}>סטטוס זמינות</label>
              <select style={inputStyle} value={personState} onChange={e => setPersonState(e.target.value)} disabled={isOut}>
                <option value="field">בשטח</option>
                <option value="brief">תדריך</option>
                <option value="return">בחזרה</option>
                <option value="unavailable">לא זמין</option>
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'var(--bg-2)', padding: '12px', borderRadius: 8, height: 'max-content', alignSelf: 'end' }}>
              <input type="checkbox" checked={isOut} onChange={e => setIsOut(e.target.checked)} />
              <span style={{ fontWeight: 600 }}>מחוץ לגזרה</span>
            </label>
          </div>

          {isOut && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="input-group">
                <label style={{ display: 'block', marginBottom: 5, fontSize: 12, color: 'var(--ink-3)' }}>שם מחליף</label>
                <input
                  type="text"
                  value={replacement}
                  onChange={e => setReplacement(e.target.value)}
                  placeholder="הקלד שם..."
                  list="replacement-suggestions"
                  style={inputStyle}
                />
                <datalist id="replacement-suggestions">
                  {suggestions.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div className="input-group">
                <label style={{ display: 'block', marginBottom: 5, fontSize: 12, color: 'var(--ink-3)' }}>טלפון מחליף</label>
                <input type="tel" value={replacementPhone} onChange={e => setReplacementPhone(e.target.value)} placeholder="050-0000000" style={inputStyle} />
              </div>
              <div className="input-group">
                <label style={{ display: 'block', marginBottom: 5, fontSize: 12, color: 'var(--ink-3)' }}>זמן חזרה משוער</label>
                <input type="text" value={returnTime} onChange={e => setReturnTime(e.target.value)} placeholder="17:30" style={inputStyle} />
              </div>
            </motion.div>
          )}
        </div>
        <div className="f">
          <button type="submit" className="btn brand" disabled={loading}>{loading ? 'שומר...' : 'שמור'}</button>
          <button type="button" className="btn ghost" onClick={onClose}>ביטול</button>
          {onDelete && (
            <button type="button" className="btn ghost-red" style={{ marginRight: 'auto' }} onClick={onDelete}>
              <Icon name="Trash" />
            </button>
          )}
        </div>
        </form>
      </div>
    </div>
  );
}

function EditIncidentModal({ incident, onClose, onSave }: { incident: any, onClose: () => void, onSave: () => void }) {
  const [form, setForm] = useState({
    type: incident.type || '',
    loc: incident.loc || incident.location || '',
    status: incident.status || 'בטיפול',
    sev: incident.sev || incident.severity || 'amber',
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/incidents/${incident.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: form.type, location: form.loc, status: form.status, severity: form.sev }),
      });
      if (res.ok) onSave();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal sm" onClick={e => e.stopPropagation()}>
        <div className="h"><Icon name="Edit" /><h3>עדכון אירוע</h3></div>
        <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
          <div className="b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label>סוג אירוע</label>
              <input className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} />
            </div>
            <div className="field">
              <label>מיקום</label>
              <input className="input" value={form.loc} onChange={e => setForm({ ...form, loc: e.target.value })} />
            </div>
            <div className="field">
              <label>סטטוס</label>
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="בטיפול">בטיפול</option>
                <option value="בכוח">בכוח</option>
                <option value="ממתין">ממתין</option>
                <option value="הסתיים">הסתיים</option>
              </select>
            </div>
            <div className="field">
              <label>חומרה</label>
              <select className="input" value={form.sev} onChange={e => setForm({ ...form, sev: e.target.value })}>
                <option value="green">נמוכה</option>
                <option value="amber">בינונית</option>
                <option value="red">גבוהה</option>
              </select>
            </div>
          </div>
          <div className="f">
            <button type="submit" className="btn brand" disabled={loading}>{loading ? 'שומר...' : 'שמור'}</button>
            <button type="button" className="btn ghost" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewIncidentModal({ onClose, onSave }: { onClose: () => void, onSave: () => void }) {
  const [formData, setFormData] = useState({
    type: 'תאונת דרכים',
    loc: '',
    sev: 'amber'
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!formData.loc.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: formData.type, location: formData.loc, severity: formData.sev })
      });
      if (res.ok) onSave();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal sm" onClick={e => e.stopPropagation()}>
        <div className="h"><h3>פתיחת אירוע שגרה חדש</h3></div>
        <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
        <div className="b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label>סוג אירוע</label>
            <input className="input" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} />
          </div>
          <div className="field">
            <label>מיקום</label>
            <input className="input" value={formData.loc} onChange={e => setFormData({ ...formData, loc: e.target.value })} />
          </div>
          <div className="field">
            <label>חומרה</label>
            <select className="input" value={formData.sev} onChange={e => setFormData({ ...formData, sev: e.target.value })}>
              <option value="green">נמוכה</option>
              <option value="amber">בינונית</option>
              <option value="red">גבוהה</option>
            </select>
          </div>
        </div>
        <div className="f">
          <button type="submit" className="btn brand" disabled={loading || !formData.loc.trim()}>פתח אירוע</button>
          <button type="button" className="btn ghost" onClick={onClose}>ביטול</button>
        </div>
        </form>
      </div>
    </div>
  );
}

function NewPersonModal({ onClose, onSave }: { onClose: () => void, onSave: () => void }) {
  const [form, setForm] = useState({ name: '', role: 'סייר', phone: '', state: 'field' });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/roster/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        toast('בעל התפקיד נוסף בהצלחה', 'success');
        onSave();
      } else {
        toast('שגיאה בהוספת בעל תפקיד', 'error');
      }
    } catch (e) {
      toast('שגיאת תקשורת', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scrim" onClick={onClose}>
      <div className="modal sm" onClick={e => e.stopPropagation()}>
        <div className="h"><h3>הוספת בעל תפקיד</h3></div>
        <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
          <div className="b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="field">
              <label>שם מלא</label>
              <input autoFocus className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="fieldrow">
              <div className="field">
                <label>תפקיד</label>
                <input className="input" placeholder="סייר / רבשצ..." value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
              </div>
              <div className="field">
                <label>סטטוס התחלתי</label>
                <select className="input" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}>
                  <option value="field">בשטח</option>
                  <option value="brief">תדריך</option>
                  <option value="unavailable">לא זמין</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>טלפון</label>
              <input type="tel" className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="f">
            <button type="submit" className="btn brand" disabled={loading || !form.name.trim()}>{loading ? 'מוסיף...' : 'הוסף'}</button>
            <button type="button" className="btn ghost" onClick={onClose}>ביטול</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RoutineScreen({ data, onOpenEmergency }: RoutineScreenProps) {
  const r = data.routine;
  const now = useNow();
  const [tab, setTab] = useState<'in' | 'out'>('out');
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [editingPerson, setEditingPerson] = useState<RosterMember | null>(null);
  const [showNewPerson, setShowNewPerson] = useState(false);
  const [showNewIncident, setShowNewIncident] = useState(false);
  const [reportText, setReportText] = useState('');
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const [closingIds, setClosingIds] = useState<Set<number>>(new Set());
  const [editingIncident, setEditingIncident] = useState<any>(null);

  // ── filters & sort ──
  const [incSearch, setIncSearch] = useState('');
  const [incStatus, setIncStatus] = useState('open');
  const [incSev, setIncSev] = useState('');
  const [incSort, setIncSort] = useState<{ key: string; asc: boolean }>({ key: '', asc: true });
  const [feedSearch, setFeedSearch] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');

  const handleCloseIncident = async (id: number) => {
    setClosingIds(prev => new Set(prev).add(id));
    try {
      await fetch(`/api/incidents/${id}/close`, { method: 'POST' });
    } catch {
      setClosingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

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
        body: JSON.stringify({ src: 'מוקדן', text: reportText })
      });
      setReportText('');
    } catch (err) {}
  };

  const fetchRoster = () => {
    fetch('/api/roster').then(res => res.json()).then(data => {
      const mapped = data.map((item: any) => ({
        ...item,
        out: item.out_time,
        returnTime: item.return_time,
        isOutOfSector: !!item.is_out_of_sector
      }));
      setRoster(mapped);
    });
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  const handleDeletePerson = async (id: number) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק בעל תפקיד זה?')) return;
    await fetch(`/api/roster/${id}`, { method: 'DELETE' }).catch(() => {});
    fetchRoster();
    setEditingPerson(null);
  };

  // ── derived filtered/sorted lists ──
  const filteredIncidents = useMemo(() => {
    let items = [...r.incidents];
    if (incSearch) {
      const q = incSearch.toLowerCase();
      items = items.filter(i =>
        i.type?.toLowerCase().includes(q) ||
        (i.loc || i.location || '').toLowerCase().includes(q)
      );
    }
    if (incStatus === 'open') items = items.filter(i => i.status !== 'הסתיים' && !closingIds.has(i.id));
    else if (incStatus === 'closed') items = items.filter(i => i.status === 'הסתיים' || closingIds.has(i.id));
    if (incSev) items = items.filter(i => (i.sev || i.severity) === incSev);
    if (incSort.key) {
      items.sort((a: any, b: any) => {
        const va = String(a[incSort.key] ?? '');
        const vb = String(b[incSort.key] ?? '');
        return incSort.asc ? va.localeCompare(vb, 'he') : vb.localeCompare(va, 'he');
      });
    }
    return items;
  }, [r.incidents, incSearch, incStatus, incSev, incSort, closingIds]);

  const filteredFeed = useMemo(() => {
    const base = r.feed.filter((it: any) => !deletedIds.has(it.id));
    if (!feedSearch) return base;
    const q = feedSearch.toLowerCase();
    return base.filter((it: any) =>
      it.text?.toLowerCase().includes(q) || it.src?.toLowerCase().includes(q)
    );
  }, [r.feed, deletedIds, feedSearch]);

  const inSector = roster.filter(p => !p.isOutOfSector);
  const outOfSector = roster.filter(p => p.isOutOfSector);

  const filteredRoster = useMemo(() => {
    const base = tab === 'in' ? inSector : outOfSector;
    if (!rosterSearch) return base;
    const q = rosterSearch.toLowerCase();
    return base.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.role?.toLowerCase().includes(q) ||
      (p as any).task?.toLowerCase().includes(q)
    );
  }, [tab, inSector, outOfSector, rosterSearch]);

  const toggleSort = (key: string) =>
    setIncSort(s => s.key === key ? { key, asc: !s.asc } : { key, asc: true });

  const SortIcon = ({ k }: { k: string }) =>
    incSort.key === k
      ? <span style={{ marginRight: 4, fontSize: 10 }}>{incSort.asc ? '▲' : '▼'}</span>
      : <span style={{ marginRight: 4, fontSize: 10, opacity: .25 }}>↕</span>;

  return (
    <div style={{ height: '100%', padding: 10, display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 10, minHeight: 0 }}>
      {editingPerson && (
        <RosterUpdateModal 
          person={editingPerson} 
          onClose={() => setEditingPerson(null)} 
          onSave={() => {
            setEditingPerson(null);
            fetchRoster();
          }}
          onDelete={() => handleDeletePerson(editingPerson.id)}
        />
      )}
      {showNewPerson && (
        <NewPersonModal onClose={() => setShowNewPerson(false)} onSave={() => { setShowNewPerson(false); fetchRoster(); }} />
      )}
      {showNewIncident && (
        <NewIncidentModal onClose={() => setShowNewIncident(false)} onSave={() => setShowNewIncident(false)} />
      )}
      {editingIncident && (
        <EditIncidentModal
          incident={editingIncident}
          onClose={() => setEditingIncident(null)}
          onSave={() => setEditingIncident(null)}
        />
      )}
      
      {/* col 1 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel" 
          style={{ flex: '0 0 auto' }}
        >
          <div className="panel-h">
            <h3>תמונת מצב גזרה</h3>
            <div className="spacer" />
            <span className="muted mono" style={{ fontSize: 12 }}>{fmtDate(now)}</span>
          </div>
          <div className="panel-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="metric">
              <div className="lbl">כוננות גזרה</div>
              <div className="num" style={{ fontSize: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="tag green" style={{ fontSize: 13 }}>שגרה</span>
              </div>
            </div>
            <div className="metric">
              <div className="lbl">אירועים פעילים</div>
              <div className="num">{r.metrics.open}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, fontSize: 11, color: 'var(--ink-2)' }}>
                <span style={{ color: 'var(--red)' }}>🔴 {r.incidents.filter(i => (i.sev || i.severity) === 'red' && i.status !== 'הסתיים').length}</span>
                <span style={{ color: 'var(--amber)' }}>🟡 {r.incidents.filter(i => (i.sev || i.severity) === 'amber' && i.status !== 'הסתיים').length}</span>
                <span style={{ color: 'var(--green)' }}>🟢 {r.incidents.filter(i => (i.sev || i.severity) === 'green' && i.status !== 'הסתיים').length}</span>
              </div>
            </div>
            <div className="metric">
              <div className="lbl">אירועים היום</div>
              <div className="num">{r.metrics.today}</div>
              <div className="spark" style={{ marginTop: 8 }}>
                {[6, 3, 8, 4, 7, 9, 5, 11, 8, 4, 12, 9, 6, 14].map((h, i) => (
                  <i key={i} style={{ height: h * 2 }} />
                ))}
              </div>
            </div>
            <div className="metric">
              <div className="lbl">בעלי תפקידים בשטח</div>
              <div className="num">
                {roster.filter(p => p.state === 'field').length}
                <span style={{ fontSize: 14, color: 'var(--ink-3)' }}> / {roster.length}</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="panel" 
          style={{ flex: '1 1 auto', minHeight: 0 }}
        >
          <div className="panel-h">
            <h3>אירועים חריגים</h3>
            <span className="tag" style={{ marginRight: 4 }}>{filteredIncidents.length}</span>
            <div className="spacer" />
            <button className="btn sm" onClick={() => setShowNewIncident(true)}><Icon name="Plus" /> חדש</button>
          </div>
          {/* filter bar */}
          <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-1)', display: 'flex', gap: 6, background: 'var(--bg-1)', flexWrap: 'wrap' }}>
            <input
              className="input" style={{ flex: '1 1 120px', fontSize: 12, padding: '4px 8px' }}
              placeholder="חיפוש סוג / מיקום..."
              value={incSearch} onChange={e => setIncSearch(e.target.value)}
            />
            <select className="input" style={{ fontSize: 12, padding: '4px 6px' }} value={incStatus} onChange={e => setIncStatus(e.target.value)}>
              <option value="">כל הסטטוסים</option>
              <option value="open">פתוחים</option>
              <option value="closed">סגורים</option>
            </select>
            <select className="input" style={{ fontSize: 12, padding: '4px 6px' }} value={incSev} onChange={e => setIncSev(e.target.value)}>
              <option value="">כל החומרות</option>
              <option value="red">גבוהה 🔴</option>
              <option value="amber">בינונית 🟡</option>
              <option value="green">נמוכה 🟢</option>
            </select>
            {(incSearch || incStatus || incSev) && (
              <button className="btn ghost-red icon-sm" onClick={() => { setIncSearch(''); setIncStatus(''); setIncSev(''); }} title="נקה סינון">
                <Icon name="X" style={{ width: 11 }} />
              </button>
            )}
          </div>
          <div className="panel-b" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('t')}>שעה<SortIcon k="t" /></th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('type')}>סוג<SortIcon k="type" /></th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('loc')}>מיקום<SortIcon k="loc" /></th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('status')}>סטטוס<SortIcon k="status" /></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-4)', padding: 16 }}>אין תוצאות</td></tr>
                )}
                {filteredIncidents.map((inc) => {
                  const closed = closingIds.has(inc.id) || inc.status === 'הסתיים';
                  return (
                    <tr
                      key={inc.id}
                      style={{ opacity: closed ? 0.5 : 1, cursor: 'pointer' }}
                      onClick={() => setEditingIncident(inc)}
                    >
                      <td className="mono" style={{ color: 'var(--ink-3)' }}>{inc.t}</td>
                      <td>{inc.type}</td>
                      <td style={{ color: 'var(--ink-2)' }}>{inc.loc}</td>
                      <td><span className={cn("tag", closed ? 'green' : inc.sev)}>{closed ? 'הסתיים' : inc.status}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        {!closed && (
                          <button className="btn ghost-brand icon-sm" title="סגור אירוע" onClick={() => handleCloseIncident(inc.id)}>
                            <Icon name="Check" style={{ width: 13 }} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* col 2 - feed */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="panel" 
        style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        <div className="panel-h">
          <h3>זרם עדכונים</h3>
          {filteredFeed.length !== r.feed.filter((it: any) => !deletedIds.has(it.id)).length && (
            <span className="tag" style={{ marginRight: 4 }}>{filteredFeed.length}</span>
          )}
        </div>
        <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-1)', display: 'flex', gap: 6 }}>
          <Icon name="Search" style={{ width: 14, color: 'var(--ink-4)', alignSelf: 'center', flexShrink: 0 }} />
          <input
            className="input" style={{ fontSize: 12, padding: '4px 8px' }}
            placeholder="חיפוש בעדכונים..."
            value={feedSearch} onChange={e => setFeedSearch(e.target.value)}
          />
          {feedSearch && (
            <button className="btn ghost-red icon-sm" onClick={() => setFeedSearch('')} title="נקה">
              <Icon name="X" style={{ width: 11 }} />
            </button>
          )}
        </div>
        <div className="panel-b" style={{ padding: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="feed" style={{ flex: 1, overflow: 'auto' }}>
            {filteredFeed.map((it: any, i: number) => (
              <div className="item" key={it.id ?? i} style={{ position: 'relative' }}>
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
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--border-1)', background: 'var(--bg-1)' }}>
            <div className="input-group" style={{ display: 'flex', gap: 8 }}>
              <input 
                type="text" 
                className="input" 
                placeholder="הוספת דיווח ליומן..." 
                value={reportText}
                onChange={e => setReportText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendReport()}
              />
              <button className="btn brand icon" onClick={handleSendReport}><Icon name="Send" /></button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* col 3 - roster + quick actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="panel" 
          style={{ flex: 1, minHeight: 0, padding: 0 }}
        >
          <div className="panel-h" style={{ borderBottom: 'none', padding: '10px 15px', flexWrap: 'wrap', gap: 8 }}>
            <h3>בעלי תפקידים</h3>
            <button className="btn ghost icon-sm" title="הוסף בעל תפקיד" onClick={() => setShowNewPerson(true)} style={{ padding: '2px 6px', height: 24 }}>
              <Icon name="Plus" style={{ width: 14 }} />
            </button>
            <div className="spacer" />
            <div className="tabs-row sm">
              <button className={cn("tab", tab === 'in' && "on")} onClick={() => setTab('in')}>
                בגזרה <small>({inSector.length})</small>
              </button>
              <button className={cn("tab", tab === 'out' && "on")} onClick={() => setTab('out')}>
                מחוץ לגזרה <small>({outOfSector.length})</small>
              </button>
            </div>
          </div>
          <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-1)', display: 'flex', gap: 6 }}>
            <Icon name="Search" style={{ width: 14, color: 'var(--ink-4)', alignSelf: 'center', flexShrink: 0 }} />
            <input
              className="input" style={{ fontSize: 12, padding: '4px 8px' }}
              placeholder="חיפוש שם / תפקיד / משימה..."
              value={rosterSearch} onChange={e => setRosterSearch(e.target.value)}
            />
            {rosterSearch && (
              <button className="btn ghost-red icon-sm" onClick={() => setRosterSearch('')} title="נקה">
                <Icon name="X" style={{ width: 11 }} />
              </button>
            )}
          </div>
          <div className="panel-b" style={{ padding: 0, overflow: 'auto' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.1 }}
                className="roster"
              >
                {filteredRoster.length === 0 && (
                  <div style={{ padding: 16, color: 'var(--ink-4)', textAlign: 'center', fontSize: 13 }}>אין תוצאות</div>
                )}
                {filteredRoster.map((person, i) => {
                  const p = person as any;
                  return (
                    <div key={i} style={{ borderBottom: '1px solid var(--border-1)' }}>
                      {/* main row */}
                      <div
                        className={cn('r', p.isOutOfSector && 'out-row')}
                        onClick={() => setEditingPerson(person)}
                        style={{ cursor: 'pointer', borderBottom: 'none' }}
                      >
                        <div className="av" style={p.isOutOfSector ? { background: 'var(--red)', color: 'white' } : {}}>
                          {p.name.split(' ').map((s: string) => s[0]).join('')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="name">
                            {p.name}
                            {p.isOutOfSector && <span className="tag sm red" style={{ marginRight: 8 }}>מחוץ לגזרה</span>}
                          </div>
                          <div className="meta">
                            {p.role} · {p.isOutOfSector ? 'יציאה מהגזרה' : p.task}
                          </div>
                          {(p.phone || p.operational_phone) && (
                            <div className="meta mono" style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
                              {p.phone && <span>{p.phone}</span>}
                              {p.phone && p.operational_phone && <span style={{ margin: '0 4px' }}>·</span>}
                              {p.operational_phone && <span style={{ color: 'var(--brand)' }}>{p.operational_phone}</span>}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                          <span className={cn('st', p.state)}>
                            {p.state === 'field' ? 'בשטח' : p.state === 'brief' ? 'תדריך' : p.state === 'return' ? 'בחזרה' : 'לא זמין'}
                          </span>
                          <span className="meta">מ- {p.out}</span>
                          {p.isOutOfSector && p.return_time && (
                            <span className="meta mono" style={{ fontSize: 10 }}>חזרה: {p.return_time}</span>
                          )}
                        </div>
                      </div>
                      {/* replacement sub-row */}
                      {p.isOutOfSector && p.replacement && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '6px 12px 8px 12px',
                          background: 'rgba(239,68,68,0.05)',
                          borderTop: '1px dashed rgba(239,68,68,0.2)',
                        }}>
                          <Icon name="User" style={{ width: 13, color: 'var(--ink-4)', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>מחליף:</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{p.replacement}</span>
                          {p.replacement_phone && (
                            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginRight: 'auto' }}>
                              {p.replacement_phone}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="panel" style={{ flex: '0 0 auto' }}>
          <div className="panel-h"><h3>פעולה מהירה</h3></div>
          <div className="panel-b" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn danger" onClick={onOpenEmergency} style={{ justifyContent: 'center', padding: '12px' }}>
              <Icon name="Siren" lg /> פתיחת אירוע חירום חדש
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="btn" onClick={() => setShowNewIncident(true)}><Icon name="Plus" /> דיווח חדש</button>
              <button className="btn"><Icon name="Doc" /> דוח שגרה</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
