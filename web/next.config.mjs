/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Dummy portrait photos for the seeded profiles — see server/src/data/seed.js.
      { protocol: 'https', hostname: 'randomuser.me' },
    ],
  },
};

export default nextConfig;
