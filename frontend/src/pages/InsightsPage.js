import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { aiAnalyticsAPI, attendanceAPI, metaAPI, auditAPI, campaignAPI, feedbackAPI, followupAPI } from '@/api/api';
import { format } from 'date-fns';
import { 
  Brain, TrendingUp, TrendingDown, Users, IndianRupee, 
  GraduationCap, Target, AlertTriangle, CheckCircle, 
  RefreshCw, BarChart3, Sparkles, Building2, Zap,
  Phone, Calendar, Star, Lightbulb, Award, UserCheck,
  Clock, ClipboardList, XCircle, Facebook, DollarSign,
  Eye, MousePointer, Play, Pause, Archive, ArrowUpRight,
  History, Edit, Plus, Trash2, Activity, MessageSquare,
  Bell, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown,
  ArrowRight, Megaphone, Search, Filter
} from 'lucide-react';

// Import modular components
import { HealthScoreCard, InsightsColumn, QuickStatsGrid, LoadingState } from '@/components/insights';

const InsightsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Business Overview State
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [businessOverview, setBusinessOverview] = useState(null);
  
  // Branch Analytics State
  const [branchLoading, setBranchLoading] = useState(true);
  const [branchAnalytics, setBranchAnalytics] = useState(null);
  const [branchRefreshing, setBranchRefreshing] = useState(false);
  
  // User Efficiency State
  const [efficiencyLoading, setEfficiencyLoading] = useState(true);
  const [efficiencyData, setEfficiencyData] = useState(null);
  const [efficiencyRefreshing, setEfficiencyRefreshing] = useState(false);
  
  // Attendance State
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState(null);
  
  // Meta Analytics State
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaAnalytics, setMetaAnalytics] = useState(null);
  const [metaLeads, setMetaLeads] = useState([]);
  const [metaSyncing, setMetaSyncing] = useState(false);
  const [metaDays, setMetaDays] = useState('30');
  
  // Activity Logs State
  const [logsLoading, setLogsLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [logsSummary, setLogsSummary] = useState(null);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsFilters, setLogsFilters] = useState({ entity_type: '', action: '' });
  
  // Campaign State
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignStats, setCampaignStats] = useState(null);
  
  // Feedback State
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedback, setFeedback] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState(null);
  
  // Follow-ups State
  const [followupsLoading, setFollowupsLoading] = useState(true);
  const [followups, setFollowups] = useState([]);
  const [followupsStats, setFollowupsStats] = useState(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const branchId = user.branch_id;

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchBusinessOverview();
    } else if (activeTab === 'branch') {
      fetchBranchAnalytics();
    } else if (activeTab === 'efficiency') {
      fetchEfficiencyData();
    } else if (activeTab === 'attendance') {
      fetchAttendanceData();
    } else if (activeTab === 'meta') {
      fetchMetaData();
    } else if (activeTab === 'activity') {
      fetchActivityLogs();
    } else if (activeTab === 'campaigns') {
      fetchCampaigns();
    } else if (activeTab === 'feedback') {
      fetchFeedback();
    } else if (activeTab === 'followups') {
      fetchFollowups();
    }
  }, [activeTab, logsPage, logsFilters]);

  // Business Overview - Enhanced AI Summary
  const fetchBusinessOverview = async () => {
    setOverviewLoading(true);
    try {
      const [branchRes, efficiencyRes, followupRes] = await Promise.all([
        aiAnalyticsAPI.getBranchInsights(),
        aiAnalyticsAPI.getUserEfficiency(),
        followupAPI.getPendingCount()
      ]);
      
      setBusinessOverview({
        branch: branchRes.data,
        efficiency: efficiencyRes.data,
        pendingFollowups: followupRes.data.count
      });
    } catch (error) {
      toast.error('Failed to load business overview');
    } finally {
      setOverviewLoading(false);
    }
  };

  // Branch Analytics
  const fetchBranchAnalytics = async () => {
    try {
      const response = await aiAnalyticsAPI.getBranchInsights();
      setBranchAnalytics(response.data);
    } catch (error) {
      toast.error('Failed to load branch analytics');
    } finally {
      setBranchLoading(false);
      setBranchRefreshing(false);
    }
  };

  // User Efficiency
  const fetchEfficiencyData = async () => {
    try {
      const response = await aiAnalyticsAPI.getUserEfficiency();
      setEfficiencyData(response.data);
    } catch (error) {
      toast.error('Failed to load efficiency data');
    } finally {
      setEfficiencyLoading(false);
      setEfficiencyRefreshing(false);
    }
  };

  // Attendance
  const fetchAttendanceData = async () => {
    try {
      const response = await attendanceAPI.getMissedInsights();
      setAttendanceData(response.data);
    } catch (error) {
      toast.error('Failed to load attendance insights');
    } finally {
      setAttendanceLoading(false);
    }
  };

  // Meta Analytics
  const fetchMetaData = async () => {
    if (!branchId) {
      setMetaLoading(false);
      return;
    }
    setMetaLoading(true);
    try {
      const [analyticsRes, leadsRes] = await Promise.all([
        metaAPI.getAnalytics(branchId, parseInt(metaDays)),
        metaAPI.getLeads({ branch_id: branchId })
      ]);
      setMetaAnalytics(analyticsRes.data);
      setMetaLeads(leadsRes.data);
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Meta not configured for your branch');
      }
      console.error('Meta fetch error:', error);
    } finally {
      setMetaLoading(false);
    }
  };

  // Activity Logs
  const fetchActivityLogs = async () => {
    setLogsLoading(true);
    try {
      const params = { page: logsPage, limit: 20 };
      if (logsFilters.entity_type) params.entity_type = logsFilters.entity_type;
      if (logsFilters.action) params.action = logsFilters.action;

      const [logsRes, summaryRes] = await Promise.all([
        auditAPI.getLogs(params),
        auditAPI.getSummary(7)
      ]);
      
      setLogs(logsRes.data.logs);
      setLogsTotalPages(logsRes.data.total_pages);
      setLogsSummary(summaryRes.data);
    } catch (error) {
      toast.error('Failed to load activity logs');
    } finally {
      setLogsLoading(false);
    }
  };

  // Campaigns
  const fetchCampaigns = async () => {
    setCampaignsLoading(true);
    try {
      const response = await campaignAPI.getAll();
      setCampaigns(response.data);
      
      // Calculate stats
      const stats = {
        total: response.data.length,
        active: response.data.filter(c => c.status === 'active').length,
        totalBudget: response.data.reduce((sum, c) => sum + (c.budget || 0), 0),
        totalLeads: response.data.reduce((sum, c) => sum + (c.leads_generated || 0), 0)
      };
      setCampaignStats(stats);
    } catch (error) {
      toast.error('Failed to load campaigns');
    } finally {
      setCampaignsLoading(false);
    }
  };

  // Feedback
  const fetchFeedback = async () => {
    setFeedbackLoading(true);
    try {
      const response = await feedbackAPI.getAll({ limit: 50 });
      setFeedback(response.data);
      
      // Calculate stats
      const ratings = response.data.map(f => f.rating).filter(r => r);
      const stats = {
        total: response.data.length,
        avgRating: ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 0,
        positive: response.data.filter(f => f.rating >= 4).length,
        needsAttention: response.data.filter(f => f.rating && f.rating < 3).length
      };
      setFeedbackStats(stats);
    } catch (error) {
      toast.error('Failed to load feedback');
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Follow-ups
  const fetchFollowups = async () => {
    setFollowupsLoading(true);
    try {
      const response = await followupAPI.getPending();
      setFollowups(response.data);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Helper to safely parse dates - support both scheduled_date and followup_date
      const parseDate = (item) => {
        const dateStr = item.scheduled_date || item.followup_date;
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
      };
      
      const stats = {
        total: response.data.length,
        today: response.data.filter(f => {
          const d = parseDate(f);
          if (!d) return false;
          const dCopy = new Date(d);
          dCopy.setHours(0, 0, 0, 0);
          return dCopy.getTime() === today.getTime();
        }).length,
        overdue: response.data.filter(f => {
          const d = parseDate(f);
          if (!d) return false;
          const dCopy = new Date(d);
          dCopy.setHours(0, 0, 0, 0);
          return dCopy < today;
        }).length,
        upcoming: response.data.filter(f => {
          const d = parseDate(f);
          if (!d) return false;
          const dCopy = new Date(d);
          dCopy.setHours(0, 0, 0, 0);
          return dCopy > today;
        }).length
      };
      setFollowupsStats(stats);
    } catch (error) {
      toast.error('Failed to load follow-ups');
    } finally {
      setFollowupsLoading(false);
    }
  };

  // Helper Functions
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-blue-50 border-blue-200';
    if (score >= 40) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return format(date, 'dd MMM yyyy, h:mm a');
    } catch {
      return '-';
    }
  };

  // Business Overview Tab - What's Working & What Needs Attention
  const renderBusinessOverview = () => {
    if (overviewLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Brain className="w-16 h-16 text-indigo-500 mx-auto animate-pulse" />
            <p className="mt-4 text-slate-500">Analyzing your business...</p>
          </div>
        </div>
      );
    }

    const branchData = businessOverview?.branch;
    const efficiencyData = businessOverview?.efficiency;
    const aiAnalysis = branchData?.ai_analysis;
    // AI overall_health score is 1-10, convert to 0-100 for display
    const rawScore = aiAnalysis?.overall_health?.score || 0;
    const healthScore = rawScore <= 10 ? rawScore * 10 : rawScore;
    
    // Build metrics from actual response structure
    const metrics = {
      total_leads: branchData?.leads?.total || 0,
      total_enrollments: branchData?.students?.active || 0,
      conversion_rate: branchData?.leads?.conversion_rate || 0,
      total_revenue: branchData?.income?.this_month || 0
    };

    // Categorize insights - AI-powered when available
    const goingWell = [];
    const needsAttention = [];

    // If AI analysis is available, use AI insights
    if (aiAnalysis && branchData?.ai_powered) {
      // Income insights
      if (aiAnalysis.income_insights?.trend === 'growing') {
        goingWell.push({ 
          title: 'Revenue Growing', 
          detail: aiAnalysis.income_insights.forecast || 'Positive trend in collections',
          icon: TrendingUp 
        });
      } else if (aiAnalysis.income_insights?.trend === 'declining') {
        needsAttention.push({ 
          title: 'Revenue Declining', 
          detail: aiAnalysis.income_insights.recommendation || 'Focus on improving collections',
          icon: TrendingDown, 
          priority: 'high' 
        });
      }

      // Student/retention insights
      if (aiAnalysis.student_insights?.retention_risk === 'low') {
        goingWell.push({ 
          title: 'Low Retention Risk', 
          detail: 'Student engagement is healthy',
          icon: UserCheck 
        });
      } else if (aiAnalysis.student_insights?.retention_risk === 'high') {
        needsAttention.push({ 
          title: 'High Retention Risk', 
          detail: aiAnalysis.student_insights.recommendation || 'Focus on student engagement',
          icon: AlertTriangle, 
          priority: 'high' 
        });
      }

      // Fee collection status
      if (aiAnalysis.student_insights?.fee_collection_status === 'healthy') {
        goingWell.push({ 
          title: 'Fee Collection Healthy', 
          detail: `${branchData?.students?.fee_efficiency_percent || 0}% collection efficiency`,
          icon: IndianRupee 
        });
      } else if (aiAnalysis.student_insights?.fee_collection_status === 'critical') {
        needsAttention.push({ 
          title: 'Critical Fee Collection', 
          detail: `₹${(branchData?.students?.pending_fees || 0).toLocaleString()} pending`,
          icon: IndianRupee, 
          priority: 'high' 
        });
      }

      // Trainer workload insights
      if (aiAnalysis.trainer_analysis?.overloaded?.length > 0) {
        needsAttention.push({ 
          title: 'Trainer Overload', 
          detail: aiAnalysis.trainer_analysis.recommendation || 'Review workload distribution',
          icon: Users, 
          priority: 'medium' 
        });
      }
      if (aiAnalysis.trainer_analysis?.underutilized?.length > 0 && aiAnalysis.trainer_analysis?.underutilized?.length > 0) {
        needsAttention.push({ 
          title: 'Underutilized Trainers', 
          detail: `${aiAnalysis.trainer_analysis.underutilized.join(', ')} have capacity`,
          icon: Users, 
          priority: 'low' 
        });
      }

      // Add AI summary as a top priority item if score is low
      if (aiAnalysis.overall_health?.top_priority) {
        needsAttention.unshift({ 
          title: 'Top Priority', 
          detail: aiAnalysis.overall_health.top_priority,
          icon: Zap, 
          priority: 'high' 
        });
      }
    }

    // Fallback rule-based analysis if AI not available
    if (!branchData?.ai_powered) {
      if (metrics.conversion_rate >= 20) {
        goingWell.push({ title: 'Strong Conversion Rate', detail: `${metrics.conversion_rate}% - Above industry average`, icon: TrendingUp });
      } else if (metrics.conversion_rate < 10) {
        needsAttention.push({ title: 'Low Conversion Rate', detail: `Only ${metrics.conversion_rate}% leads converting`, icon: TrendingDown, priority: 'high' });
      }

      if (metrics.total_enrollments > 0) {
        goingWell.push({ title: 'Active Enrollments', detail: `${metrics.total_enrollments} students enrolled`, icon: GraduationCap });
      }

      if (metrics.total_revenue > 100000) {
        goingWell.push({ title: 'Revenue Growth', detail: `₹${metrics.total_revenue?.toLocaleString()} collected`, icon: IndianRupee });
      }
    }

    // Follow-ups (always check)
    if (businessOverview?.pendingFollowups > 10) {
      needsAttention.push({ title: 'Pending Follow-ups', detail: `${businessOverview.pendingFollowups} follow-ups waiting`, icon: Bell, priority: 'medium' });
    } else if (businessOverview?.pendingFollowups <= 5) {
      goingWell.push({ title: 'Follow-ups On Track', detail: 'Team is staying on top of follow-ups', icon: CheckCircle });
    }

    return (
      <div className="space-y-6">
        {/* Health Score Banner */}
        <Card className={`border-2 ${getScoreBgColor(healthScore)}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-800">Business Health Score</h2>
                <p className="text-slate-600 mt-1">AI-powered analysis of your branch performance</p>
                {aiAnalysis?.overall_health?.summary && (
                  <p className="text-sm text-slate-700 mt-3 bg-slate-50 p-3 rounded-lg border-l-4 border-indigo-400">
                    <Sparkles className="w-4 h-4 inline-block mr-1 text-indigo-500" />
                    {aiAnalysis.overall_health.summary}
                  </p>
                )}
              </div>
              <div className="text-right ml-6">
                <span className={`text-6xl font-bold ${getScoreColor(healthScore)}`}>{healthScore}</span>
                <span className="text-2xl text-slate-400">/100</span>
                <p className={`text-sm mt-1 font-medium ${
                  aiAnalysis?.overall_health?.status === 'excellent' ? 'text-green-600' :
                  aiAnalysis?.overall_health?.status === 'good' ? 'text-blue-600' :
                  aiAnalysis?.overall_health?.status === 'needs improvement' ? 'text-amber-600' :
                  'text-red-600'
                }`}>
                  {aiAnalysis?.overall_health?.status?.toUpperCase() || 'ANALYZING...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* What's Going Well */}
          <Card className="border-green-200">
            <CardHeader className="bg-green-50 rounded-t-lg">
              <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" /> What's Going Well
              </CardTitle>
              <CardDescription className="text-green-600">Areas where your branch excels</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {goingWell.length === 0 ? (
                <p className="text-slate-500 text-center py-4">Keep improving to see positive highlights!</p>
              ) : (
                <div className="space-y-3">
                  {goingWell.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                      <item.icon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-green-800">{item.title}</p>
                        <p className="text-sm text-green-600">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* What Needs Attention */}
          <Card className="border-amber-200">
            <CardHeader className="bg-amber-50 rounded-t-lg">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
                <AlertTriangle className="w-5 h-5" /> Needs Attention
              </CardTitle>
              <CardDescription className="text-amber-600">Areas to focus on for improvement</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {needsAttention.length === 0 ? (
                <p className="text-slate-500 text-center py-4">Great! No immediate concerns.</p>
              ) : (
                <div className="space-y-3">
                  {needsAttention.map((item, idx) => (
                    <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${
                      item.priority === 'high' ? 'bg-red-50' : item.priority === 'medium' ? 'bg-amber-50' : 'bg-slate-50'
                    }`}>
                      <item.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        item.priority === 'high' ? 'text-red-600' : item.priority === 'medium' ? 'text-amber-600' : 'text-slate-600'
                      }`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold ${
                            item.priority === 'high' ? 'text-red-800' : item.priority === 'medium' ? 'text-amber-800' : 'text-slate-800'
                          }`}>{item.title}</p>
                          {item.priority === 'high' && <Badge className="bg-red-100 text-red-700 text-xs">Urgent</Badge>}
                        </div>
                        <p className={`text-sm ${
                          item.priority === 'high' ? 'text-red-600' : item.priority === 'medium' ? 'text-amber-600' : 'text-slate-600'
                        }`}>{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <Users className="w-8 h-8 text-blue-500 mx-auto" />
              <p className="text-3xl font-bold mt-2">{metrics.total_leads || 0}</p>
              <p className="text-sm text-slate-500">Total Leads</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <GraduationCap className="w-8 h-8 text-purple-500 mx-auto" />
              <p className="text-3xl font-bold mt-2">{metrics.total_enrollments || 0}</p>
              <p className="text-sm text-slate-500">Enrollments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Target className="w-8 h-8 text-green-500 mx-auto" />
              <p className="text-3xl font-bold mt-2">{metrics.conversion_rate || 0}%</p>
              <p className="text-sm text-slate-500">Conversion Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <IndianRupee className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-3xl font-bold mt-2">₹{(metrics.total_revenue || 0).toLocaleString()}</p>
              <p className="text-sm text-slate-500">Revenue</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  // Activity Logs Tab
  const renderActivityLogs = () => {
    if (logsLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <History className="w-16 h-16 text-slate-400 animate-pulse" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        {logsSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {logsSummary.user_activity?.slice(0, 4).map((user, idx) => (
              <Card key={idx}>
                <CardContent className="pt-4">
                  <p className="font-semibold truncate">{user.user_name}</p>
                  <p className="text-2xl font-bold text-blue-600">{user.action_count}</p>
                  <p className="text-xs text-slate-500">actions (7 days)</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-4">
          <Select value={logsFilters.entity_type || 'all'} onValueChange={(v) => setLogsFilters({ ...logsFilters, entity_type: v === 'all' ? '' : v })}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="enrollment">Enrollment</SelectItem>
            </SelectContent>
          </Select>
          <Select value={logsFilters.action || 'all'} onValueChange={(v) => setLogsFilters({ ...logsFilters, action: v === 'all' ? '' : v })}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="create">Created</SelectItem>
              <SelectItem value="update">Updated</SelectItem>
              <SelectItem value="delete">Deleted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logs List */}
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      log.action === 'create' ? 'bg-green-100' : log.action === 'update' ? 'bg-blue-100' : 'bg-red-100'
                    }`}>
                      {log.action === 'create' ? <Plus className="w-5 h-5 text-green-600" /> :
                       log.action === 'update' ? <Edit className="w-5 h-5 text-blue-600" /> :
                       <Trash2 className="w-5 h-5 text-red-600" />}
                    </div>
                    <div>
                      <p className="font-medium">{log.user_name}</p>
                      <p className="text-sm text-slate-500">
                        {log.action} {log.entity_type} {log.entity_name && `"${log.entity_name}"`}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">{formatDate(log.timestamp)}</p>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={logsPage <= 1}
                onClick={() => setLogsPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <span className="text-sm text-slate-500">Page {logsPage} of {logsTotalPages}</span>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={logsPage >= logsTotalPages}
                onClick={() => setLogsPage(p => p + 1)}
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Campaigns Tab
  const renderCampaigns = () => {
    if (campaignsLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Target className="w-16 h-16 text-slate-400 animate-pulse" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Stats */}
        {campaignStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <Megaphone className="w-8 h-8 text-blue-500 mx-auto" />
                <p className="text-3xl font-bold mt-2">{campaignStats.total}</p>
                <p className="text-sm text-slate-500">Total Campaigns</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <Play className="w-8 h-8 text-green-500 mx-auto" />
                <p className="text-3xl font-bold mt-2">{campaignStats.active}</p>
                <p className="text-sm text-slate-500">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <IndianRupee className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-3xl font-bold mt-2">₹{campaignStats.totalBudget?.toLocaleString()}</p>
                <p className="text-sm text-slate-500">Total Budget</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <Users className="w-8 h-8 text-purple-500 mx-auto" />
                <p className="text-3xl font-bold mt-2">{campaignStats.totalLeads}</p>
                <p className="text-sm text-slate-500">Leads Generated</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Campaigns List */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No campaigns yet</p>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        campaign.status === 'active' ? 'bg-green-100' : 'bg-slate-200'
                      }`}>
                        <Target className={`w-6 h-6 ${campaign.status === 'active' ? 'text-green-600' : 'text-slate-500'}`} />
                      </div>
                      <div>
                        <p className="font-semibold">{campaign.name}</p>
                        <p className="text-sm text-slate-500">{campaign.source || 'Manual'} • {campaign.program || 'All Programs'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={campaign.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
                        {campaign.status}
                      </Badge>
                      <p className="text-sm text-slate-500 mt-1">{campaign.leads_generated || 0} leads</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Feedback Tab
  const renderFeedback = () => {
    if (feedbackLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <MessageSquare className="w-16 h-16 text-slate-400 animate-pulse" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Stats */}
        {feedbackStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <MessageSquare className="w-8 h-8 text-blue-500 mx-auto" />
                <p className="text-3xl font-bold mt-2">{feedbackStats.total}</p>
                <p className="text-sm text-slate-500">Total Feedback</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <Star className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-3xl font-bold mt-2">{feedbackStats.avgRating}</p>
                <p className="text-sm text-slate-500">Avg Rating</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <ThumbsUp className="w-8 h-8 text-green-500 mx-auto" />
                <p className="text-3xl font-bold mt-2">{feedbackStats.positive}</p>
                <p className="text-sm text-slate-500">Positive (4-5★)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <ThumbsDown className="w-8 h-8 text-red-500 mx-auto" />
                <p className="text-3xl font-bold mt-2">{feedbackStats.needsAttention}</p>
                <p className="text-sm text-slate-500">Needs Attention</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Feedback List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            {feedback.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No feedback yet</p>
            ) : (
              <div className="space-y-4">
                {feedback.slice(0, 10).map((item) => (
                  <div key={item.id} className={`p-4 rounded-lg border ${
                    item.rating >= 4 ? 'bg-green-50 border-green-200' : 
                    item.rating && item.rating < 3 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{item.student_name}</p>
                        <p className="text-sm text-slate-500">{item.course_name}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(star => (
                          <Star key={star} className={`w-4 h-4 ${
                            star <= (item.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                          }`} />
                        ))}
                      </div>
                    </div>
                    {item.feedback && (
                      <p className="mt-2 text-sm text-slate-600 italic">"{item.feedback}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Follow-ups Tab
  const renderFollowups = () => {
    if (followupsLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Bell className="w-16 h-16 text-slate-400 animate-pulse" />
        </div>
      );
    }

    // Helper function to safely parse date
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? null : date;
    };

    // Helper function to format date safely
    const safeFormatDate = (dateStr, formatStr) => {
      const date = parseDate(dateStr);
      if (!date) return 'N/A';
      try {
        return format(date, formatStr);
      } catch {
        return 'N/A';
      }
    };

    return (
      <div className="space-y-6">
        {/* Stats */}
        {followupsStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <Bell className="w-8 h-8 text-blue-500 mx-auto" />
                <p className="text-3xl font-bold mt-2">{followupsStats.total}</p>
                <p className="text-sm text-slate-500">Total Pending</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4 text-center">
                <Clock className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-3xl font-bold mt-2 text-amber-700">{followupsStats.today}</p>
                <p className="text-sm text-amber-600">Due Today</p>
              </CardContent>
            </Card>
            <Card className={followupsStats.overdue > 0 ? 'border-red-200 bg-red-50' : ''}>
              <CardContent className="pt-4 text-center">
                <AlertTriangle className={`w-8 h-8 mx-auto ${followupsStats.overdue > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                <p className={`text-3xl font-bold mt-2 ${followupsStats.overdue > 0 ? 'text-red-700' : ''}`}>{followupsStats.overdue}</p>
                <p className={`text-sm ${followupsStats.overdue > 0 ? 'text-red-600' : 'text-slate-500'}`}>Overdue</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <Calendar className="w-8 h-8 text-green-500 mx-auto" />
                <p className="text-3xl font-bold mt-2">{followupsStats.upcoming}</p>
                <p className="text-sm text-slate-500">Upcoming</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Follow-ups List */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Follow-ups</CardTitle>
          </CardHeader>
          <CardContent>
            {followups.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No pending follow-ups</p>
            ) : (
              <div className="space-y-3">
                {followups.slice(0, 15).map((followup) => {
                  // Support both scheduled_date and followup_date
                  const dateStr = followup.scheduled_date || followup.followup_date;
                  const scheduledDate = parseDate(dateStr);
                  const now = new Date();
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  let isOverdue = false;
                  let isToday = false;
                  if (scheduledDate) {
                    const schedCopy = new Date(scheduledDate);
                    schedCopy.setHours(0, 0, 0, 0);
                    isOverdue = schedCopy < today;
                    isToday = schedCopy.getTime() === today.getTime();
                  }
                  
                  return (
                    <div key={followup.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                      isOverdue ? 'bg-red-50 border-red-200' : isToday ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isOverdue ? 'bg-red-100' : isToday ? 'bg-amber-100' : 'bg-blue-100'
                        }`}>
                          <Phone className={`w-5 h-5 ${
                            isOverdue ? 'text-red-600' : isToday ? 'text-amber-600' : 'text-blue-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-semibold">{followup.lead_name}</p>
                          <p className="text-sm text-slate-500">{followup.lead_number}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={
                          isOverdue ? 'bg-red-100 text-red-700' : isToday ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }>
                          {isOverdue ? 'Overdue' : isToday ? 'Today' : safeFormatDate(dateStr, 'dd MMM')}
                        </Badge>
                        {(followup.counsellor_name || followup.created_by_name) && (
                          <p className="text-xs text-slate-500 mt-1">{followup.counsellor_name || followup.created_by_name}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Branch Analytics Tab
  const renderBranchAnalytics = () => {
    if (branchLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Brain className="w-16 h-16 text-indigo-500 mx-auto animate-pulse" />
        </div>
      );
    }

    const aiAnalysis = branchAnalytics?.ai_analysis;
    const overallHealth = aiAnalysis?.overall_health;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Last updated: {branchAnalytics?.generated_at ? formatDate(branchAnalytics.generated_at) : 'N/A'}
          </p>
          <Button onClick={() => { setBranchRefreshing(true); fetchBranchAnalytics(); }} disabled={branchRefreshing} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${branchRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {overallHealth && (
          <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm">Branch Health Score</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-5xl font-bold">{overallHealth.score}</span>
                    <span className="text-2xl text-indigo-200">/100</span>
                  </div>
                  <p className="text-indigo-100 mt-2">{overallHealth.assessment}</p>
                </div>
                <Badge className="bg-white/20 text-white text-lg px-4 py-1">{overallHealth.grade}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {branchAnalytics?.metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Users className="w-4 h-4" /> Total Leads
                </div>
                <p className="text-2xl font-bold mt-1">{branchAnalytics.metrics.total_leads}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Target className="w-4 h-4" /> Conversion Rate
                </div>
                <p className="text-2xl font-bold mt-1">{branchAnalytics.metrics.conversion_rate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <GraduationCap className="w-4 h-4" /> Enrollments
                </div>
                <p className="text-2xl font-bold mt-1">{branchAnalytics.metrics.total_enrollments}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <IndianRupee className="w-4 h-4" /> Revenue
                </div>
                <p className="text-2xl font-bold mt-1">₹{branchAnalytics.metrics.total_revenue?.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {aiAnalysis?.recommendations && aiAnalysis.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" /> AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {aiAnalysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // User Efficiency Tab
  const renderUserEfficiency = () => {
    if (efficiencyLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Zap className="w-16 h-16 text-purple-500 mx-auto animate-pulse" />
        </div>
      );
    }

    const aiAnalysis = efficiencyData?.ai_analysis;
    const overallEfficiency = aiAnalysis?.overall_efficiency;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Last updated: {efficiencyData?.generated_at ? formatDate(efficiencyData.generated_at) : 'N/A'}
          </p>
          <Button onClick={() => { setEfficiencyRefreshing(true); fetchEfficiencyData(); }} disabled={efficiencyRefreshing} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${efficiencyRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {overallEfficiency && (
          <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Team Efficiency Score</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-5xl font-bold">{overallEfficiency.score}</span>
                    <span className="text-2xl text-purple-200">/100</span>
                  </div>
                  <p className="text-purple-100 mt-2">{overallEfficiency.assessment}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {efficiencyData?.users && efficiencyData.users.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {efficiencyData.users.map((user) => (
              <Card key={user.user_id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold">{user.user_name}</p>
                        <p className="text-xs text-slate-500">{user.role}</p>
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${getScoreColor(user.efficiency_score)}`}>
                      {user.efficiency_score}%
                    </div>
                  </div>
                  <Progress value={user.efficiency_score} className="h-2" />
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                    <div className="p-2 bg-slate-50 rounded">
                      <p className="font-semibold">{user.leads_handled}</p>
                      <p className="text-slate-500">Leads</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <p className="font-semibold">{user.conversions}</p>
                      <p className="text-slate-500">Converted</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <p className="font-semibold">{user.conversion_rate}%</p>
                      <p className="text-slate-500">Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Attendance Tab
  const renderAttendance = () => {
    if (attendanceLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <ClipboardList className="w-16 h-16 text-blue-500 mx-auto animate-pulse" />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Users className="w-4 h-4" /> Total Trainers
              </div>
              <p className="text-2xl font-bold mt-1">{attendanceData?.summary?.total_trainers || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" /> Compliance Rate
              </div>
              <p className={`text-2xl font-bold mt-1 ${
                (attendanceData?.summary?.compliance_rate || 0) >= 90 ? 'text-green-600' : 
                (attendanceData?.summary?.compliance_rate || 0) >= 70 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {attendanceData?.summary?.compliance_rate || 0}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Missed Days
              </div>
              <p className="text-2xl font-bold mt-1">{attendanceData?.summary?.total_missed || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Calendar className="w-4 h-4" /> Period
              </div>
              <p className="text-lg font-bold mt-1">{attendanceData?.period || 'Last 30 days'}</p>
            </CardContent>
          </Card>
        </div>

        {attendanceData?.trainers && attendanceData.trainers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trainer Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attendanceData.trainers.map((trainer) => (
                  <div key={trainer.trainer_id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold">{trainer.trainer_name}</p>
                        <p className="text-xs text-slate-500">{trainer.batch_count} batches</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        trainer.compliance_rate >= 90 ? 'text-green-600' : 
                        trainer.compliance_rate >= 70 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {trainer.compliance_rate}%
                      </p>
                      <p className="text-xs text-slate-500">{trainer.missed_days} missed days</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Meta Analytics Tab
  const renderMetaAnalytics = () => {
    if (metaLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <Facebook className="w-16 h-16 text-blue-600 mx-auto animate-pulse" />
        </div>
      );
    }

    if (!metaAnalytics) {
      return (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="font-semibold text-lg">Meta Not Configured</h3>
            <p className="text-slate-600 mt-2">
              Contact Super Admin to configure Meta integration for your branch.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Select value={metaDays} onValueChange={(v) => { setMetaDays(v); fetchMetaData(); }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { setMetaSyncing(true); metaAPI.sync(branchId).then(() => { toast.success('Synced!'); fetchMetaData(); }).finally(() => setMetaSyncing(false)); }} disabled={metaSyncing} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${metaSyncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Users className="w-4 h-4" /> Total Leads
              </div>
              <p className="text-2xl font-bold mt-1">{metaAnalytics?.summary?.total_leads || metaAnalytics?.total_leads || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Eye className="w-4 h-4" /> Impressions
              </div>
              <p className="text-2xl font-bold mt-1">{(metaAnalytics?.summary?.total_impressions || metaAnalytics?.impressions || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <MousePointer className="w-4 h-4" /> Clicks
              </div>
              <p className="text-2xl font-bold mt-1">{(metaAnalytics?.summary?.total_clicks || metaAnalytics?.clicks || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <DollarSign className="w-4 h-4" /> Spend
              </div>
              <p className="text-2xl font-bold mt-1">₹{(metaAnalytics?.summary?.total_spend || metaAnalytics?.spend || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {(metaAnalytics?.ai_analysis || metaAnalytics?.ai_insights) && (
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" /> AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 whitespace-pre-line">
                {metaAnalytics?.ai_analysis?.performance_summary || metaAnalytics?.ai_insights}
              </p>
              {metaAnalytics?.ai_analysis?.recommendations && (
                <div className="mt-4">
                  <p className="font-semibold text-slate-700 mb-2">Recommendations:</p>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    {metaAnalytics.ai_analysis.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="insights-page">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-indigo-500" />
          Insights & Analytics
        </h1>
        <p className="text-slate-500 mt-1">AI-powered business intelligence for your branch</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap bg-slate-100 h-auto p-1 gap-1">
          <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-white" data-testid="overview-tab">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="branch" className="flex items-center gap-2 data-[state=active]:bg-white" data-testid="branch-tab">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Branch</span>
          </TabsTrigger>
          <TabsTrigger value="efficiency" className="flex items-center gap-2 data-[state=active]:bg-white" data-testid="efficiency-tab">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Team</span>
          </TabsTrigger>
          <TabsTrigger value="followups" className="flex items-center gap-2 data-[state=active]:bg-white" data-testid="followups-tab">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Follow-ups</span>
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2 data-[state=active]:bg-white" data-testid="feedback-tab">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Feedback</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2 data-[state=active]:bg-white" data-testid="campaigns-tab">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Campaigns</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2 data-[state=active]:bg-white" data-testid="activity-tab">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2 data-[state=active]:bg-white" data-testid="attendance-tab">
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Attendance</span>
          </TabsTrigger>
          <TabsTrigger value="meta" className="flex items-center gap-2 data-[state=active]:bg-white" data-testid="meta-tab">
            <Facebook className="w-4 h-4" />
            <span className="hidden sm:inline">Meta</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">{renderBusinessOverview()}</TabsContent>
        <TabsContent value="branch" className="mt-6">{renderBranchAnalytics()}</TabsContent>
        <TabsContent value="efficiency" className="mt-6">{renderUserEfficiency()}</TabsContent>
        <TabsContent value="followups" className="mt-6">{renderFollowups()}</TabsContent>
        <TabsContent value="feedback" className="mt-6">{renderFeedback()}</TabsContent>
        <TabsContent value="campaigns" className="mt-6">{renderCampaigns()}</TabsContent>
        <TabsContent value="activity" className="mt-6">{renderActivityLogs()}</TabsContent>
        <TabsContent value="attendance" className="mt-6">{renderAttendance()}</TabsContent>
        <TabsContent value="meta" className="mt-6">{renderMetaAnalytics()}</TabsContent>
      </Tabs>
    </div>
  );
};

export default InsightsPage;
