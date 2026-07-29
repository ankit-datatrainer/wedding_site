import { Router } from 'express';
import { z } from 'zod';
import { photos, storyMedia } from '../data/seed.js';
import { addSubscriber, listStories } from '../store.js';

const router = Router();

router.get('/stories', async (_req, res, next) => {
  try {
    res.json({ items: await listStories(), media: storyMedia });
  } catch (err) {
    next(err);
  }
});

router.get('/media', (_req, res) => {
  res.json({ photos, storyMedia });
});

const emailSchema = z.object({ email: z.string().email('Enter a valid email address.') });

router.post('/newsletter', async (req, res, next) => {
  try {
    const parsed = emailSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    await addSubscriber(parsed.data.email);
    res.status(201).json({ message: 'You are subscribed. Welcome to EverAfter.' });
  } catch (err) {
    next(err);
  }
});

export default router;
