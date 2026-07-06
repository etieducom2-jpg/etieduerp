import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { brandAPI } from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Save, Share2, Copy, Trash2, ClipboardCheck, Plus, X } from 'lucide-react';

const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'YouTube', 'Multi'];
const CONTENT_TYPES = ['Reel', 'Post', 'Story', 'Carousel', 'Video', 'Live', 'Blog', 'Other'];

const todayMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const daysInMonth = (ym) => {
  if (!ym) return 30;
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

const BrandPlanEditor = () => {
  const { planId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !planId;

  const [clients, setClients] = useState([]);
  const [plan, setPlan] = useState({
    client_id: params.get('clientId') || '',
    title: '',
    month: todayMonth(),
    days: [],
    status: 'Draft',
    share_token: null,
    client_remarks: null,
    accepted_at: null,
    accepted_by_name: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const dim = useMemo(() => daysInMonth(plan.month), [plan.month]);

  useEffect(() => {
    (async () => {
      try {
        const c = await brandAPI.listClients();
        setClients(c.data || []);
        if (!isNew) {
          const r = await brandAPI.getPlan(planId);
          setPlan({ ...r.data, days: r.data.days || [] });
        }
      } catch (e) {
        toast.error(e.response?.data?.detail || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [planId, isNew]);

  // Ensure days array matches month length when month changes (only for new plans).
  // Preserve existing deliverables; ensure each day 1..dim has at least one empty row.
  useEffect(() => {
    if (!isNew) return;
    setPlan((p) => {
      const existing = p.days || [];
      const present = new Set(existing.map((d) => d.day));
      const inRange = existing.filter((d) => d.day >= 1 && d.day <= dim);
      const next = [...inRange];
      for (let day = 1; day <= dim; day++) {
        if (!present.has(day)) {
          next.push({ day, content_type: '', caption: '', platform: '', notes: '', image_url: '' });
        }
      }
      next.sort((a, b) => a.day - b.day);
      return { ...p, days: next };
    });
  }, [dim, isNew]);

  const updateDay = (idx, key, val) => setPlan((p) => ({ ...p, days: p.days.map((d, i) => (i === idx ? { ...d, [key]: val } : d)) }));

  // Group flat deliverables by day number for rendering. Empty days still get a card.
  const groupedDays = useMemo(() => {
    const map = new Map();
    for (let n = 1; n <= dim; n++) map.set(n, []);
    (plan.days || []).forEach((d, idx) => {
      const day = d.day;
      if (!map.has(day)) map.set(day, []);
      map.get(day).push({ idx, item: d });
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [plan.days, dim]);

  const addDeliverable = (day) => {
    setPlan((p) => ({
      ...p,
      days: [...(p.days || []), { day, content_type: '', caption: '', platform: '', notes: '', image_url: '' }],
    }));
  };

  const removeDeliverable = (idx) => {
    setPlan((p) => ({ ...p, days: (p.days || []).filter((_, i) => i !== idx) }));
  };

  const save = async () => {
    if (!plan.client_id) return toast.error('Pick a client');
    if (!plan.title) return toast.error('Add a plan title');
    if (!plan.month) return toast.error('Pick a month');
    try {
      setSaving(true);
      if (isNew) {
        const r = await brandAPI.createPlan({ client_id: plan.client_id, title: plan.title, month: plan.month, days: plan.days });
        toast.success('Plan created');
        navigate(`/wizbang/brand/plans/${r.data.id}`, { replace: true });
      } else {
        await brandAPI.updatePlan(planId, { title: plan.title, month: plan.month, days: plan.days });
        toast.success('Plan saved');
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const share = async () => {
    let url = null;
    try {
      const r = await brandAPI.sharePlan(planId);
      url = `${window.location.origin}${r.data.public_path}`;
      setPlan((p) => ({ ...p, share_token: r.data.share_token, status: 'Shared' }));
      toast.success('Public link generated');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Share failed');
      return;
    }
    // Best-effort clipboard copy; never fail the share flow if clipboard is blocked
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      } else {
        toast.info(`Copy manually: ${url}`);
      }
    } catch {
      toast.info(`Copy manually: ${url}`);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this plan?')) return;
    try {
      await brandAPI.deletePlan(planId);
      toast.success('Deleted');
      navigate('/wizbang/brand');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Delete failed');
    }
  };

  const copyLink = () => {
    if (!plan.share_token) return;
    navigator.clipboard.writeText(`${window.location.origin}/public/brand-plan/${plan.share_token}`);
    toast.success('Link copied');
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading…</div>;

  return (
    <div className="space-y-6" data-testid="brand-plan-editor">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/wizbang/brand')}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{isNew ? 'New Content Plan' : 'Edit Content Plan'}</h1>
            <p className="text-sm text-slate-500">Status: <span className="font-medium">{plan.status}</span>{plan.accepted_at && <> · Accepted by {plan.accepted_by_name} on {new Date(plan.accepted_at).toLocaleString()}</>}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!isNew && plan.share_token && plan.status !== 'Draft' && (
            <Button variant="outline" onClick={copyLink} data-testid="copy-link-btn"><Copy className="h-4 w-4 mr-1" />Copy Link</Button>
          )}
          {!isNew && (
            <Button variant="outline" onClick={share} data-testid="share-plan-btn"><Share2 className="h-4 w-4 mr-1" />Share Public Link</Button>
          )}
          <Button onClick={save} disabled={saving} data-testid="save-plan-btn"><Save className="h-4 w-4 mr-1" />{saving ? 'Saving…' : 'Save'}</Button>
          {!isNew && (
            <Button variant="destructive" onClick={remove} data-testid="delete-plan-btn"><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
          )}
        </div>
      </div>

      {plan.client_remarks && (
        <Card className="border-amber-300 bg-amber-50/40">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <ClipboardCheck className="h-5 w-5 text-amber-700 mt-1" />
              <div>
                <div className="text-sm font-semibold text-amber-900">Client Remarks</div>
                <p className="text-sm text-amber-900/90 mt-1 whitespace-pre-wrap">{plan.client_remarks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Plan Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Client</Label>
            <select
              className="w-full h-10 border rounded px-2 text-sm mt-1"
              value={plan.client_id}
              disabled={!isNew}
              onChange={(e) => setPlan({ ...plan, client_id: e.target.value })}
              data-testid="plan-client-select"
            >
              <option value="">Select client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><Label>Title</Label><Input value={plan.title} onChange={(e) => setPlan({ ...plan, title: e.target.value })} data-testid="plan-title-input" placeholder="e.g. March Content Calendar" /></div>
          <div><Label>Month</Label><Input type="month" value={plan.month} onChange={(e) => setPlan({ ...plan, month: e.target.value })} data-testid="plan-month-input" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Daily Deliverables ({dim} days · {plan.days.length} total)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {groupedDays.map(([day, items]) => (
              <div key={day} className="rounded-lg border bg-slate-50/40" data-testid={`plan-day-card-${day}`}>
                <div className="flex items-center justify-between px-3 py-2 border-b bg-white rounded-t-lg">
                  <div className="font-semibold text-slate-700">Day {day} <span className="text-xs font-normal text-slate-500">· {items.length} {items.length === 1 ? 'deliverable' : 'deliverables'}</span></div>
                  <Button size="sm" variant="outline" onClick={() => addDeliverable(day)} data-testid={`add-deliverable-day-${day}`}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Add Deliverable
                  </Button>
                </div>
                <div className="p-2 space-y-2">
                  {items.length === 0 && (
                    <div className="text-xs text-slate-400 italic px-2 py-3">No deliverables planned for this day.</div>
                  )}
                  {items.map(({ idx, item: d }, k) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-start rounded border bg-white p-2" data-testid={`plan-day-${day}-item-${k}`}>
                      <div className="col-span-2">
                        <select className="w-full h-9 border rounded px-2 text-xs" value={d.platform || ''} onChange={(e) => updateDay(idx, 'platform', e.target.value)} data-testid={`platform-day-${day}-item-${k}`}>
                          <option value="">Platform</option>
                          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <select className="w-full h-9 border rounded px-2 text-xs" value={d.content_type || ''} onChange={(e) => updateDay(idx, 'content_type', e.target.value)} data-testid={`content-type-day-${day}-item-${k}`}>
                          <option value="">Type</option>
                          {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="col-span-4"><Textarea rows={2} placeholder="Caption / hook" value={d.caption || ''} onChange={(e) => updateDay(idx, 'caption', e.target.value)} data-testid={`caption-day-${day}-item-${k}`} /></div>
                      <div className="col-span-3"><Textarea rows={2} placeholder="Notes / brief" value={d.notes || ''} onChange={(e) => updateDay(idx, 'notes', e.target.value)} data-testid={`notes-day-${day}-item-${k}`} /></div>
                      <div className="col-span-1 flex justify-end pt-1">
                        <Button size="icon" variant="ghost" onClick={() => removeDeliverable(idx)} title="Remove deliverable" data-testid={`remove-deliverable-day-${day}-item-${k}`}>
                          <X className="h-4 w-4 text-slate-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrandPlanEditor;
