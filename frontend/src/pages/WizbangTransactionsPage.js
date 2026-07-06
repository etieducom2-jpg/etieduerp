import React, { useEffect, useState } from 'react';
import { wizbangAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Net Banking', 'Cheque'];

const fmtINR = (n) =>
  '₹' +
  (Number(n) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const todayStr = () => new Date().toISOString().split('T')[0];

const WizbangTransactionsPage = ({ type }) => {
  const isIncome = type === 'income';
  const title = isIncome ? 'Income' : 'Expenses';
  const Icon = isIncome ? TrendingUp : TrendingDown;
  const accent = isIncome ? 'text-emerald-600' : 'text-rose-600';
  const btnColor = isIncome
    ? 'bg-emerald-600 hover:bg-emerald-700'
    : 'bg-rose-600 hover:bg-rose-700';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const blankForm = {
    type,
    date: todayStr(),
    amount: '',
    category: '',
    vendor_name: '',
    payment_mode: 'Cash',
    description: '',
  };
  const [form, setForm] = useState(blankForm);

  const fetchRows = async () => {
    try {
      setLoading(true);
      const res = await wizbangAPI.listTransactions(type);
      setRows(res.data || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    setForm({ ...blankForm, type });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const total = rows.reduce((acc, r) => acc + Number(r.amount || 0), 0);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.category.trim() || !form.vendor_name.trim()) {
      toast.error('Category and Vendor are required');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }
    try {
      setSubmitting(true);
      await wizbangAPI.createTransaction({
        ...form,
        amount: Number(form.amount),
      });
      toast.success(`${isIncome ? 'Income' : 'Expense'} added`);
      setDialog(false);
      setForm({ ...blankForm, type });
      fetchRows();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return;
    try {
      await wizbangAPI.deleteTransaction(id);
      toast.success('Deleted');
      fetchRows();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6" data-testid={`wizbang-${type}-page`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Icon className={`w-6 h-6 ${accent}`} />
            {title}
          </h1>
          <p className="text-sm text-slate-500">
            Total {title.toLowerCase()}:{' '}
            <span className={`font-semibold ${accent}`} data-testid={`wizbang-${type}-total`}>
              {fmtINR(total)}
            </span>
          </p>
        </div>
        <Button
          className={btnColor}
          onClick={() => setDialog(true)}
          data-testid={`wizbang-${type}-add-btn`}
        >
          <Plus className="w-4 h-4 mr-1" /> Add {isIncome ? 'Income' : 'Expense'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All {title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-slate-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-slate-500" data-testid={`wizbang-${type}-empty`}>
              No {title.toLowerCase()} recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid={`wizbang-${type}-table`}>
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-left px-4 py-3">Vendor</th>
                    <th className="text-left px-4 py-3">Mode</th>
                    <th className="text-left px-4 py-3">Description</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-700">{r.date}</td>
                      <td className="px-4 py-3 text-slate-700">{r.category}</td>
                      <td className="px-4 py-3 text-slate-700">{r.vendor_name}</td>
                      <td className="px-4 py-3 text-slate-700">{r.payment_mode}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-[260px] truncate">
                        {r.description}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${accent}`}>
                        {isIncome ? '+' : '−'} {fmtINR(r.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                          data-testid={`wizbang-${type}-delete-${r.id}`}
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
        <DialogContent className="max-w-lg" data-testid={`wizbang-${type}-dialog`}>
          <DialogHeader>
            <DialogTitle>Add {isIncome ? 'Income' : 'Expense'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  data-testid={`wizbang-${type}-date-input`}
                />
              </div>
              <div className="space-y-1">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                  data-testid={`wizbang-${type}-amount-input`}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Category *</Label>
                <Input
                  placeholder={isIncome ? 'e.g. Course Sale' : 'e.g. Marketing'}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  required
                  data-testid={`wizbang-${type}-category-input`}
                />
              </div>
              <div className="space-y-1">
                <Label>Vendor / From *</Label>
                <Input
                  placeholder={isIncome ? 'e.g. Student name' : 'e.g. Vendor name'}
                  value={form.vendor_name}
                  onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                  required
                  data-testid={`wizbang-${type}-vendor-input`}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Payment Mode *</Label>
              <Select
                value={form.payment_mode}
                onValueChange={(v) => setForm({ ...form, payment_mode: v })}
              >
                <SelectTrigger data-testid={`wizbang-${type}-mode-select`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                rows={3}
                placeholder="Optional notes"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                data-testid={`wizbang-${type}-description-input`}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialog(false)}
                data-testid={`wizbang-${type}-cancel-btn`}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className={btnColor}
                data-testid={`wizbang-${type}-save-btn`}
              >
                {submitting ? 'Saving…' : `Save ${isIncome ? 'Income' : 'Expense'}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WizbangTransactionsPage;
