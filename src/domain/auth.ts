export type Role = 'admin' | 'sb';

export type Permission =
  | 'view_board'
  | 'update_status'
  | 'assign'
  | 'edit_followup'
  | 'import_data'
  | 'export_data'
  | 'view_stats'
  | 'view_security'
  | 'run_migration'
  | 'manage_users';

export const ROLE_PERMS: Record<Role, Permission[]> = {
  admin: [
    'view_board',
    'update_status',
    'assign',
    'edit_followup',
    'import_data',
    'export_data',
    'view_stats',
    'view_security',
    'run_migration',
    'manage_users'
  ],
  sb: [
    'view_board',
    'update_status',
    'assign',
    'edit_followup',
    'import_data',
    'export_data',
    'view_stats'
  ]
};

export function hasPerm(role: Role, perm: Permission): boolean {
  const perms = ROLE_PERMS[role];
  return perms ? perms.includes(perm) : false;
}

export function hasAny(role: Role, perms: Permission[]): boolean {
  return perms.some(perm => hasPerm(role, perm));
}

export function hasAll(role: Role, perms: Permission[]): boolean {
  return perms.every(perm => hasPerm(role, perm));
}