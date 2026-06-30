import React, { useEffect, useState } from 'react';
import api from '@/api/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Trophy, Target, TrendingUp, Users, Phone, CheckCircle2, XCircle, GraduationCap,
  RefreshCw, AlertTriangle, Activity,
} from 'lucide-react';

const FUNNEL_TONE = [
  'from-sky-500 to-blue-500',
  'from-blue-500 to-indigo-500',
  'from-indigo-500 to-violet-500',
  'from-violet-500 to-fuchsia-500',
  'from-fuchsia-500 to-pink-500',
  'from-pink-500 to-rose-500',
  'from-rose-500 to-orange-500',
  'from-orange-500 to-emerald-500',
];

const MetricCard = ({ label, value, icon: Icon, tone, testId }) => (
  <Card className={`border-0 shadow-sm bg-gradient-to-br ${tone}`} data-testid={testId}>
    <CardContent className="p-4 flex items-center gap-3">
      <div className="p-2 bg-white/60 rounded-lg">
        <Icon className="w-5 h-5 text-slate-700" />
      </div>
      <div>
        <p className="text-[11px] text-slate-600 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const CounsellorPerformancePanel = () => {
  const [data, setData] = useState(null);
  const [lostLeads, setLostLeads] = useState([]);
  const [reopening, setReopening] = useState(null);

  const load = async () => {
    try {
      const [perf, lost] = await Promise.all([
        api.get('/counsellor/performance'),
        api.get('/counsellor/lost-leads'),
      ]);
      setData(perf.data);
      setLostLeads(lost.data || []);
    } catch (e) { /* silent */ }
  };

  useEffect(() => { load(); }, []);

  const reopen = async (leadId) => {
    setReopening(leadId);
    try {
      await api.post(`/counsellor/lost-leads/${leadId}/reopen`, { notes: 'Re-engagement' });
      toast.success('Lead reopened and moved back to New.');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Reopen failed');
    } finally {
      setReopening(null);
    }
  };

  if (!data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="performance-loading">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const m = data.metrics;
  const maxFunnel = Math.max(...data.funnel.map((s) => s.count), 1);

  return (
    <div className="space-y-8" data-testid="counsellor-performance-panel">
      {/* Performance Metrics */}
      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          My Performance
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <MetricCard label="Assigned"    value={m.leads_assigned}        icon={Users}        tone="from-sky-50 to-blue-50" testId="metric-assigned" />
          <MetricCard label="Contacted"   value={m.leads_contacted}       icon={Phone}        tone="from-indigo-50 to-violet-50" testId="metric-contacted" />
          <MetricCard label="FU Completed" value={m.followups_completed} icon={CheckCircle2} tone="from-emerald-50 to-teal-50" testId="metric-fu-completed" />
          <MetricCard label="FU Missed"    value={m.followups_missed}    icon={XCircle}      tone="from-rose-50 to-red-50" testId="metric-fu-missed" />
          <MetricCard label="Admissions"  value={m.admissions_generated} icon={GraduationCap} tone="from-emerald-50 to-green-50" testId="metric-admissions" />
          <MetricCard label="Conversion%" value={`${m.conversion_rate}%`} icon={TrendingUp} tone="from-violet-50 to-fuchsia-50" testId="metric-conv" />
          <MetricCard label="Lost"        value={m.lost_count}            icon={AlertTriangle} tone="from-zinc-50 to-slate-100" testId="metric-lost" />
        </div>
      </section>

      {/* Lead Funnel */}
      <section data-testid="lead-funnel-section">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Target className="w-5 h-5 text-violet-500" />
          Lead Funnel
        </h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <ul className="space-y-3">
              {data.funnel.map((s, i) => {
                const widthPct = Math.max(8, (s.count / maxFunnel) * 100);
                const tone = FUNNEL_TONE[i % FUNNEL_TONE.length];
                return (
                  <li key={s.stage} data-testid={`funnel-stage-${s.stage.toLowerCase().replace(/\s+/g, '-')}`}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{s.stage}</span>
                      <span className="text-xs text-slate-500">
                        <span className="font-bold text-slate-900 mr-2">{s.count}</span>
                        ({s.pct_of_top}%)
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${tone} rounded-full transition-all`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Aging Buckets */}
      <section data-testid="aging-buckets-section">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5 text-sky-500" />
          Lead Aging
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="0-3 Days (Fresh)"        value={data.aging_buckets.fresh}          icon={Activity} tone="from-emerald-50 to-teal-50"  testId="aging-fresh" />
          <MetricCard label="4-7 Days (Follow-up)"    value={data.aging_buckets.needs_followup} icon={Activity} tone="from-blue-50 to-sky-50"      testId="aging-followup" />
          <MetricCard label="8-15 Days (At Risk)"     value={data.aging_buckets.at_risk}        icon={Activity} tone="from-amber-50 to-orange-50"  testId="aging-at-risk" />
          <MetricCard label="15+ Days (Recovery)"     value={data.aging_buckets.recovery}       icon={Activity} tone="from-rose-50 to-red-50"      testId="aging-recovery" />
        </div>
      </section>

      {/* Lost Lead Recovery */}
      <section data-testid="lost-leads-section">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-rose-500" />
          Lost Lead Recovery
          <Badge className="bg-rose-100 text-rose-700 ml-1">{lostLeads.length}</Badge>
        </h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            {lostLeads.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No lost leads. Keep up the great work!</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {lostLeads.map((ld) => (
                  <li key={ld.id} className="flex items-center justify-between py-3" data-testid={`lost-lead-${ld.id}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{ld.name}</p>
                      <p className="text-xs text-slate-500">
                        {ld.program_name} • {ld.number}
                        {ld.lost_reason && <span className="ml-2 text-rose-600">Reason: {ld.lost_reason}</span>}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reopen(ld.id)}
                      disabled={reopening === ld.id}
                      data-testid={`reopen-btn-${ld.id}`}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      {reopening === ld.id ? 'Reopening…' : 'Reopen'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default CounsellorPerformancePanel;
