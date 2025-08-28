import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

type RoleName = 'superadmin' | 'admin' | 'manager' | 'lead' | 'agent';

interface UserOption {
  userid: number;
  name: string;
  email: string;
  role: string; // or roleid if you have it; not required here
}

const roleIdMap: Record<RoleName, number> = {
  superadmin: 1,
  admin: 2,
  manager: 3,
  lead: 4,
  agent: 5,
};

const roleMap: Record<number, RoleName> = {
  1: 'superadmin',
  2: 'admin',
  3: 'manager',
  4: 'lead',
  5: 'agent',
};

type CreateUserPayload = {
  name: string | undefined;
  email: string | undefined;
  password: string;
  roleid: number | null;
  managerid: number | null;
  departmentid: number | null;
};

type Props = {
  /** Optional: limit which roles can be assigned (defaults to roles below the current user's role) */
  rolesFromApi?: string[]; // e.g. ["admin","manager","lead","agent"]
  /** Optional: manager dropdown options (defaults to all users returned by GET /users) */
  managerOptions?: UserOption[];
  /** Optional: called with the newly created user object returned by the API */
  onCreated?: (user: any) => void;
  /** Optional: show/hide Department field (defaults to hidden) */
  enableDepartment?: boolean;
};

export function CreateUserCard({
  rolesFromApi,
  managerOptions,
  onCreated,
  enableDepartment = false,
}: Props) {
  const { toast } = useToast();
  const { user, fetchWithAuth } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const currentRoleId = user?.roleid ?? 0;
  const currentRole = roleMap[currentRoleId];

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: '' as '' | string,
    managerId: '' as '' | string, // stores userid as string
    departmentId: '' as '' | string,
    password: '',
    showPw: false,
  });

  // If rolesFromApi is provided, filter to roles strictly below current role.
  // Otherwise default to all role names derived from roleIdMap (still filtered).
  const allowedRoles = useMemo(() => {
    const base = (rolesFromApi?.length ? rolesFromApi : (Object.values(roleIdMap) as unknown as string[]))
      .map(r => r.toLowerCase());
    return base.filter((r) => (roleIdMap[r as RoleName] ?? Infinity) > currentRoleId);
  }, [rolesFromApi, currentRoleId]);

  const canCreateUser = currentRoleId < roleIdMap.agent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateUser) {
      toast({ title: 'Not allowed', description: 'You do not have permission to create users.', variant: 'destructive' });
      return;
    }

    // Basic client-side validation
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast({ title: 'Missing fields', description: 'Name, Email and Password are required.', variant: 'destructive' });
      return;
    }
    if (!form.role) {
      toast({ title: 'Select a role', variant: 'destructive' });
      return;
    }

    const roleid = roleIdMap[(form.role.toLowerCase() as RoleName)] ?? null;
    const managerid = form.managerId?.trim() ? Number(form.managerId) : null;
    const departmentid = enableDepartment && form.departmentId?.trim() ? Number(form.departmentId) : null;

    const payload: CreateUserPayload = {
      name: form.name?.trim(),
      email: form.email?.trim(),
      password: form.password,
      roleid,
      managerid,
      departmentid,
    };

    try {
      setSubmitting(true);
      const res = await fetchWithAuth(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Error creating user');
      }

      const data = await res.json();
      toast({ title: 'User created' });
      onCreated?.(data);

      // Reset form
      setForm({
        name: '',
        email: '',
        role: '',
        managerId: '',
        departmentId: '',
        password: '',
        showPw: false,
      });
    } catch (err: any) {
      toast({ title: 'Failed', description: err?.message ?? 'Error creating user', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!canCreateUser) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create User</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cu-name">Name</Label>
              <Input
                id="cu-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cu-email">Email</Label>
              <Input
                id="cu-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cu-role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) => setForm((f) => ({ ...f, role: value }))}
                disabled={submitting}
              >
                <SelectTrigger id="cu-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {allowedRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cu-manager">Manager</Label>
              <Select
                value={form.managerId}
                onValueChange={(value) => setForm((f) => ({ ...f, managerId: value }))}
                disabled={submitting}
              >
                <SelectTrigger id="cu-manager">
                  <SelectValue placeholder="Select manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {(managerOptions ?? []).map((m) => (
                    <SelectItem key={m.userid} value={String(m.userid)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {enableDepartment && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cu-dept">Department ID</Label>
                <Input
                  id="cu-dept"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g. 12"
                  value={form.departmentId}
                  onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
                  disabled={submitting}
                />
              </div>
            )}

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="cu-password">Password</Label>
              <div className="flex gap-2">
                <Input
                  id="cu-password"
                  type={form.showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  disabled={submitting}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm((f) => ({ ...f, showPw: !f.showPw }))}
                >
                  {form.showPw ? 'Hide' : 'Show'}
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
