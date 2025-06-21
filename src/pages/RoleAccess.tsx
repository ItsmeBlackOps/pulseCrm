import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const roles = ['Admin', 'Manager', 'User'];
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
  const [permissions, setPermissions] = useState(() => {
    const initial: Record<string, Record<string, boolean>> = {};
    components.forEach(c => {
      initial[c.id] = {};
      roles.forEach(r => { initial[c.id][r] = r === 'Admin'; });
    });
    return initial;
  });

  const togglePermission = (componentId: string, role: string) => {
    setPermissions(prev => ({
      ...prev,
      [componentId]: { ...prev[componentId], [role]: !prev[componentId][role] }
    }));
  };

  const handleSave = () => {
    toast({ title: 'Permissions updated' });
  };

  return (
    <DashboardLayout>
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
                          checked={permissions[comp.id][role]}
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
    </DashboardLayout>
  );
}
