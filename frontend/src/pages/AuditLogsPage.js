import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { auditAPI } from '@/api/api';
import { History, User, FileText, RefreshCw, Search, ChevronLeft, ChevronRight, Activity, Clock, Edit, Plus, Trash2, Eye } from 'lucide-react';

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    entity_type: '',
    action: ''
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';
  const isBranchAdmin = user.role === 'branch_admin';

  useEffect(() => {
    fetchData();
  }, [page, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (filters.entity_type) params.entity_type = filters.entity_type;
      if (filters.action) params.action = filters.action;

      const [logsRes, summaryRes] = await Promise.all([
        auditAPI.getLogs(params),
        auditAPI.getSummary(7)
      ]);
      
      setLogs(logsRes.data.logs);
      setTotalPages(logsRes.data.total_pages);
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'create': return <Plus className="w-4 h-4 text-green-600" />;
      case 'update': return <Edit className="w-4 h-4 text-blue-600" />;
      case 'delete': return <Trash2 className="w-4 h-4 text-red-600" />;
      case 'view': return <Eye className="w-4 h-4 text-slate-600" />;
      default: return <Activity className="w-4 h-4 text-slate-600" />;
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'create': return <Badge className="bg-green-100 text-green-700">Created</Badge>;
      case 'update': return <Badge className="bg-blue-100 text-blue-700">Updated</Badge>;
      case 'delete': return <Badge className="bg-red-100 text-red-700">Deleted</Badge>;
      case 'login': return <Badge className="bg-purple-100 text-purple-700">Login</Badge>;
      case 'logout': return <Badge className="bg-slate-100 text-slate-700">Logout</Badge>;
      default: return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getEntityBadge = (entityType) => {
    const colors = {
      lead: 'bg-blue-100 text-blue-700',
      payment: 'bg-green-100 text-green-700',
      enrollment: 'bg-purple-100 text-purple-700',
      student: 'bg-orange-100 text-orange-700',
      batch: 'bg-cyan-100 text-cyan-700',
      attendance: 'bg-yellow-100 text-yellow-700'
    };
    return <Badge className={colors[entityType] || 'bg-slate-100 text-slate-700'}>{entityType}</Badge>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  if (loading && page === 1) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="audit-logs-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <History className="w-7 h-7 text-indigo-600" />
            Activity Logs
          </h1>
          <p className="text-slate-600 mt-1">
            {isAdmin ? 'Track Branch Admin activities' : 'Track team activities in your branch'}
          </p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Actions (7d)</p>
                  <p className="text-2xl font-bold text-slate-800">{summary.total_actions}</p>
                </div>
                <Activity className="w-8 h-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Active Users</p>
                  <p className="text-2xl font-bold text-slate-800">{summary.user_activity?.length || 0}</p>
                </div>
                <User className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Most Common</p>
                  <p className="text-lg font-bold text-slate-800 capitalize">
                    {Object.entries(summary.action_breakdown || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Top Entity</p>
                  <p className="text-lg font-bold text-slate-800 capitalize">
                    {Object.entries(summary.entity_breakdown || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Activity Summary */}
      {summary?.user_activity?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User Activity (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {summary.user_activity.slice(0, 10).map((ua, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium">{ua.user.split('(')[0].trim()}</span>
                  <Badge variant="secondary">{ua.count} actions</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Select 
              value={filters.entity_type || "all"} 
              onValueChange={(v) => { setFilters({...filters, entity_type: v === "all" ? "" : v}); setPage(1); }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="lead">Leads</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="enrollment">Enrollments</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="batch">Batches</SelectItem>
                <SelectItem value="attendance">Attendance</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.action || "all"} 
              onValueChange={(v) => { setFilters({...filters, action: v === "all" ? "" : v}); setPage(1); }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Created</SelectItem>
                <SelectItem value="update">Updated</SelectItem>
                <SelectItem value="delete">Deleted</SelectItem>
              </SelectContent>
            </Select>

            {(filters.entity_type || filters.action) && (
              <Button 
                variant="ghost" 
                onClick={() => { setFilters({ entity_type: '', action: '' }); setPage(1); }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Detailed record of all user actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Time</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">User</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Action</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Entity</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium">{formatRelativeTime(log.created_at)}</p>
                          <p className="text-xs text-slate-500">{formatDate(log.created_at)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-medium">{log.user_name}</p>
                        <p className="text-xs text-slate-500">{log.user_email}</p>
                        <Badge variant="secondary" className="text-xs mt-1">{log.user_role}</Badge>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        {getActionBadge(log.action)}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div>
                        {getEntityBadge(log.entity_type)}
                        {log.entity_name && (
                          <p className="text-sm text-slate-600 mt-1">{log.entity_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      {log.changes && (
                        <div className="text-xs text-slate-600 max-w-xs">
                          {Object.entries(log.changes).slice(0, 3).map(([key, value]) => (
                            <div key={key} className="truncate">
                              <span className="font-medium">{key}:</span> {String(value).substring(0, 30)}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {logs.length === 0 && (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No activity logs found</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLogsPage;
