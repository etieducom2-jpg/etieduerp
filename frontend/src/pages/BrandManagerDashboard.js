import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { brandAPI } from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Users, ClipboardList, FileText, ArrowRight, Plus } from 'lucide-react';

const BrandManagerDashboard = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await brandAPI.listClients();
        setClients(r.data || []);
      } catch (e) {
        toast.error(e.response?.data?.detail || 'Failed to load clients');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalPlans = clients.reduce((s, c) => s + (c.plan_count || 0), 0);
  const totalReports = clients.reduce((s, c) => s + (c.report_count || 0), 0);

  return (
    <div className="space-y-6" data-testid="brand-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Brand Manager</h1>
          <p className="text-sm text-slate-500">Plan, share &amp; report on Wizbang client social content.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/wizbang/brand/plans/new">
            <Button data-testid="new-plan-cta"><Plus className="h-4 w-4 mr-2" />New Content Plan</Button>
          </Link>
          <Link to="/wizbang/brand/reports">
            <Button variant="outline" data-testid="reports-cta"><FileText className="h-4 w-4 mr-2" />Reports</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-5 flex items-center gap-3">
          <Users className="h-8 w-8 text-indigo-600" />
          <div><div className="text-2xl font-semibold">{clients.length}</div><div className="text-xs text-slate-500">Clients</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-emerald-600" />
          <div><div className="text-2xl font-semibold">{totalPlans}</div><div className="text-xs text-slate-500">Content Plans</div></div>
        </CardContent></Card>
        <Card><CardContent className="p-5 flex items-center gap-3">
          <FileText className="h-8 w-8 text-amber-600" />
          <div><div className="text-2xl font-semibold">{totalReports}</div><div className="text-xs text-slate-500">Monthly Reports</div></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Wizbang Clients</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-slate-500">Loading…</div>
          ) : clients.length === 0 ? (
            <div className="py-10 text-center text-slate-500" data-testid="no-clients">
              No clients yet. Ask the Wizbang Admin to add Wizbang clients first.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((c) => (
                <Link
                  key={c.id}
                  to={`/wizbang/brand/clients/${c.id}`}
                  className="block rounded-lg border border-slate-200 bg-white p-4 hover:shadow-md hover:border-indigo-300 transition"
                  data-testid={`client-card-${c.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.contact_person || '—'}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="mt-3 flex gap-2 text-xs">
                    <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-700">{c.plan_count || 0} plans</span>
                    <span className="px-2 py-1 rounded bg-amber-50 text-amber-700">{c.report_count || 0} reports</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BrandManagerDashboard;
