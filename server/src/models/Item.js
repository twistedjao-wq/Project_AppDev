import mongoose from 'mongoose';
import { CATEGORIES, ITEM_TYPES, ITEM_STATUSES, LOCATIONS } from '../config/constants.js';

const itemSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required.'], trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    category: { type: String, enum: CATEGORIES, required: true },
    type: { type: String, enum: ITEM_TYPES, required: true },
    location: { type: String, enum: LOCATIONS, required: true },
    locationDetail: { type: String, trim: true, maxlength: 200, default: '' },
    dateOccurred: Date, // optional: when the item was found or lost
    dateReported: { type: Date, default: Date.now, immutable: true },
    image: { type: String, required: true },
    status: { type: String, enum: ITEM_STATUSES, default: 'Open' },
    archivedAt: Date,
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

itemSchema.index({ status: 1, type: 1, category: 1, location: 1 });
itemSchema.index({ status: 1, dateReported: -1 });

export default mongoose.model('Item', itemSchema);
