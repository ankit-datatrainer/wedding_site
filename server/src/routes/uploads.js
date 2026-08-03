import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { requireAuth } from '../auth.js';
import { addUserPhoto, removeUserPhoto } from '../store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolved once and reused: both the writer (here) and the static server
// (index.js) need the exact same absolute path.
export const uploadsRoot = path.resolve(__dirname, '../../', config.uploadsDir);
fs.mkdirSync(uploadsRoot, { recursive: true });

const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const dir = path.join(uploadsRoot, req.user.sub);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ext = ALLOWED.get(file.mimetype) || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadMb * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG or WebP photos are allowed.'));
    }
    cb(null, true);
  },
});

const router = Router();

router.post('/photo', requireAuth, (req, res, next) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? `Photo must be under ${config.maxUploadMb}MB.`
          : err.message || 'Could not upload that photo.';
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: 'No photo was received.' });

    try {
      const url = `/uploads/${req.user.sub}/${req.file.filename}`;
      const user = await addUserPhoto(req.user.sub, url);
      res.status(201).json({ url, photos: user.photos, photo_url: user.photo_url });
    } catch (storeErr) {
      next(storeErr);
    }
  });
});

router.delete('/photo', requireAuth, async (req, res, next) => {
  try {
    const url = String(req.body?.url || '');
    if (!url.startsWith(`/uploads/${req.user.sub}/`)) {
      return res.status(400).json({ error: 'Invalid photo reference.' });
    }

    const user = await removeUserPhoto(req.user.sub, url);
    if (!user) return res.status(404).json({ error: 'Account not found.' });

    const filePath = path.join(uploadsRoot, url.replace('/uploads/', ''));
    fs.unlink(filePath, () => {}); // best-effort; a missing file is not an error here

    res.json({ photos: user.photos, photo_url: user.photo_url });
  } catch (err) {
    next(err);
  }
});

export default router;
