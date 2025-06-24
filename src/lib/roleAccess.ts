export const rolePermissions: Record<string, number[]> = {
  dashboard: [1, 2, 3, 4, 5],
  contacts: [1, 2, 3, 4, 5],
  deals: [1, 2, 3, 4, 5],
  leads: [1, 2, 3, 4, 5],
  reports: [1, 2, 3, 4],
  settings: [1, 2],
};

export function hasComponentAccess(roleId: number, componentId: string): boolean {
  const allowed = rolePermissions[componentId];
  return Array.isArray(allowed) ? allowed.includes(roleId) : false;
}
