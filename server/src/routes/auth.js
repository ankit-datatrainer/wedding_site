import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createUser, findUserByEmail, getUserById, updateUserProfile } from '../store.js';
import { publicUser, requireAuth, signToken } from '../auth.js';
import { sendParentNotificationEmail } from '../email.js';

const router = Router();

// Registration schema: identity, login, and a reference are required.
// Everything else in `details` is optional and can be completed later.
const registerSchema = z.object({
  profileFor: z.enum(['self', 'son', 'daughter', 'brother', 'sister', 'relative']).default('self'),
  firstName: z.string().default('Member'),
  lastName: z.string().default(''),
  gender: z.enum(['male', 'female']).default('male'),
  dob: z.string().default('1998-01-01'),
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  phone: z.string().optional().nullable(),
  details: z.record(z.any()).optional().default({}),
  fatherEmail: z.string().optional().nullable(),
  motherEmail: z.string().optional().nullable(),
  // Whether the member said "yes, send my parent a confirmation". Defaults
  // to yes when an email is present, matching the wizard's default.
  notifyFather: z.boolean().optional().default(true),
  notifyMother: z.boolean().optional().default(true),
});

const PHONE_DIGITS = /\d/g;

/**
 * Every registration must carry a reference — a person who can vouch for
 * the member. Returns an error message, or null when it's complete.
 */
function referenceProblem(details) {
  const name = String(details.referenceName || '').trim();
  const phone = String(details.referencePhone || '').trim();
  const relation = String(details.referredBy || '').trim();
  if (name.length < 2) return "Please enter your reference person's name.";
  if ((phone.match(PHONE_DIGITS) || []).length < 10) return "Please enter your reference's phone number (at least 10 digits).";
  if (!relation) return 'Please tell us how you know your reference (e.g. uncle, family friend).';
  return null;
}

async function notifyParents({ details, childName, userEmail, notifyFather = true, notifyMother = true }) {
  const jobs = [];
  if (details.fatherEmail && notifyFather) {
    jobs.push(sendParentNotificationEmail({ recipientEmail: details.fatherEmail, relation: 'Father', childName, userEmail }));
  }
  if (details.motherEmail && notifyMother) {
    jobs.push(sendParentNotificationEmail({ recipientEmail: details.motherEmail, relation: 'Mother', childName, userEmail }));
  }
  return (await Promise.all(jobs)).filter(Boolean);
}

router.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const body = parsed.data;

    const details = { ...(body.details || {}) };
    if (body.fatherEmail && !details.fatherEmail) details.fatherEmail = body.fatherEmail;
    if (body.motherEmail && !details.motherEmail) details.motherEmail = body.motherEmail;
    for (const key of ['referenceName', 'referencePhone', 'referredBy']) {
      if (typeof details[key] === 'string') details[key] = details[key].trim();
    }

    const referenceError = referenceProblem(details);
    if (referenceError) return res.status(400).json({ error: referenceError });

    if (await findUserByEmail(body.email)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user = await createUser({
      email: body.email,
      password_hash: await bcrypt.hash(body.password, 10),
      first_name: body.firstName || 'Member',
      last_name: body.lastName || '',
      gender: body.gender,
      dob: body.dob,
      profile_for: body.profileFor,
      plan_id: null,
      role: 'member',
      phone: body.phone || null,
      photo_url: null,
      photos: [],
      details,
    });

    // Parent confirmations go out after the account exists, so a slow or
    // failing mail server can never cost someone their registration.
    const childName = `${body.firstName || ''} ${body.lastName || ''}`.trim() || 'Your Child';
    const notifications = await notifyParents({
      details,
      childName,
      userEmail: body.email,
      notifyFather: body.notifyFather,
      notifyMother: body.notifyMother,
    });

    let saved = user;
    if (notifications.length) {
      saved = (await updateUserProfile(user.id, { details: { parentNotifications: notifications } })) || user;
    }

    res.status(201).json({
      token: signToken(saved),
      user: publicUser(saved),
      notifications,
      reference: {
        name: details.referenceName,
        phone: details.referencePhone,
        relation: details.referredBy,
      },
    });
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
    if (user.role === 'staff') {
      return res.status(403).json({ error: 'Team accounts sign in through the admin panel at /admin/login.' });
    }

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

// Partner preferences schema for matching algorithm
const partnerPreferencesSchema = z
  .object({
    professionType: z.enum(['businessman', 'job', 'any']).optional(),
    diet: z.enum(['vegetarian', 'non_vegetarian', 'any']).optional(),
    sameCaste: z.boolean().optional(),
    ageMin: z.union([z.number(), z.string()]).optional(),
    ageMax: z.union([z.number(), z.string()]).optional(),
    location: z.string().max(100).optional(),
  })
  .passthrough();

// The full matrimonial profile — everything beyond the basics captured at registration.
// Every field is optional so the onboarding wizard and dashboard can save step-by-step.
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
    fatherEmail: z.string().max(100),
    motherName: z.string().max(100),
    motherOccupation: z.string().max(120),
    motherEmail: z.string().max(100),
    siblings: z.string().max(200),
    familyType: z.enum(['Nuclear', 'Joint']),
    familyStatus: z.enum(['Middle Class', 'Upper Middle Class', 'Rich', 'Affluent']),
    familyValues: z.enum(['Traditional', 'Moderate', 'Liberal']),

    aboutMe: z.string().max(2000),
    partnerExpectations: z.string().max(2000),
    partnerPreferences: partnerPreferencesSchema.optional(),

    referenceName: z.string().max(100),
    referencePhone: z.string().max(30),
    referredBy: z.string().max(150),
  })
  .partial();

const updateMeSchema = z.object({
  phone: z.string().max(20).optional(),
  details: detailsSchema.optional(),
});

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
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

    const currentUser = await getUserById(req.user.sub);
    const existingDetails = currentUser?.details || {};
    const newDetails = parsed.data.details || {};

    // A newly added (or changed) parent email gets its own confirmation.
    const childName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'Your Child';
    const notifications = await notifyParents({
      details: {
        fatherEmail: newDetails.fatherEmail !== existingDetails.fatherEmail ? newDetails.fatherEmail : undefined,
        motherEmail: newDetails.motherEmail !== existingDetails.motherEmail ? newDetails.motherEmail : undefined,
      },
      childName,
      userEmail: currentUser.email,
    });
    if (notifications.length) {
      parsed.data.details = {
        ...newDetails,
        parentNotifications: [...(existingDetails.parentNotifications || []), ...notifications],
      };
    }

    const updated = await updateUserProfile(req.user.sub, parsed.data);
    if (!updated) return res.status(404).json({ error: 'Account not found.' });
    res.json({ user: publicUser(updated), notifications });
  } catch (err) {
    next(err);
  }
});

export default router;
