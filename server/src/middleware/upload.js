import crypto from 'node:crypto';
import fs from 'node:fs';
import multer from 'multer';
import { UPLOAD_DIR, IMAGE_TYPES, MAX_IMAGE_BYTES } from '../config/constants.js';
import { HttpError } from '../utils/http.js';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  // Random file names so people can't guess other photos or collide with existing files.
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${IMAGE_TYPES[file.mimetype]}`),
});

const fileFilter = (_req, file, cb) => {
  if (!Object.hasOwn(IMAGE_TYPES, file.mimetype)) {
    return cb(new HttpError(400, 'Only JPG, PNG, or WEBP photos are allowed.'));
  }
  cb(null, true);
};

// Expects one file in a form field named "image".
export const uploadPhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
}).single('image');
