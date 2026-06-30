import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users, TrendingUp, CheckCircle, XCircle, AlertTriangle, Gift, Clock, Phone,
  MessageSquare, Plus, Search, CalendarPlus, Flame, ArrowUpRight, ArrowDownRight,
  Minus, UserPlus, Trophy, Sparkles, Target, Zap, ChevronRight, Filter, Award, BarChart3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI } from '@/api/api';

// Indian currency: ₹/K/L/Cr
const formatIndianCurrency = (num) => {
  const v = Math.abs(num || 0);
  const sign = num < 0 ? '-' : '';
  if (v >= 1e7) return sign + '₹' + (v / 1e7).toFixed(v % 1e7 === 0 ? 0 : 2) + 'Cr';
  if (v >= 1e5) return sign + '₹' + (v / 1e5).toFixed(v % 1e5 === 0 ? 0 : 2) + 'L';
  if (v >= 1e3) return sign + '₹' + (v / 1e3).toFixed(0) + 'K';
  return sign + '₹' + v.toFixed(0);
};

// --- Compact Hero (greeting + streak + revenue progress) -----------------------
const CompactHero = ({ firstName, dateLabel, greeting, streak, revenue, trend, focusMessage }) => {
  const trendDelta = trend?.delta || 0;
  const TrendIcon = trendDelta > 0 ? ArrowUpRight : trendDelta < 0 ? ArrowDownRight : Minus;
  const trendColor = trendDelta > 0 ? 'text-emerald-300' : trendDelta < 0 ? 'text-rose-300' : 'text-slate-300';
  return (
    <div
      className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-800 text-white px-5 py-3 shadow-md flex flex-wrap items-center gap-4"
      data-testid="counsellor-hero"
    >
      <div className="flex items-baseline gap-3 min-w-0">
        <p className="text-[11px] uppercase tracking-widest text-indigo-300">{dateLabel}</p>
        <h2 className="text-lg font-semibold tracking-tight truncate" data-testid="counsellor-greeting">
          {greeting}, {firstName}
        </h2>
      </div>
      <p className="text-xs text-indigo-100 hidden md:flex items-center gap-1.5 min-w-0 flex-1 truncate">
        <Sparkles className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
        <span className="truncate">{focusMessage}</span>
      </p>
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Streak chip */}
        <div
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
            streak.target_met ? 'bg-emerald-500/15 border-emerald-300/40 text-emerald-100' : 'bg-amber-500/15 border-amber-300/40 text-amber-100'
          }`}
          data-testid="streak-chip"
        >
          <Flame className={`w-3.5 h-3.5 ${streak.active_today ? 'text-orange-300' : 'text-amber-200'}`} />
          <span data-testid="streak-current" className="font-semibold">{streak.current || 0}</span>
          <span className="opacity-80">-day · target</span>
          <span data-testid="streak-target" className="font-semibold">{streak.target_days || 0}</span>
          {streak.target_met && <span className="text-emerald-200 ml-0.5">✓</span>}
        </div>
        {/* Weekly trend pill */}
        <div className="inline-flex items-center gap-1 rounded-full bg-white/8 border border-white/15 px-2.5 py-1 text-xs">
          <span className="text-indigo-200">Wk:</span>
          <span className="font-semibold">{trend?.this_week_conversions ?? 0}</span>
          <span className={`flex items-center ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            {trendDelta > 0 ? `+${trendDelta}` : trendDelta}
          </span>
        </div>
      </div>
      {/* Revenue progress bar — inline, compact */}
      {revenue?.target > 0 && (
        <div className="w-full flex items-center gap-3" data-testid="revenue-progress">
          <p className="text-xs text-indigo-100">
            <span className="font-semibold text-white">{formatIndianCurrency(revenue.this_month)}</span>
            <span className="text-indigo-300"> of {formatIndianCurrency(revenue.target)}</span>
          </p>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden flex-1">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                revenue.percent >= 100 ? 'bg-emerald-400' : revenue.percent >= 70 ? 'bg-amber-400' : 'bg-rose-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, revenue.percent || 0))}%` }}
            />
          </div>
          <span
            className={`text-xs font-bold ${
              revenue.percent >= 100 ? 'text-emerald-300' : revenue.percent >= 70 ? 'text-amber-300' : 'text-rose-300'
            }`}
            data-testid="revenue-percent"
          >
            {revenue.percent}%
          </span>
        </div>
      )}
    </div>
  );
};

// --- Universal Search ----------------------------------------------------------
const UniversalSearchBar = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  const runSearch = useCallback(async (text) => {
    if (!text || text.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await analyticsAPI.universalSearchLeads(text, 10);
      setResults(res.data?.results || []);
      setOpen(true);
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q), 280);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [q, runSearch]);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.querySelector('[data-testid="universal-search-input"]')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="relative" ref={containerRef} data-testid="universal-search">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          data-testid="universal-search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search leads by name, phone, email, program or lead ID…  ( Ctrl+K )"
          className="pl-9 pr-12 h-10 bg-white border-slate-200 focus:border-indigo-400 focus:ring-indigo-200"
        />
        <kbd className="hidden md:inline-block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">⌘K</kbd>
      </div>
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-200 max-h-96 overflow-y-auto" data-testid="universal-search-results">
          {loading && <p className="px-4 py-3 text-sm text-slate-500">Searching…</p>}
          {!loading && results.length === 0 && q.length >= 2 && (
            <p className="px-4 py-3 text-sm text-slate-500" data-testid="universal-search-empty">
              No leads matching &quot;{q}&quot;
            </p>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                navigate(`/leads/${r.id}`);
                setOpen(false);
                setQ('');
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50 text-left border-b border-slate-100 last:border-0"
              data-testid={`universal-search-result-${r.id}`}
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700 flex-shrink-0">
                {(r.name || '?').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{r.name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {r.number} {r.email ? `· ${r.email}` : ''} · {r.program_name || 'No program'}
                </p>
              </div>
              <Badge className="bg-slate-100 text-slate-700 text-xs">{r.status}</Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Today's Priority Center ---------------------------------------------------
const PriorityCenter = ({ priority }) => {
  const navigate = useNavigate();
  if (!priority) return null;
  const tiles = [
    {
      key: 'hot',
      label: 'Hot leads pending',
      sub: 'Untouched today',
      value: priority.hot_leads_pending || 0,
      Icon: Flame,
      to: '/leads?priority=High',
      tone: 'rose',
    },
    {
      key: 'calls',
      label: 'Calls pending',
      sub: 'Open leads to contact',
      value: priority.calls_pending || 0,
      Icon: Phone,
      to: '/leads?status=New,Contacted',
      tone: 'sky',
    },
    {
      key: 'followups',
      label: 'Follow-ups due',
      sub:
        priority.followups_overdue > 0
          ? `+${priority.followups_overdue} overdue`
          : 'Today',
      value: priority.followups_due_today || 0,
      Icon: Clock,
      to: '/followups',
      tone: 'amber',
    },
    {
      key: 'target',
      label: 'Admissions to target',
      sub: `${priority.admissions_this_month}/${priority.monthly_admission_target} done`,
      value: priority.admissions_needed || 0,
      Icon: Target,
      to: '/leads?status=Admission Likely',
      tone: 'emerald',
    },
  ];
  const toneCls = {
    rose: { bg: 'from-rose-50 to-white border-rose-200', icon: 'text-rose-600 bg-rose-100', val: 'text-rose-700' },
    sky: { bg: 'from-sky-50 to-white border-sky-200', icon: 'text-sky-600 bg-sky-100', val: 'text-sky-700' },
    amber: { bg: 'from-amber-50 to-white border-amber-200', icon: 'text-amber-600 bg-amber-100', val: 'text-amber-700' },
    emerald: { bg: 'from-emerald-50 to-white border-emerald-200', icon: 'text-emerald-600 bg-emerald-100', val: 'text-emerald-700' },
  };
  return (
    <div data-testid="priority-center">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-indigo-100 rounded-lg">
          <Zap className="w-4 h-4 text-indigo-600" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Today&apos;s priority — act now</h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => {
          const cls = toneCls[t.tone];
          return (
            <button
              key={t.key}
              onClick={() => navigate(t.to)}
              data-testid={`priority-tile-${t.key}`}
              className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${cls.bg} border-2 p-4 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg ${cls.icon}`}>
                  <t.Icon className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className={`text-3xl font-bold ${cls.val}`} data-testid={`priority-tile-${t.key}-value`}>
                {t.value}
              </p>
              <p className="text-xs font-semibold text-slate-700 mt-1">{t.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{t.sub}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// --- Lead Aging Strip ----------------------------------------------------------
const LeadAgingStrip = ({ aging }) => {
  const navigate = useNavigate();
  if (!aging) return null;
  const buckets = [
    { key: '0_24h', label: '0–24 hrs', value: aging.bucket_0_24h, tone: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { key: '1_3d', label: '1–3 days', value: aging.bucket_1_3d, tone: 'bg-sky-100 text-sky-700 border-sky-200' },
    { key: '3_7d', label: '3–7 days', value: aging.bucket_3_7d, tone: 'bg-amber-100 text-amber-700 border-amber-200' },
    { key: '7_plus', label: '7+ days', value: aging.bucket_7_plus, tone: 'bg-rose-100 text-rose-700 border-rose-200' },
  ];
  return (
    <Card className="border-0 shadow-sm" data-testid="lead-aging-card">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
          <div className="p-1.5 bg-amber-100 rounded-lg">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          Lead aging — neglected leads
          {aging.bucket_7_plus > 0 && (
            <Badge className="bg-rose-100 text-rose-700 ml-auto animate-pulse">
              {aging.bucket_7_plus} stale
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {buckets.map((b) => (
            <button
              key={b.key}
              onClick={() => navigate('/leads')}
              data-testid={`aging-bucket-${b.key}`}
              className={`rounded-xl border-2 ${b.tone} p-3 text-left hover:shadow-sm transition-all`}
            >
              <p className="text-xs font-medium opacity-80">{b.label}</p>
              <p className="text-2xl font-bold mt-1" data-testid={`aging-bucket-${b.key}-value`}>{b.value}</p>
            </button>
          ))}
        </div>
        {aging.sample_7_plus && aging.sample_7_plus.length > 0 && (
          <div className="bg-rose-50/50 rounded-lg p-3 border border-rose-100">
            <p className="text-xs font-semibold text-rose-800 mb-2">Oldest neglected leads (7+ days):</p>
            <div className="flex flex-wrap gap-2">
              {aging.sample_7_plus.slice(0, 5).map((l) => (
                <button
                  key={l.id}
                  onClick={() => navigate(`/leads/${l.id}`)}
                  className="text-xs px-2 py-1 rounded-full bg-white border border-rose-200 text-rose-800 hover:bg-rose-100"
                  data-testid={`aging-sample-${l.id}`}
                >
                  {l.name} · {l.program_name || '—'}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- Conversion Funnel ---------------------------------------------------------
const ConversionFunnel = ({ funnel }) => {
  if (!funnel || !funnel.stages?.length) return null;
  const colors = ['bg-slate-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-emerald-500'];
  const max = Math.max(1, ...funnel.stages.map((s) => s.count));
  return (
    <Card className="border-0 shadow-sm" data-testid="conversion-funnel">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
          <div className="p-1.5 bg-violet-100 rounded-lg">
            <BarChart3 className="w-4 h-4 text-violet-600" />
          </div>
          Conversion funnel
          <Badge className="bg-violet-100 text-violet-700 ml-auto" data-testid="funnel-overall-pct">
            {funnel.overall_conversion_pct}% overall
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2.5">
          {funnel.stages.map((s, idx) => {
            const w = (s.count / max) * 100;
            return (
              <div key={s.status} className="flex items-center gap-3" data-testid={`funnel-stage-${idx}`}>
                <span className="w-32 text-xs font-medium text-slate-600 truncate flex-shrink-0">{s.status}</span>
                <div className="flex-1 h-7 bg-slate-100 rounded-md overflow-hidden relative">
                  <div
                    className={`h-full ${colors[idx % colors.length]} rounded-md transition-all duration-500`}
                    style={{ width: `${Math.max(w, s.count > 0 ? 6 : 0)}%` }}
                  />
                  <span className="absolute inset-0 flex items-center pl-2 text-xs font-semibold text-slate-800">
                    {s.count}
                  </span>
                </div>
                <span
                  className={`w-20 text-xs text-right ${
                    s.drop_off_pct === null
                      ? 'text-slate-400'
                      : s.drop_off_pct > 50
                      ? 'text-rose-600 font-semibold'
                      : s.drop_off_pct > 25
                      ? 'text-amber-600'
                      : 'text-slate-500'
                  }`}
                  data-testid={`funnel-dropoff-${idx}`}
                >
                  {s.drop_off_pct === null ? '—' : `-${s.drop_off_pct}%`}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500 mt-3 italic">
          Drop-off % shows how many leads were lost between this stage and the previous one. High drop-offs flag bottlenecks.
        </p>
      </CardContent>
    </Card>
  );
};

// --- Scorecard -----------------------------------------------------------------
const ScorecardCard = ({ scorecard }) => {
  if (!scorecard) return null;
  const metrics = [
    { key: 'calls', label: 'Calls today', value: scorecard.calls.made, target: scorecard.calls.target, Icon: Phone, color: 'sky' },
    { key: 'followups', label: 'Follow-ups done', value: scorecard.followups.completed, target: scorecard.followups.target, Icon: CheckCircle, color: 'emerald' },
    { key: 'demos', label: 'Demos scheduled', value: scorecard.demos.scheduled, target: scorecard.demos.target, Icon: CalendarPlus, color: 'amber' },
    { key: 'admissions', label: 'Admissions today', value: scorecard.admissions.today, target: scorecard.admissions.target, Icon: Trophy, color: 'violet' },
  ];
  const colorCls = {
    sky: 'from-sky-400 to-sky-500',
    emerald: 'from-emerald-400 to-emerald-500',
    amber: 'from-amber-400 to-amber-500',
    violet: 'from-violet-400 to-violet-500',
  };
  return (
    <Card className="border-0 shadow-sm" data-testid="scorecard">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
          <div className="p-1.5 bg-emerald-100 rounded-lg">
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          My scorecard — today
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((m) => {
            const pct = m.target > 0 ? Math.min(100, Math.round((m.value / m.target) * 100)) : 0;
            return (
              <div key={m.key} className="bg-slate-50 rounded-xl p-3 border border-slate-100" data-testid={`scorecard-${m.key}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <m.Icon className="w-4 h-4 text-slate-500" />
                  <span className={`text-[11px] font-semibold ${pct >= 100 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-slate-500'}`}>
                    {pct}%
                  </span>
                </div>
                <p className="text-xl font-bold text-slate-800">
                  {m.value} <span className="text-sm font-normal text-slate-400">/ {m.target}</span>
                </p>
                <p className="text-xs text-slate-500">{m.label}</p>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${colorCls[m.color]} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// --- Leaderboard ---------------------------------------------------------------
const LeaderboardCard = () => {
  const [data, setData] = useState(null);
  const [metric, setMetric] = useState('admissions');
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    analyticsAPI
      .getCounsellorLeaderboard(period, metric)
      .then((res) => {
        if (alive) setData(res.data);
      })
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [period, metric]);

  const rows = (data?.leaderboard || []).slice(0, 5);
  const metricLabel = metric === 'revenue' ? 'Revenue' : metric === 'conversion' ? 'Conv. %' : 'Admissions';
  const fmtValue = (r) => {
    if (metric === 'revenue') return formatIndianCurrency(r.revenue);
    if (metric === 'conversion') return `${r.conversion_rate}%`;
    return r.admissions;
  };
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <Card className="border-0 shadow-sm" data-testid="leaderboard-card">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
          <div className="p-1.5 bg-amber-100 rounded-lg">
            <Trophy className="w-4 h-4 text-amber-600" />
          </div>
          Leaderboard
          <div className="ml-auto flex items-center gap-1.5">
            <select
              data-testid="leaderboard-period-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white"
            >
              <option value="month">This month</option>
              <option value="week">This week</option>
            </select>
            <select
              data-testid="leaderboard-metric-select"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white"
            >
              <option value="admissions">Admissions</option>
              <option value="revenue">Revenue</option>
              <option value="conversion">Conversion %</option>
            </select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading && <p className="text-sm text-slate-500 py-4">Loading…</p>}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-slate-500 py-4" data-testid="leaderboard-empty">
            No counsellors to rank yet.
          </p>
        )}
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div
              key={r.counsellor_id}
              data-testid={`leaderboard-row-${r.rank}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
                r.is_current_user ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-slate-50 border border-slate-100'
              }`}
            >
              <span className="w-8 text-center text-sm font-bold text-slate-700">
                {medals[r.rank - 1] || `#${r.rank}`}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate flex items-center">
                  <span className="truncate">{r.name}</span>
                  {r.is_current_user && <Badge className="ml-2 bg-indigo-200 text-indigo-800 text-[10px]">You</Badge>}
                </div>
                <p className="text-[11px] text-slate-500">
                  {r.admissions} admissions · {formatIndianCurrency(r.revenue)} · {r.conversion_rate}% conv
                </p>
              </div>
              <span className="text-base font-bold text-slate-800" data-testid={`leaderboard-row-${r.rank}-value`}>
                {fmtValue(r)}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-2 text-right">Ranked by {metricLabel.toLowerCase()}</p>
      </CardContent>
    </Card>
  );
};

// --- AI Insights (light) -------------------------------------------------------
const AIInsightsPanel = ({ data, hot_leads }) => {
  const navigate = useNavigate();
  const insights = [];

  // Build smart, derived insights so the panel is always useful even without AI text
  if ((data?.today_priority?.hot_leads_pending || 0) > 0) {
    insights.push({
      tone: 'rose',
      Icon: Flame,
      title: `${data.today_priority.hot_leads_pending} hot leads uncontacted today`,
      action: 'Call now',
      to: '/leads?priority=High',
    });
  }
  if ((data?.today_priority?.followups_overdue || 0) > 0) {
    insights.push({
      tone: 'amber',
      Icon: AlertTriangle,
      title: `${data.today_priority.followups_overdue} follow-ups are overdue`,
      action: 'View',
      to: '/followups',
    });
  }
  if ((data?.lead_aging?.bucket_7_plus || 0) >= 3) {
    insights.push({
      tone: 'rose',
      Icon: Clock,
      title: `${data.lead_aging.bucket_7_plus} leads stale for 7+ days — risk of going cold`,
      action: 'Re-engage',
      to: '/leads',
    });
  }
  if ((data?.pending_feedbacks?.length || 0) > 0) {
    insights.push({
      tone: 'amber',
      Icon: MessageSquare,
      title: `${data.pending_feedbacks.length} student feedbacks pending`,
      action: 'Submit',
      to: '/feedback',
    });
  }
  if ((data?.lead_stats?.conversion_rate ?? 100) < 30 && (data?.lead_stats?.total_leads || 0) >= 5) {
    insights.push({
      tone: 'rose',
      Icon: TrendingUp,
      title: `Conversion rate ${data.lead_stats.conversion_rate}% — below 30% benchmark`,
      action: 'Tips',
      to: '/leads',
    });
  }
  if ((data?.today_priority?.admissions_needed || 0) === 0 && (data?.today_priority?.monthly_admission_target || 0) > 0) {
    insights.push({
      tone: 'emerald',
      Icon: CheckCircle,
      title: `Monthly admission target hit (${data.today_priority.admissions_this_month}/${data.today_priority.monthly_admission_target})`,
      action: 'View',
      to: '/leads?status=Converted',
    });
  }
  if ((hot_leads?.length || 0) > 0 && insights.length < 4) {
    insights.push({
      tone: 'sky',
      Icon: Sparkles,
      title: `${hot_leads.length} high-priority lead${hot_leads.length > 1 ? 's' : ''} ready to close`,
      action: 'See',
      to: '/leads?priority=High',
    });
  }
  if (insights.length === 0) {
    insights.push({
      tone: 'emerald',
      Icon: CheckCircle,
      title: 'All clear — no urgent risks detected today',
      action: null,
      to: null,
    });
  }

  const toneCls = {
    rose: 'border-rose-200 bg-rose-50/40 text-rose-800',
    amber: 'border-amber-200 bg-amber-50/40 text-amber-800',
    emerald: 'border-emerald-200 bg-emerald-50/40 text-emerald-800',
    sky: 'border-sky-200 bg-sky-50/40 text-sky-800',
  };

  return (
    <Card className="border-0 shadow-sm" data-testid="ai-insights-panel">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
          <div className="p-1.5 bg-fuchsia-100 rounded-lg">
            <Sparkles className="w-4 h-4 text-fuchsia-600" />
          </div>
          AI insights & risk alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {insights.slice(0, 5).map((ins, idx) => (
            <div
              key={idx}
              data-testid={`insight-${idx}`}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border ${toneCls[ins.tone]}`}
            >
              <ins.Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="text-xs flex-1">{ins.title}</p>
              {ins.action && ins.to && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => navigate(ins.to)}
                >
                  {ins.action}
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// --- Main Counsellor Dashboard -------------------------------------------------
const CounsellorDashboard = ({ counsellorDashboardEnhanced }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const firstName = (user.name || 'there').split(' ')[0];
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const d = counsellorDashboardEnhanced || {};
  const hotLeads = d.hot_leads || [];
  const today = d.today_activity || {};
  const trend = d.weekly_trend || {};
  const streak = d.streak || { current: 0, longest_30d: 0, active_today: false, target_days: 0, target_met: false };
  const revenue = d.monthly_revenue || { this_month: 0, target: 0, percent: 0 };

  const focusMessage = (() => {
    if ((d.today_priority?.followups_overdue || 0) > 0) {
      return `${d.today_priority.followups_overdue} follow-up${d.today_priority.followups_overdue > 1 ? 's' : ''} overdue — clear them first.`;
    }
    if ((d.today_priority?.hot_leads_pending || 0) > 0) {
      return `${d.today_priority.hot_leads_pending} hot lead${d.today_priority.hot_leads_pending > 1 ? 's are' : ' is'} waiting — strike while warm.`;
    }
    if ((d.today_priority?.admissions_needed || 0) > 0) {
      return `${d.today_priority.admissions_needed} more admission${d.today_priority.admissions_needed > 1 ? 's' : ''} to hit your monthly target.`;
    }
    return 'All clear — nurture cold leads or prospect new ones.';
  })();

  return (
    <div className="space-y-5" data-testid="counsellor-dashboard">
      <CompactHero
        firstName={firstName}
        dateLabel={dateLabel}
        greeting={greeting}
        streak={streak}
        revenue={revenue}
        trend={trend}
        focusMessage={focusMessage}
      />

      <UniversalSearchBar />

      <PriorityCenter priority={d.today_priority} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <LeadAgingStrip aging={d.lead_aging} />
          <ConversionFunnel funnel={d.funnel} />
          <ScorecardCard scorecard={d.scorecard} />
        </div>
        <div className="space-y-5">
          <AIInsightsPanel data={d} hot_leads={hotLeads} />
          <LeaderboardCard />
          {/* Hot leads compact list */}
          <Card className="border-0 shadow-sm" data-testid="counsellor-hot-leads">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                <div className="p-1.5 bg-rose-100 rounded-lg">
                  <Flame className="w-4 h-4 text-rose-600" />
                </div>
                Hot leads — call first
                <Badge className="bg-rose-100 text-rose-700 ml-auto">{hotLeads.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {hotLeads.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No hot leads waiting. Nice work.</p>
              ) : (
                <div className="space-y-2">
                  {hotLeads.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => navigate(`/leads/${l.id}`)}
                      data-testid={`hot-lead-${l.id}`}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-rose-100 bg-rose-50/40 hover:bg-rose-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 font-semibold text-rose-700">
                        {(l.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{l.name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {l.number} · {l.program_name || '—'}
                        </p>
                      </div>
                      <Badge className="bg-white border border-rose-200 text-rose-700 text-xs">{l.status}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QUICK ACTIONS toolbar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="counsellor-quick-actions">
        {[
          { label: 'Add new lead', sub: 'Capture an enquiry', Icon: Plus, to: '/leads?new=1', color: 'bg-blue-600 hover:bg-blue-700' },
          { label: 'Pipeline (Kanban)', sub: 'Drag leads across stages', Icon: BarChart3, to: '/leads/pipeline', color: 'bg-violet-600 hover:bg-violet-700' },
          { label: "Today's follow-ups", sub: `${d.today_followups?.length || 0} scheduled`, Icon: Phone, to: '/followups', color: 'bg-emerald-600 hover:bg-emerald-700' },
          { label: 'All leads', sub: 'Manage pipeline', Icon: Filter, to: '/leads', color: 'bg-slate-700 hover:bg-slate-800' },
        ].map((a, i) => (
          <button
            key={i}
            onClick={() => navigate(a.to)}
            data-testid={`quick-action-${i}`}
            className={`group flex items-center gap-3 ${a.color} text-white rounded-xl p-4 transition-all shadow-sm hover:shadow-lg hover:-translate-y-0.5 text-left`}
          >
            <div className="p-2 bg-white/15 rounded-lg group-hover:bg-white/25 transition-colors">
              <a.Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{a.label}</p>
              <p className="text-xs text-white/75 truncate">{a.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Existing alerts row */}
      {(d.missed_followups?.length > 0 || d.pending_feedbacks?.length > 0 || d.missed_tasks?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {d.missed_followups?.length > 0 && (
            <Card className="border-red-200 bg-gradient-to-b from-red-50/50 to-white" data-testid="missed-followups-card">
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="text-base font-semibold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Missed follow-ups
                  <Badge className="bg-red-100 text-red-700 ml-auto">{d.missed_followups.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {d.missed_followups.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-red-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{item.lead_name}</p>
                        <p className="text-xs text-slate-500">{item.lead_number}</p>
                      </div>
                      <Badge className="bg-red-100 text-red-700 text-xs ml-2">{item.days_missed}d ago</Badge>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3 text-red-700 border-red-200 hover:bg-red-50" onClick={() => navigate('/followups')}>
                  View all
                </Button>
              </CardContent>
            </Card>
          )}
          {d.pending_feedbacks?.length > 0 && (
            <Card className="border-yellow-200 bg-gradient-to-b from-yellow-50/50 to-white" data-testid="pending-feedbacks-card">
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="text-base font-semibold text-yellow-700 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Feedback pending
                  <Badge className="bg-yellow-100 text-yellow-700 ml-auto">{d.pending_feedbacks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {d.pending_feedbacks.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-yellow-100">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.student_name}</p>
                        <p className="text-xs text-slate-500">{item.program_name}</p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-700 text-xs">{item.days_enrolled}d</Badge>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3 text-yellow-700 border-yellow-200 hover:bg-yellow-50" onClick={() => navigate('/feedback')}>
                  Submit
                </Button>
              </CardContent>
            </Card>
          )}
          {d.missed_tasks?.length > 0 && (
            <Card className="border-orange-200 bg-gradient-to-b from-orange-50/50 to-white" data-testid="missed-tasks-card">
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="text-base font-semibold text-orange-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Missed tasks
                  <Badge className="bg-orange-100 text-orange-700 ml-auto">{d.missed_tasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {d.missed_tasks.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-orange-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.priority}</p>
                      </div>
                      {item.days_overdue > 0 && (
                        <Badge className="bg-orange-100 text-orange-700 text-xs ml-2">{item.days_overdue}d late</Badge>
                      )}
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3 text-orange-700 border-orange-200 hover:bg-orange-50" onClick={() => navigate('/responsibilities')}>
                  View tasks
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Today's Follow-ups (full list) */}
      {d.today_followups?.length > 0 && (
        <Card className="border-slate-200" data-testid="today-followups-card">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-sm font-bold text-indigo-700 flex items-center gap-2 uppercase tracking-wide">
              <Phone className="w-4 h-4" /> Today&apos;s follow-ups
              <Badge className="bg-indigo-100 text-indigo-700 ml-2">{d.today_followups.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {d.today_followups.map((fu, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 hover:bg-indigo-100/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/leads/${fu.lead_id}`)}
                  data-testid={`today-followup-${idx}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{fu.lead_name}</p>
                    <p className="text-xs text-slate-500">{fu.lead_number}</p>
                    {fu.note && (
                      <p className="text-xs text-indigo-600 mt-1 italic truncate">&ldquo;{fu.note}&rdquo;</p>
                    )}
                  </div>
                  <Badge className="ml-2 bg-blue-100 text-blue-700">{fu.lead_status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats summary (compact) */}
      {d.lead_stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="lead-stats-row">
          <Card className="bg-gradient-to-br from-sky-50 to-blue-50 border-0 shadow-sm" data-testid="lead-stats-total">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-500 rounded-lg"><Users className="w-4 h-4 text-white" /></div>
                <div>
                  <p className="text-xs text-sky-700/80">Total leads</p>
                  <p className="text-2xl font-bold text-sky-900">{d.lead_stats.total_leads}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-0 shadow-sm" data-testid="lead-stats-converted">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500 rounded-lg"><CheckCircle className="w-4 h-4 text-white" /></div>
                <div>
                  <p className="text-xs text-emerald-700/80">Converted</p>
                  <p className="text-2xl font-bold text-emerald-700">{d.lead_stats.total_converted}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-rose-50 to-red-50 border-0 shadow-sm" data-testid="lead-stats-lost">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500 rounded-lg"><XCircle className="w-4 h-4 text-white" /></div>
                <div>
                  <p className="text-xs text-rose-700/80">Lost</p>
                  <p className="text-2xl font-bold text-rose-700">{d.lead_stats.total_lost}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-0 shadow-sm" data-testid="lead-stats-conversion">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500 rounded-lg"><TrendingUp className="w-4 h-4 text-white" /></div>
                <div>
                  <p className="text-xs text-violet-700/80">Conversion</p>
                  <p className="text-2xl font-bold text-violet-700">{d.lead_stats.conversion_rate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Incentives — kept from existing design */}
      {d.incentive && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50/50 via-white to-emerald-50/30" data-testid="counsellor-incentive-card">
          <CardHeader className="pb-3 pt-4 border-b border-amber-100/50">
            <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2 uppercase tracking-wide">
              <div className="p-1.5 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg shadow-sm">
                <Gift className="w-4 h-4 text-white" />
              </div>
              My incentives
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 uppercase">Bookings</p>
                <p className="text-2xl font-bold text-slate-800">{d.incentive.total_bookings}</p>
              </div>
              <div className="text-center p-3 bg-sky-50 rounded-xl border border-sky-200">
                <p className="text-xs text-sky-600 uppercase">Completed</p>
                <p className="text-2xl font-bold text-sky-700">{d.incentive.completed_exams}</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 rounded-xl border border-emerald-200" data-testid="counsellor-incentive-earned">
                <p className="text-xs text-emerald-600 uppercase">Earned</p>
                <p className="text-2xl font-bold text-emerald-700">{formatIndianCurrency(d.incentive.earned_incentive)}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-xl border border-green-200" data-testid="counsellor-incentive-released">
                <p className="text-xs text-green-600 uppercase">Released</p>
                <p className="text-2xl font-bold text-green-700">{formatIndianCurrency(d.incentive.released_incentive || 0)}</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-xs text-amber-600 uppercase">Pending</p>
                <p className="text-2xl font-bold text-amber-700">{formatIndianCurrency(d.incentive.pending_incentive)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CounsellorDashboard;
