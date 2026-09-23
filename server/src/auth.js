import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { getRole, getUserById } from './store.js';
import { PERMISSION_KEYS } from './permissions.js';

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

export const isPanelRole = (role) => role === 'admin' || role === 'staff';

/**
 * Admin-panel guard. Run requireAuth first. Re-reads the account on every
 * request (rather than trusting the token) so a suspended account or a
 * changed role takes effect immediately, not when the 7-day token expires.
 * Populates req.panel = { user, isSuper, permissions: Set, role }.
 */
export async function requirePanel(req, res, next) {
  try {
    if (!isPanelRole(req.user?.role)) {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    const user = await getUserById(req.user.sub);
    if (!user || !isPanelRole(user.role)) {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    if (user.details?.suspended) {
      return res.status(403).json({ error: 'This team account has been suspended. Contact the super admin.' });
    }
    const isSuper = user.role === 'admin';
    const role = isSuper ? null : await getRole(user.admin_role_id);
    const permissions = new Set(isSuper ? PERMISSION_KEYS : role?.permissions || []);
    req.panel = { user, isSuper, permissions, role };
    next();
  } catch (err) {
    next(err);
  }
}

/** Allows the request only if the panel user holds every listed permission. */
export const can = (...perms) => (req, res, next) => {
  if (perms.every((p) => req.panel?.permissions.has(p))) return next();
  res.status(403).json({ error: "Your role doesn't have permission to do that. Ask the super admin for access." });
};

/** Allows the request if the panel user holds any of the listed permissions. */
export const canAny = (...perms) => (req, res, next) => {
  if (perms.some((p) => req.panel?.permissions.has(p))) return next();
  res.status(403).json({ error: "Your role doesn't have permission to do that. Ask the super admin for access." });
};

/** Super admin only — managing roles and the team is never delegable. */
export function superOnly(req, res, next) {
  if (req.panel?.isSuper) return next();
  res.status(403).json({ error: 'Only the super admin can manage roles and team accounts.' });
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
  admin_role_id: u.admin_role_id ?? null,
  phone: u.phone ?? null,
  photo_url: u.photo_url ?? null,
  photos: u.photos ?? [],
  details: u.details ?? {},
  created_at: u.created_at,
});
