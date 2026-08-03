import jwt from 'jsonwebtoken';
import { config } from './config.js';

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role || 'member' },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/** Populates req.user when a valid token is present; never rejects. */
export function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      req.user = jwt.verify(token, config.jwtSecret);
    } catch {
      /* ignore an expired or malformed token */
    }
  }
  next();
}

/** Rejects the request unless a valid token is present. */
export function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

/** Rejects unless the token belongs to an admin. Run requireAuth first. */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

export const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  first_name: u.first_name,
  last_name: u.last_name,
  gender: u.gender,
  dob: u.dob,
  profile_for: u.profile_for,
  plan_id: u.plan_id ?? null,
  role: u.role || 'member',
  phone: u.phone ?? null,
  photo_url: u.photo_url ?? null,
  photos: u.photos ?? [],
  details: u.details ?? {},
  created_at: u.created_at,
});
