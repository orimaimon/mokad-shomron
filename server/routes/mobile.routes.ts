import { Router } from 'express';
import { requireAdmin } from '../middlewares/auth.js';

const router = Router();

interface OTPEntry { code: string; expiresAt: number }
const otpStore = new Map<string, OTPEntry>();
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generate(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/mobile/request-otp — field user requests a code (no auth)
router.post('/request-otp', (_req, res) => {
  const code = generate();
  otpStore.set('current', { code, expiresAt: Date.now() + OTP_TTL_MS });
  console.log(`\n[OTP] *** קוד כניסה ניידת: ${code} (תקף 10 דקות) ***\n`);
  res.json({ success: true });
});

// POST /api/mobile/verify-otp — field user submits the code
router.post('/verify-otp', (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code) return res.status(400).json({ error: 'קוד חסר' });

  const entry = otpStore.get('current');
  if (!entry || Date.now() > entry.expiresAt) {
    return res.status(401).json({ error: 'קוד פג תוקף — בקש קוד חדש מהמוקדן' });
  }
  if (entry.code !== code) {
    return res.status(401).json({ error: 'קוד שגוי' });
  }

  otpStore.delete('current'); // one-time use
  res.json({ success: true });
});

// GET /api/mobile/otp — admin only: view current pending OTP
router.get('/otp', requireAdmin, (_req, res) => {
  const entry = otpStore.get('current');
  if (!entry || Date.now() > entry.expiresAt) {
    return res.json({ code: null, expiresAt: null });
  }
  res.json({ code: entry.code, expiresAt: entry.expiresAt });
});

export default router;
