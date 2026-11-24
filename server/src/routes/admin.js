import { Router } from 'express';
import ClaimRequest from '../models/ClaimRequest.js';
import DeletionLog from '../models/DeletionLog.js';
import Item from '../models/Item.js';
import User from '../models/User.js';
import { requireAuth, requireAdmin, requireSuperAdmin } from '../middleware/auth.js';
import { sendSignInLink } from '../services/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import * as v from '../utils/validators.js';
import { serializeClaim, serializeItem } from '../utils/serializers.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// Counts and recent activity for the admin dashboard.
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const active = { status: { $ne: 'Archived' } };
    const [totalItems, lostItems, foundItems, pendingClaims, returnedItems, registeredUsers, recentItems, recentClaims] =
      await Promise.all([
        Item.countDocuments(active),
        Item.countDocuments({ ...active, type: 'lost' }),
        Item.countDocuments({ ...active, type: 'found' }),
        ClaimRequest.countDocuments({ status: 'pending' }),
        Item.countDocuments({ status: 'Returned' }),
        User.countDocuments({ role: 'student' }),
        Item.find().sort({ createdAt: -1 }).limit(5).populate('reportedBy', 'name studentNumber email').lean(),
        ClaimRequest.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('item', 'title type status image location')
          .populate('claimant', 'name studentNumber email')
          .lean(),
      ]);

    res.json({
      stats: { totalItems, lostItems, foundItems, pendingClaims, returnedItems, registeredUsers },
      recentItems: recentItems.map((item) =>
        serializeItem(item, { reporterVisible: true, viewerId: String(req.user._id) })
      ),
      recentClaims: recentClaims.map((claim) => serializeClaim(claim, { includeClaimant: true })),
    });
  })
);

// Log of deleted items (newest first).
router.get(
  '/deletion-logs',
  asyncHandler(async (_req, res) => {
    const logs = await DeletionLog.find().sort({ deletedAt: -1 }).limit(200).lean();
    res.json({
      logs: logs.map((log) => ({
        id: String(log._id),
        itemTitle: log.itemTitle,
        itemType: log.itemType,
        itemStatus: log.itemStatus,
        deletedByEmail: log.deletedByEmail,
        deletedByRole: log.deletedByRole,
        reason: log.reason,
        deletedAt: log.deletedAt,
      })),
    });
  })
);

// Only the main admin can invite other admins. The invitee gets a sign-in link by email.
router.post(
  '/invites',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const email = v.requireCvsuEmail(req.body.email);

    let user = await User.findOne({ email });
    if (user?.role === 'admin') throw new HttpError(409, 'That person is already an admin.');
    if (!user) user = new User({ email });

    user.role = 'admin';
    await user.save();
    await sendSignInLink(email, { invited: true });

    res.status(201).json({ message: `Invitation sent to ${email}.` });
  })
);

export default router;
