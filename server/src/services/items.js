import fs from 'node:fs/promises';
import path from 'node:path';
import { UPLOAD_DIR } from '../config/constants.js';
import ClaimRequest from '../models/ClaimRequest.js';
import DeletionLog from '../models/DeletionLog.js';
import Item from '../models/Item.js';

export async function removeUploadedPhoto(imagePath) {
  if (!imagePath || !imagePath.startsWith('/uploads/')) return;
  try {
    await fs.unlink(path.join(UPLOAD_DIR, path.basename(imagePath)));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Could not remove photo:', err.message);
  }
}

// Logs the deletion, then removes the item, its claims, and its photo.
export async function deleteItemPermanently(item, { by = null, reason }) {
  await DeletionLog.create({
    itemId: item._id,
    itemTitle: item.title,
    itemType: item.type,
    itemStatus: item.status,
    deletedBy: by?._id ?? null,
    deletedByEmail: by?.email ?? 'system',
    deletedByRole: by?.role ?? 'system',
    reason,
  });
  await ClaimRequest.deleteMany({ item: item._id });
  await Item.deleteOne({ _id: item._id });
  await removeUploadedPhoto(item.image);
}
