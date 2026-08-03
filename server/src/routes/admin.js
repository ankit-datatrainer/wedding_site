import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import {
  adminListProfiles,
  createProfile,
  deleteProfile,
  deleteSubscriber,
  deleteUser,
  findUserByEmail,
  getAdminStats,
  getUserById,
  listActivity,
  listAllUsers,
  listOrders,
  listSubscribers,
  listUsers,
  updateProfile,
} from '../store.js';
import { publicUser, requireAdmin, requireAuth, signToken } from '../auth.js';

const router = Router();

// Deliberately separate from POST /api/auth/login: a member's password check
// must never be reused to establish an admin session, even accidentally.
const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

router.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }

    const user = await findUserByEmail(parsed.data.email);
    const ok = user && (await bcrypt.compare(parsed.data.password, user.password_hash));
    if (!ok || user.role !== 'admin') {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.use(requireAuth, requireAdmin);

router.get('/me', async (req, res, next) => {
  try {
    const user = await getUserById(req.user.sub);
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get('/members', async (req, res, next) => {
  try {
    const { page, pageSize, search } = req.query;
    const result = await listUsers({ page, pageSize, search });
    res.json({ ...result, items: result.items.map(publicUser) });
  } catch (err) {
    next(err);
  }
});

router.get('/members/:id', async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user || user.role === 'admin') return res.status(404).json({ error: 'Member not found.' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.delete('/members/:id', async (req, res, next) => {
  try {
    const target = await getUserById(req.params.id);
    if (!target || target.role === 'admin') {
      return res.status(404).json({ error: 'Member not found.' });
    }
    await deleteUser(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------- overview ---

router.get('/stats', async (_req, res, next) => {
  try {
    res.json(await getAdminStats());
  } catch (err) {
    next(err);
  }
});

router.get('/activity', async (req, res, next) => {
  try {
    res.json({ items: await listActivity(Number(req.query.limit) || 20) });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------- directory profile CRUD ---

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  age: z.coerce.number().int().min(18, 'Age must be 18 or over.').max(100),
  gender: z.enum(['male', 'female']),
  profession: z.string().optional().default(''),
  location: z.string().optional().default(''),
  education: z.string().optional().default(''),
  education_level: z.enum(['Bachelors', 'Masters', 'Doctorate']).optional(),
  religion: z.string().optional().default(''),
  community: z.string().optional().default(''),
  marital_status: z.enum(['Never Married', 'Divorced', 'Widowed']).optional(),
  verified: z.coerce.boolean().optional(),
  height_cm: z.coerce.number().int().min(120).max(230).optional(),
  mother_tongue: z.string().optional().default(''),
  diet: z.enum(['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan']).optional(),
  photo: z.string().url('Photo must be a valid URL.').or(z.literal('')).optional(),
  about: z.string().max(2000).optional().default(''),
});

router.get('/profiles', async (req, res, next) => {
  try {
    res.json(await adminListProfiles(req.query));
  } catch (err) {
    next(err);
  }
});

router.post('/profiles', async (req, res, next) => {
  try {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const body = parsed.data;
    // `city` powers the location filter on /browse; derive it so admin-created
    // rows behave the same as the seeded ones.
    const created = await createProfile({ ...body, city: (body.location || '').split(',')[0].trim() });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.patch('/profiles/:id', async (req, res, next) => {
  try {
    const parsed = profileSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const patch = { ...parsed.data };
    if (patch.location !== undefined) patch.city = patch.location.split(',')[0].trim();
    const updated = await updateProfile(req.params.id, patch);
    if (!updated) return res.status(404).json({ error: 'Profile not found.' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/profiles/:id', async (req, res, next) => {
  try {
    const ok = await deleteProfile(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Profile not found.' });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------- payments & newsletter ---

router.get('/orders', async (req, res, next) => {
  try {
    res.json(await listOrders(req.query));
  } catch (err) {
    next(err);
  }
});

router.get('/subscribers', async (_req, res, next) => {
  try {
    res.json({ items: await listSubscribers() });
  } catch (err) {
    next(err);
  }
});

router.delete('/subscribers/:email', async (req, res, next) => {
  try {
    await deleteSubscriber(decodeURIComponent(req.params.email));
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

const CSV_COLUMNS = [
  ['id', (u) => u.id],
  ['first_name', (u) => u.first_name],
  ['last_name', (u) => u.last_name],
  ['email', (u) => u.email],
  ['phone', (u) => u.phone],
  ['gender', (u) => u.gender],
  ['dob', (u) => u.dob],
  ['profile_for', (u) => u.profile_for],
  ['plan_id', (u) => u.plan_id],
  ['height_cm', (u) => u.details?.heightCm],
  ['weight_kg', (u) => u.details?.weightKg],
  ['marital_status', (u) => u.details?.maritalStatus],
  ['diet', (u) => u.details?.diet],
  ['smoking', (u) => u.details?.smoking],
  ['drinking', (u) => u.details?.drinking],
  ['mother_tongue', (u) => u.details?.motherTongue],
  ['religion', (u) => u.details?.religion],
  ['community', (u) => u.details?.community],
  ['gothram', (u) => u.details?.gothram],
  ['manglik', (u) => u.details?.manglik],
  ['rashi', (u) => u.details?.rashi],
  ['nakshatra', (u) => u.details?.nakshatra],
  ['country', (u) => u.details?.country],
  ['state', (u) => u.details?.state],
  ['city', (u) => u.details?.city],
  ['address', (u) => u.details?.address],
  ['pincode', (u) => u.details?.pincode],
  ['highest_education', (u) => u.details?.highestEducation],
  ['college', (u) => u.details?.college],
  ['occupation', (u) => u.details?.occupation],
  ['employer', (u) => u.details?.employer],
  ['annual_income', (u) => u.details?.annualIncome],
  ['father_name', (u) => u.details?.fatherName],
  ['father_occupation', (u) => u.details?.fatherOccupation],
  ['mother_name', (u) => u.details?.motherName],
  ['mother_occupation', (u) => u.details?.motherOccupation],
  ['siblings', (u) => u.details?.siblings],
  ['family_type', (u) => u.details?.familyType],
  ['family_status', (u) => u.details?.familyStatus],
  ['family_values', (u) => u.details?.familyValues],
  ['about_me', (u) => u.details?.aboutMe],
  ['partner_expectations', (u) => u.details?.partnerExpectations],
  ['photo_url', (u) => u.photo_url],
  ['photo_count', (u) => (u.photos || []).length],
  ['created_at', (u) => u.created_at],
];

function csvCell(value) {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

router.get('/export.csv', async (_req, res, next) => {
  try {
    const users = await listAllUsers();
    const header = CSV_COLUMNS.map(([name]) => name).join(',');
    const rows = users.map((u) => CSV_COLUMNS.map(([, get]) => csvCell(get(u))).join(','));
    const csv = [header, ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="everafter-members-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    // Excel needs a BOM to render UTF-8 (names, etc.) correctly.
    res.send('﻿' + csv);
  } catch (err) {
    next(err);
  }
});

export default router;
