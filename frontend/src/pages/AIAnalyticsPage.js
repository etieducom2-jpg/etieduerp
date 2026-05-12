import React, { useState, useEffect } from 'react';
import { aiAnalyticsAPI } from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Brain, TrendingUp, TrendingDown, Users, IndianRupee, 
  GraduationCap, Target, AlertTriangle, CheckCircle, 
  RefreshCw, BarChart3, Sparkles, Building2
} from 'lucide-react';
import { format } from 'date-fns';

const AIAnalyticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await aiAnalyticsAPI.getBranchInsights();
      setAnalytics(response.data);
    } catch (error) {
      toast.error('Failed to load analytics');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Brain className="w-16 h-16 text-indigo-500 mx-auto animate-pulse" />
          <p className="mt-4 text-slate-500">Analyzing branch data with AI...</p>
        </div>
      </div>
    );
  }

  const aiAnalysis = analytics?.ai_analysis;
  const overallHealth = aiAnalysis?.overall_health;

  return (
    <div className="space-y-6" data-testid="ai-analytics-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-500" />
            AI Branch Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Last updated: {analytics?.generated_at ? format(new Date(analytics.generated_at), 'dd MMM yyyy, h:mm a') : 'N/A'}
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Analysis
        </Button>
      </div>

      {/* Overall Health Score */}
      {overallHealth && (
        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm">Branch Health Score</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-5xl font-bold">{overallHealth.score || 'N/A'}</span>
                  <span className="text-xl text-indigo-200">/10</span>
                </div>
                <Badge className="mt-2 bg-white/20 text-white border-0">
                  {overallHealth.status || 'Analyzing...'}
                </Badge>
              </div>
              <div className="text-right max-w-md">
                <p className="text-sm text-indigo-100 mb-2">AI Summary</p>
                <p className="text-sm">{overallHealth.summary || 'Analysis in progress...'}</p>
                {overallHealth.top_priority && (
                  <div className="mt-3 p-2 bg-white/10 rounded-lg">
                    <p className="text-xs text-indigo-200">Top Priority</p>
                    <p className="text-sm font-medium">{overallHealth.top_priority}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">This Month Income</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{(analytics?.income?.this_month || 0).toLocaleString()}
                </p>
              </div>
              <div className={`p-3 rounded-full ${analytics?.income?.growth_percent >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {analytics?.income?.growth_percent >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-green-600" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
            <p className={`text-xs mt-2 ${analytics?.income?.growth_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {analytics?.income?.growth_percent >= 0 ? '+' : ''}{analytics?.income?.growth_percent?.toFixed(1)}% vs last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active Students</p>
                <p className="text-2xl font-bold text-blue-600">{analytics?.students?.active || 0}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {analytics?.students?.completed || 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Fee Collection</p>
                <p className="text-2xl font-bold text-amber-600">{analytics?.students?.fee_efficiency_percent || 0}%</p>
              </div>
              <div className="p-3 rounded-full bg-amber-100">
                <IndianRupee className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-red-500 mt-2">
              ₹{(analytics?.students?.pending_fees || 0).toLocaleString()} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Lead Conversion</p>
                <p className="text-2xl font-bold text-purple-600">{analytics?.leads?.conversion_rate || 0}%</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {analytics?.leads?.converted || 0} / {analytics?.leads?.total || 0} leads
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trainer Workload Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Trainer Workload Analysis
            </CardTitle>
            {aiAnalysis?.trainer_analysis?.recommendation && (
              <CardDescription className="flex items-start gap-2 mt-2 p-2 bg-blue-50 rounded-lg">
                <Brain className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                <span>{aiAnalysis.trainer_analysis.recommendation}</span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics?.trainer_workload?.map((trainer, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{trainer.trainer_name}</p>
                    <p className="text-xs text-slate-500">
                      {trainer.total_batches} batches • {trainer.total_students} students
                    </p>
                  </div>
                  <Badge variant={
                    trainer.total_students > 30 ? 'destructive' :
                    trainer.total_students < 10 ? 'outline' : 'default'
                  }>
                    {trainer.total_students > 30 ? 'Overloaded' :
                     trainer.total_students < 10 ? 'Available' : 'Balanced'}
                  </Badge>
                </div>
              ))}
              {(!analytics?.trainer_workload || analytics.trainer_workload.length === 0) && (
                <p className="text-center text-slate-500 py-4">No trainers assigned</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Income Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-500" />
              Income Analysis
            </CardTitle>
            {aiAnalysis?.income_insights?.recommendation && (
              <CardDescription className="flex items-start gap-2 mt-2 p-2 bg-green-50 rounded-lg">
                <Brain className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <span>{aiAnalysis.income_insights.recommendation}</span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Income by Payment Mode */}
              <div>
                <p className="text-sm font-medium text-slate-600 mb-2">Income by Payment Mode</p>
                <div className="space-y-2">
                  {analytics?.income?.by_payment_mode && Object.entries(analytics.income.by_payment_mode).map(([mode, amount]) => (
                    <div key={mode} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{mode}</span>
                      <span className="font-medium">₹{amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* AI Forecast */}
              {aiAnalysis?.income_insights && (
                <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={
                      aiAnalysis.income_insights.trend === 'growing' ? 'bg-green-100 text-green-700' :
                      aiAnalysis.income_insights.trend === 'declining' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }>
                      Trend: {aiAnalysis.income_insights.trend || 'stable'}
                    </Badge>
                  </div>
                  {aiAnalysis.income_insights.forecast && (
                    <p className="text-xs text-slate-600">{aiAnalysis.income_insights.forecast}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Student Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-amber-500" />
              Student Insights
            </CardTitle>
            {aiAnalysis?.student_insights?.recommendation && (
              <CardDescription className="flex items-start gap-2 mt-2 p-2 bg-amber-50 rounded-lg">
                <Brain className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <span>{aiAnalysis.student_insights.recommendation}</span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Retention Risk</p>
                  <Badge className={
                    aiAnalysis?.student_insights?.retention_risk === 'low' ? 'bg-green-100 text-green-700' :
                    aiAnalysis?.student_insights?.retention_risk === 'high' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }>
                    {aiAnalysis?.student_insights?.retention_risk || 'medium'}
                  </Badge>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500">Fee Collection</p>
                  <Badge className={
                    aiAnalysis?.student_insights?.fee_collection_status === 'healthy' ? 'bg-green-100 text-green-700' :
                    aiAnalysis?.student_insights?.fee_collection_status === 'critical' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }>
                    {aiAnalysis?.student_insights?.fee_collection_status || 'needs attention'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-purple-500" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overallHealth?.top_priority && (
                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <AlertTriangle className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-purple-800">Priority Action</p>
                    <p className="text-xs text-purple-600">{overallHealth.top_priority}</p>
                  </div>
                </div>
              )}
              
              {aiAnalysis?.trainer_analysis?.overloaded?.length > 0 && (
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                  <Users className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700">Trainer Overload</p>
                    <p className="text-xs text-red-600">
                      {aiAnalysis.trainer_analysis.overloaded.join(', ')} need load balancing
                    </p>
                  </div>
                </div>
              )}
              
              {analytics?.students?.pending_fees > 50000 && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                  <IndianRupee className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-700">Fee Collection</p>
                    <p className="text-xs text-amber-600">
                      ₹{analytics.students.pending_fees.toLocaleString()} pending - follow up with students
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Powered Badge */}
      {analytics?.ai_powered && (
        <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1">
          <Brain className="w-3 h-3" />
          Analysis powered by GPT-4o
        </div>
      )}
    </div>
  );
};

export default AIAnalyticsPage;
