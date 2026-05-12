import React, { useState, useEffect } from 'react';
import { lostLeadsAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, RotateCcw, Ban, Phone, Mail } from 'lucide-react';

const RESTORE_STATUS_OPTIONS = ['New', 'Contacted', 'Follow-up', 'Demo Booked'];

const LostLeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreLead, setRestoreLead] = useState(null);
  const [restoreStatus, setRestoreStatus] = useState('New');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await lostLeadsAPI.getAll();
      setLeads(res.data || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to fetch lost leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredLeads = leads.filter((l) => {
    const q = searchTerm.toLowerCase();
    if (!q) return true;
    return (
      l.name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.number?.includes(searchTerm) ||
      l.program_name?.toLowerCase().includes(q) ||
      l.lead_source?.toLowerCase().includes(q)
    );
  });

  const onRestoreClick = (lead) => {
    setRestoreLead(lead);
    setRestoreStatus('New');
    setRestoreOpen(true);
  };

  const confirmRestore = async () => {
    if (!restoreLead) return;
    try {
      await lostLeadsAPI.restore(restoreLead.id, restoreStatus);
      toast.success(`Lead restored to "${restoreStatus}"`);
      setRestoreOpen(false);
      setRestoreLead(null);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to restore lead');
    }
  };

  return (
    <div className="space-y-6" data-testid="lost-leads-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Ban className="w-8 h-8 text-red-500" />
            Lost Leads
          </h1>
          <p className="text-slate-600">
            Leads marked as Lost. Restore them to bring them back into your active pipeline.
          </p>
        </div>
        <Badge className="bg-red-100 text-red-700 text-base px-3 py-1">
          {filteredLeads.length} lost
        </Badge>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by name, phone, email, program, source..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="lost-leads-search"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Program</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Source</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Lost Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">Loading lost leads...</td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <Ban className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    No lost leads. Great job keeping your pipeline alive!
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors" data-testid={`lost-lead-row-${lead.id}`}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{lead.name}</p>
                      <p className="text-sm text-slate-500">{lead.city || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900 flex items-center gap-1"><Phone className="w-3 h-3" />{lead.number}</p>
                      <p className="text-sm text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm">{lead.program_name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm">{lead.lead_source || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {lead.updated_at ? new Date(lead.updated_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRestoreClick(lead)}
                        className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        data-testid={`restore-lost-${lead.id}`}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Restore
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Lost Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {restoreLead && (
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p><span className="text-slate-500">Name:</span> <span className="font-medium">{restoreLead.name}</span></p>
                <p><span className="text-slate-500">Phone:</span> {restoreLead.number}</p>
                <p><span className="text-slate-500">Program:</span> {restoreLead.program_name || 'N/A'}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Restore to status</label>
              <Select value={restoreStatus} onValueChange={setRestoreStatus}>
                <SelectTrigger data-testid="restore-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESTORE_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreOpen(false)}>Cancel</Button>
            <Button onClick={confirmRestore} className="bg-emerald-600 hover:bg-emerald-700" data-testid="confirm-restore-lost">
              Restore Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LostLeadsPage;
