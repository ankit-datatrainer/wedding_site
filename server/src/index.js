import bcrypt from 'bcryptjs';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { optionalAuth } from './auth.js';
import { ensureAdminSeeded, usingSupabase } from './store.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import profileRoutes, { interestsRouter, matchesRouter, shortlistRouter } from './routes/profiles.js';
import paymentRoutes from './routes/payments.js';
import contentRoutes from './routes/content.js';
import uploadRoutes, { uploadsRoot } from './routes/uploads.js';

const app = express();

app.use(cors({ origin: [config.webOrigin, 'http://127.0.0.1:3000'], credentials: true }));
app.use(express.json());
app.use(optionalAuth);
app.use('/uploads', express.static(uploadsRoot));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'everafter-api',
    database: usingSupabase ? 'supabase' : 'in-memory (no Supabase keys set)',
    payments: config.razorpay.enabled ? 'razorpay (live keys)' : 'simulated (no Razorpay keys set)',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/shortlist', shortlistRouter);
app.use('/api/interests', interestsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/payments', paymentRoutes);
app.use('/api', contentRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
app.use((err, _req, res, _next) => {
  console.error('[api]', err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong.' });
});

async function start() {
  // Seeded before the server accepts traffic so /api/admin/login always has
  // an account to check against, even on a cold in-memory boot.
  try {
    await ensureAdminSeeded({
      email: config.admin.email,
      passwordHash: await bcrypt.hash(config.admin.password, 10),
    });
  } catch (err) {
    // The overwhelmingly common cause is Supabase credentials pointing at a
    // database where schema.sql was never applied. Say so plainly instead of
    // dying on a PostgREST stack trace that means nothing to the reader.
    const missingSchema = /schema cache|does not exist|relation .* does not exist/i.test(
      err?.message || ''
    );
    console.error('\n[api] FATAL: could not seed the super-admin account.');
    console.error(`[api] ${err?.message || err}`);
    if (missingSchema && usingSupabase) {
      console.error(
        '\n[api] The Supabase project has no tables yet. Open the Supabase SQL editor\n' +
          '[api] and run server/supabase/schema.sql, then start the API again.\n'
      );
    }
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`[api] EverAfter API listening on http://localhost:${config.port}`);
    console.log(`[api] database: ${usingSupabase ? 'Supabase' : 'in-memory seed data'}`);
    console.log(`[api] payments: ${config.razorpay.enabled ? 'Razorpay live keys' : 'simulated'}`);
    console.log(`[api] admin login: ${config.admin.email}`);
    if (config.admin.isDefaultPassword) {
      console.log(
        '[api] WARNING: ADMIN_PASSWORD is not set — using the default dev password. ' +
          'Set ADMIN_EMAIL / ADMIN_PASSWORD in .env before deploying.'
      );
    }
  });
}

start();
