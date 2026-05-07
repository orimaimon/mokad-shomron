import { useState, useEffect } from 'react';
import { Icon } from '../components/Icons';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface User {
  email: string;
  name: string;
  role: string;
}

export function AdminScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean, user?: User | null }>({ open: false });
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'dispatcher' });

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (u: User) => {
    setForm({ email: u.email, name: u.name, password: '', role: u.role });
    setModal({ open: true, user: u });
  };

  const handleDelete = async (email: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/admin/users/${email}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) fetchUsers();
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setModal({ open: false });
      fetchUsers();
    }
  };

  return (
    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {modal.open && (
        <div className="scrim" onClick={() => setModal({ open: false })}>
          <div className="modal sm" onClick={e => e.stopPropagation()}>
            <div className="h">
              <Icon name="Users" />
              <h3>{modal.user ? 'עריכת משתמש' : 'משתמש חדש'}</h3>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
            <div className="b" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div className="input-group">
                <label>שם מלא</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label>אימייל</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} disabled={!!modal.user} />
              </div>
              <div className="input-group">
                <label>סיסמה {modal.user && '(השאר ריק כדי לא לשנות)'}</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
              </div>
              <div className="input-group">
                <label>תפקיד / הרשאה</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} style={{ width: '100%', background: 'var(--bg-2)', color: 'white', padding: 8, borderRadius: 6, border: '1px solid var(--line)' }}>
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
          <Icon name="Users" />
          <h3>ניהול משתמשים והרשאות</h3>
          <div className="spacer" />
          <button className="btn brand sm" onClick={() => { setForm({ email: '', name: '', password: '', role: 'dispatcher' }); setModal({ open: true, user: null }); }}>
            <Icon name="Plus" style={{ width: 14 }} />
            הוסף משתמש
          </button>
        </div>
        <div className="panel-b" style={{ padding: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>שם</th>
                <th>אימייל</th>
                <th>הרשאה</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.email}>
                  <td>{u.name}</td>
                  <td style={{ opacity: 0.7 }}>{u.email}</td>
                  <td>
                    <span className={cn("tag sm", u.role === 'admin' ? 'purple' : 'blue')}>
                      {u.role === 'admin' ? 'מנהל' : 'מוקדן'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button className="btn ghost-brand icon-sm" onClick={() => handleEdit(u)}>
                        <Icon name="Edit" style={{ width: 14 }} />
                      </button>
                      <button className="btn ghost-red icon-sm" onClick={() => handleDelete(u.email)} disabled={u.email === 'admin@mokad.org'}>
                        <Icon name="Trash" style={{ width: 14 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
