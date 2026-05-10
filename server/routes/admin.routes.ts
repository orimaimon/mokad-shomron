import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { requireAdmin } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { UserSchema, UserBody, DBUser } from '../types.js';

const router = Router();

// Secure all endpoints under /api/admin
router.use(requireAdmin);

router.get('/users', (req, res) => {
  const users = db.prepare('SELECT email, name, role FROM users').all();
  res.json(users);
});

router.post('/users', validateBody(UserSchema), (req, res) => {
  const { email, password, name, role } = req.body as UserBody;
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as DBUser | undefined;

  if (existing) {
    if (password) {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare('UPDATE users SET name = ?, role = ?, password = ? WHERE email = ?').run(name, role, hash, email);
    } else {
      db.prepare('UPDATE users SET name = ?, role = ? WHERE email = ?').run(name, role, email);
    }
  } else {
    if (!password) return res.status(400).json({ error: 'Password required for new user' });
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(email, hash, name, role);
  }
  res.json({ success: true });
});

router.delete('/users/:email', (req, res) => {
  const { email } = req.params;
  if (email === 'admin@mokad.org') return res.status(400).json({ error: 'Cannot delete primary admin' });
  db.prepare('DELETE FROM users WHERE email = ?').run(email);
  res.json({ success: true });
});

export default router;
