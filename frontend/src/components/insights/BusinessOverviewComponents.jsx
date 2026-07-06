import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, TrendingUp, Users, IndianRupee, 
  GraduationCap, Target, AlertTriangle, CheckCircle, 
  Sparkles
} from 'lucide-react';

const getScoreColor = (score) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
};

const getScoreBgColor = (score) => {
  if (score >= 80) return 'border-green-300 bg-gradient-to-r from-green-50 to-white';
  if (score >= 60) return 'border-blue-300 bg-gradient-to-r from-blue-50 to-white';
  if (score >= 40) return 'border-amber-300 bg-gradient-to-r from-amber-50 to-white';
  return 'border-red-300 bg-gradient-to-r from-red-50 to-white';
};

const HealthScoreCard = ({ healthScore, aiAnalysis }) => {
  return (
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
  );
};

const InsightsColumn = ({ title, description, items, type }) => {
  const isPositive = type === 'positive';
  const bgClass = isPositive ? 'border-green-200' : 'border-amber-200';
  const headerBg = isPositive ? 'bg-green-50' : 'bg-amber-50';
  const titleColor = isPositive ? 'text-green-800' : 'text-amber-800';
  const descColor = isPositive ? 'text-green-600' : 'text-amber-600';
  const Icon = isPositive ? CheckCircle : AlertTriangle;

  return (
    <Card className={bgClass}>
      <CardHeader className={`${headerBg} rounded-t-lg`}>
        <CardTitle className={`text-lg flex items-center gap-2 ${titleColor}`}>
          <Icon className="w-5 h-5" /> {title}
        </CardTitle>
        <CardDescription className={descColor}>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {items.length === 0 ? (
          <p className="text-slate-500 text-center py-4">
            {isPositive ? 'Keep improving to see positive highlights!' : 'Great! No immediate concerns.'}
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${
                item.priority === 'high' ? 'bg-red-50' : 
                item.priority === 'medium' ? 'bg-amber-50' : 
                isPositive ? 'bg-green-50' : 'bg-slate-50'
              }`}>
                <item.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  item.priority === 'high' ? 'text-red-600' : 
                  item.priority === 'medium' ? 'text-amber-600' : 
                  isPositive ? 'text-green-600' : 'text-slate-600'
                }`} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold ${
                      item.priority === 'high' ? 'text-red-800' : 
                      item.priority === 'medium' ? 'text-amber-800' : 
                      isPositive ? 'text-green-800' : 'text-slate-800'
                    }`}>{item.title}</p>
                    {item.priority === 'high' && <Badge className="bg-red-100 text-red-700 text-xs">Urgent</Badge>}
                  </div>
                  <p className={`text-sm ${
                    item.priority === 'high' ? 'text-red-600' : 
                    item.priority === 'medium' ? 'text-amber-600' : 
                    isPositive ? 'text-green-600' : 'text-slate-600'
                  }`}>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const QuickStatsGrid = ({ metrics }) => {
  return (
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
  );
};

const LoadingState = () => (
  <div className="flex items-center justify-center h-96">
    <div className="text-center">
      <Brain className="w-16 h-16 text-indigo-500 mx-auto animate-pulse" />
      <p className="mt-4 text-slate-500">Analyzing your business...</p>
    </div>
  </div>
);

export { HealthScoreCard, InsightsColumn, QuickStatsGrid, LoadingState };
