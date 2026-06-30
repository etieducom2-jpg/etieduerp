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
import { Plus, Pencil, Trash2, Users, Mail, Phone } from 'lucide-react';

const blank = {
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  gstin: '',
  notes: '',
};

const WizbangClients = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchRows = async () => {
    try {
      setLoading(true);
      const r = await wizbangAPI.listClients();
      setRows(r.data || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(blank);
    setDialog(true);
  };
  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || '',
      contact_person: row.contact_person || '',
      email: row.email || '',
      phone: row.phone || '',
      address: row.address || '',
      gstin: row.gstin || '',
      notes: row.notes || '',
    });
    setDialog(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      setSaving(true);
      const payload = { ...form };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') payload[k] = null;
      });
      if (editingId) {
        await wizbangAPI.updateClient(editingId, payload);
        toast.success('Client updated');
      } else {
        await wizbangAPI.createClient(payload);
        toast.success('Client added');
      }
      setDialog(false);
      fetchRows();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this client? This cannot be undone.')) return;
    try {
      await wizbangAPI.deleteClient(id);
      toast.success('Deleted');
      fetchRows();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6" data-testid="wizbang-clients-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" /> Clients
          </h1>
          <p className="text-sm text-slate-500">
            {rows.length} client{rows.length === 1 ? '' : 's'} on file. Use these in invoices and
            service agreements.
          </p>
        </div>
        <Button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700" data-testid="add-client-btn">
          <Plus className="w-4 h-4 mr-1" /> Add Client
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Clients</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-slate-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-10 text-center text-slate-500">
              No clients yet. Add your first client to start invoicing.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="clients-table">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Contact Person</th>
                    <th className="text-left px-4 py-3">Email / Phone</th>
                    <th className="text-left px-4 py-3">GSTIN</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                      <td className="px-4 py-3 text-slate-700">{r.contact_person || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {r.email && (
                          <div className="flex items-center gap-1 text-xs">
                            <Mail className="w-3 h-3" /> {r.email}
                          </div>
                        )}
                        {r.phone && (
                          <div className="flex items-center gap-1 text-xs">
                            <Phone className="w-3 h-3" /> {r.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-mono text-xs">{r.gstin || '—'}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => openEdit(r)}
                          className="text-slate-500 hover:text-indigo-600 mr-3"
                          data-testid={`edit-client-${r.id}`}
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => remove(r.id)}
                          className="text-slate-400 hover:text-rose-600"
                          data-testid={`delete-client-${r.id}`}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Client' : 'Add Client'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <Label>Client Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                data-testid="client-name-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Contact Person</Label>
                <Input
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>GSTIN</Label>
                <Input
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  placeholder="22ABCDE1234F1Z5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Textarea
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving ? 'Saving…' : editingId ? 'Update' : 'Add Client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WizbangClients;
