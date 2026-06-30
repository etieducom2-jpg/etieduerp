import React, { useEffect, useState } from 'react';
import api from '@/api/api';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Flame, Phone, AlertTriangle, GraduationCap, Users, Clock, Target,
  TrendingUp, CheckCircle2, ChevronRight, MessageSquare, CalendarClock,
} from 'lucide-react';

const SUMMARY_CARDS = [
  { key: 'new_today', label: 'New Today', icon: Users, accent: 'from-sky-500 to-blue-500', bg: 'from-sky-50 to-blue-50', text: 'text-sky-900' },
  { key: 'new_this_week', label: 'New This Week', icon: TrendingUp, accent: 'from-indigo-500 to-violet-500', bg: 'from-indigo-50 to-violet-50', text: 'text-indigo-900' },
  { key: 'active', label: 'Active Leads', icon: Phone, accent: 'from-emerald-500 to-teal-500', bg: 'from-emerald-50 to-teal-50', text: 'text-emerald-900' },
  { key: 'hot', label: 'Hot', icon: Flame, accent: 'from-rose-500 to-red-500', bg: 'from-rose-50 to-red-50', text: 'text-rose-900' },
  { key: 'warm', label: 'Warm', icon: Flame, accent: 'from-amber-500 to-orange-500', bg: 'from-amber-50 to-orange-50', text: 'text-amber-900' },
  { key: 'cold', label: 'Cold', icon: Flame, accent: 'from-slate-500 to-slate-600', bg: 'from-slate-50 to-slate-100', text: 'text-slate-900' },
  { key: 'lost', label: 'Lost', icon: AlertTriangle, accent: 'from-zinc-500 to-zinc-700', bg: 'from-zinc-50 to-zinc-100', text: 'text-zinc-900' },
];

const ActionBlock = ({ title, icon: Icon, tone, items, empty, render }) => (
  <Card className="border-0 shadow-sm" data-testid={`action-block-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
    <CardContent className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2 rounded-lg ${tone.iconBg}`}>
          <Icon className={`w-4 h-4 ${tone.iconColor}`} />
        </div>
        <h3 className={`font-semibold ${tone.titleColor}`}>{title}</h3>
        <Badge className={`ml-auto ${tone.badge}`}>{items.length}</Badge>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 italic">{empty}</p>
      ) : (
        <ul className="space-y-2">{items.slice(0, 5).map((it, i) => render(it, i))}</ul>
      )}
    </CardContent>
  </Card>
);

const KPI = ({ label, value, sub, accent, dataId }) => (
  <Card className={`border-0 shadow-sm bg-gradient-to-br ${accent}`} data-testid={dataId}>
    <CardContent className="p-4">
      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </CardContent>
  </Card>
);

const CounsellorActionDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get('/counsellor/action-required');
        if (alive) setData(res.data);
      } catch (e) {
        // silently degrade — existing dashboard sections still render below
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="counsellor-action-loading">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }
  if (!data) return null;

  const { lead_summary, followup_summary, admission_summary, conversion_summary, action_required, daily_queue } = data;

  return (
    <div className="space-y-8" data-testid="counsellor-action-dashboard">

      {/* Action Required — top of page */}
      <section data-testid="action-required-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-rose-500" />
            Action Required
          </h2>
          <span className="text-xs text-slate-500">What should I do next?</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <ActionBlock
            title="Hot Leads Not Contacted"
            icon={Flame}
            tone={{ iconBg: 'bg-rose-100', iconColor: 'text-rose-600', titleColor: 'text-rose-900', badge: 'bg-rose-100 text-rose-700' }}
            items={action_required.hot_leads_not_contacted}
            empty="All hot leads have been contacted. Great work!"
            render={(it) => (
              <li
                key={it.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-rose-50 cursor-pointer"
                onClick={() => navigate('/leads')}
                data-testid={`hot-lead-${it.id}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{it.name}</p>
                  <p className="text-xs text-slate-500 truncate">{it.program_name} • {it.number}</p>
                </div>
                <Badge variant="outline" className="text-[10px] border-rose-200 text-rose-700">
                  {it.minutes_since_creation < 60 ? `${it.minutes_since_creation}m` : `${Math.floor(it.minutes_since_creation / 60)}h`}
                </Badge>
              </li>
            )}
          />
          <ActionBlock
            title="Overdue Follow-Ups"
            icon={AlertTriangle}
            tone={{ iconBg: 'bg-amber-100', iconColor: 'text-amber-600', titleColor: 'text-amber-900', badge: 'bg-amber-100 text-amber-700' }}
            items={action_required.overdue_followups}
            empty="No overdue follow-ups. You're on top of it."
            render={(it) => (
              <li
                key={it.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-amber-50 cursor-pointer"
                onClick={() => navigate('/leads')}
                data-testid={`overdue-fu-${it.id}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{it.name}</p>
                  <p className="text-xs text-slate-500 truncate">{it.note || it.program_name}</p>
                </div>
                <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-700">
                  {it.days_overdue}d late
                </Badge>
              </li>
            )}
          />
          <ActionBlock
            title="Interested without Counselling"
            icon={MessageSquare}
            tone={{ iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', titleColor: 'text-indigo-900', badge: 'bg-indigo-100 text-indigo-700' }}
            items={action_required.interested_no_counseling}
            empty="No stuck interested leads."
            render={(it) => (
              <li
                key={it.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-indigo-50 cursor-pointer"
                onClick={() => navigate('/leads')}
                data-testid={`interested-${it.id}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{it.name}</p>
                  <p className="text-xs text-slate-500 truncate">{it.program_name} • {it.status}</p>
                </div>
                <Badge variant="outline" className="text-[10px] border-indigo-200 text-indigo-700">
                  {it.days_in_stage}d
                </Badge>
              </li>
            )}
          />
          <ActionBlock
            title="Admission Likely"
            icon={GraduationCap}
            tone={{ iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', titleColor: 'text-emerald-900', badge: 'bg-emerald-100 text-emerald-700' }}
            items={action_required.admission_likely}
            empty="Build your pipeline — book demos and discuss fees."
            render={(it) => (
              <li
                key={it.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-emerald-50 cursor-pointer"
                onClick={() => navigate('/leads')}
                data-testid={`admission-likely-${it.id}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{it.name}</p>
                  <p className="text-xs text-slate-500 truncate">{it.program_name} • {it.status}</p>
                </div>
                {it.fee_quoted ? (
                  <Badge className="bg-emerald-600 text-white text-[10px]">₹{Math.round(it.fee_quoted / 1000)}K</Badge>
                ) : (
                  <ChevronRight className="w-4 h-4 text-emerald-500" />
                )}
              </li>
            )}
          />
        </div>
      </section>

      {/* Lead Summary */}
      <section data-testid="lead-summary-section">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-sky-500" />
          Lead Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          {SUMMARY_CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <Card
                key={c.key}
                className={`border-0 shadow-sm bg-gradient-to-br ${c.bg}`}
                data-testid={`lead-summary-${c.key}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${c.accent} shadow-sm`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium uppercase tracking-wide">{c.label}</p>
                  <p className={`text-2xl font-bold ${c.text}`}>{lead_summary[c.key] ?? 0}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Follow-Up + Admission + Conversion */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4" data-testid="kpi-row">
        {/* Follow-Up Summary */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
              <CalendarClock className="w-4 h-4 text-blue-500" />
              Follow-Up Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <KPI label="Due Today" value={followup_summary.due_today} accent="from-blue-50 to-sky-50" dataId="fu-due-today" />
              <KPI label="Overdue" value={followup_summary.overdue} accent="from-rose-50 to-red-50" dataId="fu-overdue" />
              <KPI label="Upcoming" value={followup_summary.upcoming} accent="from-indigo-50 to-violet-50" dataId="fu-upcoming" />
              <KPI label="Completed Today" value={followup_summary.completed_today} accent="from-emerald-50 to-teal-50" dataId="fu-completed-today" />
            </div>
          </CardContent>
        </Card>

        {/* Admission Summary */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4 text-emerald-500" />
              Admission Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <KPI label="This Month" value={admission_summary.admissions_this_month} accent="from-emerald-50 to-teal-50" dataId="adm-this-month" />
              <KPI label="This Week" value={admission_summary.admissions_this_week} accent="from-emerald-50 to-teal-50" dataId="adm-this-week" />
              <KPI
                label="Target"
                value={admission_summary.target}
                sub={`${admission_summary.target_pct}% of ${admission_summary.leads_this_month} leads`}
                accent="from-slate-50 to-slate-100"
                dataId="adm-target"
              />
              <KPI
                label="Achievement"
                value={`${admission_summary.achievement_pct}%`}
                accent={admission_summary.achievement_pct >= 100 ? 'from-emerald-50 to-teal-50' : 'from-amber-50 to-orange-50'}
                dataId="adm-achievement"
              />
            </div>
          </CardContent>
        </Card>

        {/* Conversion Summary */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-violet-500" />
              Conversion Summary
            </h3>
            <div className="space-y-3">
              <div data-testid="conv-lead-to-counseling">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Lead → Counselling</span>
                  <span className="font-semibold text-slate-900">{conversion_summary.lead_to_counseling_pct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-sky-500 to-blue-500" style={{ width: `${Math.min(conversion_summary.lead_to_counseling_pct, 100)}%` }} />
                </div>
              </div>
              <div data-testid="conv-counseling-to-admission">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Counselling → Admission</span>
                  <span className="font-semibold text-slate-900">{conversion_summary.counseling_to_admission_pct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${Math.min(conversion_summary.counseling_to_admission_pct, 100)}%` }} />
                </div>
              </div>
              <div data-testid="conv-overall">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Overall</span>
                  <span className="font-semibold text-slate-900">{conversion_summary.overall_conversion_pct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${Math.min(conversion_summary.overall_conversion_pct, 100)}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Daily Work Queue */}
      <section data-testid="daily-queue-section">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          Today&apos;s Work Queue
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-500" />
                  Leads To Call
                </h3>
                <Badge className="bg-blue-100 text-blue-700">{daily_queue.to_call.length}</Badge>
              </div>
              {daily_queue.to_call.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No stale leads. Inbox-zero!</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {daily_queue.to_call.slice(0, 8).map((it) => (
                    <li
                      key={it.id}
                      className="flex items-center justify-between py-2 cursor-pointer hover:bg-blue-50 rounded-md px-2"
                      onClick={() => navigate('/leads')}
                      data-testid={`to-call-${it.id}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{it.name}</p>
                        <p className="text-xs text-slate-500 truncate">{it.number} • {it.status}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); window.open(`tel:${it.number}`); }}
                        data-testid={`call-btn-${it.id}`}
                      >
                        <Phone className="w-3 h-3 mr-1" />Call
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-violet-500" />
                  Follow-Ups Due Today
                </h3>
                <Badge className="bg-violet-100 text-violet-700">{daily_queue.followups_due_today.length}</Badge>
              </div>
              {daily_queue.followups_due_today.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No follow-ups scheduled for today.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {daily_queue.followups_due_today.slice(0, 8).map((it) => (
                    <li
                      key={it.id}
                      className="flex items-center justify-between py-2 cursor-pointer hover:bg-violet-50 rounded-md px-2"
                      onClick={() => navigate('/leads')}
                      data-testid={`fu-today-${it.id}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{it.name}</p>
                        <p className="text-xs text-slate-500 truncate">{it.note || it.program_name}</p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-violet-400" />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

    </div>
  );
};

export default CounsellorActionDashboard;
