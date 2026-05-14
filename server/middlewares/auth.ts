import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import { JWTPayload } from '../types.js';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing token' });
  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET) as JWTPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Accepts token from Authorization header OR ?t= query param (for use with <img src> / <video src>)
export const requireAuthQuery = (req: Request, res: Response, next: NextFunction) => {
  const token = (req.query.t as string) || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send('Unauthorized');
  try {
    req.user = jwt.verify(token, JWT_SECRET) as JWTPayload;
    next();
  } catch {
    res.status(401).send('Unauthorized');
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing token' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
