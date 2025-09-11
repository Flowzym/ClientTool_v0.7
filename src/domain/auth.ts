export type Role = 'admin' | 'editor' | 'user';

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
  editor: [
    'view_board',
    'update_status',
    'assign',
    'edit_followup',
    'import_data',
    'export_data',
    'view_stats'
  ],
  user: [
    'view_board',
    'view_stats'
  ]
};

export function hasPerm(role: Role, perm: Permission): boolean {
  return ROLE_PERMS[role].includes(perm);
}

export function hasAny(role: Role, perms: Permission[]): boolean {
  return perms.some(perm => hasPerm(role, perm));
}

export function hasAll(role: Role, perms: Permission[]): boolean {
  return perms.every(perm => hasPerm(role, perm));
}