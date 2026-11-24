import { Router } from 'express';
import Item from '../models/Item.js';
import ClaimRequest from '../models/ClaimRequest.js';
import { optionalAuth, requireAuth, requireCompleteProfile } from '../middleware/auth.js';
import { uploadPhoto } from '../middleware/upload.js';
import { deleteItemPermanently, removeUploadedPhoto } from '../services/items.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import * as v from '../utils/validators.js';
import { serializeItem } from '../utils/serializers.js';
import { CATEGORIES, ITEM_STATUSES, ITEM_TYPES, LOCATIONS, MANUAL_STATUSES } from '../config/constants.js';

const router = Router();
const REPORTER_FIELDS = 'name studentNumber email';
const EDITABLE_LOCKED = ['Claim Pending', 'Returned', 'Archived'];

async function loadItemOr404(id) {
  v.assertObjectId(id);
  const item = await Item.findById(id).populate('reportedBy', REPORTER_FIELDS).lean();
  if (!item) throw new HttpError(404, 'Item not found.');
  return item;
}

const reporterIdOf = (item) => String(item.reportedBy?._id ?? '');

// List items. Guests and students see active items only. Admins can include archived items.
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const viewerId = req.user ? String(req.user._id) : null;
    const { q, category, type, location, status } = req.query;
    const filter = {};

    if (status) {
      v.requireOneOf(status, ITEM_STATUSES, 'Status');
      if (status === 'Archived' && !isAdmin) throw new HttpError(403, 'Admins only.');
      filter.status = status;
    } else if (!(isAdmin && req.query.includeArchived === 'true')) {
      filter.status = { $ne: 'Archived' };
    }

    if (category) filter.category = v.requireOneOf(category, CATEGORIES, 'Category');
    if (type) filter.type = v.requireOneOf(type, ITEM_TYPES, 'Type');
    if (location) filter.location = v.requireOneOf(location, LOCATIONS, 'Location');
    if (q && String(q).trim()) {
      const pattern = new RegExp(v.escapeRegex(String(q).trim().slice(0, 100)), 'i');
      filter.$or = [{ title: pattern }, { description: pattern }];
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));

    const [items, total] = await Promise.all([
      Item.find(filter)
        .sort({ dateReported: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('reportedBy', REPORTER_FIELDS)
        .lean(),
      Item.countDocuments(filter),
    ]);

    res.json({
      items: items.map((item) => serializeItem(item, { reporterVisible: isAdmin, viewerId })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  })
);

// One item. Includes the reporter's details only for admins, the reporter, or an approved claimant.
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const item = await loadItemOr404(req.params.id);
    const isAdmin = req.user?.role === 'admin';
    const viewerId = req.user ? String(req.user._id) : null;

    if (item.status === 'Archived' && !isAdmin) throw new HttpError(404, 'Item not found.');

    let reporterVisible = isAdmin || reporterIdOf(item) === viewerId;
    let myClaim = null;

    if (req.user) {
      const claim = await ClaimRequest.findOne({ item: item._id, claimant: req.user._id })
        .sort({ createdAt: -1 })
        .lean();
      if (claim) {
        myClaim = { id: String(claim._id), status: claim.status, createdAt: claim.createdAt };
        if (claim.status === 'approved') reporterVisible = true;
      }
    }

    res.json({ item: serializeItem(item, { reporterVisible, viewerId }), myClaim });
  })
);

// Report a lost or found item. Requires a photo.
router.post(
  '/',
  requireAuth,
  requireCompleteProfile,
  uploadPhoto,
  asyncHandler(async (req, res) => {
    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;
    try {
      if (!req.file) throw new HttpError(400, 'A photo of the item is required.');

      const body = req.body;
      const location = v.requireOneOf(body.location, LOCATIONS, 'Location');
      const locationDetail =
        location === 'Other' ? v.cleanText(body.locationDetail, 'Location details', 3, 200) : '';

      const item = await Item.create({
        title: v.cleanText(body.title, 'Title', 3, 120),
        description: v.cleanText(body.description, 'Description', 10, 1000),
        category: v.requireOneOf(body.category, CATEGORIES, 'Category'),
        type: v.requireOneOf(body.type, ITEM_TYPES, 'Type'),
        location,
        locationDetail,
        dateOccurred: v.parseOptionalDate(body.dateOccurred, 'Date found or lost'),
        image: photoPath,
        reportedBy: req.user._id,
      });

      const created = await Item.findById(item._id).populate('reportedBy', REPORTER_FIELDS).lean();
      res.status(201).json({
        item: serializeItem(created, { reporterVisible: true, viewerId: String(req.user._id) }),
      });
    } catch (err) {
      await removeUploadedPhoto(photoPath); // don't keep a photo for a report that failed
      throw err;
    }
  })
);

// Edit a report. Owners can edit while it is Open. Admins can edit anytime and set status.
router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const existing = await loadItemOr404(req.params.id);
    const isAdmin = req.user.role === 'admin';
    const isOwner = reporterIdOf(existing) === String(req.user._id);

    if (!isAdmin && !isOwner) throw new HttpError(403, 'You can only edit your own reports.');
    if (!isAdmin && EDITABLE_LOCKED.includes(existing.status)) {
      throw new HttpError(403, 'This item can no longer be edited.');
    }

    const body = req.body;
    const updates = {};

    if (body.title !== undefined) updates.title = v.cleanText(body.title, 'Title', 3, 120);
    if (body.description !== undefined) updates.description = v.cleanText(body.description, 'Description', 10, 1000);
    if (body.category !== undefined) updates.category = v.requireOneOf(body.category, CATEGORIES, 'Category');
    if (body.location !== undefined) updates.location = v.requireOneOf(body.location, LOCATIONS, 'Location');
    if (body.dateOccurred !== undefined) {
      updates.dateOccurred = v.parseOptionalDate(body.dateOccurred, 'Date found or lost') ?? null;
    }

    const finalLocation = updates.location ?? existing.location;
    if (body.location !== undefined || body.locationDetail !== undefined) {
      updates.locationDetail =
        finalLocation === 'Other'
          ? v.cleanText(body.locationDetail ?? existing.locationDetail, 'Location details', 3, 200)
          : '';
    }

    if (body.status !== undefined) {
      if (!isAdmin) throw new HttpError(403, 'Only admins can change the status.');
      if (!MANUAL_STATUSES.includes(body.status)) {
        throw new HttpError(400, 'Claim Pending and Returned are set through the claim process.');
      }
      updates.status = body.status;
      updates.archivedAt = body.status === 'Archived' ? new Date() : null;
    }

    if (Object.keys(updates).length === 0) throw new HttpError(400, 'Nothing to update.');

    const item = await Item.findByIdAndUpdate(existing._id, updates, { new: true, runValidators: true })
      .populate('reportedBy', REPORTER_FIELDS)
      .lean();

    res.json({ item: serializeItem(item, { reporterVisible: isAdmin, viewerId: String(req.user._id) }) });
  })
);

// Delete a report. Owners can delete only while it is Open. Admins can delete anytime. Every deletion is logged.
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const item = await loadItemOr404(req.params.id);
    const isAdmin = req.user.role === 'admin';
    const isOwner = reporterIdOf(item) === String(req.user._id);

    if (!isAdmin && !isOwner) throw new HttpError(403, 'You can only delete your own reports.');
    if (!isAdmin && item.status !== 'Open') {
      throw new HttpError(403, 'Only open reports can be deleted. Ask an admin for help.');
    }

    await deleteItemPermanently(item, {
      by: req.user,
      reason: isOwner ? 'owner_deleted' : 'admin_deleted',
    });
    res.json({ message: 'Item deleted.' });
  })
);

export default router;
