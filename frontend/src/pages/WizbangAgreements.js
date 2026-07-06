import React, { useEffect, useState } from 'react';
import { wizbangAPI } from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ScrollText, Plus, Trash2, ExternalLink, Copy, Lock } from 'lucide-react';

const todayStr = () => new Date().toISOString().split('T')[0];

const WizbangAgreements = () => {
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const blank = {
    client_id: '',
    title: '',
    scope_brief: '',
    effective_date: todayStr(),
    term_months: 12,
  };
  const [form, setForm] = useState(blank);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [a, c] = await Promise.all([
        wizbangAPI.listAgreements(),
        wizbangAPI.listClients(),
      ]);
      setRows(a.data || []);
      setClients(c.data || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchAll();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.client_id || !form.title.trim() || !form.scope_brief.trim()) {
      toast.error('Client, title and scope brief are required');
      return;
    }
    try {
      setSaving(true);
      await wizbangAPI.createAgreement({
        client_id: form.client_id,
        title: form.title.trim(),
        scope_brief: form.scope_brief.trim(),
        effective_date: form.effective_date,
        term_months: Number(form.term_months || 12),
      });
      toast.success('Service agreement created');
      setDialog(false);
      setForm(blank);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const publicLink = (token) => `${window.location.origin}/a/${token}`;
  const copyLink = (token) => {
    navigator.clipboard.writeText(publicLink(token));
    toast.success('Public link copied');
  };

  const remove = async (row) => {
    if (row.status === 'Signed') {
      toast.error('Signed agreements cannot be deleted');
      return;
    }
    if (!window.confirm('Delete this agreement?')) return;
    try {
      await wizbangAPI.deleteAgreement(row.id);
      toast.success('Deleted');
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  return (
    <div className="space-y-6" data-testid="wizbang-agreements-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-violet-600" /> Service Agreements
          </h1>
          <p className="text-sm text-slate-500">
            Describe the scope; the system generates a full 12-clause agreement. Share the public
            link — the client signs once and it locks.
          </p>
        </div>
        <Button
          onClick={() => setDialog(true)}
          disabled={!clients.length}
          className="bg-violet-600 hover:bg-violet-700"
          data-testid="add-agreement-btn"
        >
          <Plus className="w-4 h-4 mr-1" /> New Agreement
        </Button>
      </div>

      {!clients.length && (
        <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded p-3">
          Add a client first before creating an agreement.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Agreements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-slate-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-10 text-center text-slate-500">No agreements yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="agreements-table">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Agreement #</th>
                    <th className="text-left px-4 py-3">Client</th>
                    <th className="text-left px-4 py-3">Title</th>
                    <th className="text-left px-4 py-3">Effective / Term</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-mono text-slate-900 font-medium">
                        {r.agreement_number}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{r.client_snapshot?.name}</td>
                      <td className="px-4 py-3 text-slate-700">{r.title}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {r.effective_date}
                        <br />
                        {r.term_months} months
                      </td>
                      <td className="px-4 py-3">
                        {r.status === 'Signed' ? (
                          <span
                            className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 font-medium inline-flex items-center gap-1"
                            data-testid={`status-signed-${r.id}`}
                          >
                            <Lock className="w-3 h-3" /> Signed by{' '}
                            {r.signed_by_name?.slice(0, 20)}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-violet-100 text-violet-700 font-medium">
                            Awaiting Signature
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <a
                          href={publicLink(r.public_token)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-violet-600 hover:text-violet-800 inline-flex items-center gap-1 text-xs font-medium mr-3"
                          data-testid={`view-agreement-${r.id}`}
                        >
                          <ExternalLink className="w-3 h-3" /> View
                        </a>
                        <button
                          onClick={() => copyLink(r.public_token)}
                          className="text-slate-500 hover:text-violet-600 text-xs mr-3"
                          data-testid={`copy-agreement-${r.id}`}
                        >
                          <Copy className="w-3 h-3 inline" /> Copy link
                        </button>
                        {r.status !== 'Signed' && (
                          <button
                            onClick={() => remove(r)}
                            className="text-slate-400 hover:text-rose-600"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Service Agreement</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Client *</Label>
                <Select
                  value={form.client_id}
                  onValueChange={(v) => setForm({ ...form, client_id: v })}
                >
                  <SelectTrigger data-testid="agreement-client-select">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Title *</Label>
                <Input
                  placeholder="e.g. Digital Marketing Retainer"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  data-testid="agreement-title-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Effective Date *</Label>
                <Input
                  type="date"
                  value={form.effective_date}
                  onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Term (months) *</Label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={form.term_months}
                  onChange={(e) => setForm({ ...form, term_months: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Scope Brief *</Label>
              <Textarea
                rows={6}
                placeholder="Describe what you'll deliver. The system will expand this into a full 12-clause agreement (Parties, Scope, Term, Fees, Confidentiality, IP, Termination, Governing Law, etc.)."
                value={form.scope_brief}
                onChange={(e) => setForm({ ...form, scope_brief: e.target.value })}
                required
                data-testid="agreement-scope-input"
              />
            </div>
            <p className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded p-2">
              ℹ️ After creation you'll get a shareable public link. The client signs by typing their
              full name + checking the consent box. Once signed, the agreement is locked and IP +
              timestamp are recorded for evidence.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-violet-600 hover:bg-violet-700">
                {saving ? 'Generating…' : 'Generate Agreement'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WizbangAgreements;
