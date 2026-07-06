import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Phone, MessageSquare, Calendar, CheckCircle2, Clock, AlertTriangle, Flame,
  TrendingUp, Target, ChevronRight, Sparkles, Award, GraduationCap, Users,
} from 'lucide-react';

// ------- helpers ---------------------------------------------------------------
const inr = (n) => {
  const v = Math.abs(n || 0);
  const s = n < 0 ? '-' : '';
  if (v >= 1e7) return s + '₹' + (v / 1e7).toFixed(v % 1e7 === 0 ? 0 : 2) + 'Cr';
  if (v >= 1e5) return s + '₹' + (v / 1e5).toFixed(v % 1e5 === 0 ? 0 : 2) + 'L';
  if (v >= 1e3) return s + '₹' + (v / 1e3).toFixed(0) + 'K';
  return s + '₹' + v.toFixed(0);
};

const fmtDay = (iso) => {
  if (!iso) return '';
  const d = new Date(iso.length > 10 ? iso : iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const relDay = (daysAway) => {
  if (daysAway === null || daysAway === undefined) return '';
  if (daysAway === 0) return 'Today';
  if (daysAway === 1) return 'Tomorrow';
  if (daysAway < 0) return `${Math.abs(daysAway)}d ago`;
  return `in ${daysAway}d`;
};

const waLink = (num) => {
  if (!num) return null;
  const digits = String(num).replace(/\D/g, '');
  return `https://wa.me/${digits.length === 10 ? '91' + digits : digits}`;
};

const telLink = (num) => (num ? `tel:${String(num).replace(/[^0-9+]/g, '')}` : null);

// ------- hero ------------------------------------------------------------------
const CockpitHero = ({ firstName, greeting, dateLabel, revenue, streak, focusMessage }) => {
  const pct = Math.min(100, Math.max(0, revenue?.percent || 0));
  return (
    <div
      className="rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-5 shadow-lg"
      data-testid="cockpit-hero"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-indigo-300">{dateLabel}</p>
          <h1 className="text-2xl font-bold tracking-tight mt-0.5" data-testid="cockpit-greeting">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-indigo-100/90 mt-1.5 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0" />
            <span>{focusMessage}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {streak?.current > 0 && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border ${
                streak.target_met
                  ? 'bg-emerald-500/15 border-emerald-300/40 text-emerald-100'
                  : 'bg-amber-500/15 border-amber-300/40 text-amber-100'
              }`}
              data-testid="cockpit-streak"
            >
              <Flame className="w-3.5 h-3.5" /> {streak.current}-day streak
            </span>
          )}
        </div>
      </div>

      {/* Monthly target progress */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between text-xs text-indigo-100/80 mb-1.5">
          <span className="uppercase tracking-wide">This month revenue</span>
          <span className="font-mono">
            <span className="text-white font-bold text-sm">{inr(revenue?.this_month || 0)}</span>
            <span className="text-indigo-300"> / {inr(revenue?.target || 0)}</span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-all ${
              pct >= 100 ? 'bg-emerald-400' : pct >= 60 ? 'bg-amber-400' : 'bg-rose-400'
            }`}
            style={{ width: `${pct}%` }}
            data-testid="cockpit-revenue-bar"
          />
        </div>
        <p className="text-[11px] text-indigo-200 mt-1">{pct.toFixed(0)}% of monthly target</p>
      </div>
    </div>
  );
};

// ------- KPI strip -------------------------------------------------------------
const KpiStrip = ({ dueToday, overdue, demosWeek, hotLeads, admissionsMTD }) => {
  const items = [
    {
      label: 'Follow-ups due today',
      value: dueToday,
      icon: Clock,
      cls: dueToday > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500',
      testid: 'kpi-due-today',
    },
    {
      label: 'Overdue follow-ups',
      value: overdue,
      icon: AlertTriangle,
      cls: overdue > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-500',
      testid: 'kpi-overdue',
    },
    {
      label: 'Demos next 7 days',
      value: demosWeek,
      icon: Calendar,
      cls: demosWeek > 0 ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-slate-50 border-slate-200 text-slate-500',
      testid: 'kpi-demos-week',
    },
    {
      label: 'Hot leads waiting',
      value: hotLeads,
      icon: Flame,
      cls: hotLeads > 0 ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-500',
      testid: 'kpi-hot-leads',
    },
    {
      label: 'Admissions this month',
      value: admissionsMTD,
      icon: GraduationCap,
      cls: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      testid: 'kpi-admissions-mtd',
    },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="cockpit-kpi-strip">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.label} className={`rounded-xl border p-3.5 ${it.cls}`} data-testid={it.testid}>
            <div className="flex items-center justify-between">
              <Icon className="w-4 h-4 opacity-80" />
              <span className="text-2xl font-bold tabular-nums">{it.value ?? 0}</span>
            </div>
            <p className="text-[11px] mt-1 leading-tight opacity-90">{it.label}</p>
          </div>
        );
      })}
    </div>
  );
};

// ------- Grouped list card (demos or follow-ups) -------------------------------
const groupByDay = (items, dateField) => {
  const groups = {};
  items.forEach((it) => {
    const k = (it[dateField] || '').slice(0, 10);
    if (!groups[k]) groups[k] = [];
    groups[k].push(it);
  });
  return Object.entries(groups).sort(([a], [b]) => (a > b ? 1 : -1));
};

const ScheduledDemosCard = ({ demos = [] }) => {
  const nav = useNavigate();
  const grouped = groupByDay(demos, 'demo_date');
  return (
    <Card className="border-0 shadow-sm" data-testid="cockpit-scheduled-demos">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
          <div className="p-1.5 bg-violet-100 rounded-lg">
            <Calendar className="w-4 h-4 text-violet-600" />
          </div>
          Scheduled Demos — next 7 days
          <Badge className="bg-violet-100 text-violet-700 ml-auto">{demos.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {demos.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No demos scheduled this week. Book one for a hot lead. 🚀</p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([day, items]) => (
              <div key={day}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {fmtDay(day)}
                  </span>
                  <span className="text-[10px] text-slate-400">· {relDay(items[0].days_away)}</span>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>
                <div className="space-y-2">
                  {items.map((d) => (
                    <div
                      key={d.lead_id + d.demo_date + (d.demo_time || '')}
                      className="flex items-center gap-3 p-3 rounded-lg border border-violet-100 bg-violet-50/40 hover:bg-violet-50 transition"
                      data-testid={`demo-row-${d.lead_id}`}
                    >
                      <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 font-semibold text-violet-700">
                        {(d.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <button
                        onClick={() => nav(`/leads/${d.lead_id}`)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-sm font-semibold text-slate-900 truncate">{d.name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {d.program || '—'} · {d.demo_time || 'time TBD'}
                          {d.trainer ? ` · with ${d.trainer}` : ''}
                        </p>
                      </button>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {telLink(d.number) && (
                          <a
                            href={telLink(d.number)}
                            className="p-2 rounded-md text-slate-500 hover:bg-white hover:text-blue-700 transition"
                            title="Call"
                            data-testid={`demo-call-${d.lead_id}`}
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        {waLink(d.number) && (
                          <a
                            href={waLink(d.number)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-md text-slate-500 hover:bg-white hover:text-emerald-700 transition"
                            title="WhatsApp"
                            data-testid={`demo-wa-${d.lead_id}`}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const UpcomingFollowupsCard = ({ today = [], upcoming = [] }) => {
  const nav = useNavigate();
  const combined = [
    ...today.map((f) => ({ ...f, followup_date: f.followup_date, days_away: 0 })),
    ...upcoming,
  ];
  const grouped = groupByDay(combined, 'followup_date');
  return (
    <Card className="border-0 shadow-sm" data-testid="cockpit-upcoming-followups">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          Upcoming Follow-ups — today + next 7 days
          <Badge className="bg-blue-100 text-blue-700 ml-auto">{combined.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {combined.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No upcoming follow-ups. All clear! ✨</p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([day, items]) => (
              <div key={day}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {fmtDay(day)}
                  </span>
                  <span className="text-[10px] text-slate-400">· {relDay(items[0].days_away)}</span>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>
                <div className="space-y-2">
                  {items.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-blue-100 bg-blue-50/30 hover:bg-blue-50 transition"
                      data-testid={`followup-row-${f.id}`}
                    >
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 font-semibold text-blue-700">
                        {(f.lead_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <button
                        onClick={() => nav(`/leads/${f.lead_id}`)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="text-sm font-semibold text-slate-900 truncate">{f.lead_name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {f.program || '—'} · {f.lead_status || 'New'}
                          {f.note ? ` · “${f.note}”` : ''}
                        </p>
                      </button>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {telLink(f.lead_number) && (
                          <a
                            href={telLink(f.lead_number)}
                            className="p-2 rounded-md text-slate-500 hover:bg-white hover:text-blue-700 transition"
                            title="Call"
                            data-testid={`followup-call-${f.id}`}
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        {waLink(f.lead_number) && (
                          <a
                            href={waLink(f.lead_number)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-md text-slate-500 hover:bg-white hover:text-emerald-700 transition"
                            title="WhatsApp"
                            data-testid={`followup-wa-${f.id}`}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ------- Overdue Follow-ups (compact urgent list) ------------------------------
const OverdueFollowupsCard = ({ items = [] }) => {
  const nav = useNavigate();
  if (!items || items.length === 0) return null;
  return (
    <Card className="border-0 shadow-sm border-l-4 border-l-rose-500" data-testid="cockpit-overdue">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-rose-700 flex items-center gap-2 uppercase tracking-wide">
          <AlertTriangle className="w-4 h-4" />
          Overdue — clear these first
          <Badge className="bg-rose-100 text-rose-700 ml-auto">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {items.slice(0, 6).map((m) => (
          <button
            key={m.id}
            onClick={() => nav(`/leads/${m.lead_id || ''}`)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-rose-100 bg-rose-50/40 hover:bg-rose-50 transition text-left"
            data-testid={`overdue-row-${m.id}`}
          >
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 font-semibold text-rose-700 text-sm">
              {(m.lead_name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{m.lead_name}</p>
              <p className="text-xs text-slate-500 truncate">
                {m.lead_number} · {m.lead_status}
              </p>
            </div>
            <Badge className="bg-rose-100 text-rose-700 border-0 flex-shrink-0">
              {m.days_missed}d late
            </Badge>
          </button>
        ))}
      </CardContent>
    </Card>
  );
};

// ------- Hot Leads compact -----------------------------------------------------
const HotLeadsCard = ({ leads = [] }) => {
  const nav = useNavigate();
  return (
    <Card className="border-0 shadow-sm" data-testid="cockpit-hot-leads">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
          <div className="p-1.5 bg-orange-100 rounded-lg">
            <Flame className="w-4 h-4 text-orange-600" />
          </div>
          Hot leads — call first
          <Badge className="bg-orange-100 text-orange-700 ml-auto">{leads.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {leads.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No hot leads waiting. Nice work.</p>
        ) : (
          <div className="space-y-2">
            {leads.slice(0, 6).map((l) => (
              <button
                key={l.id}
                onClick={() => nav(`/leads/${l.id}`)}
                data-testid={`hot-lead-${l.id}`}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-orange-100 bg-orange-50/40 hover:bg-orange-50 transition text-left"
              >
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 font-semibold text-orange-700 text-sm">
                  {(l.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{l.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {l.number} · {l.program_name || '—'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ------- Conversion Funnel -----------------------------------------------------
const ConversionFunnelCard = ({ funnel = {}, leadStats = {} }) => {
  const stages = [
    { key: 'total', label: 'Leads', value: funnel.total || leadStats.total_leads || 0, cls: 'bg-slate-500' },
    { key: 'contacted', label: 'Contacted', value: funnel.contacted || 0, cls: 'bg-blue-500' },
    { key: 'demo', label: 'Demo Booked', value: funnel.demo || 0, cls: 'bg-violet-500' },
    { key: 'converted', label: 'Enrolled', value: leadStats.total_converted || funnel.converted || 0, cls: 'bg-emerald-500' },
  ];
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <Card className="border-0 shadow-sm" data-testid="cockpit-funnel">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
          <div className="p-1.5 bg-emerald-100 rounded-lg">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          Conversion funnel
          <span className="ml-auto text-xs font-mono text-emerald-700">
            {(leadStats.conversion_rate || 0).toFixed?.(1) || leadStats.conversion_rate}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {stages.map((s) => (
          <div key={s.key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">{s.label}</span>
              <span className="font-mono font-semibold text-slate-900">{s.value}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${s.cls} transition-all`}
                style={{ width: `${(s.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// ------- Personal Scorecard ----------------------------------------------------
const ScorecardCard = ({ scorecard = {}, todayActivity = {} }) => {
  const rows = [
    {
      label: 'Calls made today',
      value: todayActivity.calls || todayActivity.calls_made || 0,
      icon: Phone,
    },
    {
      label: 'Follow-ups completed today',
      value: todayActivity.followups_completed || todayActivity.completed_followups || 0,
      icon: CheckCircle2,
    },
    {
      label: 'Avg response time',
      value: scorecard.avg_response_time_label || scorecard.avg_response || '—',
      icon: Clock,
    },
    {
      label: 'Demo → enrolled rate',
      value: scorecard.demo_to_enroll_rate != null ? `${scorecard.demo_to_enroll_rate}%` : '—',
      icon: Award,
    },
  ];
  return (
    <Card className="border-0 shadow-sm" data-testid="cockpit-scorecard">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
          <div className="p-1.5 bg-indigo-100 rounded-lg">
            <Target className="w-4 h-4 text-indigo-600" />
          </div>
          Your scorecard
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2.5">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                {r.label}
              </span>
              <span className="font-mono font-semibold text-slate-900">{r.value}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

// ==== MAIN =====================================================================
const CounsellorCockpit = ({ data }) => {
  const nav = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const firstName = (user.name || 'there').split(' ')[0];
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const d = data || {};
  const revenue = d.monthly_revenue || { this_month: 0, target: 0, percent: 0 };
  const streak = d.streak || { current: 0, target_met: false };
  const priority = d.today_priority || {};
  const leadStats = d.lead_stats || {};
  const scheduledDemos = d.scheduled_demos || [];
  const upcomingFollowups = d.upcoming_followups || [];
  const todayFollowups = d.today_followups || [];
  const overdueFollowups = d.missed_followups || [];
  const hotLeads = d.hot_leads || [];

  const focusMessage = (() => {
    if ((priority.followups_overdue || overdueFollowups.length) > 0) {
      const n = priority.followups_overdue || overdueFollowups.length;
      return `${n} follow-up${n > 1 ? 's' : ''} overdue — clear them first.`;
    }
    if (scheduledDemos.filter((x) => x.days_away === 0).length > 0) {
      const n = scheduledDemos.filter((x) => x.days_away === 0).length;
      return `${n} demo${n > 1 ? 's are' : ' is'} scheduled today — prep the room & the lead.`;
    }
    if ((priority.hot_leads_pending || hotLeads.length) > 0) {
      const n = priority.hot_leads_pending || hotLeads.length;
      return `${n} hot lead${n > 1 ? 's are' : ' is'} waiting — strike while warm.`;
    }
    if ((priority.admissions_needed || 0) > 0) {
      return `${priority.admissions_needed} more admission${priority.admissions_needed > 1 ? 's' : ''} to hit your monthly target.`;
    }
    return 'All clear — nurture cold leads or prospect new ones.';
  })();

  const demosWeek = scheduledDemos.length;

  return (
    <div className="space-y-4" data-testid="counsellor-cockpit">
      {/* Header row: Hero + quick actions */}
      <div className="grid grid-cols-1 gap-4">
        <CockpitHero
          firstName={firstName}
          greeting={greeting}
          dateLabel={dateLabel}
          revenue={revenue}
          streak={streak}
          focusMessage={focusMessage}
        />

        {/* Quick action buttons */}
        <div className="flex flex-wrap gap-2" data-testid="cockpit-quick-actions">
          <Button
            onClick={() => nav('/leads?open=create')}
            className="bg-slate-900 hover:bg-slate-800 text-white"
            data-testid="qa-add-lead"
          >
            <Users className="w-4 h-4 mr-1.5" /> Add Lead
          </Button>
          <Button
            onClick={() => nav('/leads?filter=hot')}
            variant="outline"
            className="border-orange-200 text-orange-700 hover:bg-orange-50"
            data-testid="qa-hot-leads"
          >
            <Flame className="w-4 h-4 mr-1.5" /> Hot Leads
          </Button>
          <Button
            onClick={() => nav('/leads?filter=demo_today')}
            variant="outline"
            className="border-violet-200 text-violet-700 hover:bg-violet-50"
            data-testid="qa-demos-today"
          >
            <Calendar className="w-4 h-4 mr-1.5" /> Demos Today
          </Button>
          <Button
            onClick={() => nav('/enrollments?open=create')}
            variant="outline"
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            data-testid="qa-new-admission"
          >
            <GraduationCap className="w-4 h-4 mr-1.5" /> New Admission
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <KpiStrip
        dueToday={todayFollowups.length}
        overdue={overdueFollowups.length}
        demosWeek={demosWeek}
        hotLeads={hotLeads.length}
        admissionsMTD={leadStats.total_converted || 0}
      />

      {/* Main 2/3 + 1/3 split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <ScheduledDemosCard demos={scheduledDemos} />
          <UpcomingFollowupsCard today={todayFollowups} upcoming={upcomingFollowups} />
        </div>
        <div className="space-y-4">
          <OverdueFollowupsCard items={overdueFollowups} />
          <HotLeadsCard leads={hotLeads} />
          <ConversionFunnelCard funnel={d.funnel || {}} leadStats={leadStats} />
          <ScorecardCard scorecard={d.scorecard || {}} todayActivity={d.today_activity || {}} />
        </div>
      </div>
    </div>
  );
};

export default CounsellorCockpit;
