import { useState, useEffect } from 'react';
import { Icon, FormattedText } from '../components/Icons';
import { useNow, fmtDate } from '../hooks/useClock';
import { MokadData, RosterMember } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface RoutineScreenProps {
  data: MokadData;
  onOpenEmergency: () => void;
}

function RosterUpdateModal({ person, onClose, onSave }: { person: RosterMember, onClose: () => void, onSave: (p: RosterMember) => void }) {
  const [isOut, setIsOut] = useState(!!person.isOutOfSector);
  const [replacement, setReplacement] = useState(person.replacement || '');
  const [reason, setReason] = useState(person.reason || '');
  const [returnTime, setReturnTime] = useState(person.returnTime || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/replacements').then(r => r.json()).then(setSuggestions);
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/roster/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: person.id, 
          is_out_of_sector: isOut, 
          replacement,
          reason,
          return_time: returnTime,
          state: isOut ? 'out' : person.state === 'out' ? 'field' : person.state
        }),
      });
      if (res.ok) {
        onSave({ 
          ...person, 
          isOutOfSector: isOut, 
          replacement, 
          reason, 
          returnTime,
          state: isOut ? 'out' : (person.state === 'out' ? 'field' : person.state) 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scrim" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal sm" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="h">
          <Icon name="User" />
          <h3>עדכון סטטוס: {person.name}</h3>
        </div>
        <div className="b" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: 'var(--bg-2)', padding: '12px', borderRadius: 8 }}>
            <input type="checkbox" checked={isOut} onChange={e => setIsOut(e.target.checked)} />
            <span style={{ fontWeight: 600 }}>מחוץ לגזרה</span>
          </label>

          {isOut && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="input-group">
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--ink-3)' }}>סיבת יציאה</label>
                <input 
                  type="text" 
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="לדוגמה: חופשה, השתלמות..."
                  style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border-1)', color: 'white' }}
                />
              </div>
              
              <div className="input-group">
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--ink-3)' }}>שם מחליף</label>
                <input 
                  type="text" 
                  value={replacement}
                  onChange={e => setReplacement(e.target.value)}
                  placeholder="הקלד שם..."
                  list="replacement-suggestions"
                  style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border-1)', color: 'white' }}
                />
                <datalist id="replacement-suggestions">
                  {suggestions.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>

              <div className="input-group">
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--ink-3)' }}>זמן חזרה משוער</label>
                <input 
                  type="text" 
                  value={returnTime}
                  onChange={e => setReturnTime(e.target.value)}
                  placeholder="לדוגמה: 17:30"
                  style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'var(--bg-2)', border: '1px solid var(--border-1)', color: 'white' }}
                />
              </div>
            </motion.div>
          )}
        </div>
        <div className="f">
          <button className="btn brand" onClick={handleSave} disabled={loading}>{loading ? 'שומר...' : 'שמור עדכון'}</button>
          <button className="btn ghost" onClick={onClose}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

export function RoutineScreen({ data, onOpenEmergency }: RoutineScreenProps) {
  const r = data.routine;
  const now = useNow();
  const [tab, setTab] = useState<'in' | 'out'>('in');
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [editingPerson, setEditingPerson] = useState<RosterMember | null>(null);

  const fetchRoster = () => {
    fetch('/api/roster').then(res => res.json()).then(data => {
      const mapped = data.map((item: any) => ({
        ...item,
        out: item.out_time,
        returnTime: item.return_time,
        isOutOfSector: !!item.is_out_of_sector
      }));
      setRoster(mapped);
      if (mapped.some((p: any) => p.isOutOfSector) && roster.length === 0) {
        setTab('out');
      }
    });
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  const inSector = roster.filter(p => !p.isOutOfSector);
  const outOfSector = roster.filter(p => p.isOutOfSector);

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
              <div className="lbl">אירועים פתוחים</div>
              <div className="num">{r.metrics.open}</div>
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
              <div className="lbl">זמן תגובה ממוצע</div>
              <div className="num">{r.metrics.avgResponse}</div>
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
            <div className="spacer" />
            <button className="btn sm"><Icon name="Plus" /> חדש</button>
          </div>
          <div className="panel-b" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr><th>שעה</th><th>סוג</th><th>מיקום</th><th>סטטוס</th></tr>
              </thead>
              <tbody>
                {r.incidents.map((inc) => (
                  <tr key={inc.id}>
                    <td className="mono" style={{ color: 'var(--ink-3)' }}>{inc.t}</td>
                    <td>{inc.type}</td>
                    <td style={{ color: 'var(--ink-2)' }}>{inc.loc}</td>
                    <td><span className={cn("tag", inc.sev)}>{inc.status}</span></td>
                  </tr>
                ))}
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
        style={{ minHeight: 0 }}
      >
        <div className="panel-h">
          <h3>זרם עדכונים</h3>
          <div className="spacer" />
          <button className="btn sm icon"><Icon name="Search" /></button>
        </div>
        <div className="panel-b" style={{ padding: 0 }}>
          <div className="feed">
            {r.feed.map((it, i) => (
              <div className="item" key={i}>
                <div className="t mono">{it.t}</div>
                <div className="body">
                  <FormattedText text={it.text} />
                  <span className="src">— {it.src}</span>
                </div>
              </div>
            ))}
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
          <div className="panel-h" style={{ borderBottom: '1px solid var(--border-1)', padding: '10px 15px' }}>
            <h3>בעלי תפקידים</h3>
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
                {(tab === 'in' ? inSector : outOfSector).map((person, i) => (
                  <div className={cn("r", person.isOutOfSector && "out-row")} key={i} onClick={() => setEditingPerson(person)} style={{ cursor: 'pointer' }}>
                    <div className="av" style={person.isOutOfSector ? { background: 'var(--red)', color: 'white' } : {}}>
                      {person.name.split(' ').map((s) => s[0]).join('')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="name">
                        {person.name}
                        {person.isOutOfSector && <span className="tag sm red" style={{ marginRight: 8 }}>מחוץ לגזרה</span>}
                      </div>
                      <div className="meta">
                        {person.role} · {person.isOutOfSector ? (person.reason || 'יציאה מהגזרה') : person.task}
                      </div>
                      {person.isOutOfSector && (
                        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                          {person.replacement && (
                            <div className="replacement-info" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--brand)', fontSize: 12, fontWeight: 500 }}>
                              <Icon name="User" style={{ width: 12, height: 12 }} />
                              <span>חליפי: {person.replacement}</span>
                            </div>
                          )}
                          {person.returnTime && (
                            <div className="return-info" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-3)', fontSize: 12 }}>
                              <Icon name="Clock" style={{ width: 12, height: 12 }} />
                              <span>חזרה: {person.returnTime}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                      <span className={cn("st", person.state)}>
                        {person.state === 'field' ? 'בשטח' : 
                         person.state === 'brief' ? 'תדריך' : 
                         person.state === 'return' ? 'בחזרה' : 'לא זמין'}
                      </span>
                      <span className="meta">מ- {person.out || person.out_time}</span>
                    </div>
                  </div>
                ))}
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
              <button className="btn"><Icon name="Plus" /> דיווח חדש</button>
              <button className="btn"><Icon name="Doc" /> דוח שגרה</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
