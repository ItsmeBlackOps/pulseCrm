import { useEffect, useState } from 'react';
import { ArrowUp, ArrowDown, Users, TrendingUp, UserPlus, DollarSign, Ticket } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { differenceInDays } from 'date-fns';

interface StatsCardProps {
  title: string;
  value: number | string;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  formatter?: (value: number | string) => string;
}

export function StatsCard({ title, value, change, changeLabel, icon, formatter }: StatsCardProps) {
  const isPositive = change > 0;

  const formattedValue = formatter ? formatter(value) : value;

  return (
    <Card className="dashboard-card">
      <div className="flex justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{formattedValue}</h3>
        </div>
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
      </div>
      <div className="flex items-center mt-3">
        <div className={cn('flex items-center text-xs font-medium', isPositive ? 'text-crm-success' : 'text-crm-danger')}>
          {isPositive ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
          {Math.abs(change)}%
        </div>
        <span className="text-xs text-muted-foreground ml-2">{changeLabel}</span>
      </div>
    </Card>
  );
}

export function DashboardStats() {
  const { fetchWithAuth, user } = useAuth();
  const [stats, setStats] = useState({ total: 0, newLeads: 0 });

  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const uid = user?.userid ?? '';
    fetchWithAuth(`${API_BASE_URL}/crm-leads?userId=${uid}`)
      .then(res => res.json())
      .then((data: { createdat?: string }[]) => {
        const total = data.length;
        const newLeads = data.filter(l => l.createdat && differenceInDays(new Date(), new Date(l.createdat)) <= 7).length;
        setStats({ total, newLeads });
      })
      .catch(() => {
        setStats({ total: 0, newLeads: 0 });
      });
  }, [fetchWithAuth, user]);

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number(value));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard title="Total Leads" value={stats.total} change={0} changeLabel="" icon={<Users className="h-5 w-5" />} />
      <StatsCard title="New Leads" value={stats.newLeads} change={0} changeLabel="" icon={<UserPlus className="h-5 w-5" />} />
      <StatsCard title="Revenue" value={54200} change={8} changeLabel="since last month" icon={<DollarSign className="h-5 w-5" />} formatter={formatCurrency} />
      <StatsCard title="Open Tickets" value={32} change={-15} changeLabel="since last week" icon={<Ticket className="h-5 w-5" />} />
    </div>
  );
}
