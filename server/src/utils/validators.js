import mongoose from 'mongoose';
import { CVSU_DOMAIN, STUDENT_NUMBER_PATTERN } from '../config/constants.js';
import { HttpError } from './http.js';

export const normalizeEmail = (value) => String(value ?? '').trim().toLowerCase();

export function requireCvsuEmail(value) {
  const email = normalizeEmail(value);
  const valid = email.endsWith(CVSU_DOMAIN) && email.length > CVSU_DOMAIN.length && !/\s/.test(email);
  if (!valid) throw new HttpError(400, `Use your ${CVSU_DOMAIN} email address.`);
  return email;
}

export function cleanText(value, field, min, max) {
  const text = String(value ?? '').trim();
  if (text.length < min || text.length > max) {
    throw new HttpError(400, `${field} must be between ${min} and ${max} characters.`);
  }
  return text;
}

export function requireOneOf(value, list, field) {
  if (!list.includes(value)) throw new HttpError(400, `${field} is not valid.`);
  return value;
}

export function requireStudentNumber(value) {
  const text = String(value ?? '').trim();
  if (!STUDENT_NUMBER_PATTERN.test(text)) {
    throw new HttpError(400, 'Student number must be 7 to 12 digits.');
  }
  return text;
}

export function parseOptionalDate(value, field) {
  if (value === undefined || value === null || value === '') return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date > new Date()) {
    throw new HttpError(400, `${field} must be a valid date that is not in the future.`);
  }
  return date;
}

export function assertObjectId(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(404, 'Not found.');
  return id;
}

export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
