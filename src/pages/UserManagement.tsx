import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { useDebounce } from '@/hooks/useDebounce';

interface User {
  userid: number;
  name: string;
  email: string;
  roleid: number;
  managerid?: number | null;
  departmentid?: number | null;
  status?: string;
  lastlogin?: string;
}

interface Role {
  roleid: number;
  name: string;
  parentroleid: number | null;
}

// Roles are fetched from the API; we avoid hardcoding role maps here

export default function UserManagement() {
  const { user, fetchWithAuth } = useAuth();
  const { toast } = useToast();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [users, setUsers] = useState<User[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [q, setQ] = useState<string>("");
  const debouncedQ = useDebounce(q, 450);
  const [rolesById, setRolesById] = useState<Record<number, string>>({});
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [pwUser, setPwUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const currentRoleId = user?.roleid ?? 0;
  const canManagePasswords = currentRoleId > 0 && currentRoleId <= 2; // 1=Super Admin, 2=Admin
  const canCreateUser = roles.some(r => r.roleid > currentRoleId);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [usersRes, rolesRes] = await Promise.all([
          fetchWithAuth(`${API_BASE_URL}/users?take=50${debouncedQ ? `&q=${encodeURIComponent(debouncedQ)}` : ''}`),
          fetchWithAuth(`${API_BASE_URL}/roles`),
        ]);

        if (usersRes.ok) {
          const data = await usersRes.json();
          const items = Array.isArray(data) ? data : (data.items || []);
          setUsers(items);
          setNextCursor(data.nextCursor ?? null);
        } else {
          const data = await usersRes.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to load users');
        }

        if (rolesRes.ok) {
          const data = (await rolesRes.json()) as Role[];
          setRoles(data);
          const map = Object.fromEntries(data.map(r => [r.roleid, r.name]));
          setRolesById(map);
        } else {
          const data = await rolesRes.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to load roles');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error loading data';
        toast({ title: 'Load failed', description: msg, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fetchWithAuth, API_BASE_URL, toast, debouncedQ]);

  const loadMore = async () => {
    if (!nextCursor) return;
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/users?take=50&cursor=${nextCursor}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
      if (!res.ok) throw new Error('Failed to load more users');
      const data = await res.json();
      const items: User[] = data.items || [];
      setUsers(prev => [...prev, ...items]);
      setNextCursor(data.nextCursor ?? null);
    } catch (e) {
      toast({ title: 'Load more failed', variant: 'destructive' });
    }
  };

  // removed create-user form logic; user creation lives on /create-user

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwUser) return;
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/users/${pwUser.userid}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Error updating password');
      }
      toast({ title: 'Password updated' });
      setPwUser(null);
      setNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating password';
      toast({ title: 'Failed', description: msg, variant: 'destructive' });
    }
  };
  return (
    <DashboardLayout>
      <div className="relative min-h-[200px]">
        {loading && users.length === 0 && <LoadingOverlay />}
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1> 
            <div className="flex items-center gap-2">
              <Input placeholder="Search users" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
              <Button variant="outline" onClick={() => { /* debounced auto-search */ }}>
                Search
              </Button>
            </div>
            {canCreateUser && (
              <Button asChild>
                <Link to="/create-user">
                  <Plus className="mr-2 h-4 w-4" />
                  New User
                </Link>
              </Button>
            )}
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading && users.length > 0 && (
                  <div className="px-4 py-2 text-sm text-muted-foreground">Updating…</div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      {canManagePasswords && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(u => (
                      <TableRow key={u.userid}>
                        <TableCell>{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{rolesById[u.roleid] ?? `Role ${u.roleid}`}</TableCell>
                        <TableCell className="capitalize">{u.status ?? ''}</TableCell>
                        <TableCell>{u.lastlogin ? new Date(u.lastlogin).toLocaleString() : ''}</TableCell>
                        {canManagePasswords && (
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
            {nextCursor && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={loadMore}>Load more</Button>
              </div>
            )}

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
      </div>
    </DashboardLayout>
  );
}

