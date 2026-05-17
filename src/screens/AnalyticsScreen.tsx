import { useState, useEffect } from 'react';
import { Icon } from '../components/Icons';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface KPI {
  totalIncidents: number;
  openIncidents: number;
  outOfSector: number;
  activeEmergencies: number;
}

interface Trend {
  date: string;
  count: number;
}

interface Distribution {
  name: string;
  value: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899'];
const SEV_COLORS: Record<string, string> = { 'green': '#10b981', 'amber': '#f59e0b', 'red': '#ef4444' };
const SEV_LABELS: Record<string, string> = { 'green': 'נמוכה', 'amber': 'בינונית', 'red': 'גבוהה' };

export function AnalyticsScreen() {
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [types, setTypes] = useState<Distribution[]>([]);
  const [severity, setSeverity] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics/kpi').then(r => r.json()),
      fetch('/api/analytics/trends').then(r => r.json()),
      fetch('/api/analytics/distribution').then(r => r.json())
    ])
      .then(([k, t, d]) => {
        setKpi(k);
        // Format dates for trends
        setTrends(t.map((item: Trend) => ({
          ...item,
          shortDate: item.date.slice(5).replace('-', '/'),
        })));
        setTypes(d.types);
        setSeverity(d.severity);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="Loader" className="spin" style={{ color: 'var(--ink-4)', width: 32, height: 32 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel" style={{ flex: 1, padding: 24, color: 'var(--red)' }}>
        שגיאה בטעינת נתונים: {error}
      </div>
    );
  }

  return (
    <div className="analytics-grid" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflow: 'auto', padding: 16 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 8, borderBottom: '1px solid var(--border-1)' }}>
        <Icon name="BarChart2" style={{ color: 'var(--brand)', width: 24, height: 24 }} />
        <h2 style={{ fontSize: 20, margin: 0 }}>סטטיסטיקות ומגמות (30 ימים אחרונים)</h2>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-3)' }}>
            <span>אירועי שגרה</span>
            <Icon name="Activity" style={{ width: 18 }} />
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{kpi?.totalIncidents}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>נפתחו ב-30 הימים האחרונים</div>
        </div>

        <div className="panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--amber)' }}>
            <span>אירועים פתוחים כרגע</span>
            <Icon name="AlertCircle" style={{ width: 18 }} />
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--amber)' }}>{kpi?.openIncidents}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>ממתינים לטיפול / בטיפול</div>
        </div>

        <div className="panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--red)' }}>
            <span>אירועי חירום פעילים</span>
            <Icon name="Siren" style={{ width: 18 }} />
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: kpi?.activeEmergencies ? 'var(--red)' : 'var(--ink-1)' }}>{kpi?.activeEmergencies}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>אירועים רב-נפגעים פתוחים</div>
        </div>

        <div className="panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-3)' }}>
            <span>מחוץ לגזרה (כ"א)</span>
            <Icon name="UserMinus" style={{ width: 18 }} />
          </div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{kpi?.outOfSector}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-4)' }}>מתוך רשימת בעלי התפקידים</div>
        </div>
      </div>

      {/* Main Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, flex: 1, minHeight: 400 }}>
        
        {/* Trend Line Chart */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', padding: 20 }}>
          <h3 style={{ marginBottom: 20, color: 'var(--ink-2)' }}>מגמת אירועים לאורך זמן</h3>
          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-1)" vertical={false} />
                <XAxis dataKey="shortDate" stroke="var(--ink-4)" fontSize={12} tickMargin={10} />
                <YAxis stroke="var(--ink-4)" fontSize={12} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--border-1)', borderRadius: 8, color: 'var(--ink-1)' }}
                  itemStyle={{ color: 'var(--brand)' }}
                  labelStyle={{ fontWeight: 'bold', marginBottom: 5 }}
                />
                <Line type="monotone" dataKey="count" name="אירועים" stroke="var(--brand)" strokeWidth={3} dot={{ r: 4, fill: 'var(--brand)' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20 }}>
            <h3 style={{ marginBottom: 10, color: 'var(--ink-2)' }}>פילוג לפי חומרה</h3>
            <div style={{ flex: 1, width: '100%', minHeight: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severity}
                    cx="50%" cy="50%"
                    innerRadius={40} outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {severity.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SEV_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [value as number, SEV_LABELS[name as string] || (name as string)]}
                    contentStyle={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--border-1)', borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontSize: 12 }}>
              {severity.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: SEV_COLORS[s.name] || '#ccc' }} />
                  <span>{SEV_LABELS[s.name] || s.name} ({s.value})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20 }}>
            <h3 style={{ marginBottom: 10, color: 'var(--ink-2)' }}>טופ 10 סוגי אירועים</h3>
            <div style={{ flex: 1, width: '100%', minHeight: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={types} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-1)" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} stroke="var(--ink-3)" fontSize={11} tick={{ fill: 'var(--ink-3)' }} />
                  <Tooltip 
                    cursor={{ fill: 'var(--bg-2)' }}
                    contentStyle={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--border-1)', borderRadius: 8 }}
                    formatter={(value) => [value as number, 'כמות']}
                  />
                  <Bar dataKey="value" fill="var(--brand)" radius={[0, 4, 4, 0]}>
                    {types.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
