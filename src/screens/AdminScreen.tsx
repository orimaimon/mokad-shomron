import { useState, useEffect } from 'react';
import { Icon } from '../components/Icons';
import { cn, getRosterStateConfig } from '../lib/utils';
import { toast } from '../components/Toast';
import { DBRosterMember } from '../types';
import { MapPicker } from '../components/MapPicker';

interface User {
  email: string;
  name: string;
  role: string;
}


const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px', borderRadius: 8,
  background: 'var(--input-bg)', border: '1px solid var(--glass-border)', color: 'var(--ink-1)',
};

// ── Users section ──────────────────────────────────────────────────────────

function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [modal, setModal] = useState<{ open: boolean; user?: User | null }>({ open: false });
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'dispatcher' });

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
      return;
    }
    if (res.ok) setUsers(await res.json());
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleEdit = (u: User) => {
    setForm({ email: u.email, name: u.name, password: '', role: u.role });
    setModal({ open: true, user: u });
  };

  const handleDelete = async (email: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/admin/users/${email}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) fetchUsers();
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast('שם מלא הוא שדה חובה', 'error'); return; }
    if (!form.email.trim()) { toast('אימייל הוא שדה חובה', 'error'); return; }
    if (!modal.user && !form.password.trim()) { toast('סיסמה נדרשת למשתמש חדש', 'error'); return; }
    try {
      const token = localStorage.getItem('token');
      const body = { ...form };
      if (!body.password) delete (body as Partial<typeof body>).password;
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast('משתמש נשמר בהצלחה', 'success');
        setModal({ open: false });
        fetchUsers();
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || 'שגיאה בשמירת משתמש', 'error');
      }
    } catch {
      toast('שגיאת תקשורת', 'error');
    }
  };

  return (
    <>
      {modal.open && (
        <div className="scrim" onClick={() => setModal({ open: false })}>
          <div className="modal sm" onClick={e => e.stopPropagation()}>
            <div className="h"><Icon name="Users" /><h3>{modal.user ? 'עריכת משתמש' : 'משתמש חדש'}</h3></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
              <div className="b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="input-group"><label>שם מלא</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
                </div>
                <div className="input-group"><label>אימייל</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!modal.user} style={inputStyle} />
                </div>
                <div className="input-group">
                  <label>סיסמה {modal.user && <span style={{ color: 'var(--ink-4)' }}>(השאר ריק לאי-שינוי)</span>}</label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={inputStyle} />
                </div>
                <div className="input-group"><label>הרשאה</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={inputStyle}>
                    <option value="dispatcher">מוקדן (Dispatcher)</option>
                    <option value="admin">מנהל (Admin)</option>
                  </select>
                </div>
              </div>
              <div className="f">
                <button type="submit" className="btn brand">שמור</button>
                <button type="button" className="btn ghost" onClick={() => setModal({ open: false })}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="panel" style={{ flex: 1, minHeight: 0 }}>
        <div className="panel-h">
          <Icon name="Users" /><h3>משתמשי מערכת</h3>
          <div className="spacer" />
          <button className="btn brand sm" onClick={() => { setForm({ email: '', name: '', password: '', role: 'dispatcher' }); setModal({ open: true, user: null }); }}>
            <Icon name="Plus" style={{ width: 14 }} /> הוסף משתמש
          </button>
        </div>
        <div className="panel-b" style={{ padding: 0 }}>
          <table className="admin-table">
            <thead><tr><th>שם</th><th>אימייל</th><th>הרשאה</th><th>פעולות</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.email}>
                  <td>{u.name}</td>
                  <td style={{ opacity: 0.7 }}>{u.email}</td>
                  <td><span className={cn('tag sm', u.role === 'admin' ? 'purple' : 'blue')}>{u.role === 'admin' ? 'מנהל' : 'מוקדן'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn ghost-brand icon-sm" onClick={() => handleEdit(u)}><Icon name="Edit" style={{ width: 14 }} /></button>
                      <button className="btn ghost-red icon-sm" onClick={() => handleDelete(u.email)} disabled={u.email === 'admin@mokad.org'}><Icon name="Trash" style={{ width: 14 }} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Roster section ─────────────────────────────────────────────────────────

const STATES = [
  { v: 'field', l: 'בשטח' },
  { v: 'brief', l: 'תדריך' },
  { v: 'return', l: 'בחזרה' },
  { v: 'unavailable', l: 'לא זמין' },
];

const emptyMember = { name: '', role: '', task: '', phone: '', operational_phone: '', state: 'field', isOutOfSector: false, replacement: '', replacementPhone: '', returnTime: '', map_coords: '' };

function RosterPanel({ members, onRosterChange }: { members: DBRosterMember[], onRosterChange: () => void }) {
  const [modal, setModal] = useState<{ open: boolean; member?: DBRosterMember | null }>({ open: false });
  const [form, setForm] = useState({ ...emptyMember });
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  const openAdd = () => { setForm({ ...emptyMember }); setModal({ open: true, member: null }); };
  const openEdit = (m: DBRosterMember) => {
    setForm({ 
      name: m.name || '', 
      role: m.role || '', 
      task: m.task || '', 
      phone: m.phone || '', 
      operational_phone: m.operational_phone || '', 
      state: m.state === 'out' ? 'field' : (m.state || 'field'),
      isOutOfSector: !!m.is_out_of_sector,
      replacement: m.replacement || '',
      replacementPhone: m.replacement_phone || '',
      returnTime: m.return_time || '',
      map_coords: m.map_coords || ''
    });
    setModal({ open: true, member: m });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('למחוק את בעל התפקיד?')) return;
    await fetch(`/api/roster/${id}`, { method: 'DELETE' });
    onRosterChange();
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast('שם מלא הוא שדה חובה', 'error');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const isEdit = !!modal.member;
      const url = isEdit ? `/api/roster/${modal.member!.id}/edit` : '/api/roster/add';
      const stateToSave = form.isOutOfSector ? 'out' : form.state;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, state: stateToSave }),
      });
      if (res.ok) {
        if (isEdit) {
          await fetch('/api/roster/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              id: modal.member!.id,
              is_out_of_sector: form.isOutOfSector,
              replacement: form.replacement,
              replacement_phone: form.replacementPhone,
              return_time: form.returnTime,
              state: stateToSave,
              phone: form.phone,
              operational_phone: form.operational_phone,
              map_coords: form.map_coords
            }),
          });
        } else if (form.isOutOfSector) {
          const data = await res.json();
          if (data.id) {
            await fetch('/api/roster/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                id: data.id,
                is_out_of_sector: form.isOutOfSector,
                replacement: form.replacement,
                replacement_phone: form.replacementPhone,
                return_time: form.returnTime,
                state: stateToSave,
                phone: form.phone,
                operational_phone: form.operational_phone,
                map_coords: form.map_coords
              }),
            });
          }
        }
        
        toast(isEdit ? 'בעל תפקיד עודכן בהצלחה' : 'בעל תפקיד נוסף בהצלחה', 'success');
        setModal({ open: false });
        onRosterChange();
      } else {
        toast('שגיאה בשמירת בעל תפקיד', 'error');
      }
    } catch(err) {
      toast('שגיאת תקשורת', 'error');
    }
  };

  return (
    <>
      {modal.open && (
        <div className="scrim" onClick={() => setModal({ open: false })}>
          <div className="modal sm" onClick={e => e.stopPropagation()}>
            <div className="h"><Icon name="User" /><h3>{modal.member ? 'עריכת בעל תפקיד' : 'הוספת בעל תפקיד'}</h3></div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
              <div className="b" style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="input-group" style={{ gridColumn: '1/-1' }}>
                    <label>שם מלא <span style={{ color: 'var(--red)' }}>*</span></label>
                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="שם פרטי ושם משפחה" style={inputStyle} />
                  </div>
                  <div className="input-group">
                    <label>תפקיד</label>
                    <input type="text" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder='קב"ט, רב"ש...' style={inputStyle} />
                  </div>
                  <div className="input-group">
                    <label>מצב</label>
                    <select value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} style={inputStyle} disabled={form.isOutOfSector}>
                      {STATES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                  </div>
                  <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 24 }}>
                    <input type="checkbox" checked={form.isOutOfSector} onChange={e => setForm({ ...form, isOutOfSector: e.target.checked })} style={{ width: 16, height: 16 }} />
                    <label style={{ margin: 0 }}>מחוץ לגזרה</label>
                  </div>
                  <div className="input-group" style={{ gridColumn: '1/-1' }}>
                    <label>משימה נוכחית</label>
                    <input type="text" value={form.task} onChange={e => setForm({ ...form, task: e.target.value })} placeholder="סיור, איוש מחסום..." style={inputStyle} />
                  </div>
                  {form.isOutOfSector && (
                    <>
                      <div className="input-group">
                        <label>מחליף</label>
                        <input type="text" value={form.replacement} onChange={e => setForm({ ...form, replacement: e.target.value })} placeholder="שם המחליף" style={inputStyle} />
                      </div>
                      <div className="input-group">
                        <label>טלפון מחליף</label>
                        <input type="tel" value={form.replacementPhone} onChange={e => setForm({ ...form, replacementPhone: e.target.value })} placeholder="050-0000000" style={inputStyle} />
                      </div>
                      <div className="input-group" style={{ gridColumn: '1/-1' }}>
                        <label>שעת חזרה משוערת</label>
                        <input type="time" value={form.returnTime} onChange={e => setForm({ ...form, returnTime: e.target.value })} style={inputStyle} />
                      </div>
                    </>
                  )}
                  <div className="input-group">
                    <label>טלפון</label>
                    <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="050-0000000" style={inputStyle} />
                  </div>
                  <div className="input-group">
                    <label>טלפון מבצעי</label>
                    <input type="tel" value={form.operational_phone} onChange={e => setForm({ ...form, operational_phone: e.target.value })} placeholder="רדיו / מוצפן" style={inputStyle} />
                  </div>
                  {/* קואורדינטות מיקום */}
                  <div className="input-group" style={{ gridColumn: '1/-1' }}>
                    <label>מיקום כוח (קואורדינטות)</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input 
                        type="text" 
                        value={form.map_coords} 
                        onChange={e => setForm({ ...form, map_coords: e.target.value })} 
                        placeholder="lat,lng (לדוגמה: 32.182,35.281)" 
                        style={inputStyle} 
                      />
                      <button type="button" className="btn icon ghost" onClick={() => setShowMapPicker(true)} data-tooltip="בחר מהמפה">
                        <Icon name="Map" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="f">
                <button type="submit" className="btn brand" disabled={!form.name?.trim()}>שמור</button>
                <button type="button" className="btn ghost" onClick={() => setModal({ open: false })}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showMapPicker && (
        <MapPicker 
          initialCoords={form.map_coords} 
          onSelect={(c) => { setForm({ ...form, map_coords: c }); setShowMapPicker(false); }} 
          onClose={() => setShowMapPicker(false)} 
        />
      )}

      <div className="panel" style={{ flex: 1, minHeight: 0 }}>
        <div className="panel-h">
          <Icon name="Users" /><h3>בעלי תפקידים</h3>
          <span className="tag" style={{ marginRight: 4 }}>{members.length}</span>
          <div className="spacer" />
          <button className="btn brand sm" onClick={openAdd}>
            <Icon name="Plus" style={{ width: 14 }} /> הוסף
          </button>
        </div>
        <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-1)', display: 'flex', gap: 6 }}>
          <input
            className="input" style={{ flex: 1, fontSize: 12, padding: '4px 8px' }}
            placeholder="חיפוש שם / תפקיד..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <select className="input" style={{ fontSize: 12, padding: '4px 6px' }} value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
            <option value="">כל המצבים</option>
            {STATES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
            <option value="out">מחוץ לגזרה</option>
          </select>
          {(search || stateFilter) && (
            <button className="btn ghost-red icon-sm" onClick={() => { setSearch(''); setStateFilter(''); }} title="נקה">
              <Icon name="X" style={{ width: 11 }} />
            </button>
          )}
        </div>
        <div className="panel-b" style={{ padding: 0 }}>
          <table className="admin-table">
            <thead>
              <tr><th>שם</th><th>תפקיד</th><th>טלפון</th><th>טלפון מבצעי</th><th>מצב</th><th>פעולות</th></tr>
            </thead>
            <tbody>
              {members
                .filter(m => {
                  if (stateFilter && m.state !== stateFilter) return false;
                  if (search) {
                    const q = search.toLowerCase();
                    return m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
                  }
                  return true;
                })
                .map(m => {
                  const stateConfig = getRosterStateConfig(m.is_out_of_sector ? 'out' : m.state);
                  return (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 500 }}>{m.name}</td>
                      <td style={{ color: 'var(--ink-3)' }}>{m.role}</td>
                      <td className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{m.phone || '—'}</td>
                      <td className="mono" style={{ fontSize: 12, color: m.operational_phone ? 'var(--brand)' : 'var(--ink-4)' }}>{m.operational_phone || '—'}</td>
                      <td>
                        <span className={cn('tag sm', stateConfig.colorClass)}>{stateConfig.label}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn ghost-brand icon-sm" onClick={() => openEdit(m)}><Icon name="Edit" style={{ width: 14 }} /></button>
                          <button className="btn ghost-red icon-sm" onClick={() => handleDelete(m.id)}><Icon name="Trash" style={{ width: 14 }} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── SopEditor section ──────────────────────────────────────────────────────

function SopEditor() {
  const [templates, setTemplates] = useState<{ event_type: string; steps: string[] }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [editSteps, setEditSteps] = useState<string[]>([]);
  const [newStep, setNewStep] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/sop/templates', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setTemplates(await res.json());
  };

  useEffect(() => { fetchTemplates(); }, []);

  const selectType = (t: { event_type: string; steps: string[] }) => {
    setSelected(t.event_type);
    setEditSteps([...t.steps]);
    setNewStep('');
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/sop/templates/${encodeURIComponent(selected)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: editSteps }),
      });
      if (res.ok) { toast('נוהל עודכן בהצלחה', 'success'); fetchTemplates(); }
      else toast('שגיאה בשמירת הנוהל', 'error');
    } finally { setSaving(false); }
  };

  const moveStep = (i: number, dir: -1 | 1) => {
    setEditSteps(s => {
      const a = [...s];
      [a[i], a[i + dir]] = [a[i + dir], a[i]];
      return a;
    });
  };

  return (
    <div style={{ display: 'flex', gap: 14, height: '100%' }}>
      {/* Type list */}
      <div className="panel" style={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="panel-h"><Icon name="ClipboardList" style={{ width: 14 }} /><h3>סוגי אירועים</h3></div>
        <div className="panel-b" style={{ padding: 0, flex: 1, overflowY: 'auto' }}>
          {templates.map(t => (
            <div
              key={t.event_type}
              onClick={() => selectType(t)}
              style={{
                padding: '10px 14px', cursor: 'pointer', fontSize: 13,
                background: selected === t.event_type ? 'rgba(245,165,36,0.1)' : 'transparent',
                borderRight: selected === t.event_type ? '2px solid var(--amber)' : '2px solid transparent',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'background 0.12s',
              }}
            >
              <span style={{ color: selected === t.event_type ? 'var(--amber)' : 'var(--ink-1)' }}>{t.event_type}</span>
              <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>{t.steps.length}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step editor */}
      <div style={{ flex: 1 }}>
        {selected ? (
          <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-h">
              <Icon name="ClipboardList" style={{ width: 14 }} />
              <h3>נוהל: {selected}</h3>
              <div className="spacer" />
              <button className="btn brand sm" disabled={saving} onClick={handleSave}>
                {saving ? 'שומר...' : 'שמור שינויים'}
              </button>
            </div>
            <div className="panel-b" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, padding: 14 }}>
              {editSteps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ color: 'var(--ink-4)', fontSize: 11, minWidth: 18, textAlign: 'center' }}>{i + 1}</span>
                  <input
                    className="input"
                    style={{ flex: 1, fontSize: 13 }}
                    value={step}
                    onChange={e => setEditSteps(s => s.map((v, j) => j === i ? e.target.value : v))}
                  />
                  <button
                    className="btn ghost icon-sm"
                    disabled={i === 0}
                    onClick={() => moveStep(i, -1)}
                    title="הזז למעלה"
                  >
                    <Icon name="ChevronDown" style={{ width: 12, transform: 'rotate(180deg)' }} />
                  </button>
                  <button
                    className="btn ghost icon-sm"
                    disabled={i === editSteps.length - 1}
                    onClick={() => moveStep(i, 1)}
                    title="הזז למטה"
                  >
                    <Icon name="ChevronDown" style={{ width: 12 }} />
                  </button>
                  <button
                    className="btn ghost-red icon-sm"
                    onClick={() => setEditSteps(s => s.filter((_, j) => j !== i))}
                  >
                    <Icon name="Trash" style={{ width: 13 }} />
                  </button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6, marginTop: 8, borderTop: '1px solid var(--border-1)', paddingTop: 12 }}>
                <input
                  className="input"
                  style={{ flex: 1, fontSize: 13 }}
                  placeholder="הוסף סעיף חדש..."
                  value={newStep}
                  onChange={e => setNewStep(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newStep.trim()) {
                      setEditSteps(s => [...s, newStep.trim()]);
                      setNewStep('');
                    }
                  }}
                />
                <button
                  className="btn sm"
                  disabled={!newStep.trim()}
                  onClick={() => { setEditSteps(s => [...s, newStep.trim()]); setNewStep(''); }}
                >הוסף</button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--ink-4)', fontSize: 14 }}>
            בחר סוג אירוע משמאל לעריכת הנוהל
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export function AdminScreen({ roster, onRosterChange }: { roster: DBRosterMember[], onRosterChange: () => void }) {
  const [tab, setTab] = useState<'users' | 'roster' | 'sop'>('roster');

  return (
    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-1)', paddingBottom: 12 }}>
        <button className={cn('btn sm', tab === 'roster' && 'brand')} onClick={() => setTab('roster')}>
          <Icon name="Users" style={{ width: 14 }} /> בעלי תפקידים
        </button>
        <button className={cn('btn sm', tab === 'users' && 'brand')} onClick={() => setTab('users')}>
          <Icon name="Shield" style={{ width: 14 }} /> משתמשי מערכת
        </button>
        <button className={cn('btn sm', tab === 'sop' && 'brand')} onClick={() => setTab('sop')}>
          <Icon name="ClipboardList" style={{ width: 14 }} /> נהלי אירוע
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {tab === 'users' ? <UsersPanel /> : tab === 'sop' ? <SopEditor /> : <RosterPanel members={roster} onRosterChange={onRosterChange} />}
      </div>
    </div>
  );
}
