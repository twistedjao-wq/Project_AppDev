import { Router } from 'express';
import MagicLink from '../models/MagicLink.js';
import User from '../models/User.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { hashToken, sendSignInLink } from '../services/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { cleanText, requireCvsuEmail, requireStudentNumber } from '../utils/validators.js';
import { publicUser } from '../utils/serializers.js';

const router = Router();

// Step 1: student enters their CvSU email and gets a sign-in link.
router.post(
  '/request-link',
  asyncHandler(async (req, res) => {
    const email = requireCvsuEmail(req.body.email);
    await sendSignInLink(email);
    res.json({ message: 'If this is a CvSU email, a sign-in link has been sent.' });
  })
);

// Step 2: the link's token is exchanged for a login token.
router.post(
  '/verify',
  asyncHandler(async (req, res) => {
    const token = String(req.body.token ?? '');
    if (!token) throw new HttpError(400, 'The sign-in link is missing its token.');

    const link = await MagicLink.findOneAndUpdate(
      { tokenHash: hashToken(token), used: false, expiresAt: { $gt: new Date() } },
      { used: true }
    );
    if (!link) throw new HttpError(401, 'This sign-in link is invalid or has expired. Request a new one.');

    let user = await User.findOne({ email: link.email });
    if (!user) user = new User({ email: link.email });
    user.lastLoginAt = new Date();
    await user.save();

    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// Students fill in their name and student number once after first login.
router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.body.name !== undefined) {
      req.user.name = cleanText(req.body.name, 'Name', 2, 100);
    }
    if (req.body.studentNumber !== undefined) {
      req.user.studentNumber = requireStudentNumber(req.body.studentNumber);
    }

    try {
      await req.user.save();
    } catch (err) {
      if (err.code === 11000) {
        throw new HttpError(409, 'That student number is already linked to another account.');
      }
      throw err;
    }
    res.json({ user: publicUser(req.user) });
  })
);

export default router;
