import { Icon, FormattedText } from '../components/Icons';
import { useNow, fmtDate } from '../hooks/useClock';
import { MokadData } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface RoutineScreenProps {
  data: MokadData;
  onOpenEmergency: () => void;
}

export function RoutineScreen({ data, onOpenEmergency }: RoutineScreenProps) {
  const r = data.routine;
  const now = useNow();

  return (
    <div style={{ height: '100%', padding: 10, display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr', gap: 10, minHeight: 0 }}>
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
                {r.metrics.online}
                <span style={{ fontSize: 14, color: 'var(--ink-3)' }}> / {r.metrics.total}</span>
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
          style={{ flex: 1, minHeight: 0 }}
        >
          <div className="panel-h">
            <h3>בעלי תפקידים בשטח</h3>
            <div className="spacer" />
            <span className="tag green">{r.metrics.online} פעילים</span>
          </div>
          <div className="panel-b" style={{ padding: 0 }}>
            <div className="roster">
              {r.roster.map((person, i) => (
                <div className="r" key={i}>
                  <div className="av">{person.name.split(' ').map((s) => s[0]).join('')}</div>
                  <div>
                    <div className="name">{person.name}</div>
                    <div className="meta">{person.role} · {person.task}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
                    <span className={cn("st", person.state)}>
                      {person.state === 'field' ? 'בשטח' : person.state === 'brief' ? 'תדריך' : 'בחזרה'}
                    </span>
                    <span className="meta">יצא {person.out}</span>
                  </div>
                </div>
              ))}
            </div>
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
