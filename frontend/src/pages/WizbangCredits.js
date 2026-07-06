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
import { toast } from 'sonner';
import { HandCoins, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

const fmtINR = (n) =>
  '₹' +
  (Number(n) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const todayStr = () => new Date().toISOString().split('T')[0];

const WizbangCredits = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({
    recipient_name: '',
    amount: '',
    purpose: '',
    given_date: todayStr(),
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchRows = async () => {
    try {
      setLoading(true);
      const r = await wizbangAPI.listCredits();
      setRows(r.data || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load credits');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchRows();
  }, []);

  const outstanding = rows
    .filter((r) => !r.is_repaid)
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const repaid = rows
    .filter((r) => r.is_repaid)
    .reduce((s, r) => s + Number(r.repaid_amount || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.recipient_name.trim() || !form.purpose.trim()) {
      toast.error('Recipient and Purpose are required');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }
    try {
      setSaving(true);
      await wizbangAPI.createCredit({
        recipient_name: form.recipient_name.trim(),
        amount: Number(form.amount),
        purpose: form.purpose.trim(),
        given_date: form.given_date,
        notes: form.notes || null,
      });
      toast.success(
        'Credit recorded. Current bank balance has been reduced automatically.',
      );
      setDialog(false);
      setForm({
        recipient_name: '',
        amount: '',
        purpose: '',
        given_date: todayStr(),
        notes: '',
      });
      fetchRows();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const markRepaid = async (row) => {
    const amt = window.prompt(
      `Mark as repaid — how much did ${row.recipient_name} return? (Default ₹${row.amount})`,
      String(row.amount),
    );
    if (amt === null) return;
    try {
      await wizbangAPI.repayCredit(row.id, { repaid_amount: Number(amt) });
      toast.success('Marked as repaid. Income entry added automatically.');
      fetchRows();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const remove = async (row) => {
    const msg = row.is_repaid
      ? 'Delete this credit? Both backing transactions will also be removed.'
      : 'Delete this credit? The outflow transaction will be reverted (balance restored).';
    if (!window.confirm(msg)) return;
    try {
      await wizbangAPI.deleteCredit(row.id);
      toast.success('Deleted');
      fetchRows();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  return (
    <div className="space-y-6" data-testid="wizbang-credits-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <HandCoins className="w-6 h-6 text-amber-600" /> Credits & Repayments
          </h1>
          <p className="text-sm text-slate-500">
            Money given out as credit — this immediately reduces your Current Bank Balance.
          </p>
        </div>
        <Button
          onClick={() => setDialog(true)}
          className="bg-amber-600 hover:bg-amber-700"
          data-testid="add-credit-btn"
        >
          <Plus className="w-4 h-4 mr-1" /> Give Credit
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-l-4 border-amber-500">
          <CardContent className="p-5 flex justify-between items-center">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Outstanding Credit</p>
              <p className="text-2xl font-bold mt-1 text-amber-700" data-testid="credit-outstanding">
                {fmtINR(outstanding)}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-amber-400" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-emerald-500">
          <CardContent className="p-5 flex justify-between items-center">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Already Repaid</p>
              <p className="text-2xl font-bold mt-1 text-emerald-700" data-testid="credit-repaid">
                {fmtINR(repaid)}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Credits</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-slate-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-10 text-center text-slate-500">No credit given yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="credits-table">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Given On</th>
                    <th className="text-left px-4 py-3">Recipient</th>
                    <th className="text-left px-4 py-3">Purpose</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-700">{r.given_date}</td>
                      <td className="px-4 py-3 text-slate-900 font-medium">{r.recipient_name}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{r.purpose}</td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-700">
                        {fmtINR(r.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {r.is_repaid ? (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 font-medium">
                            Repaid {fmtINR(r.repaid_amount)} on {r.repaid_at}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 font-medium">
                            Outstanding
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {!r.is_repaid && (
                          <button
                            onClick={() => markRepaid(r)}
                            className="text-emerald-600 hover:text-emerald-800 text-xs font-medium mr-3"
                            data-testid={`repay-${r.id}`}
                          >
                            Mark Repaid
                          </button>
                        )}
                        <button
                          onClick={() => remove(r)}
                          className="text-slate-400 hover:text-rose-600"
                          data-testid={`delete-credit-${r.id}`}
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Give Credit</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <Label>Recipient Name *</Label>
              <Input
                value={form.recipient_name}
                onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                required
                data-testid="credit-recipient-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                  data-testid="credit-amount-input"
                />
              </div>
              <div className="space-y-1">
                <Label>Given Date *</Label>
                <Input
                  type="date"
                  value={form.given_date}
                  onChange={(e) => setForm({ ...form, given_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Purpose *</Label>
              <Input
                placeholder="e.g. Advance for vendor"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                required
                data-testid="credit-purpose-input"
              />
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              ⚠️ This will reduce your Current Bank Balance immediately. When the person returns the
              money, click "Mark Repaid" and the system will record an income entry.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-amber-600 hover:bg-amber-700">
                {saving ? 'Saving…' : 'Give Credit'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WizbangCredits;
