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
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

const companies = [
  { prefix: "VIZ", name: "Vizva Inc." },
  { prefix: "SIL", name: "Silverspace Inc." },
  { prefix: "FL", name: "FlawLess" }
];

const visaStatuses = [
  { visaStatusId: 1, name: "H1B" },
  { visaStatusId: 2, name: "F1" },
  { visaStatusId: 3, name: "OPT" },
  { visaStatusId: 4, name: "STEM" },
  { visaStatusId: 5, name: "Green Card" },
  { visaStatusId: 6, name: "USC" },
  { visaStatusId: 7, name: "H4" }
];

function capitalize(value: string) {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  const p1 = digits.slice(0, 3);
  const p2 = digits.slice(3, 6);
  const p3 = digits.slice(6, 10);
  let out = "";
  if (p1) out += `(${p1}`;
  if (p1.length === 3) out += ") ";
  if (p2) out += p2;
  if (p2.length === 3 && p3) out += "-";
  if (p3) out += p3;
  return out;
}

interface ChecklistItem {
  label: string;
  checked: boolean;
}

interface LeadForm {
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  company: string;
  status: string;
  source?: string;
  otherSource?: string;
  notes?: string;
  assignedto?: string;
  createdat?: string;
  updatedat?: string;
  lastcontactedat?: null;
  expectedrevenue?: null;
  createdby?: number;
  visastatusid?: number;
  checklist: ChecklistItem[];
  legalnamessn?: string;
  last4ssn?: string;
}

export default function LeadDetails() {
  const { id } = useParams<{ id: string }>();
  const { fetchWithAuth, user } = useAuth();
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [form, setForm] = useState<LeadForm>({
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    company: "",
    status: "lead",
    source: "",
    otherSource: "",
    notes: "",
    assignedto: "",
    checklist: []
  });
  const [statuses, setStatuses] = useState<string[]>([]);
  const [assignable, setAssignable] = useState<{ userid: number; name: string }[]>([]);
  const [originalForm, setOriginalForm] = useState<LeadForm | null>(null);
  const [loading, setLoading] = useState(true);
  const editMode = !!id;

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const uid = user?.userid ?? '';
        const [columnsData, assignableUsersData] = await Promise.all([
          fetchWithAuth(`${API_BASE_URL}/columns`).then(res =>
            res.json() as Promise<{ title: string }[]>
          ),
          fetchWithAuth(`${API_BASE_URL}/assignable-users?userId=${uid}`).then(res =>
            res.json() as Promise<{ userid: number; name: string }[]>
          )
        ]);

        setStatuses(columnsData.map((c: { title: string }) => c.title));

        const assignableList: { userid: number; name: string }[] = [
          ...assignableUsersData
        ];
        if (user) {
          assignableList.unshift({ userid: user.userid, name: user.name });
        }

        if (editMode) {
          const uid = user?.userid ?? '';
          const leadData = await fetchWithAuth(
            `${API_BASE_URL}/crm-leads/${id}?userId=${uid}`
          ).then(res => res.json());

          if (leadData.assignedto) {
            const uid = Number(leadData.assignedto);
            if (!assignableList.some(u => u.userid === uid)) {
              assignableList.push({ userid: uid, name: `User ${uid}` });
            }
          }

          const loaded = {
            firstname: leadData.firstname,
            lastname: leadData.lastname,
            email: leadData.email,
            phone: leadData.phone || "",
            company: leadData.company,
            status: leadData.status,
            source: leadData.source || "",
            otherSource: leadData.otherSource || leadData.othersource || "",
            notes: leadData.notes || "",
            assignedto: leadData.assignedto || "",
            createdat: leadData.createdat,
            updatedat: leadData.updatedat,
            lastcontactedat: leadData.lastcontactedat,
            expectedrevenue: leadData.expectedrevenue,
            createdby: leadData.createdby,
            visastatusid: leadData.visastatusid,
            checklist: leadData.checklist || [],
            legalnamessn: leadData.legalnamessn || leadData.legalNameSsn || "",
            last4ssn: leadData.last4ssn || leadData.last4Ssn || ""
          };
          setForm(loaded);
          setOriginalForm(JSON.parse(JSON.stringify(loaded)));
        }

        setAssignable(assignableList);
      } catch {
        toast({ title: "Failed to load lead details", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, editMode, fetchWithAuth, API_BASE_URL, toast]);

  const addChecklistItem = () => {
    setForm({ ...form, checklist: [...form.checklist, { label: "", checked: false }] });
  };

  const updateChecklistItem = (idx: number, value: string) => {
    const list = [...form.checklist];
    list[idx].label = value;
    setForm({ ...form, checklist: list });
  };

  const toggleChecklistItem = (idx: number) => {
    const list = [...form.checklist];
    list[idx].checked = !list[idx].checked;
    setForm({ ...form, checklist: list });
  };

  const removeChecklistItem = (idx: number) => {
    const list = [...form.checklist];
    list.splice(idx, 1);
    setForm({ ...form, checklist: list });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === 'firstname' || name === 'lastname') {
      setForm({ ...form, [name]: capitalize(value) });
    } else if (name === 'phone') {
      setForm({ ...form, phone: formatPhone(value) });
    } else if (name === 'legalnamessn') {
      setForm({ ...form, legalnamessn: capitalize(value) });
    } else if (name === 'last4ssn') {
      const digits = value.replace(/\D/g, '').slice(0, 4);
      setForm({ ...form, last4ssn: digits });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const saveLead = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.firstname || !form.lastname || !form.email || !form.phone || !form.company) {
      toast({ title: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    if (!form.visastatusid) {
      toast({ title: 'Visa status is required', variant: 'destructive' });
      return;
    }

    if (!editMode) {
      const uid = user?.userid ?? '';
      const existing: LeadForm[] = await fetchWithAuth(
        `${API_BASE_URL}/crm-leads?userId=${uid}`
      ).then(r => r.json());
      if (existing.some((l) => l.email === form.email || l.phone === form.phone || (form.legalnamessn && l.legalnamessn === form.legalnamessn) || (form.last4ssn && l.last4ssn === form.last4ssn))) {
        toast({ title: 'Duplicate lead found', variant: 'destructive' });
        return;
      }
    }

    if (form.status === 'signed' && (!form.legalnamessn || !form.last4ssn)) {
      toast({ title: 'Legal Name SSN and Last4 SSN required for signed status', variant: 'destructive' });
      return;
    }

    const payload = {
      ...form,
      company: form.company,
      createdat: form.createdat || new Date().toISOString(),
      updatedat: new Date().toISOString(),
      lastcontactedat: null,
      expectedrevenue: null,
      createdby: form.createdby || user?.userid,
      othersource: form.otherSource || undefined
    };

    const method = editMode ? 'PUT' : 'POST';
    const url = editMode ? `${API_BASE_URL}/crm-leads/${id}` : `${API_BASE_URL}/crm-leads`;
    const res = await fetchWithAuth(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      let notificationMsg = '';
      if (editMode) {
        const changes: Record<string, { old: unknown; new: unknown }> = {};
        if (originalForm) {
          Object.keys(form).forEach(key => {
            const k = key as keyof LeadForm;
            if (JSON.stringify(form[k]) !== JSON.stringify((originalForm as Record<string, unknown>)[k])) {
              changes[k] = { old: (originalForm as Record<string, unknown>)[k], new: form[k] };
            }
          });
        }
        if (Object.keys(changes).length) {
          const histPayload = {
            leadId: Number(id),
            state: JSON.stringify(changes),
            changedAt: new Date().toISOString()
          };
          await fetchWithAuth(`${API_BASE_URL}/crmLeadHistory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(histPayload)
          });

          if (changes.status) {
            notificationMsg = `${user?.name || 'User'} changed status of ${form.firstname} ${form.lastname} for ${form.company} from ${changes.status.old} to ${changes.status.new}`;
          } else {
            const fields = Object.keys(changes).join(', ');
            notificationMsg = `${user?.name || 'User'} updated ${form.firstname} ${form.lastname} for ${form.company} (${fields})`;
          }
        }
      } else {
        notificationMsg = `${user?.name || 'User'} created lead ${form.firstname} ${form.lastname} for ${form.company} with status ${form.status}`;
      }

      const msg = editMode ? 'Lead updated' : 'Lead created';
      toast({ title: msg });
      if (notificationMsg) addNotification(notificationMsg);
      navigate('/leads');
    } else {
      toast({ title: data.message || 'Error saving lead', variant: 'destructive' });
    }
  };

  const stageFields = true;

  return (
    <DashboardLayout>
      <div className="relative min-h-[200px]">
        {loading && <LoadingOverlay />}
        {!loading && (
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
                <Select value={form.company} onValueChange={(v) => setForm({ ...form, company: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.prefix} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                    <SelectItem value="Linkedin">Linkedin</SelectItem>
                    <SelectItem value="Cold Call">Cold Call</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {form.source === 'Other' && (
                  <Input
                    className="mt-2"
                    placeholder="Other source"
                    name="otherSource"
                    value={form.otherSource}
                    onChange={handleChange}
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="visastatusid">Visa Status</Label>
                <Select value={form.visastatusid?.toString() || ''} onValueChange={(v) => setForm({ ...form, visastatusid: Number(v) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select visa status" />
                  </SelectTrigger>
                  <SelectContent>
                    {visaStatuses.map(vs => (
                      <SelectItem key={vs.visaStatusId} value={vs.visaStatusId.toString()}>{vs.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedto">Assigned To</Label>
                <Select value={form.assignedto} onValueChange={(v) => setForm({ ...form, assignedto: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignable.map(u => (
                      <SelectItem key={u.userid} value={String(u.userid)}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Checklist</Label>
                {form.checklist.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input type="checkbox" checked={item.checked} onChange={() => toggleChecklistItem(idx)} />
                    <Input value={item.label} onChange={(e) => updateChecklistItem(idx, e.target.value)} />
                    <Button type="button" variant="ghost" onClick={() => removeChecklistItem(idx)}>Remove</Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addChecklistItem}>Add Item</Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="legalnamessn">Legal Name SSN</Label>
                  <Input
                    id="legalnamessn"
                    name="legalnamessn"
                    value={form.legalnamessn}
                    onChange={handleChange}
                    required={form.status === 'signed'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last4ssn">Last 4 SSN</Label>
                  <Input
                    id="last4ssn"
                    name="last4ssn"
                    value={form.last4ssn}
                    onChange={handleChange}
                    maxLength={4}
                    required={form.status === 'signed'}
                  />
                </div>
              </div>
              {stageFields && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" value={form.notes} onChange={handleChange} />
                </div>
              )}
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
        </div>
        )}
      </div>
    </DashboardLayout>
  );
}
