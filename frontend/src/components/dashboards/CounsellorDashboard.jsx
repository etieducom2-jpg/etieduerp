import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, CheckCircle, XCircle, AlertTriangle, Gift, Clock, Phone, MessageSquare } from 'lucide-react';
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

const CounsellorDashboard = ({ counsellorDashboardEnhanced }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8" data-testid="counsellor-dashboard">
      
      {/* 1. Lead Stats - Premium Cards */}
      {counsellorDashboardEnhanced?.lead_stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {/* Total Leads Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-sky-50 to-blue-50 border-0 shadow-sm hover:shadow-lg transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-200/30 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-300" />
            <CardContent className="pt-5 pb-4 px-5 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-sky-500 to-blue-500 rounded-xl shadow-md">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-sky-700/80 font-medium mb-1">Total Leads</p>
              <p className="text-3xl font-bold text-sky-900">{counsellorDashboardEnhanced.lead_stats.total_leads}</p>
              <p className="text-xs text-sky-600/70 mt-2">All assigned leads</p>
            </CardContent>
          </Card>
          
          {/* Converted Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-green-50 border-0 shadow-sm hover:shadow-lg transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/30 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-300" />
            <CardContent className="pt-5 pb-4 px-5 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-md">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-emerald-700/80 font-medium mb-1">Converted</p>
              <p className="text-3xl font-bold text-emerald-700">{counsellorDashboardEnhanced.lead_stats.total_converted}</p>
              <p className="text-xs text-emerald-600/70 mt-2">Successfully enrolled</p>
            </CardContent>
          </Card>
          
          {/* Lost Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-rose-50 to-red-50 border-0 shadow-sm hover:shadow-lg transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-200/30 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-300" />
            <CardContent className="pt-5 pb-4 px-5 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-rose-500 to-red-500 rounded-xl shadow-md">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-rose-700/80 font-medium mb-1">Lost</p>
              <p className="text-3xl font-bold text-rose-700">{counsellorDashboardEnhanced.lead_stats.total_lost}</p>
              <p className="text-xs text-rose-600/70 mt-2">Did not convert</p>
            </CardContent>
          </Card>
          
          {/* Conversion Rate Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-violet-50 to-purple-50 border-0 shadow-sm hover:shadow-lg transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-200/30 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-300" />
            <CardContent className="pt-5 pb-4 px-5 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-md">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-sm text-violet-700/80 font-medium mb-1">Conversion Rate</p>
              <p className="text-3xl font-bold text-violet-700">{counsellorDashboardEnhanced.lead_stats.conversion_rate}%</p>
              <p className="text-xs text-violet-600/70 mt-2">Success ratio</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* LOW CONVERSION RATE ALERT - Shows when < 40% */}
      {counsellorDashboardEnhanced?.lead_stats && 
       counsellorDashboardEnhanced.lead_stats.conversion_rate < 40 && 
       counsellorDashboardEnhanced.lead_stats.total_leads >= 5 && (
        <Card className="border-2 border-orange-300 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-orange-800 flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg animate-pulse">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              Conversion Rate Alert - {counsellorDashboardEnhanced.lead_stats.conversion_rate}%
              <Badge className="bg-orange-200 text-orange-800 ml-auto text-sm">Below 40% Target</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-orange-700 mb-4">
              Your conversion rate is below the target of 40%. Here are some tips to improve your conversion:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/80 rounded-xl p-4 border border-orange-200">
                <h4 className="font-semibold text-orange-900 flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4" /> Follow-up Strategy
                </h4>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>• Call leads within 24 hours of inquiry</li>
                  <li>• Schedule follow-ups at optimal times (10-11 AM, 4-5 PM)</li>
                  <li>• Don't give up - make at least 5 follow-up attempts</li>
                </ul>
              </div>
              <div className="bg-white/80 rounded-xl p-4 border border-orange-200">
                <h4 className="font-semibold text-orange-900 flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4" /> Communication Tips
                </h4>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>• Understand student's goals before pitching</li>
                  <li>• Highlight placement success stories</li>
                  <li>• Offer demo sessions to undecided leads</li>
                </ul>
              </div>
              <div className="bg-white/80 rounded-xl p-4 border border-orange-200">
                <h4 className="font-semibold text-orange-900 flex items-center gap-2 mb-2">
                  <Gift className="w-4 h-4" /> Incentive Offers
                </h4>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>• Mention early-bird discounts if available</li>
                  <li>• Offer flexible payment options</li>
                  <li>• Highlight scholarship opportunities</li>
                </ul>
              </div>
              <div className="bg-white/80 rounded-xl p-4 border border-orange-200">
                <h4 className="font-semibold text-orange-900 flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" /> Timing Matters
                </h4>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>• Create urgency with batch start dates</li>
                  <li>• Follow up on lost leads after 2-3 weeks</li>
                  <li>• Re-engage cold leads with new offers</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Quick Win:</strong> Review your missed follow-ups below and make those calls today. 
                Converting just {Math.max(1, Math.ceil((0.4 * counsellorDashboardEnhanced.lead_stats.total_leads) - counsellorDashboardEnhanced.lead_stats.total_converted))} more leads 
                will bring you to the 40% target!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Alerts Row - Missed Follow-ups, Pending Feedbacks, Missed Tasks */}
      {counsellorDashboardEnhanced && (counsellorDashboardEnhanced.missed_followups?.length > 0 || counsellorDashboardEnhanced.pending_feedbacks?.length > 0 || counsellorDashboardEnhanced.missed_tasks?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Missed Follow-ups Alert */}
          {counsellorDashboardEnhanced.missed_followups?.length > 0 && (
            <Card className="border-red-200 bg-gradient-to-b from-red-50/50 to-white">
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="text-base font-semibold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Missed Follow-ups
                  <Badge className="bg-red-100 text-red-700 ml-auto">{counsellorDashboardEnhanced.missed_followups.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {counsellorDashboardEnhanced.missed_followups.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-red-100">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800">{item.lead_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.lead_number}</p>
                        {item.note && (
                          <p className="text-xs text-red-600 mt-1 italic truncate">"{item.note}"</p>
                        )}
                      </div>
                      <Badge className="bg-red-100 text-red-700 text-xs ml-2">{item.days_missed}d ago</Badge>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4 text-red-700 border-red-200 hover:bg-red-50" onClick={() => navigate('/followups')}>
                  View All Missed
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Pending Feedbacks Alert */}
          {counsellorDashboardEnhanced.pending_feedbacks?.length > 0 && (
            <Card className="border-yellow-200 bg-gradient-to-b from-yellow-50/50 to-white">
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="text-base font-semibold text-yellow-700 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Feedback Pending
                  <Badge className="bg-yellow-100 text-yellow-700 ml-auto">{counsellorDashboardEnhanced.pending_feedbacks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {counsellorDashboardEnhanced.pending_feedbacks.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-yellow-100">
                      <div>
                        <p className="font-medium text-slate-800">{item.student_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.program_name}</p>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-700 text-xs">{item.days_enrolled}d enrolled</Badge>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4 text-yellow-700 border-yellow-200 hover:bg-yellow-50" onClick={() => navigate('/feedback')}>
                  Submit Feedback
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Missed Tasks Alert */}
          {counsellorDashboardEnhanced.missed_tasks?.length > 0 && (
            <Card className="border-orange-200 bg-gradient-to-b from-orange-50/50 to-white">
              <CardHeader className="pb-3 pt-5">
                <CardTitle className="text-base font-semibold text-orange-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Missed Tasks
                  <Badge className="bg-orange-100 text-orange-700 ml-auto">{counsellorDashboardEnhanced.missed_tasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {counsellorDashboardEnhanced.missed_tasks.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-orange-100">
                      <div className="flex-1">
                        <p className="font-medium text-slate-800 truncate">{item.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.priority} priority</p>
                      </div>
                      {item.days_overdue > 0 && (
                        <Badge className="bg-orange-100 text-orange-700 text-xs ml-2">{item.days_overdue}d late</Badge>
                      )}
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4 text-orange-700 border-orange-200 hover:bg-orange-50" onClick={() => navigate('/responsibilities')}>
                  View Tasks
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 3. Today's Follow-ups */}
      {counsellorDashboardEnhanced?.today_followups?.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="text-base font-semibold text-indigo-700 flex items-center gap-2">
              <Phone className="w-4 h-4" /> Today's Follow-ups
              <Badge className="bg-indigo-100 text-indigo-700 ml-2">{counsellorDashboardEnhanced.today_followups.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {counsellorDashboardEnhanced.today_followups.map((fu, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 hover:bg-indigo-100/50 cursor-pointer transition-colors" onClick={() => navigate(`/leads/${fu.lead_id}`)}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{fu.lead_name}</p>
                    <p className="text-sm text-slate-500 mt-1">{fu.lead_number}</p>
                    <p className="text-xs text-slate-400 mt-1">{fu.program}</p>
                    {fu.note && (
                      <p className="text-xs text-indigo-600 mt-2 bg-indigo-100/50 p-2 rounded-lg border-l-2 border-indigo-400 italic">
                        "{fu.note}"
                      </p>
                    )}
                  </div>
                  <Badge className={`ml-3 ${
                    fu.lead_status === 'Hot' ? 'bg-red-100 text-red-700' :
                    fu.lead_status === 'Warm' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{fu.lead_status}</Badge>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-5 border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => navigate('/followups')}>
              View All Follow-ups
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 4. My Incentives - Premium Design */}
      {counsellorDashboardEnhanced?.incentive && (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50/50 via-white to-emerald-50/30 overflow-hidden" data-testid="counsellor-incentive-card">
          <CardHeader className="pb-3 pt-5 border-b border-amber-100/50">
            <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2 uppercase tracking-wide">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg shadow-sm">
                <Gift className="w-4 h-4 text-white" />
              </div>
              My Incentives
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="relative overflow-hidden text-center p-5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 w-12 h-12 bg-slate-100 rounded-full -mr-4 -mt-4" />
                <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wide">Total Bookings</p>
                <p className="text-3xl font-bold text-slate-800">{counsellorDashboardEnhanced.incentive.total_bookings}</p>
              </div>
              <div className="relative overflow-hidden text-center p-5 bg-gradient-to-br from-sky-50 to-white rounded-xl border border-sky-200 group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 w-12 h-12 bg-sky-100 rounded-full -mr-4 -mt-4" />
                <p className="text-xs text-sky-600 font-medium mb-2 uppercase tracking-wide">Completed Exams</p>
                <p className="text-3xl font-bold text-sky-700">{counsellorDashboardEnhanced.incentive.completed_exams}</p>
              </div>
              <div className="relative overflow-hidden text-center p-5 bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-200 group hover:shadow-md transition-all" data-testid="counsellor-incentive-earned">
                <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-100 rounded-full -mr-4 -mt-4" />
                <p className="text-xs text-emerald-600 font-medium mb-2 uppercase tracking-wide">Incentive Earned</p>
                <p className="text-3xl font-bold text-emerald-700">{formatIndianCurrency(counsellorDashboardEnhanced.incentive.earned_incentive)}</p>
              </div>
              <div className="relative overflow-hidden text-center p-5 bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-200 group hover:shadow-md transition-all" data-testid="counsellor-incentive-released">
                <div className="absolute top-0 right-0 w-12 h-12 bg-green-100 rounded-full -mr-4 -mt-4" />
                <p className="text-xs text-green-600 font-medium mb-2 uppercase tracking-wide">Released (Paid)</p>
                <p className="text-3xl font-bold text-green-700">{formatIndianCurrency(counsellorDashboardEnhanced.incentive.released_incentive || 0)}</p>
              </div>
              <div className="relative overflow-hidden text-center p-5 bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-200 group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 w-12 h-12 bg-amber-100 rounded-full -mr-4 -mt-4" />
                <p className="text-xs text-amber-600 font-medium mb-2 uppercase tracking-wide">Pending</p>
                <p className="text-3xl font-bold text-amber-700">{formatIndianCurrency(counsellorDashboardEnhanced.incentive.pending_incentive)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CounsellorDashboard;
