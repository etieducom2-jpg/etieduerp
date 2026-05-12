import React, { useState, useEffect } from 'react';
import { analyticsAPI } from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const STATUS_COLORS = {
  'New': '#3B82F6',
  'Contacted': '#8B5CF6',
  'Demo Booked': '#F59E0B',
  'Follow-up': '#06B6D4',
  'Converted': '#10B981',
  'Lost': '#EF4444',
};

const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [analyticsRes, trendsRes] = await Promise.all([
        analyticsAPI.getOverview(),
        analyticsAPI.getTrends(),
      ]);
      setAnalytics(analyticsRes.data);
      setTrends(trendsRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-slate-600">Loading analytics...</div>
      </div>
    );
  }

  const statusData = analytics?.status_breakdown
    ? Object.entries(analytics.status_breakdown).map(([name, value]) => ({
        name,
        value,
        color: STATUS_COLORS[name] || '#94A3B8',
      }))
    : [];

  return (
    <div className="space-y-6" data-testid="analytics-page">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Analytics</h1>
        <p className="text-slate-600">Detailed insights into your lead performance</p>
      </div>

      {/* Lead Trends */}
      <Card className="border-slate-200 shadow-soft">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Lead Trends (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="date" stroke="#64748B" />
              <YAxis stroke="#64748B" />
              <Tooltip />
              <Line type="monotone" dataKey="leads" stroke="#0F172A" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Performance */}
        <Card className="border-slate-200 shadow-soft">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Lead Source Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics?.source_performance || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" stroke="#64748B" />
                <YAxis dataKey="source" type="category" stroke="#64748B" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Program Performance */}
        <Card className="border-slate-200 shadow-soft">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Program Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics?.program_performance || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" stroke="#64748B" />
                <YAxis dataKey="program" type="category" stroke="#64748B" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card className="border-slate-200 shadow-soft">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Lead Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(analytics?.status_breakdown || {}).map(([status, count]) => (
              <div
                key={status}
                className="p-4 rounded-lg border border-slate-200"
                style={{ borderLeftWidth: '4px', borderLeftColor: STATUS_COLORS[status] }}
              >
                <p className="text-sm text-slate-600 mb-1">{status}</p>
                <p className="text-2xl font-bold">{count}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-soft">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Top Performing Source</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.source_performance?.[0] ? (
              <div>
                <p className="text-3xl font-bold text-slate-900 mb-2">
                  {analytics.source_performance[0].source}
                </p>
                <p className="text-slate-600">
                  {analytics.source_performance[0].count} leads generated
                </p>
              </div>
            ) : (
              <p className="text-slate-500">No data available</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-soft">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Most Popular Program</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.program_performance?.[0] ? (
              <div>
                <p className="text-3xl font-bold text-slate-900 mb-2">
                  {analytics.program_performance[0].program}
                </p>
                <p className="text-slate-600">
                  {analytics.program_performance[0].count} enrollments
                </p>
              </div>
            ) : (
              <p className="text-slate-500">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsPage;
