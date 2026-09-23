import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { z } from 'zod';
import {
  adminListProfiles,
  createProfile,
  createRole,
  createUser,
  deleteProfile,
  deleteRole,
  deleteSubscriber,
  deleteTeamUser,
  deleteUser,
  findUserByEmail,
  getAdminStats,
  getProfileAdmin,
  getRole,
  getUserById,
  listActivity,
  listAllUsers,
  listEmailLogs,
  listMembersForExport,
  listOrders,
  listProfilesForExport,
  listRoles,
  listSubscribers,
  listTeam,
  listUsers,
  requireSchemaV2,
  schema,
  updateProfile,
  updateRole,
  updateUserColumns,
} from '../store.js';
import {
  can,
  canAny,
  isPanelRole,
  publicUser,
  requireAuth,
  requirePanel,
  signToken,
  superOnly,
} from '../auth.js';
import { config } from '../config.js';
import {
  PROFILE_DETAIL_KEYS,
  missingRequired,
  parseBiodataPdf,
  toProfileDetails,
  toProfileRow,
} from '../biodata.js';
import { biodataUpload, uploadErrorMessage, uploadsRoot } from './uploads.js';
import { findMatches, normalizeProfile } from '../matching.js';
import { PERMISSIONS, sanitizePermissions } from '../permissions.js';
import { columnCatalog, resolveColumns, toCsv, toPdf, toXlsx } from '../exporter.js';

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
    if (!ok || !isPanelRole(user.role)) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }
    if (user.details?.suspended) {
      return res.status(403).json({ error: 'This team account has been suspended. Contact the super admin.' });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.use(requireAuth, requirePanel);

/** Who is signed in and what they may do — the panel builds its nav from this. */
function sessionPayload(req) {
  const { user, isSuper, permissions, role } = req.panel;
  return {
    user: publicUser(user),
    isSuper,
    roleName: isSuper ? 'Super Admin' : role?.name || 'No role assigned',
    permissions: [...permissions],
    schemaReady: schema.v2,
  };
}

router.get('/me', (req, res) => res.json(sessionPayload(req)));

router.get('/meta/permissions', (_req, res) => res.json({ permissions: PERMISSIONS }));

// -------------------------------------------------------------- members ---

router.get('/members', can('members.view'), async (req, res, next) => {
  try {
    const { page, pageSize, search } = req.query;
    const result = await listUsers({ page, pageSize, search });
    res.json({ ...result, items: result.items.map(publicUser) });
  } catch (err) {
    next(err);
  }
});

router.get('/members/:id', can('members.view'), async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user || user.role !== 'member') return res.status(404).json({ error: 'Member not found.' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.delete('/members/:id', can('members.delete'), async (req, res, next) => {
  try {
    const target = await getUserById(req.params.id);
    if (!target || target.role !== 'member') {
      return res.status(404).json({ error: 'Member not found.' });
    }
    await deleteUser(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------- overview ---

router.get('/stats', can('overview.view'), async (_req, res, next) => {
  try {
    res.json(await getAdminStats());
  } catch (err) {
    next(err);
  }
});

router.get('/activity', can('overview.view'), async (req, res, next) => {
  try {
    res.json({ items: await listActivity(Number(req.query.limit) || 20) });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------- directory profile CRUD ---

const detailsSchema = z
  .record(z.union([z.string().max(2000), z.number()]))
  .transform((obj) => {
    // Only known biodata keys survive, as trimmed strings; blanks are dropped.
    const out = {};
    for (const key of PROFILE_DETAIL_KEYS) {
      const v = obj[key];
      if (v !== undefined && String(v).trim() !== '') out[key] = String(v).trim();
    }
    return out;
  });

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
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
  // A full URL, or a path the API/web app serves (/uploads/..., /profiles/...).
  photo: z
    .string()
    .refine((v) => v === '' || /^https?:\/\//.test(v) || v.startsWith('/'), 'Photo must be a URL or an uploaded photo.')
    .optional(),
  about: z.string().max(2000).optional().default(''),
  details: detailsSchema.optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

const cityOf = (location) => (location || '').split(',')[0].trim();

/**
 * What a new profile starts as. Anyone without the approve permission (e.g.
 * Staff) can only ever create 'pending' profiles — invisible on the site
 * until someone with approval rights publishes them.
 */
function initialStatus(req, requested) {
  if (!req.panel.permissions.has('profiles.approve')) return 'pending';
  return requested === 'pending' ? 'pending' : 'approved';
}

function stampApproval(req, status) {
  return status === 'approved'
    ? { approved_by: req.panel.user.email, approved_at: new Date().toISOString() }
    : { approved_by: null, approved_at: null };
}

router.get('/profiles', can('profiles.view'), async (req, res, next) => {
  try {
    res.json(await adminListProfiles(req.query));
  } catch (err) {
    next(err);
  }
});

router.get('/profiles/:id', can('profiles.view'), async (req, res, next) => {
  try {
    const profile = await getProfileAdmin(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.post('/profiles', can('profiles.create'), async (req, res, next) => {
  try {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const { status: requested, verified, ...body } = parsed.data;
    const status = initialStatus(req, requested);
    const canApprove = req.panel.permissions.has('profiles.approve');

    const created = await createProfile({
      ...body,
      details: body.details || {},
      city: cityOf(body.location),
      verified: canApprove ? !!verified : false,
      status,
      source: req.body.source === 'biodata' ? 'biodata' : 'manual',
      created_by: req.panel.user.email,
      ...stampApproval(req, status),
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

/**
 * Parses one biodata PDF into profile form values without saving anything —
 * the Upload Biodata wizard shows them for review first.
 */
router.post('/profiles/parse-biodata', can('profiles.create'), (req, res) => {
  biodataUpload.single('biodata')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: uploadErrorMessage(err, config.maxBiodataMb) });
    if (!req.file) return res.status(400).json({ error: 'No PDF was received.' });
    try {
      const { fields, warnings } = await parseBiodataPdf(req.file.buffer);
      const row = toProfileRow(fields);
      const details = toProfileDetails(fields);
      if (fields.dob && !details.dob) details.dob = fields.dob;
      res.json({ profile: { ...row, details }, missing: missingRequired(fields), warnings });
    } catch (parseErr) {
      res.status(parseErr.status === 422 ? 422 : 400).json({
        error: parseErr.status === 422 ? parseErr.message : 'That file could not be read as a PDF.',
      });
    }
  });
});

/**
 * Bulk-imports profiles from biodata PDFs.
 *
 * Each file is independent: one unreadable PDF in a batch of twenty must not
 * lose the other nineteen, so failures are collected and reported per-file
 * rather than aborting the request. Returns 207 when the batch is mixed.
 * Each imported profile comes back with its top matches when the caller may
 * see matches.
 */
router.post('/profiles/import-biodata', can('profiles.create'), (req, res) => {
  biodataUpload.array('biodata', 20)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: uploadErrorMessage(err, config.maxBiodataMb) });
    }
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: 'No PDFs were received.' });

    const status = initialStatus(req, req.body?.status);
    const withMatches = req.panel.permissions.has('matches.view');
    const imported = [];
    const failures = [];

    for (const file of files) {
      const filename = file.originalname || 'biodata.pdf';
      try {
        const { fields, warnings } = await parseBiodataPdf(file.buffer);

        const missing = missingRequired(fields);
        if (missing.length) {
          failures.push({
            filename,
            error: `Could not read ${missing.join(', ')} from this PDF.`,
          });
          continue;
        }

        // Runs through the same schema as a hand-typed profile, so an import
        // can never write a row the admin form itself would have rejected.
        const parsedRow = profileSchema.safeParse({ ...toProfileRow(fields), details: toProfileDetails(fields) });
        if (!parsedRow.success) {
          failures.push({ filename, error: parsedRow.error.issues[0].message });
          continue;
        }

        // profileSchema has no `city` key, so Zod strips it — re-derive it
        // the same way POST /profiles does, or /browse's location filter
        // would never surface imported rows.
        const { status: _ignored, ...row } = parsedRow.data;
        const created = await createProfile({
          ...row,
          details: row.details || {},
          city: fields.city || cityOf(row.location),
          status,
          source: 'biodata',
          created_by: req.panel.user.email,
          ...stampApproval(req, status),
        });
        const matches = withMatches
          ? await findMatches(normalizeProfile(created), { limit: 3, excludeId: created.id })
          : [];
        imported.push({ filename, profile: created, warnings, matches });
      } catch (fileErr) {
        failures.push({
          filename,
          error:
            fileErr.status === 422
              ? fileErr.message
              : 'That file could not be read as a PDF.',
        });
      }
    }

    res.status(failures.length && imported.length ? 207 : failures.length ? 400 : 201).json({
      imported,
      failures,
      summary: { total: files.length, imported: imported.length, failed: failures.length, status },
    });
  });
});

router.patch('/profiles/:id', can('profiles.edit'), async (req, res, next) => {
  try {
    const parsed = profileSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const patch = { ...parsed.data };
    const canApprove = req.panel.permissions.has('profiles.approve');

    // Publishing and the verified badge are approval decisions, not edits.
    if (!canApprove && (patch.status !== undefined || patch.verified !== undefined)) {
      return res.status(403).json({ error: 'Only roles with approval rights can publish or verify profiles.' });
    }

    const current = await getProfileAdmin(req.params.id);
    if (!current) return res.status(404).json({ error: 'Profile not found.' });

    if (patch.location !== undefined) patch.city = cityOf(patch.location);
    if (patch.details) patch.details = { ...(current.details || {}), ...patch.details };
    if (patch.status && patch.status !== current.status) Object.assign(patch, stampApproval(req, patch.status));

    const updated = await updateProfile(req.params.id, patch);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

const statusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  note: z.string().max(500).optional(),
});

/** Approve (publish), reject, or send back to pending. */
router.post('/profiles/:id/status', can('profiles.approve'), async (req, res, next) => {
  try {
    requireSchemaV2();
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const current = await getProfileAdmin(req.params.id);
    if (!current) return res.status(404).json({ error: 'Profile not found.' });

    const updated = await updateProfile(req.params.id, {
      status: parsed.data.status,
      review_note: parsed.data.note || null,
      ...stampApproval(req, parsed.data.status),
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/profiles/:id', can('profiles.delete'), async (req, res, next) => {
  try {
    const ok = await deleteProfile(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Profile not found.' });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------- matches ---

router.get('/profiles/:id/matches', can('matches.view'), async (req, res, next) => {
  try {
    const profile = await getProfileAdmin(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found.' });
    const items = await findMatches(normalizeProfile(profile), {
      limit: Number(req.query.limit) || 10,
      excludeId: profile.id,
    });
    res.json({ profile: { id: profile.id, name: profile.name, gender: profile.gender }, items });
  } catch (err) {
    next(err);
  }
});

/** Matches for an unsaved biodata — the wizard previews these before saving. */
router.post('/profiles/match-preview', can('matches.view'), async (req, res, next) => {
  try {
    const parsed = profileSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    if (!parsed.data.gender) return res.status(400).json({ error: 'Gender is needed to find matches.' });
    const items = await findMatches(normalizeProfile({ ...parsed.data, id: '__preview__' }), {
      limit: Number(req.query.limit) || 10,
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------- photo uploads ---

const PHOTO_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);
const profilePhotoDir = path.join(uploadsRoot, 'profiles');

const profilePhotoUpload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, cb) {
      fs.mkdirSync(profilePhotoDir, { recursive: true });
      cb(null, profilePhotoDir);
    },
    filename(_req, file, cb) {
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${PHOTO_TYPES.get(file.mimetype)}`);
    },
  }),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const ok = PHOTO_TYPES.has(file.mimetype);
    cb(ok ? null : new Error('Photos must be JPG, PNG or WebP.'), ok);
  },
});

/** Stores a directory-profile photo and returns its URL for the profile form. */
router.post('/uploads/photo', canAny('profiles.create', 'profiles.edit'), (req, res) => {
  profilePhotoUpload.single('photo')(req, res, (err) => {
    if (err) {
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? `Photo must be under ${config.maxUploadMb}MB.` : err.message;
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: 'No photo was received.' });
    res.status(201).json({ url: `/uploads/profiles/${req.file.filename}` });
  });
});

// ------------------------------------------------- payments & newsletter ---

router.get('/orders', can('payments.view'), async (req, res, next) => {
  try {
    res.json(await listOrders(req.query));
  } catch (err) {
    next(err);
  }
});

router.get('/subscribers', can('newsletter.manage'), async (_req, res, next) => {
  try {
    res.json({ items: await listSubscribers() });
  } catch (err) {
    next(err);
  }
});

router.delete('/subscribers/:email', can('newsletter.manage'), async (req, res, next) => {
  try {
    await deleteSubscriber(decodeURIComponent(req.params.email));
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

router.get('/email-logs', can('emails.view'), async (_req, res, next) => {
  try {
    res.json({ items: await listEmailLogs() });
  } catch (err) {
    next(err);
  }
});

// --------------------------------------------------------------- export ---

router.get('/export/columns', can('export.data'), (_req, res) => res.json(columnCatalog()));

const exportSchema = z.object({
  dataset: z.enum(['members', 'profiles']),
  format: z.enum(['xlsx', 'pdf', 'csv']),
  layout: z.enum(['table', 'sheets']).optional().default('table'),
  columns: z.array(z.string()).max(80).optional().default([]),
  ids: z.array(z.string()).max(5000).optional().default([]),
  filters: z
    .object({
      search: z.string().optional(),
      gender: z.string().optional(),
      status: z.string().optional(),
    })
    .optional()
    .default({}),
});

const previewSchema = exportSchema.pick({ dataset: true, columns: true, filters: true }).extend({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(25),
});

async function exportRows(dataset, { ids = [], filters = {} }) {
  return dataset === 'members'
    ? listMembersForExport({ ids, search: filters.search })
    : listProfilesForExport({ ids, ...filters });
}

/**
 * One page of the biodata table, formatted exactly as the export will be —
 * so what the admin ticks on screen is what lands in the file.
 */
router.post('/export/preview', can('export.data'), async (req, res, next) => {
  try {
    const parsed = previewSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const { dataset, columns: keys, filters, page, pageSize } = parsed.data;
    const all = await exportRows(dataset, { filters });
    const columns = resolveColumns(dataset, keys);
    const from = (page - 1) * pageSize;
    const fmt = (v) => (v === null || v === undefined ? '' : String(v));
    res.json({
      columns: columns.map(({ key, label }) => ({ key, label })),
      rows: all.slice(from, from + pageSize).map((r) => ({
        id: r.id,
        photo: dataset === 'members' ? r.photo_url : r.photo,
        values: columns.map((c) => fmt(c.get(r))),
      })),
      allIds: all.map((r) => r.id),
      total: all.length,
      page,
      pageSize,
    });
  } catch (err) {
    next(err);
  }
});

const MIME = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

/**
 * Exports the selected rows and columns. `ids` empty means "everything the
 * current filters match". The file's name is sent in Content-Disposition.
 */
router.post('/export', can('export.data'), async (req, res, next) => {
  try {
    const parsed = exportSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const { dataset, format, layout, columns: keys, ids, filters } = parsed.data;

    const rows = await exportRows(dataset, { ids, filters });
    const columns = resolveColumns(dataset, keys);
    if (!columns.length) return res.status(400).json({ error: 'Pick at least one column to export.' });

    const title = dataset === 'members' ? 'Registered Member Biodata' : 'Directory Profile Biodata';
    let body;
    if (format === 'csv') body = toCsv(rows, columns);
    else if (format === 'xlsx') body = await toXlsx(rows, columns, { title });
    else {
      body = await toPdf(rows, columns, {
        title,
        layout,
        uploadsRoot,
        nameOf: (r) => (dataset === 'members' ? `${r.first_name || ''} ${r.last_name || ''}`.trim() : r.name),
        photoOf: (r) => (dataset === 'members' ? r.photo_url : r.photo),
      });
    }

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', MIME[format]);
    res.setHeader('Content-Disposition', `attachment; filename="everafter-${dataset}-${stamp}.${format}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(body);
  } catch (err) {
    next(err);
  }
});

// Kept for the Members page's one-click "Export CSV" button.
router.get('/export.csv', can('export.data'), async (_req, res, next) => {
  try {
    const users = await listAllUsers();
    const all = columnCatalog().columns.members.map((c) => c.key);
    res.setHeader('Content-Type', MIME.csv);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="everafter-members-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(toCsv(users, resolveColumns('members', all)));
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------ roles & team ---

const roleSchema = z.object({
  name: z.string().trim().min(2, 'Give the role a name.').max(40),
  description: z.string().max(200).optional().default(''),
  permissions: z.array(z.string()).default([]),
});

router.get('/roles', superOnly, async (_req, res, next) => {
  try {
    const [roles, team] = await Promise.all([listRoles(), listTeam()]);
    const counts = new Map();
    for (const u of team) if (u.admin_role_id) counts.set(u.admin_role_id, (counts.get(u.admin_role_id) || 0) + 1);
    res.json({ items: roles.map((r) => ({ ...r, member_count: counts.get(r.id) || 0 })), permissions: PERMISSIONS });
  } catch (err) {
    next(err);
  }
});

async function nameTaken(name, exceptId) {
  const roles = await listRoles();
  return roles.some((r) => r.id !== exceptId && r.name.toLowerCase() === name.toLowerCase());
}

router.post('/roles', superOnly, async (req, res, next) => {
  try {
    const parsed = roleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    if (await nameTaken(parsed.data.name)) return res.status(409).json({ error: 'A role with that name already exists.' });
    const role = await createRole({ ...parsed.data, permissions: sanitizePermissions(parsed.data.permissions) });
    res.status(201).json(role);
  } catch (err) {
    next(err);
  }
});

router.patch('/roles/:id', superOnly, async (req, res, next) => {
  try {
    const parsed = roleSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    if (!(await getRole(req.params.id))) return res.status(404).json({ error: 'Role not found.' });
    if (parsed.data.name && (await nameTaken(parsed.data.name, req.params.id))) {
      return res.status(409).json({ error: 'A role with that name already exists.' });
    }
    const patch = { ...parsed.data };
    if (patch.permissions) patch.permissions = sanitizePermissions(patch.permissions);
    res.json(await updateRole(req.params.id, patch));
  } catch (err) {
    next(err);
  }
});

router.delete('/roles/:id', superOnly, async (req, res, next) => {
  try {
    const team = await listTeam();
    const assigned = team.filter((u) => u.admin_role_id === req.params.id).length;
    if (assigned) {
      return res.status(409).json({
        error: `${assigned} team member${assigned === 1 ? ' is' : 's are'} assigned to this role. Move them to another role first.`,
      });
    }
    await deleteRole(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

const teamSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(60),
  lastName: z.string().trim().max(60).optional().default(''),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  roleId: z.string().min(1, 'Choose a role.'),
});

const teamView = (u, roles) => ({
  ...publicUser(u),
  role_name: u.role === 'admin' ? 'Super Admin' : roles.find((r) => r.id === u.admin_role_id)?.name || 'No role',
  suspended: !!u.details?.suspended,
});

router.get('/team', superOnly, async (_req, res, next) => {
  try {
    const [team, roles] = await Promise.all([listTeam(), listRoles()]);
    res.json({ items: team.map((u) => teamView(u, roles)) });
  } catch (err) {
    next(err);
  }
});

router.post('/team', superOnly, async (req, res, next) => {
  try {
    requireSchemaV2();
    const parsed = teamSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const body = parsed.data;
    if (!(await getRole(body.roleId))) return res.status(400).json({ error: 'That role no longer exists.' });
    if (await findUserByEmail(body.email)) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const user = await createUser({
      email: body.email,
      password_hash: await bcrypt.hash(body.password, 10),
      first_name: body.firstName,
      last_name: body.lastName,
      gender: 'other',
      dob: null,
      profile_for: 'self',
      plan_id: null,
      role: 'staff',
      admin_role_id: body.roleId,
      phone: null,
      photo_url: null,
      photos: [],
      details: { createdBy: req.panel.user.email },
    });
    res.status(201).json(teamView(user, await listRoles()));
  } catch (err) {
    next(err);
  }
});

const teamPatchSchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
  roleId: z.string().min(1).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters.').optional(),
  suspended: z.boolean().optional(),
});

router.patch('/team/:id', superOnly, async (req, res, next) => {
  try {
    const parsed = teamPatchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    const target = await getUserById(req.params.id);
    if (!target || target.role !== 'staff') return res.status(404).json({ error: 'Team member not found.' });

    const body = parsed.data;
    const patch = {};
    if (body.firstName !== undefined) patch.first_name = body.firstName;
    if (body.lastName !== undefined) patch.last_name = body.lastName;
    if (body.roleId !== undefined) {
      if (!(await getRole(body.roleId))) return res.status(400).json({ error: 'That role no longer exists.' });
      patch.admin_role_id = body.roleId;
    }
    if (body.password) patch.password_hash = await bcrypt.hash(body.password, 10);
    if (body.suspended !== undefined) patch.details = { ...(target.details || {}), suspended: body.suspended };

    const updated = await updateUserColumns(req.params.id, patch);
    res.json(teamView(updated, await listRoles()));
  } catch (err) {
    next(err);
  }
});

router.delete('/team/:id', superOnly, async (req, res, next) => {
  try {
    const target = await getUserById(req.params.id);
    if (!target || target.role !== 'staff') return res.status(404).json({ error: 'Team member not found.' });
    await deleteTeamUser(req.params.id);
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
