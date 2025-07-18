
import { useEffect, useState } from 'react';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Filter, Target, TrendingUp, Users, Trash2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNotifications } from '@/hooks/useNotifications';

const visaStatusMap: Record<number, string> = {
  1: 'H1B',
  2: 'F1',
  3: 'OPT',
  4: 'STEM',
  5: 'Green Card',
  6: 'USC',
  7: 'H4',
  8: 'GC-USC'
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
  checklist?: string[];        // e.g. ["ID","Contract",…]
  legalName?: string;
  ssnLast4?: string;
  notes?: string;

}

const Leads = () => {
  const { fetchWithAuth, user } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const leadsPerPage = 10;

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    setLoading(true);
    const uid = user?.userid ?? '';
    Promise.all([
      fetchWithAuth(`${API_BASE_URL}/assignable-users?userId=${uid}`)
        .then(res => res.json())
        .then((data: { userid: number; name: string }[]) => {
          const map: Record<string, string> = {};
          if (user) map[String(user.userid)] = user.name;
          data.forEach((u: { userid: number; name: string }) => {
            map[String(u.userid)] = u.name;
          });
          setUserMap(map);
        }),
      fetchWithAuth(`${API_BASE_URL}/crm-leads?userId=${uid}`)
        .then(res => res.json())
        .then((data: Lead[]) => setLeads(data))
    ]).finally(() => setLoading(false));
  }, [user, fetchWithAuth, API_BASE_URL]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, leads]);

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

  const filteredLeads = leads.filter(lead => {
  const term = searchTerm.toLowerCase().trim()
    
const matchList = (arr?: any[]) =>
!!arr?.some(item =>
  String(item).toLowerCase().includes(term)
)

  // helper to safely test a string field
  const match = (value?: string) =>
    !!value && value.toLowerCase().includes(term)

  // date match: format the ISO date into locale string
  const dateMatch = (iso?: string) =>
    !!iso && new Date(iso).toLocaleDateString().includes(term)

  return (
    match(lead.firstname)    ||
    match(lead.lastname)     ||
    match(lead.email)        ||
    match(lead.company)      ||
    match(lead.status)       ||
    match(lead.source)       ||
    match(visaStatusMap[lead.visastatusid ?? 0]) ||
    match(userMap[lead.assignedto ?? '']) ||
    dateMatch(lead.createdat)||
    matchList(lead.checklist)||
    match(lead.legalName)    ||
    !!lead.ssnLast4?.includes(term) ||
    match(lead.notes)
  )
})
;

  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * leadsPerPage,
    currentPage * leadsPerPage
  );

  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(lead => lead.status === 'qualified').length;
  const newLeads = leads.filter(l => l.createdat && differenceInDays(new Date(), new Date(l.createdat)) <= 7).length;
  const converted = leads.filter(l => l.status === 'converted').length;
  const conversionRate = totalLeads ? Math.round((converted / totalLeads) * 100) : 0;

  const deleteLead = async (lead: Lead) => {
    if (!confirm('Delete this lead?')) return;
    const res = await fetchWithAuth(`${API_BASE_URL}/crm-leads/${lead.id}`, { method: 'DELETE' });
    if (res.ok) {
      setLeads(prev => prev.filter(l => l.id !== lead.id));
      toast({ title: 'Lead deleted' });
      addNotification(`${user?.name || 'User'} deleted lead ${lead.firstname} ${lead.lastname} for ${lead.company}`);
    } else {
      const data = await res.json();
      toast({ title: data.message || 'Error deleting lead', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="relative min-h-[200px]">
        {loading && <LoadingOverlay />}
        {!loading && (
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
            <div className="space-y-4">
                {paginatedLeads.map((lead) => (
                  <div key={lead.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold truncate">
                          {lead.firstname} {lead.lastname}
                        </h3>
                        <Badge variant="secondary" className="ml-auto">
                          {lead.company}
                        </Badge>
                        <Link
                          to={`/lead-details/${lead.id}`}
                          className="text-sm text-primary underline"
                        >
                          Edit
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="delete"
                          onClick={() => deleteLead(lead)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{lead.email}</span>
                        {lead.phone && <span>{lead.phone}</span>}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                        </Badge>
                        {lead.visastatusid && (
                          <Badge variant="outline">{visaStatusMap[lead.visastatusid]}</Badge>
                        )}
                        {lead.source && (
                          <span className="text-sm text-muted-foreground">Source: {lead.source}</span>
                        )}
                        {lead.assignedto && (
                          <span className="text-sm text-muted-foreground">Owner: {userMap[lead.assignedto] || lead.assignedto}</span>
                        )}
                        {lead.createdby && (
                          <span className="text-sm text-muted-foreground">Created By: {userMap[String(lead.createdby)] || lead.createdby}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mt-1">
                        {lead.createdat && <span>Created: {new Date(lead.createdat).toLocaleDateString()}</span>}
                        {lead.updatedat && <span>Updated: {new Date(lead.updatedat).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center mt-4">
                  <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
                  <span className="text-sm">Page {currentPage} of {totalPages}</span>
                  <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Leads;
