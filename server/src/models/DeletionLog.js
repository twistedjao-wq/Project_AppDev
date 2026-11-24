import mongoose from 'mongoose';

// Kept after an item is deleted so admins can see what was removed and by whom.
const deletionLogSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
  itemTitle: { type: String, required: true },
  itemType: { type: String, required: true },
  itemStatus: { type: String, required: true },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  deletedByEmail: { type: String, required: true },
  deletedByRole: { type: String, enum: ['student', 'admin', 'system'], required: true },
  reason: { type: String, enum: ['owner_deleted', 'admin_deleted', 'auto_purged'], required: true },
  deletedAt: { type: Date, default: Date.now },
});

export default mongoose.model('DeletionLog', deletionLogSchema);
