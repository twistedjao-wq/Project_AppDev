import mongoose from 'mongoose';
import { ROLES } from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/@cvsu\.edu\.ph$/, 'Use your @cvsu.edu.ph email address.'],
    },
    name: { type: String, trim: true, maxlength: 100, default: '' },
    studentNumber: { type: String, trim: true, default: '' },
    role: { type: String, enum: ROLES, default: 'student' },
    isSuperAdmin: { type: Boolean, default: false },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

// One account per student number (ignores blank values).
userSchema.index(
  { studentNumber: 1 },
  { unique: true, partialFilterExpression: { studentNumber: { $gt: '' } } }
);

export default mongoose.model('User', userSchema);
