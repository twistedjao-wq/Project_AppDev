import Item from '../models/Item.js';
import { deleteItemPermanently } from '../services/items.js';
import { PURGE_AFTER_DAYS, STALE_AFTER_DAYS } from '../config/constants.js';

const DAY_MS = 24 * 60 * 60 * 1000;

// 1. Open reports older than the limit are archived (hidden from browsing).
// 2. Items archived longer than the purge limit are permanently deleted and logged.
export async function runStaleItemJobs() {
  const now = Date.now();

  const archived = await Item.updateMany(
    { status: 'Open', dateReported: { $lt: new Date(now - STALE_AFTER_DAYS * DAY_MS) } },
    { $set: { status: 'Archived', archivedAt: new Date(now) } }
  );

  const expired = await Item.find({
    status: 'Archived',
    archivedAt: { $lt: new Date(now - PURGE_AFTER_DAYS * DAY_MS) },
  });
  for (const item of expired) {
    await deleteItemPermanently(item, { reason: 'auto_purged' });
  }

  return { archived: archived.modifiedCount, purged: expired.length };
}
