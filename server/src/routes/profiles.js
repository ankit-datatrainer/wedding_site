import { Router } from 'express';
import { expressInterest, getProfile, listProfiles, listShortlist, toggleShortlist } from '../store.js';
import { requireAuth } from '../auth.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    res.json(await listProfiles(req.query));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const profile = await getProfile(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/shortlist', requireAuth, async (req, res, next) => {
  try {
    res.json(await toggleShortlist(req.user.sub, req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/interest', requireAuth, async (req, res, next) => {
  try {
    res.json(await expressInterest(req.user.sub, req.params.id));
  } catch (err) {
    next(err);
  }
});

export default router;

export const shortlistRouter = Router().get('/', requireAuth, async (req, res, next) => {
  try {
    res.json({ items: await listShortlist(req.user.sub) });
  } catch (err) {
    next(err);
  }
});
