import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { optionalAuth } from './auth.js';
import { usingSupabase } from './store.js';
import authRoutes from './routes/auth.js';
import profileRoutes, { shortlistRouter } from './routes/profiles.js';
import paymentRoutes from './routes/payments.js';
import contentRoutes from './routes/content.js';

const app = express();

app.use(cors({ origin: [config.webOrigin, 'http://127.0.0.1:3000'], credentials: true }));
app.use(express.json());
app.use(optionalAuth);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'everafter-api',
    database: usingSupabase ? 'supabase' : 'in-memory (no Supabase keys set)',
    payments: config.razorpay.enabled ? 'razorpay (live keys)' : 'simulated (no Razorpay keys set)',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/shortlist', shortlistRouter);
app.use('/api/payments', paymentRoutes);
app.use('/api', contentRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
app.use((err, _req, res, _next) => {
  console.error('[api]', err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong.' });
});

app.listen(config.port, () => {
  console.log(`[api] EverAfter API listening on http://localhost:${config.port}`);
  console.log(`[api] database: ${usingSupabase ? 'Supabase' : 'in-memory seed data'}`);
  console.log(`[api] payments: ${config.razorpay.enabled ? 'Razorpay live keys' : 'simulated'}`);
});
