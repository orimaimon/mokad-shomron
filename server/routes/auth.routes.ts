import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { JWT_SECRET } from '../config.js';
import { validateBody } from '../middlewares/validate.js';
import { LoginSchema, LoginBody, DBUser } from '../types.js';

const router = Router();

router.post('/login', validateBody(LoginSchema), (req, res) => {
  const { email, password } = req.body as LoginBody;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as DBUser | undefined;

  if (!user || !user.password || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
  }

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { name: user.name, role: user.role, email: user.email } });
});

export default router;
