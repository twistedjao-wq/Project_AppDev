import { fileURLToPath } from 'node:url';

export const UPLOAD_DIR = fileURLToPath(new URL('../../uploads', import.meta.url));

export const CVSU_DOMAIN = '@cvsu.edu.ph';
export const ROLES = ['student', 'admin'];
export const ITEM_TYPES = ['lost', 'found'];
export const ITEM_STATUSES = ['Open', 'Claim Pending', 'Returned', 'Archived'];
// Statuses an admin can set by hand. "Claim Pending" and "Returned" come from the claim process.
export const MANUAL_STATUSES = ['Open', 'Returned', 'Archived'];
export const CLAIM_STATUSES = ['pending', 'approved', 'rejected'];

export const CATEGORIES = [
  'Electronics',
  'Bags',
  'IDs and Cards',
  'Keys',
  'Wallets',
  'Clothing',
  'Water Bottles',
  'Books and Notebooks',
  'Others',
];

export const LOCATIONS = [
  'Gate 1',
  'Gate 2',
  'Gate 3',
  'CAS',
  'CEIT (Main / Engineering Building)',
  'Engineering Science (ES) Building',
  'DIET Building',
  'DIT / ITC Building',
  'CEd',
  'CEMDS',
  'CAFENR',
  'CON',
  'CCJ',
  'CSPEAR',
  'CVMBS / CAPS',
  'Administration Building',
  'Student Union Building (OSAS)',
  'Ladislao Diwa Memorial Library and Museum',
  'International Convention Center (ICON)',
  'Santiago M. Rolle Hall',
  'University Mall',
  'Hostel Tropicana',
  'Coffee Processing Center',
  'Security Office',
  'Other',
];

export const IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const MAGIC_LINK_MINUTES = 15;
export const STALE_AFTER_DAYS = 90;
export const PURGE_AFTER_DAYS = 30;

export const STUDENT_NUMBER_PATTERN = /^\d{7,12}$/;
