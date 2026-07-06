import React, { useEffect, useState } from 'react';
import api from '@/api/api';
import { UserPlus, Users, Calendar, Trophy, GraduationCap, DollarSign, Building2, Sparkles } from 'lucide-react';

const ICON_MAP = {
  'user-plus': UserPlus,
  users: Users,
  calendar: Calendar,
  trophy: Trophy,
  'graduation-cap': GraduationCap,
  'dollar-sign': DollarSign,
};

const COLOR_MAP = {
  sky: 'text-sky-300',
  blue: 'text-sky-300',
  amber: 'text-amber-300',
  emerald: 'text-emerald-300',
  violet: 'text-violet-300',
};

const formatInr = (n) => {
  const v = Math.abs(n || 0);
  if (v >= 1e7) return '₹' + (v / 1e7).toFixed(v % 1e7 === 0 ? 0 : 1) + 'Cr';
  if (v >= 1e5) return '₹' + (v / 1e5).toFixed(v % 1e5 === 0 ? 0 : 1) + 'L';
  if (v >= 1e3) return '₹' + (v / 1e3).toFixed(0) + 'K';
  return '₹' + v.toFixed(0);
};

/**
 * Generic dashboard hero for FDE & Placement Manager — fetches /api/analytics/role-hero
 * and renders the same gradient hero used on the counsellor dashboard, tailored to the role.
 */
export default function RoleHero() {
  const [data, setData] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const firstName = (user.name || 'there').split(' ')[0];

  useEffect(() => {
    api.get('/analytics/role-hero').then(({ data }) => setData(data)).catch(() => {});
  }, []);

  if (!data || (!data.kpis?.length && !data.streak)) return null;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const streak = data.streak || { current: 0, active_today: false };
  const target = data.target;
  const focusMessage = (() => {
    if (streak.current > 0 && !streak.active_today) return `🔥 ${streak.current}-day streak alive — log any activity today to keep it going.`;
    if (target && target.percent >= 100) return `🎉 You hit your monthly target. Keep stacking the wins!`;
    if (target && target.percent >= 70) return `Strong month — ${target.percent}% of target. The last push is everything.`;
    if (target && target.target > 0) return `${target.current} of ${target.target} ${target.unit === 'count' ? '' : ''}done — let's close the gap.`;
    return 'Let\u2019s make today count.';
  })();

  const progressColor = target?.percent >= 100 ? 'from-emerald-400 to-emerald-300' : target?.percent >= 70 ? 'from-amber-400 to-amber-300' : 'from-rose-400 to-pink-300';
  const pctColor = target?.percent >= 100 ? 'text-emerald-300' : target?.percent >= 70 ? 'text-amber-300' : 'text-rose-300';
  const gradient = data.role === 'Placement Manager'
    ? 'from-slate-900 via-emerald-900 to-slate-800'
    : 'from-slate-900 via-violet-900 to-slate-800';

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} text-white p-7 shadow-xl mb-6`} data-testid="role-hero">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
      <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-widest text-indigo-300 mb-1.5">{dateLabel} · {data.role}</p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">{greeting}, {firstName} <span className="inline-block animate-pulse">👋</span></h2>
          <p className="mt-2 text-indigo-100 text-sm lg:text-base max-w-2xl flex items-start gap-2">
            <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-300" /> {focusMessage}
          </p>
        </div>
        {streak.current > 0 && (
          <div className={`bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border ${streak.active_today ? 'border-amber-300/40' : 'border-white/15'}`}>
            <p className="text-xs text-indigo-200">Activity streak</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold">🔥 {streak.current}</span>
              <span className="text-xs text-indigo-200">{streak.active_today ? 'active today' : 'log to keep alive'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Target progress */}
      {target && target.target > 0 && (
        <div className="relative mt-5 bg-white/5 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/10" data-testid="role-target-progress">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-indigo-200">
              {target.label} · <span className="font-semibold text-white">{target.unit === 'count' ? target.current : formatInr(target.current)}</span> of {target.unit === 'count' ? target.target : formatInr(target.target)}
            </p>
            <span className={`text-xs font-bold ${pctColor}`}>{target.percent}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${progressColor}`} style={{ width: `${Math.min(100, Math.max(0, target.percent))}%` }} />
          </div>
        </div>
      )}

      {/* KPI tiles */}
      <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        {(data.kpis || []).map((k, i) => {
          const Icon = ICON_MAP[k.icon] || Building2;
          return (
            <div key={i} className="bg-white/8 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10" data-testid={`role-kpi-${i}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs text-indigo-200">{k.label}</p>
                <Icon className={`w-4 h-4 ${COLOR_MAP[k.color] || 'text-slate-300'}`} />
              </div>
              <p className="text-2xl font-bold mt-1">{k.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
