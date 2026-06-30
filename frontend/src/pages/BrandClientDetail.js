import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { brandAPI } from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Save, Plus, Trash2, ClipboardList, FileText } from 'lucide-react';

const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'YouTube'];

const BrandClientDetail = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [plans, setPlans] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [c, p, r] = await Promise.all([
        brandAPI.getClient(clientId),
        brandAPI.listPlans(clientId),
        brandAPI.listReports(clientId),
      ]);
      setClient(c.data.client);
      setProfiles(c.data.profiles || []);
      setPlans(p.data || []);
      setReports(r.data || []);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [clientId]);

  const addProfile = () => setProfiles((p) => [...p, { platform: 'Instagram', url: '', handle: '', initial_followers: 0, initial_followers_date: '' }]);
  const updateProfile = (idx, key, val) => setProfiles((p) => p.map((x, i) => (i === idx ? { ...x, [key]: val } : x)));
  const removeProfile = (idx) => setProfiles((p) => p.filter((_, i) => i !== idx));

  const saveProfiles = async () => {
    try {
      setSaving(true);
      const cleaned = profiles
        .filter((p) => p.platform && p.url)
        .map((p) => ({ ...p, initial_followers: Number(p.initial_followers) || 0 }));
      await brandAPI.setProfiles(clientId, cleaned);
      toast.success('Social profiles saved');
      setProfiles(cleaned);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const shareLink = (token) => `${window.location.origin}/public/brand-plan/${token}`;
  const copyShare = (token) => {
    navigator.clipboard.writeText(shareLink(token));
    toast.success('Public link copied');
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading…</div>;
  if (!client) return <div className="p-10 text-center text-slate-500">Client not found</div>;

  return (
    <div className="space-y-6" data-testid="brand-client-detail">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/wizbang/brand')}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
            <p className="text-sm text-slate-500">{client.contact_person || '—'} · {client.email || ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/wizbang/brand/plans/new?clientId=${clientId}`}><Button data-testid="add-plan-btn"><Plus className="h-4 w-4 mr-1" />Content Plan</Button></Link>
          <Link to={`/wizbang/brand/reports/new?clientId=${clientId}`}><Button variant="outline" data-testid="add-report-btn"><FileText className="h-4 w-4 mr-1" />Monthly Report</Button></Link>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Social Profiles</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addProfile} data-testid="add-profile-btn"><Plus className="h-4 w-4 mr-1" />Add</Button>
            <Button size="sm" onClick={saveProfiles} disabled={saving} data-testid="save-profiles-btn"><Save className="h-4 w-4 mr-1" />{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <p className="text-sm text-slate-500">No profiles yet. Add the client&apos;s social handles to track follower growth across reports.</p>
          ) : (
            <div className="space-y-3">
              {profiles.map((p, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-2">
                    <Label className="text-xs">Platform</Label>
                    <select className="w-full h-9 border rounded px-2 text-sm" value={p.platform} onChange={(e) => updateProfile(i, 'platform', e.target.value)}>
                      {PLATFORMS.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </div>
                  <div className="col-span-4"><Label className="text-xs">URL</Label><Input value={p.url} onChange={(e) => updateProfile(i, 'url', e.target.value)} /></div>
                  <div className="col-span-2"><Label className="text-xs">Handle</Label><Input value={p.handle || ''} onChange={(e) => updateProfile(i, 'handle', e.target.value)} /></div>
                  <div className="col-span-2"><Label className="text-xs">Initial Followers</Label><Input type="number" value={p.initial_followers || 0} onChange={(e) => updateProfile(i, 'initial_followers', e.target.value)} /></div>
                  <div className="col-span-1"><Label className="text-xs">Since</Label><Input type="date" value={p.initial_followers_date || ''} onChange={(e) => updateProfile(i, 'initial_followers_date', e.target.value)} /></div>
                  <div className="col-span-1"><Button variant="ghost" size="icon" onClick={() => removeProfile(i)}><Trash2 className="h-4 w-4 text-red-500" /></Button></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Content Plans</CardTitle></CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <p className="text-sm text-slate-500">No content plans yet.</p>
          ) : (
            <div className="space-y-2">
              {plans.map((pl) => (
                <div key={pl.id} className="flex items-center justify-between rounded-lg border p-3" data-testid={`plan-row-${pl.id}`}>
                  <div>
                    <div className="font-medium text-slate-900">{pl.title}</div>
                    <div className="text-xs text-slate-500">{pl.month} · {pl.days?.length || 0} days · <span className="font-medium">{pl.status}</span></div>
                  </div>
                  <div className="flex gap-2">
                    {pl.share_token && pl.status !== 'Draft' && (
                      <Button size="sm" variant="outline" onClick={() => copyShare(pl.share_token)} data-testid={`copy-link-${pl.id}`}>Copy Link</Button>
                    )}
                    <Link to={`/wizbang/brand/plans/${pl.id}`}><Button size="sm">Open</Button></Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Monthly Reports</CardTitle></CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-sm text-slate-500">No reports yet.</p>
          ) : (
            <div className="space-y-2">
              {reports.map((rep) => (
                <div key={rep.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium text-slate-900">{rep.title}</div>
                    <div className="text-xs text-slate-500">{rep.month} · reach {rep.total_reach?.toLocaleString?.() || 0}</div>
                  </div>
                  <Link to={`/wizbang/brand/reports?open=${rep.id}`}><Button size="sm" variant="outline">View</Button></Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BrandClientDetail;
