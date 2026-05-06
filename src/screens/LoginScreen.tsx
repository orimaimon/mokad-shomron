import { useState } from 'react';
import { Icon } from '../components/Icons';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface LoginScreenProps {
  onLogin: (token: string, user: any) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('admin@mokad.org');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      onLogin(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ 
      height: '100vh', 
      display: 'grid', 
      placeItems: 'center', 
      background: 'var(--bg-2)',
      direction: 'rtl'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="login-card"
        style={{
          width: '100%',
          maxWidth: 400,
          background: 'var(--bg-1)',
          padding: 32,
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          border: '1px solid var(--border-1)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ 
            width: 64, height: 64, background: 'var(--brand)', borderRadius: 16, 
            display: 'grid', placeItems: 'center', margin: '0 auto 16px',
            boxShadow: '0 8px 16px rgba(11,108,126,0.3)'
          }}>
            <Icon name="Shield" lg style={{ color: 'white' }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink-1)' }}>מוקד שומרון</h1>
          <p style={{ color: 'var(--ink-3)', marginTop: 8 }}>מערכת שו"ב v2.5 · כניסת מורשים</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="input-group">
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: 'var(--ink-2)' }}>דוא"ל</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 8,
                background: 'var(--bg-2)',
                border: '1px solid var(--border-1)',
                color: 'var(--ink-1)',
                outline: 'none'
              }}
              required
            />
          </div>

          <div className="input-group">
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: 'var(--ink-2)' }}>סיסמה</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 8,
                background: 'var(--bg-2)',
                border: '1px solid var(--border-1)',
                color: 'var(--ink-1)',
                outline: 'none'
              }}
              required
            />
          </div>

          {error && (
            <div style={{ color: 'var(--red)', fontSize: 13, background: 'rgba(255, 107, 107, 0.1)', padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(255, 107, 107, 0.2)' }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className={cn("btn brand", loading && "loading")}
            style={{ 
              width: '100%', 
              padding: 14, 
              fontSize: 16, 
              fontWeight: 600,
              marginTop: 12
            }}
          >
            {loading ? 'מתחבר...' : 'כניסה למערכת'}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--ink-4)' }}>
          © 2024 מועצה אזורית שומרון · מחלקת ביטחון
        </div>
      </motion.div>
    </div>
  );
}
