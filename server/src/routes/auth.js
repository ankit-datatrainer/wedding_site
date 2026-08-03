import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createUser, findUserByEmail, getUserById, updateUserProfile } from '../store.js';
import { publicUser, requireAuth, signToken } from '../auth.js';

const router = Router();

// Mirrors the fields on the Stitch register screen. The full matrimonial
// profile (family, career, horoscope, photos...) is captured afterwards in
// the onboarding wizard via PATCH /me — asking for all of it at account
// creation would make the sign-up form itself the drop-off point.
const registerSchema = z.object({
  profileFor: z.enum(['self', 'son', 'daughter', 'brother', 'sister', 'relative']).default('self'),
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  gender: z.enum(['male', 'female']),
  dob: z.string().min(1, 'Date of birth is required.'),
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const body = parsed.data;

    if (await findUserByEmail(body.email)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user = await createUser({
      email: body.email,
      password_hash: await bcrypt.hash(body.password, 10),
      first_name: body.firstName,
      last_name: body.lastName,
      gender: body.gender,
      dob: body.dob,
      profile_for: body.profileFor,
      plan_id: null,
      role: 'member',
      phone: null,
      photo_url: null,
      photos: [],
      details: {},
    });

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

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
    if (!ok) return res.status(401).json({ error: 'Incorrect email or password.' });

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await getUserById(req.user.sub);
    if (!user) return res.status(404).json({ error: 'Account not found.' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// The full matrimonial profile — everything beyond the basics captured at
// registration. Every field is optional so the onboarding wizard can save
// one step at a time; nothing here blocks account creation.
const detailsSchema = z
  .object({
    heightCm: z.string().max(10),
    weightKg: z.string().max(10),
    maritalStatus: z.enum(['Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce']),
    diet: z.enum(['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan']),
    smoking: z.enum(['No', 'Occasionally', 'Yes']),
    drinking: z.enum(['No', 'Occasionally', 'Yes']),
    disability: z.string().max(200),
    motherTongue: z.string().max(60),
    religion: z.string().max(60),
    community: z.string().max(60),
    gothram: z.string().max(60),
    manglik: z.enum(['Yes', 'No', "Don't Know"]),
    rashi: z.string().max(60),
    nakshatra: z.string().max(60),

    country: z.string().max(60),
    state: z.string().max(60),
    city: z.string().max(60),
    address: z.string().max(300),
    pincode: z.string().max(20),

    highestEducation: z.string().max(120),
    college: z.string().max(150),
    occupation: z.string().max(120),
    employer: z.string().max(150),
    annualIncome: z.string().max(60),

    fatherName: z.string().max(100),
    fatherOccupation: z.string().max(120),
    motherName: z.string().max(100),
    motherOccupation: z.string().max(120),
    siblings: z.string().max(200),
    familyType: z.enum(['Nuclear', 'Joint']),
    familyStatus: z.enum(['Middle Class', 'Upper Middle Class', 'Rich', 'Affluent']),
    familyValues: z.enum(['Traditional', 'Moderate', 'Liberal']),

    aboutMe: z.string().max(2000),
    partnerExpectations: z.string().max(2000),
  })
  .partial();

const updateMeSchema = z.object({
  phone: z.string().max(20).optional(),
  details: detailsSchema.optional(),
});

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    // Unanswered <select>s submit as '' — several `details` fields are
    // enums, so an empty string fails validation and the whole save (every
    // other field the member did fill in) is rejected with it. Treat "not
    // answered" the same as "not sent" here, once, for every caller —
    // multi-step wizards, the edit-profile page, anything future.
    const body = { ...req.body };
    if (body.details && typeof body.details === 'object') {
      body.details = Object.fromEntries(
        Object.entries(body.details).filter(([, v]) => v !== '')
      );
    }

    const parsed = updateMeSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const updated = await updateUserProfile(req.user.sub, parsed.data);
    if (!updated) return res.status(404).json({ error: 'Account not found.' });
    res.json({ user: publicUser(updated) });
  } catch (err) {
    next(err);
  }
});

export default router;
