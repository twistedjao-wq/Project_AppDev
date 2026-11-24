import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { HttpError, asyncHandler } from '../utils/http.js';

export function signToken(user) {
  return jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function userFromRequest(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;

  let payload;
  try {
    payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return null; // expired or tampered token
  }
  return User.findById(payload.sub);
}

// Attaches req.user when a valid token is sent, but lets guests through.
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  req.user = await userFromRequest(req);
  next();
});

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const user = await userFromRequest(req);
  if (!user) throw new HttpError(401, 'Please log in to continue.');
  req.user = user;
  next();
});

export const requireAdmin = (req, _res, next) =>
  req.user?.role === 'admin' ? next() : next(new HttpError(403, 'Admins only.'));

export const requireSuperAdmin = (req, _res, next) =>
  req.user?.isSuperAdmin ? next() : next(new HttpError(403, 'Only the main admin can do this.'));

export const requireCompleteProfile = (req, _res, next) =>
  req.user?.name && req.user?.studentNumber
    ? next()
    : next(new HttpError(403, 'Add your name and student number in your profile first.'));
