import mongoose from 'mongoose';

// Stores a hash of each sign-in token, never the token itself.
const magicLinkSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('MagicLink', magicLinkSchema);
