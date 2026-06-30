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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { FileText, Plus, Trash2, ExternalLink, Copy, IndianRupee, CheckCircle2 } from 'lucide-react';

const fmtINR = (n) =>
  '₹' +
  (Number(n) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
const todayStr = () => new Date().toISOString().split('T')[0];
const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

const STATUSES = ['Sent', 'Paid', 'Overdue', 'Cancelled'];

const WizbangInvoices = () => {
  const [rows, setRows] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Record-payment dialog state
  const [payDialog, setPayDialog] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [payForm, setPayForm] = useState({
    payment_date: todayStr(),
    payment_mode: 'Net Banking',
    amount: '',
    notes: '',
  });
  const [recording, setRecording] = useState(false);

  const blankItem = { description: '', quantity: 1, rate: 0, amount: 0 };
  const blank = {
    client_id: '',
    issue_date: todayStr(),
    due_date: addDays(7),
    tax_enabled: false,
    tax_rate: 18,
    notes: '',
    items: [{ ...blankItem }],
  };
  const [form, setForm] = useState(blank);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [a, c] = await Promise.all([wizbangAPI.listInvoices(), wizbangAPI.listClients()]);
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

  const setItem = (i, patch) => {
    const items = [...form.items];
    items[i] = { ...items[i], ...patch };
    const q = Number(items[i].quantity || 0);
    const rt = Number(items[i].rate || 0);
    items[i].amount = Number((q * rt).toFixed(2));
    setForm({ ...form, items });
  };
  const addItem = () => setForm({ ...form, items: [...form.items, { ...blankItem }] });
  const removeItem = (i) =>
    setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });

  const subtotal = form.items.reduce((s, it) => s + Number(it.amount || 0), 0);
  const tax = form.tax_enabled ? Number(((subtotal * (form.tax_rate || 0)) / 100).toFixed(2)) : 0;
  const total = subtotal + tax;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.client_id) {
      toast.error('Select a client');
      return;
    }
    if (!form.items.length || form.items.some((it) => !it.description.trim() || it.amount <= 0)) {
      toast.error('Each line item needs a description and amount > 0');
      return;
    }
    try {
      setSaving(true);
      await wizbangAPI.createInvoice({
        client_id: form.client_id,
        issue_date: form.issue_date,
        due_date: form.due_date,
        tax_enabled: form.tax_enabled,
        tax_rate: form.tax_enabled ? Number(form.tax_rate || 0) : 0,
        notes: form.notes || null,
        items: form.items.map((it) => ({
          description: it.description.trim(),
          quantity: Number(it.quantity || 0),
          rate: Number(it.rate || 0),
          amount: Number(it.amount || 0),
        })),
      });
      toast.success('Invoice created');
      setDialog(false);
      setForm(blank);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const publicLink = (token) => `${window.location.origin}/i/${token}`;

  const copyLink = (token) => {
    navigator.clipboard.writeText(publicLink(token));
    toast.success('Public link copied');
  };

  const updateStatus = async (id, status) => {
    try {
      await wizbangAPI.updateInvoice(id, { status });
      toast.success(`Marked ${status}`);
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this invoice? If a payment was recorded, the linked income entry will also be removed (balance restored).')) return;
    try {
      await wizbangAPI.deleteInvoice(id);
      toast.success('Deleted');
      fetchAll();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  const openRecordPayment = (inv) => {
    setPayTarget(inv);
    setPayForm({
      payment_date: todayStr(),
      payment_mode: 'Net Banking',
      amount: String(inv.total),
      notes: '',
    });
    setPayDialog(true);
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!payTarget) return;
    const amt = Number(payForm.amount);
    if (!amt || amt <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }
    try {
      setRecording(true);
      await wizbangAPI.recordInvoicePayment(payTarget.id, {
        payment_date: payForm.payment_date,
        payment_mode: payForm.payment_mode,
        amount: amt,
        notes: payForm.notes || null,
      });
      toast.success(
        'Payment recorded — invoice marked Paid and income added to Current Bank Balance.',
      );
      setPayDialog(false);
      setPayTarget(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed');
    } finally {
      setRecording(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="wizbang-invoices-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" /> Invoices
          </h1>
          <p className="text-sm text-slate-500">
            Create branded e-invoices with multiple line items, optional GST, and a public share
            link.
          </p>
        </div>
        <Button
          onClick={() => setDialog(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
          disabled={!clients.length}
          data-testid="add-invoice-btn"
        >
          <Plus className="w-4 h-4 mr-1" /> New Invoice
        </Button>
      </div>

      {!clients.length && (
        <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded p-3">
          Add a client first before raising an invoice.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-slate-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-10 text-center text-slate-500">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="invoices-table">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Invoice #</th>
                    <th className="text-left px-4 py-3">Client</th>
                    <th className="text-left px-4 py-3">Issued / Due</th>
                    <th className="text-right px-4 py-3">Total</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-mono text-slate-900 font-medium">
                        {r.invoice_number}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{r.client_snapshot?.name}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {r.issue_date}
                        <br />
                        Due {r.due_date}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{fmtINR(r.total)}</td>
                      <td className="px-4 py-3">
                        <Select
                          value={r.status}
                          onValueChange={(v) => updateStatus(r.id, v)}
                        >
                          <SelectTrigger className="h-7 text-xs w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {r.status !== 'Paid' && r.status !== 'Cancelled' && (
                          <button
                            onClick={() => openRecordPayment(r)}
                            className="text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1 text-xs font-semibold mr-3"
                            data-testid={`record-payment-${r.id}`}
                          >
                            <IndianRupee className="w-3 h-3" /> Record Payment
                          </button>
                        )}
                        {r.status === 'Paid' && (
                          <span
                            className="text-emerald-600 inline-flex items-center gap-1 text-xs font-medium mr-3"
                            title={`Paid on ${r.paid_date || ''} via ${r.payment_mode || ''}`}
                            data-testid={`paid-badge-${r.id}`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Paid {r.paid_date}
                          </span>
                        )}
                        <a
                          href={publicLink(r.public_token)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 text-xs font-medium mr-3"
                          data-testid={`view-invoice-${r.id}`}
                        >
                          <ExternalLink className="w-3 h-3" /> View
                        </a>
                        <button
                          onClick={() => copyLink(r.public_token)}
                          className="text-slate-500 hover:text-indigo-600 text-xs mr-3"
                          data-testid={`copy-invoice-${r.id}`}
                        >
                          <Copy className="w-3 h-3 inline" /> Copy link
                        </button>
                        <button
                          onClick={() => remove(r.id)}
                          className="text-slate-400 hover:text-rose-600"
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Invoice</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-1">
                <Label>Client *</Label>
                <Select
                  value={form.client_id}
                  onValueChange={(v) => setForm({ ...form, client_id: v })}
                >
                  <SelectTrigger data-testid="invoice-client-select">
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
                <Label>Issue Date *</Label>
                <Input
                  type="date"
                  value={form.issue_date}
                  onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="w-3 h-3 mr-1" /> Add Item
                </Button>
              </div>
              <div className="space-y-2">
                {form.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-6 space-y-1">
                      <Label className="text-xs">Description</Label>
                      <Input
                        value={it.description}
                        onChange={(e) => setItem(i, { description: e.target.value })}
                        required
                        data-testid={`item-desc-${i}`}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={it.quantity}
                        onChange={(e) => setItem(i, { quantity: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Rate</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={it.rate}
                        onChange={(e) => setItem(i, { rate: e.target.value })}
                      />
                    </div>
                    <div className="col-span-1 space-y-1">
                      <Label className="text-xs">Amount</Label>
                      <Input value={it.amount} readOnly className="bg-slate-50" />
                    </div>
                    <div className="col-span-1">
                      {form.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          className="text-rose-500 hover:text-rose-700 p-2"
                          aria-label="Remove line"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded border border-slate-200 bg-slate-50">
              <Switch
                checked={form.tax_enabled}
                onCheckedChange={(v) => setForm({ ...form, tax_enabled: v })}
                data-testid="tax-toggle"
              />
              <Label className="m-0">Apply GST</Label>
              {form.tax_enabled && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    className="w-20"
                    value={form.tax_rate}
                    onChange={(e) => setForm({ ...form, tax_rate: e.target.value })}
                  />
                  <span className="text-sm text-slate-600">%</span>
                </div>
              )}
              <div className="ml-auto text-sm text-slate-700">
                Subtotal {fmtINR(subtotal)} {form.tax_enabled && `+ Tax ${fmtINR(tax)}`} ={' '}
                <strong className="text-slate-900">{fmtINR(total)}</strong>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Anything you want the client to see on the invoice"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? 'Saving…' : 'Create Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payment dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="max-w-md" data-testid="record-payment-dialog">
          <DialogHeader>
            <DialogTitle>
              Record Payment {payTarget && `— ${payTarget.invoice_number}`}
            </DialogTitle>
          </DialogHeader>
          {payTarget && (
            <form onSubmit={submitPayment} className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm">
                <p className="text-slate-600">
                  <strong className="text-slate-900">{payTarget.client_snapshot?.name}</strong> owes{' '}
                  <strong>{fmtINR(payTarget.total)}</strong> for invoice{' '}
                  <span className="font-mono">{payTarget.invoice_number}</span>.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Payment Date *</Label>
                  <Input
                    type="date"
                    value={payForm.payment_date}
                    onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                    required
                    data-testid="pay-date-input"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Amount Received (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    required
                    data-testid="pay-amount-input"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Payment Mode *</Label>
                <Select
                  value={payForm.payment_mode}
                  onValueChange={(v) => setPayForm({ ...payForm, payment_mode: v })}
                >
                  <SelectTrigger data-testid="pay-mode-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Cash', 'Card', 'UPI', 'Net Banking', 'Cheque'].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Notes (optional)</Label>
                <Textarea
                  rows={2}
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  placeholder="e.g. UTR / cheque number"
                  data-testid="pay-notes-input"
                />
              </div>
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
                ✅ This will mark the invoice as Paid AND post an income entry of the same amount
                into your Wizbang ledger — Current Bank Balance updates automatically.
              </p>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPayDialog(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={recording}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  data-testid="pay-submit-btn"
                >
                  {recording ? 'Recording…' : 'Record Payment & Mark Paid'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WizbangInvoices;
