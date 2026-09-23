import 'dotenv/config';

const bool = (v) => Boolean(v && String(v).trim() && !String(v).startsWith('your_'));

export const config = {
  port: Number(process.env.PORT || 4000),
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'everafter-dev-secret-change-me',

  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    get enabled() {
      return bool(process.env.SUPABASE_URL) && bool(process.env.SUPABASE_SERVICE_ROLE_KEY);
    },
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    get enabled() {
      return bool(process.env.RAZORPAY_KEY_ID) && bool(process.env.RAZORPAY_KEY_SECRET);
    },
  },

  // The super-admin account is seeded on boot (see store.js#ensureAdminSeeded)
  // rather than created through the UI — there is no public sign-up path to
  // an admin role. Falls back to a fixed dev password so the panel is usable
  // immediately; ADMIN_PASSWORD should always be overridden in production.
  admin: {
    email: (bool(process.env.ADMIN_EMAIL) ? process.env.ADMIN_EMAIL : 'admin@everafter.com').toLowerCase(),
    password: bool(process.env.ADMIN_PASSWORD) ? process.env.ADMIN_PASSWORD : 'ChangeMe123!',
    isDefaultPassword: !bool(process.env.ADMIN_PASSWORD),
  },

  // Outgoing mail (parent confirmation emails). Leave SMTP_HOST unset in
  // development and messages are printed to the console instead.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'EverAfter <no-reply@everafter.com>',
    get enabled() {
      return bool(process.env.SMTP_HOST);
    },
  },

  uploadsDir: process.env.UPLOADS_DIR || 'uploads',
  maxUploadMb: 5,
  // Biodata PDFs run larger than photos — they often embed scans — and are
  // parsed in memory rather than stored.
  maxBiodataMb: 10,
};
