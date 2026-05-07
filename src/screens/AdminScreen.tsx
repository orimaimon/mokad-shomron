import { useState, useEffect } from 'react';
import { Icon } from '../components/Icons';
import { cn } from '../lib/utils';

interface User {
  email: string;
  name: string;
  role: string;
}

interface RosterMember {
  id: number;
  name: string;
  role: string;
  task: string;
  phone: string;
  operational_phone: string;
  state: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px', borderRadius: 8,
  background: 'var(--bg-2)', border: '1px solid var(--border-1)', color: 'white',
};

// ── Users section ──────────────────────────────────────────────────────────

function UsersPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [modal, setModal] = useState<{ open: boolean; user?: User | null }>({ open: false });
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'dispatcher' });

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
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
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) { setModal({ open: false }); fetchUsers(); }
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
  { v: 'out', l: 'מחוץ לגזרה' },
];

const emptyMember = { name: '', role: '', task: '', phone: '', operational_phone: '', state: 'field' };

function RosterPanel() {
  const [members, setMembers] = useState<RosterMember[]>([]);
  const [modal, setModal] = useState<{ open: boolean; member?: RosterMember | null }>({ open: false });
  const [form, setForm] = useState({ ...emptyMember });
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  const fetchMembers = async () => {
    const res = await fetch('/api/roster');
    if (res.ok) setMembers(await res.json());
  };

  useEffect(() => { fetchMembers(); }, []);

  const openAdd = () => { setForm({ ...emptyMember }); setModal({ open: true, member: null }); };
  const openEdit = (m: RosterMember) => {
    setForm({ name: m.name, role: m.role, task: m.task, phone: m.phone || '', operational_phone: m.operational_phone || '', state: m.state });
    setModal({ open: true, member: m });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('למחוק את בעל התפקיד?')) return;
    await fetch(`/api/roster/${id}`, { method: 'DELETE' });
    fetchMembers();
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const token = localStorage.getItem('token');
    const isEdit = !!modal.member;
    const url = isEdit ? `/api/roster/${modal.member!.id}/edit` : '/api/roster/add';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) { setModal({ open: false }); fetchMembers(); }
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
                    <select value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} style={inputStyle}>
                      {STATES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                  </div>
                  <div className="input-group" style={{ gridColumn: '1/-1' }}>
                    <label>משימה נוכחית</label>
                    <input type="text" value={form.task} onChange={e => setForm({ ...form, task: e.target.value })} placeholder="סיור, איוש מחסום..." style={inputStyle} />
                  </div>
                  <div className="input-group">
                    <label>טלפון</label>
                    <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="050-0000000" style={inputStyle} />
                  </div>
                  <div className="input-group">
                    <label>טלפון מבצעי</label>
                    <input type="tel" value={form.operational_phone} onChange={e => setForm({ ...form, operational_phone: e.target.value })} placeholder="רדיו / מוצפן" style={inputStyle} />
                  </div>
                </div>
              </div>
              <div className="f">
                <button type="submit" className="btn brand" disabled={!form.name.trim()}>שמור</button>
                <button type="button" className="btn ghost" onClick={() => setModal({ open: false })}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
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
                .map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500 }}>{m.name}</td>
                  <td style={{ color: 'var(--ink-3)' }}>{m.role}</td>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{m.phone || '—'}</td>
                  <td className="mono" style={{ fontSize: 12, color: m.operational_phone ? 'var(--brand)' : 'var(--ink-4)' }}>{m.operational_phone || '—'}</td>
                  <td>
                    <span className={cn('tag sm', m.state === 'field' ? 'green' : m.state === 'out' ? 'red' : 'amber')}>
                      {STATES.find(s => s.v === m.state)?.l ?? m.state}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn ghost-brand icon-sm" onClick={() => openEdit(m)}><Icon name="Edit" style={{ width: 14 }} /></button>
                      <button className="btn ghost-red icon-sm" onClick={() => handleDelete(m.id)}><Icon name="Trash" style={{ width: 14 }} /></button>
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

// ── Main screen ────────────────────────────────────────────────────────────

export function AdminScreen() {
  const [tab, setTab] = useState<'users' | 'roster'>('roster');

  return (
    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-1)', paddingBottom: 12 }}>
        <button className={cn('btn sm', tab === 'roster' && 'brand')} onClick={() => setTab('roster')}>
          <Icon name="Users" style={{ width: 14 }} /> בעלי תפקידים
        </button>
        <button className={cn('btn sm', tab === 'users' && 'brand')} onClick={() => setTab('users')}>
          <Icon name="Shield" style={{ width: 14 }} /> משתמשי מערכת
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {tab === 'users' ? <UsersPanel /> : <RosterPanel />}
      </div>
    </div>
  );
}
