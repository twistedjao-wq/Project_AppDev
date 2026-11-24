import cors from 'cors';
import express from 'express';
import { UPLOAD_DIR } from './config/constants.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import claimRoutes from './routes/claims.js';
import itemRoutes from './routes/items.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json({ limit: '100kb' }));
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api', claimRoutes);
app.use('/api/admin', adminRoutes);

app.use('/api', notFound);
app.use(errorHandler);

export default app;
