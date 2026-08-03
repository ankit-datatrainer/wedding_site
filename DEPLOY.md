# Deploying to wedding.peculiex.com

Target: Ubuntu VPS (`srv1800305`), Nginx + PM2.
The box already runs `interviewaceai` under PM2 — this app uses ports **3100**
(web) and **4100** (API) so nothing collides.

---

## 1. DNS records

Add these at whoever hosts DNS for `peculiex.com` (Hostinger / Cloudflare / etc).

Get the server's public IPv4 first:

```bash
curl -4 ifconfig.me
```

| Type | Name / Host | Value | TTL | Proxy |
| --- | --- | --- | --- | --- |
| `A` | `wedding` | *(that IPv4)* | 3600 | DNS only |

That is the only record required. Notes:

- **Name is `wedding`, not the full domain.** Most panels append `.peculiex.com`
  automatically. If yours wants the whole thing, use `wedding.peculiex.com`.
- Add an `AAAA` record with the same host **only** if the VPS has a public IPv6
  (`curl -6 ifconfig.me`). A broken AAAA record breaks the site for IPv6 clients
  even when the A record is fine.
- No `CNAME`, and no `www` record — this is already a subdomain.
- **On Cloudflare, set the cloud to grey (DNS only) until Certbot has issued the
  certificate.** Orange-proxied records make the HTTP-01 challenge fail.

Confirm it resolves before continuing — this can take a few minutes:

```bash
dig +short wedding.peculiex.com
```

Do not move to Certbot (step 7) until that prints your server's IP.

---

## 2. Push the repo (run on your Windows machine)

The repo is committed locally and the remote is already set. Just:

```bash
git push -u origin main
```

If GitHub rejects the push because the repo already has a README:

```bash
git pull --rebase origin main
git push -u origin main
```

---

## 3. Server prerequisites

SSH in, then check what's already there:

```bash
node -v && npm -v && nginx -v && pm2 -v
```

Node must be **18 or newer** (Next.js 15 requires it). If it's older or missing:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

If Nginx is missing:

```bash
sudo apt update && sudo apt install -y nginx
```

---

## 4. Clone and install

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www

git clone https://github.com/ankit-datatrainer/wedding_site.git wedding
cd wedding

npm --prefix server install --omit=dev
npm --prefix web install
```

`web` needs its dev dependencies — TypeScript and Tailwind run during the build.

---

## 5. Environment files

**API** — `server/.env`:

```bash
cat > /var/www/wedding/server/.env <<'EOF'
PORT=4100
WEB_ORIGIN=https://wedding.peculiex.com
JWT_SECRET=PASTE_A_LONG_RANDOM_STRING_HERE

SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

ADMIN_EMAIL=admin@everafter.com
ADMIN_PASSWORD=PASTE_A_STRONG_PASSWORD_HERE

UPLOADS_DIR=uploads
EOF
```

Generate real values for both placeholders:

```bash
openssl rand -hex 32          # JWT_SECRET
openssl rand -base64 18       # ADMIN_PASSWORD
```

**Write the admin password down before restarting the API** — it's only ever
shown to you once, here. It's re-synced from `ADMIN_PASSWORD` on every boot,
so if you lose it, set a new value and restart.

Leave the Supabase and Razorpay lines as `your_...` for now — the app runs on
seeded in-memory data and simulated payments until you fill them in. **It will
deploy and work without them.**

**Web** — `web/.env.production`:

```bash
cat > /var/www/wedding/web/.env.production <<'EOF'
NEXT_PUBLIC_API_URL=https://wedding.peculiex.com
INTERNAL_API_URL=http://127.0.0.1:4100
EOF
```

`NEXT_PUBLIC_API_URL` is compiled into the browser bundle, so it must be set
**before** the build in the next step.

---

## 6. Build and start

**Order matters here.** Several pages are prerendered at build time and fetch
the API while building, so the API must already be running or the build dies
with `ECONNREFUSED` on `/membership`. Start the API *first*:

```bash
cd /var/www/wedding

# 1. API first — the build depends on it
pm2 start ecosystem.config.js --only wedding-api

# 2. verify it answers before building
curl -s http://127.0.0.1:4100/api/health

# 3. now build the frontend
npm --prefix web run build

# 4. and start it
pm2 start ecosystem.config.js --only wedding-web

pm2 save
pm2 startup     # run the command it prints, so PM2 survives reboot
```

Step 2 must print `{"ok":true,...}` before you continue.

Check both are up alongside your existing app:

```bash
pm2 list
curl -s http://127.0.0.1:4100/api/health
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3100/
```

You want `{"ok":true,...}` and `200`.

---

## 7. Nginx + HTTPS

```bash
sudo cp /var/www/wedding/deploy/nginx.conf \
        /etc/nginx/sites-available/wedding.peculiex.com
sudo ln -sf /etc/nginx/sites-available/wedding.peculiex.com \
            /etc/nginx/sites-enabled/wedding.peculiex.com

sudo nginx -t && sudo systemctl reload nginx
```

`nginx -t` must pass before you reload. Then the certificate:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d wedding.peculiex.com
```

Choose **redirect HTTP to HTTPS** when asked. Certbot edits the site file in
place and sets up auto-renewal.

Open **[https://wedding.peculiex.com](https://wedding.peculiex.com)**.

The admin panel is at
**[https://wedding.peculiex.com/admin/login](https://wedding.peculiex.com/admin/login)**
— sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` set in step 5.

---

## 8. Firewall

If UFW is active (`sudo ufw status`):

```bash
sudo ufw allow 'Nginx Full'
```

Ports 3100 and 4100 must **not** be opened publicly — Nginx reaches them over
localhost. Leave them closed.

---

## Redeploying after a change

```bash
cd /var/www/wedding
git pull
npm --prefix server install --omit=dev
npm --prefix web install

pm2 restart wedding-api          # API up first, the build needs it
npm --prefix web run build
pm2 restart wedding-web
```

Two things that bite here:

- **Always rebuild `web` after pulling.** Next.js serves from `.next/`, so a
  restart alone ships the old bundle.
- **Never stop the API before building.** Same prerender dependency as the
  first deploy — the build will fail with `ECONNREFUSED`.
- **If `deploy/nginx.conf` changed** (it did, to add the `/uploads/` location
  for member photos), copy it over and reload Nginx too.

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/wedding.peculiex.com
sudo nginx -t && sudo systemctl reload nginx
```

---

## Backing up member photos

Uploaded photos live on local disk at `server/uploads/`, outside Supabase and
outside this repo (it's gitignored — real user data, not source). Nothing here
backs it up automatically. Include it in whatever backup routine covers the
rest of the box, e.g.:

```bash
tar -czf /root/backups/uploads-$(date +%F).tar.gz -C /var/www/wedding/server uploads
```

---

## Going live with real data and payments

Both switch on by editing `server/.env` and restarting the API — no code change.

**Supabase:** run `server/supabase/schema.sql` in the SQL editor, put the real
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` in `server/.env`, then:

```bash
npm --prefix server run seed
pm2 restart wedding-api
```

**Razorpay:** add `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` (test keys first),
then `pm2 restart wedding-api`. Add `https://wedding.peculiex.com` to the
authorised domains in the Razorpay dashboard.

Confirm which mode is live at any time:

```bash
curl -s https://wedding.peculiex.com/api/health
```

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `502 Bad Gateway` | Node process down | `pm2 list`, then `pm2 logs wedding-web --lines 50` |
| Site loads, no profiles | API down or CORS | `curl 127.0.0.1:4100/api/health`; check `WEB_ORIGIN` matches the URL exactly |
| Certbot fails | DNS not propagated, or Cloudflare proxy on | `dig +short wedding.peculiex.com`; set the record to DNS-only |
| Port already in use | Clash with `interviewaceai` | `sudo ss -ltnp \| grep -E '3100\|4100'` |
| Images broken | Remote host not allowed | `web/next.config.mjs` → `images.remotePatterns` |
| Old version after deploy | Forgot the rebuild | `npm --prefix web run build && pm2 restart wedding-web` |

Logs: `pm2 logs wedding-web`, `pm2 logs wedding-api`,
`sudo tail -f /var/log/nginx/error.log`.
