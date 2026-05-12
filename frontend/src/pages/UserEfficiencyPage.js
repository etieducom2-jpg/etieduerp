import React, { useState, useEffect } from 'react';
import { aiAnalyticsAPI } from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Brain, Users, TrendingUp, TrendingDown, Award, AlertTriangle,
  RefreshCw, Target, Clock, CheckCircle, UserCheck, Zap,
  Phone, IndianRupee, GraduationCap, Calendar, Star, Lightbulb
} from 'lucide-react';
import { format } from 'date-fns';

const UserEfficiencyPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await aiAnalyticsAPI.getUserEfficiency();
      setData(response.data);
    } catch (error) {
      toast.error('Failed to load efficiency data');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-blue-600 bg-blue-50';
    if (score >= 40) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return { label: 'Excellent', variant: 'default', color: 'bg-green-500' };
    if (score >= 60) return { label: 'Good', variant: 'secondary', color: 'bg-blue-500' };
    if (score >= 40) return { label: 'Average', variant: 'outline', color: 'bg-amber-500' };
    return { label: 'Needs Attention', variant: 'destructive', color: 'bg-red-500' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Brain className="w-16 h-16 text-purple-500 mx-auto animate-pulse" />
          <p className="mt-4 text-slate-500">Analyzing user efficiency with AI...</p>
        </div>
      </div>
    );
  }

  const aiAnalysis = data?.ai_analysis;
  const overallEfficiency = aiAnalysis?.overall_efficiency;

  return (
    <div className="space-y-6" data-testid="user-efficiency-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Zap className="w-6 h-6 text-purple-500" />
            User Efficiency Analysis
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            AI-powered insights on team performance | 
            Period: {data?.analysis_period?.start} to {data?.analysis_period?.end}
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Analysis
        </Button>
      </div>

      {/* Overall Efficiency Score */}
      {overallEfficiency && (
        <Card className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Team Efficiency Score</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-5xl font-bold">{overallEfficiency.score || 'N/A'}</span>
                  <span className="text-xl text-purple-200">/100</span>
                </div>
                <Badge className="mt-2 bg-white/20 text-white border-0">
                  {overallEfficiency.status || 'Analyzing...'}
                </Badge>
              </div>
              <div className="text-right max-w-md">
                <p className="text-sm text-purple-100 mb-2">AI Summary</p>
                <p className="text-sm">{overallEfficiency.summary || 'Analysis in progress...'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="counsellors">Counsellors</TabsTrigger>
          <TabsTrigger value="fdes">FDEs</TabsTrigger>
          <TabsTrigger value="trainers">Trainers</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data?.all_users_ranked?.slice(0, 3).map((user, idx) => (
                  <div key={user.user_id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-100">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-300' : 'bg-amber-600'} text-white font-bold`}>
                      #{idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.role}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full ${getScoreColor(user.efficiency_score)}`}>
                      <span className="font-bold">{user.efficiency_score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Phone className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Counsellors</p>
                    <p className="text-2xl font-bold">{data?.counsellors?.length || 0}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-slate-500 mb-1">Avg Efficiency</p>
                  <Progress 
                    value={data?.counsellors?.length ? Math.round(data.counsellors.reduce((a, b) => a + b.efficiency_score, 0) / data.counsellors.length) : 0} 
                    className="h-2"
                  />
                  <p className="text-right text-xs font-medium mt-1">
                    {data?.counsellors?.length ? Math.round(data.counsellors.reduce((a, b) => a + b.efficiency_score, 0) / data.counsellors.length) : 0}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 rounded-full">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Front Desk Executives</p>
                    <p className="text-2xl font-bold">{data?.fdes?.length || 0}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-slate-500 mb-1">Avg Efficiency</p>
                  <Progress 
                    value={data?.fdes?.length ? Math.round(data.fdes.reduce((a, b) => a + b.efficiency_score, 0) / data.fdes.length) : 0} 
                    className="h-2"
                  />
                  <p className="text-right text-xs font-medium mt-1">
                    {data?.fdes?.length ? Math.round(data.fdes.reduce((a, b) => a + b.efficiency_score, 0) / data.fdes.length) : 0}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <GraduationCap className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Trainers</p>
                    <p className="text-2xl font-bold">{data?.trainers?.length || 0}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-slate-500 mb-1">Avg Efficiency</p>
                  <Progress 
                    value={data?.trainers?.length ? Math.round(data.trainers.reduce((a, b) => a + b.efficiency_score, 0) / data.trainers.length) : 0} 
                    className="h-2"
                  />
                  <p className="text-right text-xs font-medium mt-1">
                    {data?.trainers?.length ? Math.round(data.trainers.reduce((a, b) => a + b.efficiency_score, 0) / data.trainers.length) : 0}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* All Users Ranked */}
          <Card>
            <CardHeader>
              <CardTitle>All Users Ranked by Efficiency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data?.all_users_ranked?.map((user, idx) => (
                  <div key={user.user_id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <span className="w-8 text-center font-bold text-slate-400">#{idx + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <Badge variant="outline">{user.role}</Badge>
                    <div className="w-32">
                      <Progress value={user.efficiency_score} className="h-2" />
                    </div>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${getScoreColor(user.efficiency_score)}`}>
                      {user.efficiency_score}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Counsellors Tab */}
        <TabsContent value="counsellors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-500" />
                Counsellor Performance
              </CardTitle>
              <CardDescription>Lead conversion and follow-up metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.counsellors?.map((counsellor) => (
                  <div key={counsellor.user_id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium text-lg">{counsellor.name}</p>
                        <p className="text-sm text-slate-500">{counsellor.email}</p>
                      </div>
                      <div className={`px-4 py-2 rounded-lg ${getScoreColor(counsellor.efficiency_score)}`}>
                        <p className="text-xs">Efficiency Score</p>
                        <p className="text-2xl font-bold">{counsellor.efficiency_score}%</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{counsellor.leads_assigned}</p>
                        <p className="text-xs text-slate-500">Leads Assigned</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{counsellor.leads_converted}</p>
                        <p className="text-xs text-slate-500">Converted</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">{counsellor.conversion_rate}%</p>
                        <p className="text-xs text-slate-500">Conversion Rate</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-amber-600">{counsellor.followup_completion_rate}%</p>
                        <p className="text-xs text-slate-500">Follow-up Rate</p>
                      </div>
                    </div>
                  </div>
                ))}
                {(!data?.counsellors || data.counsellors.length === 0) && (
                  <p className="text-center text-slate-500 py-8">No counsellors found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FDEs Tab */}
        <TabsContent value="fdes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-green-500" />
                Front Desk Executive Performance
              </CardTitle>
              <CardDescription>Enrollment and payment collection metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.fdes?.map((fde) => (
                  <div key={fde.user_id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium text-lg">{fde.name}</p>
                        <p className="text-sm text-slate-500">{fde.email}</p>
                      </div>
                      <div className={`px-4 py-2 rounded-lg ${getScoreColor(fde.efficiency_score)}`}>
                        <p className="text-xs">Efficiency Score</p>
                        <p className="text-2xl font-bold">{fde.efficiency_score}%</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{fde.enrollments_processed}</p>
                        <p className="text-xs text-slate-500">Enrollments</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{fde.payments_collected}</p>
                        <p className="text-xs text-slate-500">Payments</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">₹{(fde.amount_collected || 0).toLocaleString()}</p>
                        <p className="text-xs text-slate-500">Amount Collected</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-amber-600">{fde.task_completion_rate}%</p>
                        <p className="text-xs text-slate-500">Task Completion</p>
                      </div>
                    </div>
                  </div>
                ))}
                {(!data?.fdes || data.fdes.length === 0) && (
                  <p className="text-center text-slate-500 py-8">No FDEs found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trainers Tab */}
        <TabsContent value="trainers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-purple-500" />
                Trainer Performance
              </CardTitle>
              <CardDescription>Teaching and attendance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.trainers?.map((trainer) => (
                  <div key={trainer.user_id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium text-lg">{trainer.name}</p>
                        <p className="text-sm text-slate-500">{trainer.email}</p>
                      </div>
                      <div className={`px-4 py-2 rounded-lg ${getScoreColor(trainer.efficiency_score)}`}>
                        <p className="text-xs">Efficiency Score</p>
                        <p className="text-2xl font-bold">{trainer.efficiency_score}%</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{trainer.total_batches}</p>
                        <p className="text-xs text-slate-500">Batches</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{trainer.active_students}</p>
                        <p className="text-xs text-slate-500">Active Students</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">{trainer.completed_students}</p>
                        <p className="text-xs text-slate-500">Completed</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <p className="text-2xl font-bold text-amber-600">{trainer.attendance_rate}%</p>
                        <p className="text-xs text-slate-500">Attendance Rate</p>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <p className="text-2xl font-bold text-yellow-600">{trainer.avg_feedback_rating || '-'}</p>
                        </div>
                        <p className="text-xs text-slate-500">Avg Rating</p>
                      </div>
                    </div>
                  </div>
                ))}
                {(!data?.trainers || data.trainers.length === 0) && (
                  <p className="text-center text-slate-500 py-8">No trainers found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          {aiAnalysis ? (
            <>
              {/* Top Performers from AI */}
              {aiAnalysis.top_performers?.length > 0 && (
                <Card className="border-green-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <Award className="w-5 h-5" />
                      AI-Identified Top Performers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {aiAnalysis.top_performers.map((performer, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                          <div>
                            <p className="font-medium">{performer.name} <span className="text-sm text-slate-500">({performer.role})</span></p>
                            <p className="text-sm text-slate-600">{performer.highlight}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Needs Attention from AI */}
              {aiAnalysis.needs_attention?.length > 0 && (
                <Card className="border-amber-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="w-5 h-5" />
                      Needs Attention
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {aiAnalysis.needs_attention.map((item, idx) => (
                        <div key={idx} className="p-3 bg-amber-50 rounded-lg">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                            <div>
                              <p className="font-medium">{item.name} <span className="text-sm text-slate-500">({item.role})</span></p>
                              <p className="text-sm text-red-600">Issue: {item.issue}</p>
                              <p className="text-sm text-green-600 mt-1">Suggestion: {item.suggestion}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Team Insights */}
              {aiAnalysis.team_insights && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-500" />
                      Team Performance Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="font-medium text-blue-700 mb-2">Counsellors</p>
                        <p className="text-sm text-slate-600">{aiAnalysis.team_insights.counsellors}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="font-medium text-green-700 mb-2">FDEs</p>
                        <p className="text-sm text-slate-600">{aiAnalysis.team_insights.fdes}</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="font-medium text-purple-700 mb-2">Trainers</p>
                        <p className="text-sm text-slate-600">{aiAnalysis.team_insights.trainers}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {aiAnalysis.recommendations?.length > 0 && (
                <Card className="border-indigo-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-indigo-700">
                      <Lightbulb className="w-5 h-5" />
                      AI Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {aiAnalysis.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
                          <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm flex-shrink-0">
                            {idx + 1}
                          </span>
                          <p className="text-sm text-slate-700">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">AI analysis not available</p>
                  <p className="text-sm text-slate-400">Ensure Emergent LLM key is configured</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserEfficiencyPage;
