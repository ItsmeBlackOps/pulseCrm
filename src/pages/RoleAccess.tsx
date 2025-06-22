import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { LoadingOverlay } from '@/components/ui/loading-overlay';

const components = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'contacts', name: 'Contacts' },
  { id: 'deals', name: 'Deals' },
  { id: 'leads', name: 'Leads' },
  { id: 'reports', name: 'Reports' },
  { id: 'settings', name: 'Settings' }
];

export default function RoleAccess() {
  const { toast } = useToast();
  const { fetchWithAuth } = useAuth();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchWithAuth(`${API_BASE_URL}/roles`)
        .then(res => res.json())
        .then((data: { name: string }[]) => setRoles(data.map(r => r.name)))
        .catch(() => toast({ title: 'Failed to load roles', variant: 'destructive' })),
      fetchWithAuth(`${API_BASE_URL}/role-access`)
        .then(res => res.json())
        .then(data => setPermissions(data))
        .catch(() => toast({ title: 'Failed to load permissions', variant: 'destructive' }))
    ]).finally(() => setLoading(false));
  }, [fetchWithAuth, toast]);

  const togglePermission = (componentId: string, role: string) => {
    setPermissions(prev => ({
      ...prev,
      [componentId]: {
        ...prev[componentId],
        [role]: !prev?.[componentId]?.[role]
      }
    }));
  };

  const handleSave = async () => {
    const res = await fetchWithAuth(`${API_BASE_URL}/role-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(permissions)
    });
    if (res.ok) {
      toast({ title: 'Permissions updated' });
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: data.message || 'Error updating permissions', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="relative min-h-[200px]">
        {loading && <LoadingOverlay />}
        {!loading && (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Role Access</h1>
        <Card>
          <CardHeader>
            <CardTitle>Component Access by Role</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  {roles.map(role => (
                    <TableHead key={role} className="text-center">{role}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.map(comp => (
                  <TableRow key={comp.id}>
                    <TableCell className="font-medium">{comp.name}</TableCell>
                    {roles.map(role => (
                      <TableCell key={role} className="text-center">
                        <Checkbox
                          checked={permissions?.[comp.id]?.[role] ?? false}
                          onCheckedChange={() => togglePermission(comp.id, role)}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Button onClick={handleSave}>Save</Button>
      </div>
        )}
      </div>
    </DashboardLayout>
  );
}
