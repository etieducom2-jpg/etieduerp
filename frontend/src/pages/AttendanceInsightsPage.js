import React, { useState, useEffect } from 'react';
import { attendanceAPI } from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  ClipboardList, Users, AlertTriangle, Calendar, RefreshCw,
  TrendingDown, CheckCircle, XCircle, Clock
} from 'lucide-react';

const AttendanceInsightsPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await attendanceAPI.getMissedInsights();
      setData(response.data);
    } catch (error) {
      toast.error('Failed to load attendance insights');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getComplianceColor = (rate) => {
    if (rate >= 90) return 'text-green-600 bg-green-50';
    if (rate >= 70) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <ClipboardList className="w-16 h-16 text-blue-500 mx-auto animate-pulse" />
          <p className="mt-4 text-slate-500">Loading attendance insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="attendance-insights-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-500" />
            Attendance Insights
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track trainer attendance marking compliance | 
            Period: {data?.analysis_period?.start} to {data?.analysis_period?.end}
          </p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data?.total_trainers || 0}</p>
                <p className="text-sm text-slate-500">Trainers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-full">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data?.total_batches || 0}</p>
                <p className="text-sm text-slate-500">Active Batches</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-full">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{data?.summary?.total_missed_days || 0}</p>
                <p className="text-sm text-slate-500">Total Missed Days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-full">
                <TrendingDown className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data?.summary?.avg_compliance_rate || 100}%</p>
                <p className="text-sm text-slate-500">Avg Compliance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trainer Compliance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Trainer Compliance (Last 7 Days)
          </CardTitle>
          <CardDescription>Sorted by compliance rate - lowest first</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.trainer_insights?.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
              <p>All trainers have 100% attendance marking compliance!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.trainer_insights?.map((trainer) => (
                <div key={trainer.trainer_id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{trainer.trainer_name}</p>
                      <p className="text-sm text-slate-500">{trainer.trainer_email}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full ${getComplianceColor(trainer.compliance_rate)}`}>
                      <span className="font-bold">{trainer.compliance_rate}%</span>
                      <span className="text-xs ml-1">compliance</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-sm mb-3">
                    <div className="text-center p-2 bg-slate-50 rounded">
                      <p className="font-bold text-blue-600">{trainer.total_batches}</p>
                      <p className="text-xs text-slate-500">Batches</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded">
                      <p className="font-bold text-green-600">{trainer.marked_days}</p>
                      <p className="text-xs text-slate-500">Marked</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded">
                      <p className="font-bold text-red-600">{trainer.missed_days}</p>
                      <p className="text-xs text-slate-500">Missed</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded">
                      <p className="font-bold">{trainer.total_expected_days}</p>
                      <p className="text-xs text-slate-500">Expected</p>
                    </div>
                  </div>
                  
                  <Progress value={trainer.compliance_rate} className="h-2" />
                  
                  {trainer.missed_dates?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs text-slate-500">Missed dates:</span>
                      {trainer.missed_dates.slice(0, 5).map((date, idx) => (
                        <Badge key={idx} variant="destructive" className="text-xs">
                          {date}
                        </Badge>
                      ))}
                      {trainer.missed_dates.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{trainer.missed_dates.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Missed Days */}
      {data?.missed_days_list?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Recent Missed Attendance
            </CardTitle>
            <CardDescription>Days when attendance was not marked</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.missed_days_list.map((missed, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="font-medium">{missed.date}</p>
                      <p className="text-sm text-slate-500">{missed.batch_name}</p>
                    </div>
                  </div>
                  <Badge variant="outline">{missed.trainer_name}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AttendanceInsightsPage;
