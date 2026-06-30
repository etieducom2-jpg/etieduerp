import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Loader2, ArrowLeft, RefreshCw, RotateCcw, X, Phone, Mail, Calendar, AlertTriangle } from 'lucide-react';
import { analyticsAPI, leadsAPI } from '@/api/api';
import { toast } from 'sonner';

const AGE_BUCKETS = [
  { key: 'all', label: 'All', min: 0, max: 365 },
  { key: 'fresh', label: '0–7 days', min: 0, max: 7 },
  { key: 'recent', label: '8–30 days', min: 8, max: 30 },
  { key: 'old', label: '31+ days', min: 31, max: 365 },
];

export const ReengageDialog = ({ open, lead, owners, onClose, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [assignTo, setAssignTo] = useState('keep');
  const [targetStage, setTargetStage] = useState('New');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setReason('');
      setAssignTo('keep');
      setTargetStage('New');
    }
  }, [open]);

  if (!open || !lead) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await analyticsAPI.reengageLostLead(lead.id, {
        reason: reason.trim(),
        assign_to: assignTo === 'keep' ? null : assignTo,
        target_stage: targetStage,
      });
      toast.success(`Re-opened ${lead.name} as ${targetStage}`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to re-engage lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="reengage-dialog">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Re-engage lead</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Re-open <span className="font-semibold text-slate-700">{lead.name}</span> and move them back into the pipeline.
            </p>
            {lead.lost_reason && (
              <p className="text-xs text-rose-600 mt-1.5 bg-rose-50 rounded px-2 py-1">
                <AlertTriangle className="w-3 h-3 inline-block mr-1" />
                Last lost reason: {lead.lost_reason}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" data-testid="reengage-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium text-slate-600">Re-entry stage</Label>
            <Select value={targetStage} onValueChange={setTargetStage}>
              <SelectTrigger data-testid="reengage-stage-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="Contact Attempted">Contact Attempted</SelectItem>
                <SelectItem value="Connected">Connected</SelectItem>
                <SelectItem value="Interested">Interested</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600">Reassign to (optional)</Label>
            <Select value={assignTo} onValueChange={setAssignTo}>
              <SelectTrigger data-testid="reengage-assign-select"><SelectValue placeholder="Keep current owner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="keep">Keep current owner ({lead.counsellor_name || '—'})</SelectItem>
                {owners.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name} ({o.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium text-slate-600">Why re-engaging? (optional)</Label>
            <Textarea
              data-testid="reengage-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Lead replied to follow-up campaign, customer ready to enrol now…"
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose} data-testid="reengage-cancel">
            Cancel
          </Button>
          <Button
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            onClick={handleSave}
            disabled={saving}
            data-testid="reengage-confirm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Re-engage lead'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const LostLeadsPage = () => {
  const navigate = useNavigate();
  const [bucket, setBucket] = useState('all');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [owners, setOwners] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const b = AGE_BUCKETS.find((x) => x.key === bucket) || AGE_BUCKETS[0];
    try {
      const res = await analyticsAPI.listLostLeads({ days_min: b.min, days_max: b.max, limit: 200 });
      setLeads(res.data?.results || []);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [bucket]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    leadsAPI?.getBranchLeadOwners?.()
      .then((res) => setOwners(res.data || []))
      .catch(() => setOwners([]));
  }, []);

  return (
    <div className="space-y-4" data-testid="lost-leads-page">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} data-testid="lost-back">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Dashboard
        </Button>
        <h1 className="text-xl font-bold text-slate-900 flex-1">Lost leads — re-engagement</h1>
        <Button variant="outline" size="sm" onClick={load} data-testid="lost-refresh">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-800 flex items-center gap-2">
            Filter by lost-age
            <div className="ml-auto flex gap-1.5">
              {AGE_BUCKETS.map((b) => (
                <button
                  key={b.key}
                  onClick={() => setBucket(b.key)}
                  data-testid={`lost-bucket-${b.key}`}
                  className={`text-xs px-3 py-1 rounded-full border ${
                    bucket === b.key
                      ? 'bg-indigo-600 border-indigo-600 text-white font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading && (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading lost leads…
            </div>
          )}
          {!loading && leads.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-10" data-testid="lost-empty">
              No lost leads in this range. Great work.
            </p>
          )}
          {!loading && leads.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="text-left py-2 px-2">Name</th>
                    <th className="text-left py-2 px-2">Program</th>
                    <th className="text-left py-2 px-2">Owner</th>
                    <th className="text-left py-2 px-2">Source</th>
                    <th className="text-left py-2 px-2">Lost</th>
                    <th className="text-left py-2 px-2">Reason</th>
                    <th className="text-right py-2 px-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                      data-testid={`lost-row-${l.id}`}
                    >
                      <td className="py-2.5 px-2">
                        <button
                          onClick={() => navigate(`/leads/${l.id}`)}
                          className="text-indigo-700 hover:underline font-medium text-left"
                        >
                          {l.name}
                        </button>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          {l.number && <span className="flex items-center gap-0.5"><Phone className="w-3 h-3" /> {l.number}</span>}
                          {l.email && <span className="flex items-center gap-0.5 truncate max-w-[160px]"><Mail className="w-3 h-3" /> {l.email}</span>}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-slate-700">{l.program_name || '—'}</td>
                      <td className="py-2.5 px-2 text-slate-700">{l.counsellor_name || '—'}</td>
                      <td className="py-2.5 px-2"><Badge className="bg-slate-100 text-slate-700 text-[11px]">{l.lead_source || '—'}</Badge></td>
                      <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">
                        <Calendar className="w-3 h-3 inline-block mr-1 text-slate-400" />
                        {l.lost_days}d ago
                      </td>
                      <td className="py-2.5 px-2 text-rose-600 italic max-w-[200px] truncate">{l.lost_reason || '—'}</td>
                      <td className="py-2.5 px-2 text-right">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => setSelectedLead(l)}
                          data-testid={`btn-reengage-${l.id}`}
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Re-engage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ReengageDialog
        open={!!selectedLead}
        lead={selectedLead}
        owners={owners}
        onClose={() => setSelectedLead(null)}
        onSuccess={load}
      />
    </div>
  );
};

export default LostLeadsPage;
