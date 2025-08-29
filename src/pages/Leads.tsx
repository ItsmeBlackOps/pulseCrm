import { useEffect, useState } from 'react';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Search, Plus, Filter, Target, TrendingUp, Users, Trash2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { useNotifications } from '@/hooks/useNotifications';

const visaStatusMap: Record<number, string> = {
  1: 'H1B',
  2: 'F1',
  3: 'OPT',
  4: 'STEM',
  5: 'Green Card',
  6: 'USC',
  7: 'H4',
  8: 'GC-EAD',
};

interface Lead {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  company: string;
  source?: string;
  status: string;
  assignedto?: string;
  createdat?: string;
  updatedat?: string;
  createdby?: number;
  visastatusid?: number;
  checklist?: string[];
  legalName?: string;
  ssnLast4?: string;
  notes?: string;
}

type PanelMode = 'view' | 'edit';

const ViewField = ({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-medium break-words">{value ?? '-'}</p>
  </div>
);

const Leads = () => {
  const { fetchWithAuth, user } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();

  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebounce(searchTerm, 450);

  // Sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [mode, setMode] = useState<PanelMode>('view');
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<Partial<Lead>>({});
  const [saving, setSaving] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Fetch leads + assignable users (paginated)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [usersRes, leadsRes] = await Promise.all([
          fetchWithAuth(`${API_BASE_URL}/assignable-users`),
          fetchWithAuth(`${API_BASE_URL}/crm-leads?take=50${debouncedSearch ? `&q=${encodeURIComponent(debouncedSearch)}` : ''}`),
        ]);
        const usersData = await usersRes.json();
        const map: Record<string, string> = {};
        if (user) map[String(user.userid)] = user.name;
        (usersData || []).forEach((u: { userid: number; name: string }) => {
          map[String(u.userid)] = u.name;
        });
        setUserMap(map);
        const leadsData = await leadsRes.json();
        const items: Lead[] = Array.isArray(leadsData) ? leadsData : (leadsData.items || []);
        setLeads(items);
        setNextCursor(leadsData.nextCursor ?? null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, fetchWithAuth, API_BASE_URL, debouncedSearch]);

  const loadMore = async () => {
    if (!nextCursor) return;
    const res = await fetchWithAuth(`${API_BASE_URL}/crm-leads?take=50&cursor=${nextCursor}${searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : ''}`);
    if (!res.ok) return;
    const data = await res.json();
    const items: Lead[] = data.items || [];
    setLeads(prev => [...prev, ...items]);
    setNextCursor(data.nextCursor ?? null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'qualified': return 'bg-green-100 text-green-800';
      case 'unqualified': return 'bg-red-100 text-red-800';
      case 'converted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Server-side search/pagination now; render current list

  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter((lead) => lead.status === 'qualified').length;
  const newLeads = leads.filter(
    (l) => l.createdat && differenceInDays(new Date(), new Date(l.createdat)) <= 7
  ).length;
  const converted = leads.filter((l) => l.status === 'converted').length;
  const conversionRate = totalLeads ? Math.round((converted / totalLeads) * 100) : 0;

  const deleteLead = async (lead: Lead) => {
    if (!confirm('Delete this lead?')) return;
    const res = await fetchWithAuth(`${API_BASE_URL}/crm-leads/${lead.id}`, { method: 'DELETE' });
    if (res.ok) {
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      toast({ title: 'Lead deleted' });
      addNotification(`${user?.name || 'User'} deleted lead ${lead.firstname} ${lead.lastname} for ${lead.company}`);
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: data.message || 'Error deleting lead', variant: 'destructive' });
    }
  };

  // --- Sheet helpers ---
  const seedForm = (lead: Lead) => {
    setForm({
      id: lead.id,
      firstname: lead.firstname,
      lastname: lead.lastname,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      source: lead.source,
      status: lead.status,
      assignedto: lead.assignedto,
      visastatusid: lead.visastatusid,
      legalName: lead.legalName,
      ssnLast4: lead.ssnLast4,
      notes: lead.notes,
    });
  };

  const openLead = (lead: Lead, m: PanelMode) => {
    setActiveLead(lead);
    seedForm(lead);
    setMode(m);
    setIsSheetOpen(true);
  };

  const startView = (lead: Lead) => openLead(lead, 'view');
  const startEdit = (lead: Lead) => openLead(lead, 'edit');

  const handleChange =
    <K extends keyof Lead>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value =
        key === 'visastatusid'
          ? (e.target.value ? Number(e.target.value) : undefined)
          : (e.target.value as unknown as Partial<Lead>[K]);
      setForm((prev) => ({ ...(prev as Partial<Lead>), [key]: value } as Partial<Lead>));
    };

  const handleSave = async () => {
    if (!activeLead) return;
    setSaving(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/crm-leads/${activeLead.id}`, {
        method: 'PUT', // change to PATCH if your API expects
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      let updated: Lead | null = null;
      if (res.status === 204) {
        updated = { ...activeLead, ...(form as Lead), updatedat: new Date().toISOString() };
      } else if (res.ok) {
        updated = await res.json();
      } else {
        const err = await res.json().catch(() => ({} as { message?: string }));
        throw new Error(err.message || 'Failed to update lead');
      }

      if (updated) {
        setLeads((prev) => prev.map((l) => (l.id === updated!.id ? { ...l, ...updated! } : l)));
        setActiveLead(updated); // keep viewing the fresh data
        seedForm(updated);      // sync form too
      }

      toast({ title: 'Lead updated' });
      addNotification(`${user?.name || 'User'} updated lead ${form.firstname} ${form.lastname} for ${form.company}`);
      setMode('view'); // return to read-only in the same sheet
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error updating lead';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const closeSheet = () => {
    if (saving) return;
    setIsSheetOpen(false);
    setActiveLead(null);
    setMode('view');
  };

  return (
    <DashboardLayout>
      <div className="relative min-h-[200px]">
        {loading && leads.length === 0 && <LoadingOverlay />}
        <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
                <p className="text-muted-foreground">Manage your potential customers and prospects</p>
              </div>
              <Button asChild>
                <Link to="/lead-details">
                  <Plus className="mr-2 h-4 w-4" />
                  New Lead
                </Link>
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalLeads}</div>
                  <p className="text-xs text-muted-foreground">+{newLeads} new this week</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Qualified Leads</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{qualifiedLeads}</div>
                  <p className="text-xs text-muted-foreground">Qualified leads</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{conversionRate}%</div>
                  <p className="text-xs text-muted-foreground">Conversion rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Leads</CardTitle>
                    <CardDescription>Track and manage your potential customers</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search leads..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-64"
                      />
                    </div>
                    <Button variant="outline">
                      <Filter className="mr-2 h-4 w-4" />
                      Filter
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {loading && leads.length > 0 && (
                  <div className="px-4 py-2 text-sm text-muted-foreground">Updating…</div>
                )}
                <div className="space-y-4">
                  {leads.map((lead) => (
                    <div key={lead.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold truncate">
                            {lead.firstname} {lead.lastname}
                          </h3>

                          <Badge variant="secondary" className="ml-auto">{lead.company}</Badge>

                          <div className="flex items-center gap-2">
                            {/* Keep VIEW button exactly as you had it */}
                            <Button variant="ghost" onClick={() => startView(lead)}>
                              View
                            </Button>
                            <Button variant="link" className="p-0 h-auto text-sm" onClick={() => startEdit(lead)}>
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="delete"
                              onClick={() => deleteLead(lead)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{lead.email}</span>
                          {lead.phone && <span>{lead.phone}</span>}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                          </Badge>

                          {lead.visastatusid && <Badge variant="outline">{visaStatusMap[lead.visastatusid]}</Badge>}

                          {lead.source && (
                            <span className="text-sm text-muted-foreground">Source: {lead.source}</span>
                          )}

                          {lead.assignedto && (
                            <span className="text-sm text-muted-foreground">
                              Owner: {userMap[lead.assignedto] || lead.assignedto}
                            </span>
                          )}

                          {lead.createdby && (
                            <span className="text-sm text-muted-foreground">
                              Created By: {userMap[String(lead.createdby)] || lead.createdby}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-1">
                          {lead.createdat && <span>Created: {new Date(lead.createdat).toLocaleDateString()}</span>}
                          {lead.updatedat && <span>Updated: {new Date(lead.updatedat).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>
                  ))}

                  {nextCursor && (
                    <div className="flex justify-center mt-4">
                      <Button variant="outline" onClick={loadMore}>Load more</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
      </div>

      {/* VIEW / EDIT Sheet */}
      <Sheet
        open={isSheetOpen}
        onOpenChange={(o) => {
          if (saving) return;
          if (!o) closeSheet();
          else setIsSheetOpen(true);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{mode === 'view' ? 'Lead Details' : 'Edit Lead'}</SheetTitle>
            <SheetDescription>
              {mode === 'view'
                ? 'Review the lead information.'
                : 'Update the lead details and save your changes.'}
            </SheetDescription>
          </SheetHeader>

          {/* BODY */}
          {mode === 'view' && activeLead && (
            <div className="py-4 space-y-6">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(activeLead.status)}>
                  {activeLead.status.charAt(0).toUpperCase() + activeLead.status.slice(1)}
                </Badge>
                {activeLead.visastatusid && (
                  <Badge variant="outline">{visaStatusMap[activeLead.visastatusid]}</Badge>
                )}
                <Badge variant="secondary">{activeLead.company}</Badge>
              </div>

              {/* Single column, line-by-line fields */}
              <div className="space-y-4">
                <ViewField label="First Name" value={activeLead.firstname} />
                <ViewField label="Last Name" value={activeLead.lastname} />
                <ViewField label="Email" value={activeLead.email} />
                <ViewField label="Phone" value={activeLead.phone} />
                <ViewField label="Source" value={activeLead.source} />
                <ViewField
                  label="Owner"
                  value={(activeLead.assignedto && userMap[activeLead.assignedto]) || '-'}
                />
                <ViewField label="Legal Name" value={activeLead.legalName} />
                <ViewField label="SSN (last 4)" value={activeLead.ssnLast4} />
                <ViewField
                  label="Created"
                  value={activeLead.createdat ? new Date(activeLead.createdat).toLocaleString() : '-'}
                />
                <ViewField
                  label="Updated"
                  value={activeLead.updatedat ? new Date(activeLead.updatedat).toLocaleString() : '-'}
                />
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="font-medium whitespace-pre-wrap">{activeLead.notes || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {mode === 'edit' && (
            <div className="py-4 space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstname">First Name</Label>
                  <Input id="firstname" value={form.firstname || ''} onChange={handleChange('firstname')} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="lastname">Last Name</Label>
                  <Input id="lastname" value={form.lastname || ''} onChange={handleChange('lastname')} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email || ''} onChange={handleChange('email')} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={form.phone || ''} onChange={handleChange('phone')} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" value={form.company || ''} onChange={handleChange('company')} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="source">Source</Label>
                  <Input id="source" value={form.source || ''} onChange={handleChange('source')} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={form.status || 'new'}
                    onChange={handleChange('status')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="unqualified">Unqualified</option>
                    <option value="converted">Converted</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="assignedto">Owner</Label>
                  <select
                    id="assignedto"
                    value={form.assignedto || ''}
                    onChange={handleChange('assignedto')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="">— Unassigned —</option>
                    {Object.entries(userMap).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="visastatusid">Visa Status</Label>
                  <select
                    id="visastatusid"
                    value={form.visastatusid ?? ''}
                    onChange={handleChange('visastatusid')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="">—</option>
                    {Object.entries(visaStatusMap).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="legalName">Legal Name</Label>
                  <Input id="legalName" value={form.legalName || ''} onChange={handleChange('legalName')} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="ssnLast4">SSN (last 4)</Label>
                  <Input id="ssnLast4" maxLength={4} value={form.ssnLast4 || ''} onChange={handleChange('ssnLast4')} />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add notes…"
                    className="min-h-[120px]"
                    value={form.notes || ''}
                    onChange={handleChange('notes')}
                  />
                </div>
              </div>
            </div>
          )}

          <SheetFooter className="pt-2">
            {mode === 'view' ? (
              <>
                <Button onClick={() => { if (activeLead) { seedForm(activeLead); setMode('edit'); } }}>
                  Edit
                </Button>
                <SheetClose asChild>
                  <Button variant="outline" onClick={closeSheet}>Close</Button>
                </SheetClose>
              </>
            ) : (
              <>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
                <Button variant="outline" disabled={saving} onClick={() => {
                  // revert edits and go back to view
                  if (activeLead) seedForm(activeLead);
                  setMode('view');
                }}>
                  Cancel
                </Button>
              </>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

export default Leads;
