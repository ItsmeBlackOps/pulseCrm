import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface LeadForm {
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  company: string;
  status: string;
  source?: string;
  notes?: string;
  assignedto?: string;
}

export default function LeadDetails() {
  const { id } = useParams<{ id: string }>();
  const { fetchWithAuth } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<LeadForm>({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    company: "",
    status: "new",
    source: "",
    notes: "",
    assignedto: ""
  });
  const [error, setError] = useState<string | null>(null);
  const editMode = !!id;

  useEffect(() => {
    if (editMode) {
      fetchWithAuth(`/crm-leads/${id}`)
        .then(res => res.json())
        .then(data => setForm({
          firstname: data.firstname,
          lastname: data.lastname,
          email: data.email,
          phone: data.phone || "",
          company: data.company,
          status: data.status,
          source: data.source || "",
          notes: data.notes || "",
          assignedto: data.assignedto || ""
        }));
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const saveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!editMode) {
      const existing = await fetchWithAuth('/crm-leads').then(r => r.json());
      if (existing.some((l: any) => l.email === form.email || (form.phone && l.phone === form.phone))) {
        setError('Lead with this email or phone already exists');
        return;
      }
    }
    const method = editMode ? 'PUT' : 'POST';
    const url = editMode ? `/crm-leads/${id}` : '/crm-leads';
    const res = await fetchWithAuth(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      navigate('/leads');
    } else {
      const data = await res.json();
      setError(data.message || 'Error saving lead');
    }
  };

  const stageFields = form.status === 'qualified';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/leads">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{editMode ? 'Edit Lead' : 'New Lead'}</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lead Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={saveLead}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstname">First Name</Label>
                  <Input id="firstname" name="firstname" value={form.firstname} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastname">Last Name</Label>
                  <Input id="lastname" name="lastname" value={form.lastname} onChange={handleChange} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" value={form.phone} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" name="company" value={form.company} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="unqualified">Unqualified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {stageFields && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" value={form.notes} onChange={handleChange} />
                </div>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
