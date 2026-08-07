import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { requireAuth } from '../auth.js';
import { addUserPhoto, removeUserPhoto } from '../store.js';
import { parseBiodataPdf, toMemberDraft } from '../biodata.js';

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

/* ------------------------------------------------------------- biodata -- */

// Held in memory, never written to disk: the PDF is read once, turned into
// form values, and dropped. Storing strangers' family documents on the
// filesystem would be a liability with no upside — the parsed fields are the
// only thing anyone needs.
export const biodataUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxBiodataMb * 1024 * 1024, files: 20 },
  fileFilter(_req, file, cb) {
    const isPdf =
      file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname || '');
    cb(isPdf ? null : new Error('Only PDF biodata files are supported.'), isPdf);
  },
});

/** Turns a multer error into the message the member should actually read. */
export function uploadErrorMessage(err, limitMb) {
  if (err.code === 'LIMIT_FILE_SIZE') return `Each PDF must be under ${limitMb}MB.`;
  if (err.code === 'LIMIT_FILE_COUNT') return 'Please upload at most 20 PDFs at a time.';
  return err.message || 'Could not read that file.';
}

// Deliberately unauthenticated: the registration wizard parses a biodata
// *before* the account exists, so there is no token to present yet. Nothing
// is stored and nothing is returned but the caller's own document, so the
// only risk is CPU burn — capped below.
const parseHits = new Map();
const PARSE_LIMIT = 20;
const PARSE_WINDOW_MS = 10 * 60 * 1000;

function rateLimited(req) {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const hits = (parseHits.get(key) || []).filter((t) => now - t < PARSE_WINDOW_MS);
  hits.push(now);
  parseHits.set(key, hits);
  if (parseHits.size > 5000) parseHits.clear(); // crude bound; this is a single-process cache
  return hits.length > PARSE_LIMIT;
}

router.post('/biodata', (req, res, next) => {
  biodataUpload.single('biodata')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: uploadErrorMessage(err, config.maxBiodataMb) });
    }
    if (!req.file) return res.status(400).json({ error: 'No PDF was received.' });
    if (rateLimited(req)) {
      return res
        .status(429)
        .json({ error: 'Too many biodata uploads. Please try again in a few minutes.' });
    }

    try {
      const { fields, warnings } = await parseBiodataPdf(req.file.buffer);
      const draft = toMemberDraft(fields);
      const filled =
        Object.values(draft).filter((v) => typeof v === 'string' && v).length +
        Object.keys(draft.details).length;

      if (filled === 0) {
        return res.status(422).json({
          error:
            'We could not find any profile details in that PDF. Please check the file or fill the form in manually.',
        });
      }

      res.json({ draft, warnings, filled });
    } catch (parseErr) {
      if (parseErr.status === 422) {
        return res.status(422).json({ error: parseErr.message });
      }
      // A corrupt or password-protected PDF is the member's problem to fix,
      // not a server fault — don't surface it as a 500.
      res.status(400).json({
        error: 'That file could not be read as a PDF. Please try a different export.',
      });
    }
  });
});

/* --------------------------------------------------------------- photos -- */

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
