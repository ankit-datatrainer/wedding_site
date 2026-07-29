// PM2 process definitions for wedding.peculiex.com
//
// Ports are deliberately 3100/4100 rather than the usual 3000/4000, because
// the VPS already runs `interviewaceai` under PM2 and 3000 is the common
// default. Nothing here should collide with it.
//
// Usage from the repo root on the server:
//   pm2 start ecosystem.config.js
//   pm2 save

module.exports = {
  apps: [
    {
      name: 'wedding-api',
      cwd: './server',
      script: 'src/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 4100,
        WEB_ORIGIN: 'https://wedding.peculiex.com',
      },
    },
    {
      name: 'wedding-web',
      cwd: './web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3100',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
        PORT: 3100,
        // Server-side fetches stay on the box instead of going out through Nginx.
        INTERNAL_API_URL: 'http://127.0.0.1:4100',
      },
    },
  ],
};
