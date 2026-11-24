// Run once to create the main admin:  npm run seed:admin -- yourname@cvsu.edu.ph
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const email = (process.argv[2] || process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();

if (!email.endsWith('@cvsu.edu.ph')) {
  console.error('Usage: npm run seed:admin -- yourname@cvsu.edu.ph');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is missing. Add it to server/.env first.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
const user = await User.findOneAndUpdate(
  { email },
  { $set: { role: 'admin', isSuperAdmin: true } },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);
console.log(`Main admin ready: ${user.email}. Sign in with this email to start.`);
await mongoose.disconnect();
