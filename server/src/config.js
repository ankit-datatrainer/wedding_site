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
};
