import mongoose from 'mongoose';
import { CLAIM_STATUSES } from '../config/constants.js';

const claimRequestSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true, index: true },
    claimant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    proofDescription: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    status: { type: String, enum: CLAIM_STATUSES, default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('ClaimRequest', claimRequestSchema);
