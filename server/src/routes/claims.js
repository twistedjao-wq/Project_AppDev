import { Router } from 'express';
import ClaimRequest from '../models/ClaimRequest.js';
import Item from '../models/Item.js';
import { requireAdmin, requireAuth, requireCompleteProfile } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import * as v from '../utils/validators.js';
import { serializeClaim } from '../utils/serializers.js';
import { CLAIM_STATUSES } from '../config/constants.js';

const router = Router();
const CLAIMANT_FIELDS = 'name studentNumber email';
const ITEM_FIELDS = 'title type status image location';

// Student claims a found item and describes proof of ownership.
router.post(
  '/items/:id/claims',
  requireAuth,
  requireCompleteProfile,
  asyncHandler(async (req, res) => {
    v.assertObjectId(req.params.id);
    const item = await Item.findById(req.params.id);
    if (!item) throw new HttpError(404, 'Item not found.');

    if (item.type !== 'found') throw new HttpError(400, 'Only found items can be claimed.');
    if (!['Open', 'Claim Pending'].includes(item.status)) {
      throw new HttpError(409, 'This item is not open for claims.');
    }
    if (String(item.reportedBy) === String(req.user._id)) {
      throw new HttpError(400, 'You cannot claim an item you reported.');
    }

    const proofDescription = v.cleanText(req.body.proofDescription, 'Proof of ownership', 10, 1000);

    const alreadyClaimed = await ClaimRequest.exists({
      item: item._id,
      claimant: req.user._id,
      status: 'pending',
    });
    if (alreadyClaimed) throw new HttpError(409, 'You already have a pending claim on this item.');

    const claim = await ClaimRequest.create({
      item: item._id,
      claimant: req.user._id,
      proofDescription,
    });

    if (item.status === 'Open') {
      item.status = 'Claim Pending';
      await item.save();
    }

    // Other students who already claimed this item, so the new claimant can settle it with them in person.
    const others = await ClaimRequest.find({
      item: item._id,
      status: 'pending',
      claimant: { $ne: req.user._id },
    })
      .populate('claimant', 'name studentNumber')
      .sort({ createdAt: 1 })
      .lean();

    res.status(201).json({
      claim: serializeClaim(claim),
      otherClaimants: others.map((c) => ({
        name: c.claimant?.name ?? '',
        studentNumber: c.claimant?.studentNumber ?? '',
        submittedAt: c.createdAt,
      })),
      message: others.length
        ? 'Another student has also claimed this item. Please coordinate with each other at the claim location.'
        : 'Your claim was submitted.',
    });
  })
);

// Student: their own claims.
router.get(
  '/claims/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const claims = await ClaimRequest.find({ claimant: req.user._id })
      .populate('item', ITEM_FIELDS)
      .sort({ createdAt: -1 })
      .lean();
    res.json({ claims: claims.map((c) => serializeClaim(c)) });
  })
);

// Admin: all claims, optionally filtered by status.
router.get(
  '/claims',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = v.requireOneOf(req.query.status, CLAIM_STATUSES, 'Status');

    const claims = await ClaimRequest.find(filter)
      .populate('item', ITEM_FIELDS)
      .populate('claimant', CLAIMANT_FIELDS)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json({ claims: claims.map((c) => serializeClaim(c, { includeClaimant: true })) });
  })
);

// One claim: its claimant or an admin.
router.get(
  '/claims/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    v.assertObjectId(req.params.id);
    const claim = await ClaimRequest.findById(req.params.id)
      .populate('item', ITEM_FIELDS)
      .populate('claimant', CLAIMANT_FIELDS)
      .lean();
    if (!claim) throw new HttpError(404, 'Claim not found.');

    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && String(claim.claimant?._id) !== String(req.user._id)) {
      throw new HttpError(403, 'You can only view your own claims.');
    }
    res.json({ claim: serializeClaim(claim, { includeClaimant: isAdmin }) });
  })
);

// Admin approves or rejects a claim.
// Approve: item becomes Returned, other pending claims are rejected.
// Reject: item goes back to Open if no other claims are pending.
router.patch(
  '/claims/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    v.assertObjectId(req.params.id);
    const decision = v.requireOneOf(req.body.status, ['approved', 'rejected'], 'Decision');

    const claim = await ClaimRequest.findById(req.params.id);
    if (!claim) throw new HttpError(404, 'Claim not found.');
    if (claim.status !== 'pending') throw new HttpError(409, 'This claim has already been reviewed.');

    const item = await Item.findById(claim.item);
    if (!item) throw new HttpError(404, 'The item for this claim no longer exists.');

    const now = new Date();
    claim.status = decision;
    claim.reviewedBy = req.user._id;
    claim.reviewedAt = now;
    await claim.save();

    if (decision === 'approved') {
      await ClaimRequest.updateMany(
        { item: item._id, status: 'pending', _id: { $ne: claim._id } },
        { status: 'rejected', reviewedBy: req.user._id, reviewedAt: now }
      );
      item.status = 'Returned';
    } else {
      const stillPending = await ClaimRequest.exists({ item: item._id, status: 'pending' });
      if (!stillPending && item.status === 'Claim Pending') item.status = 'Open';
    }
    await item.save();

    res.json({ claim: serializeClaim(claim), itemStatus: item.status });
  })
);

export default router;
