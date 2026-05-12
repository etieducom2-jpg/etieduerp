import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle, AlertTriangle, Award, IndianRupee, Banknote, ClipboardList, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Indian currency format: 1L = 1,00,000 | 1Cr = 1,00,00,000
const formatIndianCurrency = (num) => {
  const absNum = Math.abs(num || 0);
  const sign = num < 0 ? '-' : '';
  
  if (absNum >= 10000000) {
    const crores = absNum / 10000000;
    return sign + '₹' + (crores % 1 === 0 ? crores.toFixed(0) : crores.toFixed(2)) + 'Cr';
  } else if (absNum >= 100000) {
    const lakhs = absNum / 100000;
    return sign + '₹' + (lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(2)) + 'L';
  } else if (absNum >= 1000) {
    const thousands = absNum / 1000;
    return sign + '₹' + (thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)) + 'K';
  } else {
    return sign + '₹' + absNum.toFixed(0);
  }
};

const FDEDashboard = ({ fdeDashboard, fdeDashboardEnhanced }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8" data-testid="fde-dashboard">
      
      {/* Quick Stats Row - Enhanced Cards */}
      {fdeDashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {/* Fee Due Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => navigate('/students')}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-200/30 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-300" />
            <CardContent className="pt-5 pb-4 px-5 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl shadow-md">
                  <IndianRupee className="w-6 h-6 text-white" />
                </div>
                <Badge className="bg-orange-100 text-orange-700 font-semibold">{fdeDashboard.fee_due?.count || 0}</Badge>
              </div>
              <p className="text-sm text-orange-700/80 font-medium mb-1">Fee Due</p>
              <p className="text-3xl font-bold text-orange-900">{formatIndianCurrency(fdeDashboard.fee_due?.amount || 0)}</p>
              <p className="text-xs text-orange-600/70 mt-2">{fdeDashboard.fee_due?.month || 'This Month'}</p>
            </CardContent>
          </Card>
          
          {/* Unassigned Students Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-violet-50 to-purple-50 border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group" onClick={() => navigate('/students')}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-200/30 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-300" />
            <CardContent className="pt-5 pb-4 px-5 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-md">
                  <Users className="w-6 h-6 text-white" />
                </div>
                {(fdeDashboard.students_without_batch || 0) > 0 && (
                  <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
                )}
              </div>
              <p className="text-sm text-violet-700/80 font-medium mb-1">Unassigned</p>
              <p className="text-3xl font-bold text-violet-900">{fdeDashboard.students_without_batch || 0}</p>
              <p className="text-xs text-violet-600/70 mt-2">Students without batch</p>
            </CardContent>
          </Card>
          
          {/* Cash Handling Card */}
          <Card className={`relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group ${fdeDashboard.cash_handling?.updated_today ? 'bg-gradient-to-br from-emerald-50 to-green-50' : 'bg-gradient-to-br from-rose-50 to-red-50'}`} onClick={() => navigate('/finances')}>
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-300 ${fdeDashboard.cash_handling?.updated_today ? 'bg-emerald-200/30' : 'bg-rose-200/30'}`} />
            <CardContent className="pt-5 pb-4 px-5 relative">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl shadow-md ${fdeDashboard.cash_handling?.updated_today ? 'bg-gradient-to-br from-emerald-500 to-green-500' : 'bg-gradient-to-br from-rose-500 to-red-500'}`}>
                  <Banknote className="w-6 h-6 text-white" />
                </div>
                {!fdeDashboard.cash_handling?.updated_today && (
                  <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                )}
              </div>
              <p className={`text-sm font-medium mb-1 ${fdeDashboard.cash_handling?.updated_today ? 'text-emerald-700/80' : 'text-rose-700/80'}`}>Cash Handling</p>
              <p className={`text-3xl font-bold ${fdeDashboard.cash_handling?.updated_today ? 'text-emerald-700' : 'text-rose-700'}`}>
                {fdeDashboard.cash_handling?.updated_today ? 'Done' : 'Pending'}
              </p>
              <p className={`text-xs mt-2 ${fdeDashboard.cash_handling?.updated_today ? 'text-emerald-600/70' : 'text-rose-600/70'}`}>Today: {formatIndianCurrency(fdeDashboard.cash_handling?.today_cash_total || 0)}</p>
            </CardContent>
          </Card>
          
          {/* Tasks Card */}
          <Card className={`relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group ${fdeDashboard.tasks?.overdue > 0 ? 'bg-gradient-to-br from-rose-50 to-red-50' : 'bg-gradient-to-br from-sky-50 to-blue-50'}`} onClick={() => navigate('/tasks')}>
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-300 ${fdeDashboard.tasks?.overdue > 0 ? 'bg-rose-200/30' : 'bg-sky-200/30'}`} />
            <CardContent className="pt-5 pb-4 px-5 relative">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl shadow-md ${fdeDashboard.tasks?.overdue > 0 ? 'bg-gradient-to-br from-rose-500 to-red-500' : 'bg-gradient-to-br from-sky-500 to-blue-500'}`}>
                  <ClipboardList className="w-6 h-6 text-white" />
                </div>
                {fdeDashboard.tasks?.overdue > 0 && (
                  <Badge className="bg-rose-100 text-rose-700 font-semibold">{fdeDashboard.tasks.overdue} overdue</Badge>
                )}
              </div>
              <p className={`text-sm font-medium mb-1 ${fdeDashboard.tasks?.overdue > 0 ? 'text-rose-700/80' : 'text-sky-700/80'}`}>Tasks</p>
              <p className={`text-3xl font-bold ${fdeDashboard.tasks?.overdue > 0 ? 'text-rose-700' : 'text-sky-900'}`}>{fdeDashboard.tasks?.pending || 0}</p>
              <p className={`text-xs mt-2 ${fdeDashboard.tasks?.overdue > 0 ? 'text-rose-600/70' : 'text-sky-600/70'}`}>Pending tasks</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Data Sections - Premium Cards */}
      {fdeDashboardEnhanced && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Overdue Payments - Premium Card */}
          <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-rose-50 via-white to-white overflow-hidden">
            <CardHeader className="pb-3 pt-5 border-b border-rose-100">
              <CardTitle className="text-sm font-bold text-rose-700 flex items-center gap-2 uppercase tracking-wide">
                <div className="p-2 bg-rose-100 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                Overdue Payments
                {fdeDashboardEnhanced.overdue_payments?.length > 0 && (
                  <Badge className="bg-rose-500 text-white ml-auto">{fdeDashboardEnhanced.overdue_payments.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {fdeDashboardEnhanced.overdue_payments?.length > 0 ? (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {fdeDashboardEnhanced.overdue_payments.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-rose-100 hover:border-rose-300 hover:shadow-sm transition-all cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{item.student_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.program_name}</p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="font-bold text-rose-600">{formatIndianCurrency(item.amount)}</p>
                        <Badge className="bg-rose-100 text-rose-700 text-[10px] mt-1 font-medium">{item.days_overdue}d late</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-gradient-to-b from-emerald-50/50 to-white rounded-xl">
                  <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-emerald-700">All Clear!</p>
                  <p className="text-xs text-slate-500 mt-1">No overdue payments</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ready to Enroll - Premium Card */}
          <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-emerald-50 via-white to-white overflow-hidden">
            <CardHeader className="pb-3 pt-5 border-b border-emerald-100">
              <CardTitle className="text-sm font-bold text-emerald-700 flex items-center gap-2 uppercase tracking-wide">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <UserPlus className="w-4 h-4" />
                </div>
                Ready to Enroll
                {fdeDashboardEnhanced.ready_to_enroll?.length > 0 && (
                  <Badge className="bg-emerald-500 text-white ml-auto">{fdeDashboardEnhanced.ready_to_enroll.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {fdeDashboardEnhanced.ready_to_enroll?.length > 0 ? (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {fdeDashboardEnhanced.ready_to_enroll.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-100 hover:border-emerald-300 hover:shadow-sm cursor-pointer transition-all" onClick={() => navigate(`/enrollments/new?lead_id=${item.lead_id}`)}>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{item.student_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.contact_no}</p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs ml-3 font-medium">{item.program_name || 'N/A'}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-gradient-to-b from-emerald-50/50 to-white rounded-xl">
                  <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-emerald-700">Great Work!</p>
                  <p className="text-xs text-slate-500 mt-1">All leads enrolled</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Exams - Premium Card */}
          <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-violet-50 via-white to-white overflow-hidden">
            <CardHeader className="pb-3 pt-5 border-b border-violet-100">
              <CardTitle className="text-sm font-bold text-violet-700 flex items-center gap-2 uppercase tracking-wide">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <Award className="w-4 h-4" />
                </div>
                Pending Exams
                {fdeDashboardEnhanced.pending_exams?.length > 0 && (
                  <Badge className="bg-violet-500 text-white ml-auto">{fdeDashboardEnhanced.pending_exams.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {fdeDashboardEnhanced.pending_exams?.length > 0 ? (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {fdeDashboardEnhanced.pending_exams.slice(0, 6).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-violet-100 hover:border-violet-300 hover:shadow-sm transition-all cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{item.student_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.program_name}</p>
                      </div>
                      <Badge className="bg-violet-100 text-violet-700 text-xs ml-3 font-medium">Course Done</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-gradient-to-b from-emerald-50/50 to-white rounded-xl">
                  <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-emerald-700">All Done!</p>
                  <p className="text-xs text-slate-500 mt-1">No pending exams</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FDEDashboard;
