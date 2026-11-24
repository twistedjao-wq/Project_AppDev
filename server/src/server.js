import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { runStaleItemJobs } from './jobs/staleItems.js';

const PORT = process.env.PORT || 5000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function start() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is missing. Add it to server/.env.');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  const runJobs = () =>
    runStaleItemJobs()
      .then((result) => console.log('Stale item job:', result))
      .catch((err) => console.error('Stale item job failed:', err.message));
  runJobs();
  setInterval(runJobs, ONE_DAY_MS);

  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
