// Admin-panel permissions.
//
// The super admin (role 'admin') implicitly holds every permission. Team
// accounts (role 'staff') hold exactly the permissions of the admin_roles row
// they are assigned to. Checks always happen server-side — the panel hiding a
// button is a convenience, never the enforcement.

export const PERMISSIONS = [
  { key: 'overview.view', group: 'Overview', label: 'View the overview dashboard and stats' },

  { key: 'members.view', group: 'Members', label: 'View registered members and their full profiles' },
  { key: 'members.delete', group: 'Members', label: 'Delete member accounts' },

  { key: 'profiles.view', group: 'Profiles', label: 'View directory profiles' },
  { key: 'profiles.create', group: 'Profiles', label: 'Upload biodata / add new profiles' },
  { key: 'profiles.edit', group: 'Profiles', label: 'Edit profile details and photos' },
  { key: 'profiles.approve', group: 'Profiles', label: 'Approve, reject and verify profiles (publish to site)' },
  { key: 'profiles.delete', group: 'Profiles', label: 'Delete profiles' },
  { key: 'matches.view', group: 'Profiles', label: 'See matching profiles for an uploaded biodata' },

  { key: 'export.data', group: 'Data', label: 'Export biodata to Excel, PDF and CSV' },
  { key: 'payments.view', group: 'Business', label: 'View payments and revenue' },
  { key: 'newsletter.manage', group: 'Business', label: 'View and manage newsletter subscribers' },
  { key: 'emails.view', group: 'Business', label: 'View the parent confirmation email log' },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

// Seeded on first boot; the super admin can change their permissions or add
// more roles from /admin/team. `id`s are stable so re-seeding never duplicates.
export const DEFAULT_ROLES = [
  {
    id: 'role_staff',
    name: 'Staff',
    description: 'Uploads biodata and adds profiles. Everything they add waits for approval.',
    permissions: ['profiles.view', 'profiles.create', 'matches.view'],
  },
  {
    id: 'role_content_editor',
    name: 'Content Editor',
    description: 'Adds and edits profile content and manages the newsletter. Cannot publish.',
    permissions: ['profiles.view', 'profiles.create', 'profiles.edit', 'matches.view', 'newsletter.manage'],
  },
  {
    id: 'role_manager',
    name: 'Manager',
    description: 'Runs day-to-day operations: approvals, members, exports and payments.',
    permissions: [
      'overview.view', 'members.view', 'profiles.view', 'profiles.create', 'profiles.edit',
      'profiles.approve', 'profiles.delete', 'matches.view', 'export.data', 'payments.view',
      'newsletter.manage', 'emails.view',
    ],
  },
  {
    id: 'role_developer',
    name: 'Developer',
    description: 'Read-only technical access for debugging data issues.',
    permissions: ['overview.view', 'members.view', 'profiles.view', 'matches.view', 'payments.view', 'emails.view'],
  },
].map((r) => ({ ...r, is_system: true }));

/** Keeps only keys that exist, de-duplicated, in catalogue order. */
export function sanitizePermissions(list) {
  const wanted = new Set(Array.isArray(list) ? list : []);
  return PERMISSION_KEYS.filter((k) => wanted.has(k));
}
