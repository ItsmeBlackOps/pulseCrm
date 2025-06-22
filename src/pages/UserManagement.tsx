import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface User {
  userid: number;
  name: string;
  email: string;
  role: string;
}

const roleMap: Record<number, string> = {
  1: 'superadmin',
  2: 'admin',
  3: 'manager',
  4: 'lead',
  5: 'agent'
};

const roleIdMap: Record<string, number> = {
  superadmin: 1,
  admin: 2,
  manager: 3,
  lead: 4,
  agent: 5
};

export default function UserManagement() {
  const { user, fetchWithAuth } = useAuth();
  const { toast } = useToast();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [users, setUsers] = useState<User[]>([]);
  const [userOptions, setUserOptions] = useState<User[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', role: '', managerId: '', password: '' });
  const [pwUser, setPwUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const currentRole = roleMap[user?.roleid ?? 0];
  const currentRoleId = user?.roleid ?? 0;
  const canCreateUser = currentRoleId < roleIdMap.agent;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchWithAuth(`${API_BASE_URL}/users`)
        .then(res => res.json())
        .then((data: User[]) => {
          setUsers(data);
          setUserOptions(data);
        }),
      fetchWithAuth(`${API_BASE_URL}/roles`)
        .then(res => res.json())
        .then((data: { name: string }[]) => setRoles(data.map(r => r.name)))
    ]).finally(() => setLoading(false));
  }, [fetchWithAuth, API_BASE_URL]);

  const allowedRoles = roles.filter(r => {
    const id = roleIdMap[r.toLowerCase()] ?? Infinity;
    return id > currentRoleId;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetchWithAuth(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(prev => [...prev, data]);
      setForm({ name: '', email: '', role: '', managerId: '', password: '' });
      toast({ title: 'User created' });
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: data.message || 'Error creating user', variant: 'destructive' });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwUser) return;
    const res = await fetchWithAuth(`${API_BASE_URL}/users/${pwUser.userid}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword })
    });
    if (res.ok) {
      toast({ title: 'Password updated' });
      setPwUser(null);
      setNewPassword('');
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: data.message || 'Error updating password', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="relative min-h-[200px]">
        {loading && <LoadingOverlay />}
        {!loading && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            {canCreateUser && (
            <Card>
              <CardHeader>
                <CardTitle>Create User</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleCreate}>
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select value={form.role} onValueChange={value => setForm({ ...form, role: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedRoles.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="manager">Manager</Label>
                    <Select value={form.managerId} onValueChange={value => setForm({ ...form, managerId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select manager" />
                      </SelectTrigger>
                      <SelectContent>
                        {userOptions.map(m => (
                          <SelectItem key={m.userid} value={String(m.userid)}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                  </div>
                  <Button type="submit">Create</Button>
                </form>
              </CardContent>
            </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      {['admin', 'superadmin'].includes(currentRole) && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => (
                      <TableRow key={u.userid}>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.role}</TableCell>
                        {['admin', 'superadmin'].includes(currentRole) && (
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => setPwUser(u)}>Change Password</Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {pwUser && (
              <Card className="max-w-sm">
                <CardHeader>
                  <CardTitle>Change Password for {pwUser.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4" onSubmit={handleChangePassword}>
                    <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password" required />
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => { setPwUser(null); setNewPassword(''); }}>Cancel</Button>
                      <Button type="submit">Update</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

