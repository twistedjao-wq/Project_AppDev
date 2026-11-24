import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import MagicLink from '../models/MagicLink.js';
import { MAGIC_LINK_MINUTES } from '../config/constants.js';

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

let transporter;
function getTransporter() {
  if (transporter !== undefined) return transporter;
  transporter = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      })
    : null;
  return transporter;
}

// Creates a single-use sign-in link and emails it. Without SMTP settings, the link is printed to the terminal.
export async function sendSignInLink(email, { invited = false } = {}) {
  const token = crypto.randomBytes(32).toString('hex');
  await MagicLink.create({
    email,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + MAGIC_LINK_MINUTES * 60 * 1000),
  });

  const link = `${process.env.CLIENT_URL}/verify?token=${token}`;
  const subject = invited ? 'You are invited to manage FindMate' : 'Your FindMate sign-in link';
  const text = [
    invited ? 'You were invited to manage FindMate as an admin.' : 'Use this link to sign in to FindMate.',
    '',
    link,
    '',
    `The link expires in ${MAGIC_LINK_MINUTES} minutes and can be used once.`,
    'If you did not expect this email, you can ignore it.',
  ].join('\n');

  const mailer = getTransporter();
  if (!mailer) {
    console.log(`[dev] ${subject} for ${email}: ${link}`);
    return;
  }
  await mailer.sendMail({ from: process.env.MAIL_FROM, to: email, subject, text });
}
