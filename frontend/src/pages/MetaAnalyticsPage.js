import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { metaAPI } from '@/api/api';
import { Facebook, TrendingUp, TrendingDown, DollarSign, Users, Eye, MousePointer, Target, Brain, RefreshCw, AlertCircle, ArrowUpRight, Sparkles, Play, Pause, Archive, Clock } from 'lucide-react';

const MetaAnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [days, setDays] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const branchId = user.branch_id;

  useEffect(() => {
    if (branchId) {
      fetchData();
    }
  }, [branchId, days]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, leadsRes] = await Promise.all([
        metaAPI.getAnalytics(branchId, parseInt(days)),
        metaAPI.getLeads({ branch_id: branchId })
      ]);
      setAnalytics(analyticsRes.data);
      setLeads(leadsRes.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      if (error.response?.status === 404) {
        toast.error('Meta not configured for your branch. Contact Super Admin.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const response = await metaAPI.getCampaigns(branchId);
      setCampaigns(response.data.campaigns || []);
      toast.success(`Loaded ${response.data.total} campaigns from Meta`);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      toast.error(error.response?.data?.detail || 'Failed to fetch campaigns. Check your access token.');
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await metaAPI.syncAds(branchId);
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to sync ads data');
    } finally {
      setSyncing(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-IN').format(value);
  };

  const getStatusBadge = (status, effectiveStatus) => {
    const displayStatus = effectiveStatus || status;
    switch (displayStatus?.toUpperCase()) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-700"><Play className="w-3 h-3 mr-1" />Active</Badge>;
      case 'PAUSED':
        return <Badge className="bg-yellow-100 text-yellow-700"><Pause className="w-3 h-3 mr-1" />Paused</Badge>;
      case 'ARCHIVED':
        return <Badge className="bg-slate-100 text-slate-700"><Archive className="w-3 h-3 mr-1" />Archived</Badge>;
      case 'DELETED':
        return <Badge variant="destructive">Deleted</Badge>;
      default:
        return <Badge variant="secondary">{displayStatus || 'Unknown'}</Badge>;
    }
  };

  if (!branchId) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="py-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800">No Branch Assigned</h3>
          <p className="text-yellow-700">You need to be assigned to a branch to view Meta analytics.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-8 text-center">
          <Facebook className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-blue-800">Meta Integration Not Configured</h3>
          <p className="text-blue-700">Contact your Super Admin to configure Facebook/Instagram integration for your branch.</p>
        </CardContent>
      </Card>
    );
  }

  const { summary, campaigns: campaignStats, daily_trend, ai_analysis, period } = analytics;

  return (
    <div className="space-y-6" data-testid="meta-analytics-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Facebook className="w-7 h-7 text-blue-600" />
            Meta Ads Analytics
          </h1>
          <p className="text-slate-600 mt-1">
            Facebook & Instagram advertising performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSync} disabled={syncing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync Data
          </Button>
        </div>
      </div>

      {/* Period Info */}
      <p className="text-sm text-slate-500">
        Showing data from {period?.start} to {period?.end}
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Spend</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(summary?.total_spend || 0)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Leads</p>
                <p className="text-2xl font-bold text-slate-800">{formatNumber(summary?.total_leads || 0)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {summary?.converted_leads || 0} converted ({summary?.conversion_rate || 0}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Cost per Lead</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(summary?.cost_per_lead || 0)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">CTR</p>
                <p className="text-2xl font-bold text-slate-800">{summary?.ctr || 0}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <MousePointer className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-50">
          <CardContent className="py-4 text-center">
            <Eye className="w-6 h-6 text-slate-500 mx-auto mb-2" />
            <p className="text-xl font-semibold">{formatNumber(summary?.total_impressions || 0)}</p>
            <p className="text-sm text-slate-500">Impressions</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50">
          <CardContent className="py-4 text-center">
            <Users className="w-6 h-6 text-slate-500 mx-auto mb-2" />
            <p className="text-xl font-semibold">{formatNumber(summary?.total_reach || 0)}</p>
            <p className="text-sm text-slate-500">Reach</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50">
          <CardContent className="py-4 text-center">
            <MousePointer className="w-6 h-6 text-slate-500 mx-auto mb-2" />
            <p className="text-xl font-semibold">{formatNumber(summary?.total_clicks || 0)}</p>
            <p className="text-sm text-slate-500">Clicks</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">AI Insights</TabsTrigger>
          <TabsTrigger value="campaigns">All Campaigns</TabsTrigger>
          <TabsTrigger value="performance">Campaign Performance</TabsTrigger>
          <TabsTrigger value="leads">Facebook Leads</TabsTrigger>
        </TabsList>

        {/* AI Insights Tab */}
        <TabsContent value="overview" className="space-y-4">
          {ai_analysis ? (
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  AI-Powered Analysis
                </CardTitle>
                <CardDescription>Automated insights from your Meta ads data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Performance Summary */}
                <div className="p-4 bg-white rounded-lg">
                  <h4 className="font-medium text-slate-700 mb-2">Performance Summary</h4>
                  <p className="text-slate-600">{ai_analysis.performance_summary}</p>
                </div>

                {/* Spend Efficiency */}
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-500">Spend Efficiency:</span>
                  <Badge className={
                    ai_analysis.spend_efficiency === 'excellent' ? 'bg-green-100 text-green-700' :
                    ai_analysis.spend_efficiency === 'good' ? 'bg-blue-100 text-blue-700' :
                    ai_analysis.spend_efficiency === 'average' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }>
                    {ai_analysis.spend_efficiency?.toUpperCase()}
                  </Badge>
                </div>

                {/* Campaign Highlights */}
                <div className="grid md:grid-cols-2 gap-4">
                  {ai_analysis.top_campaign && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-700">Top Campaign</span>
                      </div>
                      <p className="font-semibold text-green-800">{ai_analysis.top_campaign.name}</p>
                      <p className="text-sm text-green-600">{ai_analysis.top_campaign.reason}</p>
                    </div>
                  )}
                  {ai_analysis.underperforming && (
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        <span className="font-medium text-red-700">Needs Attention</span>
                      </div>
                      <p className="font-semibold text-red-800">{ai_analysis.underperforming.name}</p>
                      <p className="text-sm text-red-600">{ai_analysis.underperforming.issue}</p>
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                {ai_analysis.recommendations && ai_analysis.recommendations.length > 0 && (
                  <div className="p-4 bg-white rounded-lg">
                    <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-600" />
                      Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {ai_analysis.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2 text-slate-600">
                          <ArrowUpRight className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Trend & ROI */}
                <div className="grid md:grid-cols-2 gap-4">
                  {ai_analysis.trend_insight && (
                    <div className="p-4 bg-white rounded-lg">
                      <h4 className="font-medium text-slate-700 mb-2">Trend Insight</h4>
                      <p className="text-sm text-slate-600">{ai_analysis.trend_insight}</p>
                    </div>
                  )}
                  {ai_analysis.roi_assessment && (
                    <div className="p-4 bg-white rounded-lg">
                      <h4 className="font-medium text-slate-700 mb-2">ROI Assessment</h4>
                      <p className="text-sm text-slate-600">{ai_analysis.roi_assessment}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200">
              <CardContent className="py-8 text-center">
                <Brain className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600">AI Analysis Not Available</h3>
                <p className="text-slate-500">Sync more data or check back later for AI-powered insights.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* All Campaigns Tab - Live from Meta */}
        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Meta Campaigns</CardTitle>
                  <CardDescription>Live list of campaigns from your Meta Ad Account</CardDescription>
                </div>
                <Button onClick={fetchCampaigns} disabled={loadingCampaigns} variant="outline">
                  <RefreshCw className={`w-4 h-4 mr-2 ${loadingCampaigns ? 'animate-spin' : ''}`} />
                  Load Campaigns
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {campaigns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Campaign Name</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Status</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Objective</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Budget</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((campaign) => (
                        <tr key={campaign.id} className="border-b hover:bg-slate-50">
                          <td className="py-3 px-2">
                            <p className="font-medium text-slate-800">{campaign.name}</p>
                            <p className="text-xs text-slate-400">ID: {campaign.id}</p>
                          </td>
                          <td className="py-3 px-2">
                            {getStatusBadge(campaign.status, campaign.effective_status)}
                          </td>
                          <td className="py-3 px-2 text-sm text-slate-600">
                            {campaign.objective?.replace(/_/g, ' ') || '-'}
                          </td>
                          <td className="py-3 px-2 text-sm">
                            {campaign.daily_budget ? (
                              <span>{formatCurrency(campaign.daily_budget)}/day</span>
                            ) : campaign.lifetime_budget ? (
                              <span>{formatCurrency(campaign.lifetime_budget)} lifetime</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-sm text-slate-500">
                            {campaign.created_time ? new Date(campaign.created_time).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-4">Click "Load Campaigns" to fetch your Meta campaigns</p>
                  <Button onClick={fetchCampaigns} disabled={loadingCampaigns}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingCampaigns ? 'animate-spin' : ''}`} />
                    Load Campaigns
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaign Performance Tab - From synced data */}
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>Performance breakdown from synced data (last {days} days)</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(campaignStats || {}).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(campaignStats).map(([name, stats]) => (
                    <div key={name} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-800">{name}</h4>
                        <Badge variant="outline">{stats.leads || 0} leads</Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Spend</p>
                          <p className="font-semibold">{formatCurrency(stats.spend || 0)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Impressions</p>
                          <p className="font-semibold">{formatNumber(stats.impressions || 0)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Clicks</p>
                          <p className="font-semibold">{formatNumber(stats.clicks || 0)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Cost/Lead</p>
                          <p className="font-semibold">
                            {stats.leads > 0 ? formatCurrency(stats.spend / stats.leads) : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-4">No performance data available. Click "Sync Data" to fetch from Meta.</p>
                  <Button onClick={handleSync} disabled={syncing} variant="outline">
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Sync Data
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Facebook Leads</CardTitle>
              <CardDescription>Leads captured from Facebook Lead Ads</CardDescription>
            </CardHeader>
            <CardContent>
              {leads.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Name</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Contact</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Campaign</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Status</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.slice(0, 50).map((lead) => (
                        <tr key={lead.id} className="border-b hover:bg-slate-50">
                          <td className="py-3 px-2 font-medium">{lead.name || 'Unknown'}</td>
                          <td className="py-3 px-2">
                            <div className="text-sm">
                              {lead.email && <p>{lead.email}</p>}
                              {lead.phone && <p className="text-slate-500">{lead.phone}</p>}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-sm text-slate-600">{lead.campaign_name || '-'}</td>
                          <td className="py-3 px-2">
                            {lead.is_synced_to_crm ? (
                              <Badge className="bg-green-100 text-green-700">Synced to CRM</Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </td>
                          <td className="py-3 px-2 text-sm text-slate-500">
                            {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-8 text-slate-500">No Facebook leads captured yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MetaAnalyticsPage;
