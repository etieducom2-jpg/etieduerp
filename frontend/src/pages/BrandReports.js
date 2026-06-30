import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { brandAPI } from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Download, Trash2, FileText, ArrowLeft } from 'lucide-react';

const b64ToBlob = (b64, mime = 'application/pdf') => {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

const BrandReports = () => {
  const [reports, setReports] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientFilter, setClientFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async (clientId = null) => {
    try {
      setLoading(true);
      const r = await brandAPI.listReports(clientId && clientId !== 'all' ? clientId : null);
      setReports(r.data || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const c = await brandAPI.listClients();
        setClients(c.data || []);
      } catch (e) {
        // non-blocking
      }
    })();
    load();
  }, []);

  const onFilterChange = (v) => {
    setClientFilter(v);
    load(v);
  };

  const onDownload = async (rep) => {
    try {
      setBusyId(rep.id);
      const full = await brandAPI.getReport(rep.id);
      const b64 = full.data?.pdf_b64;
      if (!b64) {
        toast.error('PDF not available');
        return;
      }
      const blob = b64ToBlob(b64);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(rep.title || 'report').replace(/[^a-z0-9]+/gi, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Download failed');
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (rep) => {
    if (!window.confirm(`Delete report "${rep.title}"?`)) return;
    try {
      await brandAPI.deleteReport(rep.id);
      toast.success('Report deleted');
      load(clientFilter);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6" data-testid="brand-reports-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/wizbang/brand">
            <Button variant="ghost" size="sm" data-testid="back-to-brand"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Monthly Reports</h1>
            <p className="text-sm text-slate-500">AI-generated social media reports for Wizbang clients.</p>
          </div>
        </div>
        <Link to="/wizbang/brand/reports/new">
          <Button data-testid="new-report-cta"><Plus className="h-4 w-4 mr-2" />New Report</Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-amber-600" /> All Reports</CardTitle>
          <div className="w-64">
            <Select value={clientFilter} onValueChange={onFilterChange}>
              <SelectTrigger data-testid="client-filter"><SelectValue placeholder="Filter by client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-slate-500">Loading…</div>
          ) : reports.length === 0 ? (
            <div className="py-10 text-center text-slate-500" data-testid="no-reports">
              No reports yet. Click <span className="font-medium">New Report</span> to generate one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2 pr-4">Title</th>
                    <th className="py-2 pr-4">Client</th>
                    <th className="py-2 pr-4">Month</th>
                    <th className="py-2 pr-4">Reach</th>
                    <th className="py-2 pr-4">Posts</th>
                    <th className="py-2 pr-4">Engagement</th>
                    <th className="py-2 pr-4">Created</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-slate-50" data-testid={`report-row-${r.id}`}>
                      <td className="py-2 pr-4 font-medium text-slate-900">{r.title}</td>
                      <td className="py-2 pr-4">{r.client_name}</td>
                      <td className="py-2 pr-4">{r.month}</td>
                      <td className="py-2 pr-4">{(r.total_reach || 0).toLocaleString()}</td>
                      <td className="py-2 pr-4">{r.total_posts || 0}</td>
                      <td className="py-2 pr-4">{(r.total_engagement || 0).toLocaleString()}</td>
                      <td className="py-2 pr-4 text-slate-500">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                      <td className="py-2 pr-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === r.id}
                            onClick={() => onDownload(r)}
                            data-testid={`download-report-${r.id}`}
                          >
                            <Download className="h-4 w-4 mr-1" />{busyId === r.id ? 'Loading…' : 'PDF'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => onDelete(r)}
                            data-testid={`delete-report-${r.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BrandReports;
