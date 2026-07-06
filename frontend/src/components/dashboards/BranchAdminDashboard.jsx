import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, DollarSign, ArrowDownRight, Award, Calendar, CreditCard, GraduationCap, Gift, Phone, User, Clock, Sparkles, Plus, FileSpreadsheet, BarChart3, Facebook, Building2, Flame } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import TrainerHeatmap from './TrainerHeatmap';
import StudentFeedbackCard from './StudentFeedbackCard';

const safeNum = (val) => (Number.isFinite(val) ? val : 0);
const safeAbs = (val) => Math.abs(safeNum(val));

// Indian numbering format: 1L = 1,00,000 | 1Cr = 1,00,00,000
const formatIndianCurrency = (num) => {
  const absNum = Math.abs(num || 0);
  const sign = num < 0 ? '-' : '';
  
  if (absNum >= 10000000) {
    // Crores (1 Cr = 10,000,000)
    const crores = absNum / 10000000;
    return sign + '₹' + (crores % 1 === 0 ? crores.toFixed(0) : crores.toFixed(2)) + 'Cr';
  } else if (absNum >= 100000) {
    // Lakhs (1 L = 100,000)
    const lakhs = absNum / 100000;
    return sign + '₹' + (lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(2)) + 'L';
  } else if (absNum >= 1000) {
    // Thousands
    const thousands = absNum / 1000;
    return sign + '₹' + (thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)) + 'K';
  } else {
    return sign + '₹' + absNum.toFixed(0);
  }
};

const BranchAdminDashboard = ({ 
  branchFinancialStats, 
  financialData,
  admissionData, 
  sessionComparison, 
  branchIncentiveStats,
  demosToday,
  trainerHeatmap,
  trainerHeatmapLoading,
  onRefreshTrainerHeatmap,
  selectedYear,
  setSelectedYear
}) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const firstName = (user.name || 'there').split(' ')[0];
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const branchName = (user.branch_name || branchFinancialStats?.branch_name || 'your branch');
  const demosTodayCount = demosToday?.demos?.length || demosToday?.count || 0;
  // Backend (/api/branch-admin/financial-stats) returns: monthly_revenue, monthly_admissions, active_unique_students
  const monthRevenue = safeNum(branchFinancialStats?.monthly_revenue);
  const monthAdmissions = safeNum(branchFinancialStats?.monthly_admissions);
  const activeStudents = safeNum(branchFinancialStats?.active_unique_students);
  const yearAdmissions = safeNum(admissionData?.total_admissions);
  const branchStreak = branchFinancialStats?.branch_streak || null;

  const heroMessage = (() => {
    if (demosTodayCount > 0) return `${demosTodayCount} demo${demosTodayCount > 1 ? 's are' : ' is'} scheduled today. Make sure the trainers are briefed.`;
    if (monthAdmissions > 0) return `${monthAdmissions} admission${monthAdmissions > 1 ? 's' : ''} this month so far. Keep the momentum going.`;
    return 'Calm day. Great time to review pipeline health and re-engage cold leads.';
  })();

  return (
    <div className="space-y-6" data-testid="branch-admin-dashboard">

      {/* HERO — Branch Admin */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white p-7 shadow-xl" data-testid="branch-admin-hero">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest text-blue-300 mb-1.5">{dateLabel}</p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              {greeting}, {firstName} <span className="inline-block animate-pulse">👋</span>
            </h2>
            <p className="mt-2 text-blue-100 text-sm lg:text-base max-w-2xl flex items-start gap-2">
              <Building2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-300" />
              <span><span className="font-semibold text-white">{branchName}</span> · {heroMessage}</span>
            </p>
            {branchStreak && (
              <div className="mt-3 flex flex-wrap gap-2" data-testid="branch-streak-chip">
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border ${branchStreak.target_met ? 'bg-emerald-500/15 border-emerald-300/40 text-emerald-100' : 'bg-amber-500/15 border-amber-300/40 text-amber-100'}`}>
                  <Flame className={`w-3.5 h-3.5 ${branchStreak.active_today ? 'text-orange-300' : 'text-amber-200'}`} />
                  <span>
                    <span data-testid="branch-streak-current" className="font-semibold">{branchStreak.current || 0}</span>
                    <span className="opacity-80">-day streak</span>
                  </span>
                  <span className="opacity-60">·</span>
                  <span className="opacity-90">
                    target <span data-testid="branch-streak-target" className="font-semibold">{branchStreak.target_days || 0}</span>
                  </span>
                  {branchStreak.target_met && <span className="ml-1 text-emerald-200">✓ on target</span>}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/15 px-3 py-1.5 text-xs text-blue-100">
                  <span>Best in 30d:</span>
                  <span className="font-semibold text-white" data-testid="branch-streak-longest">{branchStreak.longest_30d || 0} days</span>
                </div>
                {!branchStreak.active_today && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-300/40 px-3 py-1.5 text-xs text-rose-100">
                    No branch activity yet today
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Today snapshot */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[
            { label: "Demos today", value: demosTodayCount, Icon: Calendar, color: 'text-amber-300' },
            { label: "Admissions this month", value: monthAdmissions, Icon: GraduationCap, color: 'text-emerald-300' },
            { label: "Revenue this month", value: formatIndianCurrency(monthRevenue), Icon: DollarSign, color: 'text-sky-300' },
            { label: "Active students", value: activeStudents, Icon: Users, color: 'text-violet-300' },
          ].map((t, i) => (
            <div key={i} className="bg-white/8 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10" data-testid={`branch-hero-tile-${i}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs text-blue-200">{t.label}</p>
                <t.Icon className={`w-4 h-4 ${t.color}`} />
              </div>
              <p className="text-2xl font-bold mt-1">{t.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="branch-admin-quick-actions">
        {[
          { label: "Today's demos", sub: `${demosTodayCount} scheduled`, Icon: Calendar, to: '/demos-today', color: 'bg-amber-600 hover:bg-amber-700' },
          { label: 'All leads', sub: 'Manage pipeline', Icon: Phone, to: '/leads', color: 'bg-blue-600 hover:bg-blue-700' },
          { label: 'Ads lead sheet', sub: 'Connect Google Sheets', Icon: Facebook, to: '/branch-meta-sheet', color: 'bg-indigo-600 hover:bg-indigo-700' },
          { label: 'Reports', sub: 'Branch analytics', Icon: BarChart3, to: '/reports', color: 'bg-slate-700 hover:bg-slate-800' },
        ].map((a, i) => (
          <button
            key={i}
            onClick={() => navigate(a.to)}
            data-testid={`branch-quick-action-${i}`}
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
      
      {/* Demos Booked for Today */}
      {demosToday && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-white" data-testid="demos-today-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                Demos Booked for Today
              </CardTitle>
              <Badge className="bg-amber-600 text-white" data-testid="demos-today-count">
                {demosToday.count || 0} scheduled
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {(!demosToday.demos || demosToday.demos.length === 0) ? (
              <p className="text-sm text-slate-500 py-2">No demos scheduled for today.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {demosToday.demos.map((d) => (
                  <div key={d.id} className="bg-white border border-amber-100 rounded-lg p-3 shadow-sm" data-testid={`demo-today-${d.id}`}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-slate-800">{d.name}</p>
                      <Badge variant="outline" className="text-xs text-amber-700 border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {d.demo_time || 'TBD'}
                      </Badge>
                    </div>
                    {d.program_name && <p className="text-xs text-slate-500 mb-1">{d.program_name}</p>}
                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      {d.number && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{d.number}</span>}
                      {d.trainer_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{d.trainer_name}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trainer Load & Availability Heatmap */}
      <TrainerHeatmap
        data={trainerHeatmap}
        loading={trainerHeatmapLoading}
        onRefresh={onRefreshTrainerHeatmap}
      />

      {/* Student Feedback Inbox */}
      <StudentFeedbackCard />

      {/* 1. Session Summary - TOP */}
      {sessionComparison && (
        <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Session Summary
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {sessionComparison.current_session?.label} vs {sessionComparison.previous_session?.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-white rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Leads</p>
                <p className="text-xl font-bold text-slate-800">{safeNum(sessionComparison.current_session?.leads)}</p>
                <p className={`text-xs ${safeNum(sessionComparison.changes?.leads) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {safeNum(sessionComparison.changes?.leads) >= 0 ? '↑' : '↓'} {safeAbs(sessionComparison.changes?.leads)}%
                </p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Converted</p>
                <p className="text-xl font-bold text-green-600">{safeNum(sessionComparison.current_session?.converted)}</p>
                <p className={`text-xs ${safeNum(sessionComparison.changes?.converted) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {safeNum(sessionComparison.changes?.converted) >= 0 ? '↑' : '↓'} {safeAbs(sessionComparison.changes?.converted)}%
                </p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Conversion</p>
                <p className="text-xl font-bold text-purple-600">{safeNum(sessionComparison.current_session?.conversion_rate)}%</p>
                <p className={`text-xs ${safeNum(sessionComparison.changes?.conversion_rate) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {safeNum(sessionComparison.changes?.conversion_rate) >= 0 ? '↑' : '↓'} {safeAbs(sessionComparison.changes?.conversion_rate)} pts
                </p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Enrollments</p>
                <p className="text-xl font-bold text-blue-600">{safeNum(sessionComparison.current_session?.enrollments)}</p>
                <p className={`text-xs ${safeNum(sessionComparison.changes?.enrollments) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {safeNum(sessionComparison.changes?.enrollments) >= 0 ? '↑' : '↓'} {safeAbs(sessionComparison.changes?.enrollments)}%
                </p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Active Students</p>
                <p className="text-xl font-bold text-orange-600">{branchFinancialStats?.active_unique_students || 0}</p>
                <p className="text-xs text-slate-400">Course in progress</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Income</p>
                <p className="text-xl font-bold text-amber-600">{formatIndianCurrency(safeNum(sessionComparison.current_session?.income))}</p>
                <p className={`text-xs ${safeNum(sessionComparison.changes?.income) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {safeNum(sessionComparison.changes?.income) >= 0 ? '↑' : '↓'} {safeAbs(sessionComparison.changes?.income)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Charts Row - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Income & Expense Chart */}
        {financialData && (
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-semibold text-slate-700">Income & Expenses</CardTitle>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger className="w-20 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={financialData.monthly_data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month_name" stroke="#94A3B8" tick={{fontSize: 10}} />
                  <YAxis stroke="#94A3B8" tick={{fontSize: 10}} tickFormatter={(v) => {
                    if (v >= 10000000) return `₹${(v/10000000).toFixed(1)}Cr`;
                    if (v >= 100000) return `₹${(v/100000).toFixed(1)}L`;
                    if (v >= 1000) return `₹${(v/1000).toFixed(0)}K`;
                    return `₹${v}`;
                  }} />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Legend wrapperStyle={{fontSize: '11px'}} />
                  <Bar dataKey="income" name="Income" fill="#10B981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        
        {/* Monthly Admissions Chart */}
        {admissionData && (
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base font-semibold text-slate-700">Monthly Admissions</CardTitle>
                <Badge variant="outline" className="text-xs">{admissionData.total_admissions} total</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={admissionData.monthly_data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month_name" stroke="#94A3B8" tick={{fontSize: 10}} />
                  <YAxis stroke="#94A3B8" tick={{fontSize: 10}} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="admissions" name="Admissions" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 3. Counsellor Incentives */}
      {branchIncentiveStats && (
        <Card className="border-slate-200" data-testid="branch-admin-incentive-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
              <Gift className="w-4 h-4 text-purple-500" />
              Counsellor Incentives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div className="text-center p-3 bg-emerald-50 rounded-lg" data-testid="branch-incentive-released">
                <p className="text-xs text-emerald-700 mb-1">Incentive Released</p>
                <p className="text-lg font-bold text-emerald-700">₹{(branchIncentiveStats.branch_summary.total_released_incentives || 0).toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 mb-1">Total Earned</p>
                <p className="text-lg font-bold text-green-700">₹{(branchIncentiveStats.branch_summary.total_earned_incentives || 0).toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs text-yellow-600 mb-1">Pending Release</p>
                <p className="text-lg font-bold text-yellow-700">₹{(branchIncentiveStats.branch_summary.total_earned_unreleased_incentives || 0).toLocaleString()}</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 mb-1">Exams Done</p>
                <p className="text-lg font-bold text-blue-700">{branchIncentiveStats.branch_summary.completed_exams || 0}</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-red-600 mb-1">Refunds</p>
                <p className="text-lg font-bold text-red-700">₹{(branchIncentiveStats.branch_summary.total_refunds_pending || 0).toLocaleString()}</p>
              </div>
            </div>
            {branchIncentiveStats.counsellor_stats?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {branchIncentiveStats.counsellor_stats.map((counsellor) => (
                  <div key={counsellor.counsellor_id} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border text-xs">
                    <span className="text-slate-600">{counsellor.counsellor_name}</span>
                    <span className="text-emerald-700 font-semibold" title="Released">₹{(counsellor.released_incentive || 0).toLocaleString()}</span>
                    <span className="text-slate-400">/</span>
                    <span className="text-green-600 font-semibold" title="Total Earned">₹{(counsellor.earned_incentive || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BranchAdminDashboard;
