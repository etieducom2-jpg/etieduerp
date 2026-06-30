import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { brandAPI } from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Sparkles } from 'lucide-react';

const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'YouTube'];

const monthYM = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const BrandReportNew = () => {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const preClient = search.get('client_id') || '';

  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState(preClient);
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [title, setTitle] = useState('');
  const [month, setMonth] = useState(monthYM());
  const [totalReach, setTotalReach] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalEngagement, setTotalEngagement] = useState(0);
  const [profileStats, setProfileStats] = useState([]);
  const [posts, setPosts] = useState([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await brandAPI.listClients();
        setClients(r.data || []);
      } catch (e) {
        toast.error('Failed to load clients');
      }
    })();
  }, []);

  // When client changes, prefill profile_stats from their saved profiles
  useEffect(() => {
    if (!clientId) {
      setSavedProfiles([]);
      setProfileStats([]);
      return;
    }
    (async () => {
      try {
        const r = await brandAPI.getClient(clientId);
        const profs = r.data?.profiles || [];
        setSavedProfiles(profs);
        setProfileStats(
          profs.map((p) => ({
            platform: p.platform,
            url: p.url || '',
            followers_initial: p.initial_followers || 0,
            followers_now: p.initial_followers || 0,
          }))
        );
      } catch (e) {
        setSavedProfiles([]);
        setProfileStats([]);
      }
    })();
  }, [clientId]);

  const selectedClient = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);

  const updateStat = (idx, field, value) => {
    setProfileStats((arr) => arr.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };
  const addStat = () => {
    setProfileStats((a) => [...a, { platform: 'Instagram', url: '', followers_initial: 0, followers_now: 0 }]);
  };
  const removeStat = (idx) => setProfileStats((a) => a.filter((_, i) => i !== idx));

  const updatePost = (idx, field, value) => {
    setPosts((arr) => arr.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };
  const addPost = () =>
    setPosts((a) => [...a, { url: '', caption: '', platform: 'Instagram', reach: 0, likes: 0, comments: 0, shares: 0 }]);
  const removePost = (idx) => setPosts((a) => a.filter((_, i) => i !== idx));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!clientId) {
      toast.error('Please select a client');
      return;
    }
    if (!month) {
      toast.error('Please pick a month');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        client_id: clientId,
        month,
        title: title || undefined,
        profile_stats: profileStats.map((s) => ({
          platform: s.platform,
          url: s.url || undefined,
          followers_initial: Number(s.followers_initial || 0),
          followers_now: Number(s.followers_now || 0),
        })),
        total_reach: Number(totalReach || 0),
        total_posts: Number(totalPosts || 0),
        total_engagement: Number(totalEngagement || 0),
        posts: posts.map((p) => ({
          url: p.url || undefined,
          caption: p.caption || undefined,
          platform: p.platform || undefined,
          reach: Number(p.reach || 0),
          likes: Number(p.likes || 0),
          comments: Number(p.comments || 0),
          shares: Number(p.shares || 0),
        })),
        notes: notes || undefined,
      };
      const r = await brandAPI.createReport(payload);
      toast.success('Report generated successfully');
      // Trigger immediate download
      const b64 = r.data?.pdf_b64;
      if (b64) {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(r.data.title || 'report').replace(/[^a-z0-9]+/gi, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
      navigate('/wizbang/brand/reports');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to generate report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="brand-report-new-page">
      <div className="flex items-center gap-3">
        <Link to="/wizbang/brand/reports">
          <Button variant="ghost" size="sm" data-testid="back-to-reports"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">New Monthly Report</h1>
          <p className="text-sm text-slate-500">Fill in metrics — Claude Sonnet 4.5 will draft the executive summary and produce a downloadable PDF.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Report Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Client *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger data-testid="select-client"><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedClient && savedProfiles.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">No saved social profiles for this client. Add them on the client detail page for better reports.</p>
              )}
            </div>
            <div>
              <Label>Month *</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} data-testid="input-month" required />
            </div>
            <div>
              <Label>Title (optional)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Auto-generated if blank" data-testid="input-title" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Aggregate Metrics</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Total Reach</Label>
              <Input type="number" min="0" value={totalReach} onChange={(e) => setTotalReach(e.target.value)} data-testid="input-total-reach" />
            </div>
            <div>
              <Label>Total Posts</Label>
              <Input type="number" min="0" value={totalPosts} onChange={(e) => setTotalPosts(e.target.value)} data-testid="input-total-posts" />
            </div>
            <div>
              <Label>Total Engagement</Label>
              <Input type="number" min="0" value={totalEngagement} onChange={(e) => setTotalEngagement(e.target.value)} data-testid="input-total-engagement" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Profile Stats</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addStat} data-testid="add-profile-stat">
              <Plus className="h-4 w-4 mr-1" />Add Platform
            </Button>
          </CardHeader>
          <CardContent>
            {profileStats.length === 0 ? (
              <p className="text-sm text-slate-500">No profile stats yet. Click <span className="font-medium">Add Platform</span> to track follower growth.</p>
            ) : (
              <div className="space-y-3">
                {profileStats.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end border rounded-md p-3" data-testid={`profile-stat-${idx}`}>
                    <div className="md:col-span-2">
                      <Label>Platform</Label>
                      <Select value={s.platform} onValueChange={(v) => updateStat(idx, 'platform', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-4">
                      <Label>URL</Label>
                      <Input value={s.url} onChange={(e) => updateStat(idx, 'url', e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="md:col-span-2">
                      <Label>Initial Followers</Label>
                      <Input type="number" min="0" value={s.followers_initial} onChange={(e) => updateStat(idx, 'followers_initial', e.target.value)} />
                    </div>
                    <div className="md:col-span-3">
                      <Label>Current Followers</Label>
                      <Input type="number" min="0" value={s.followers_now} onChange={(e) => updateStat(idx, 'followers_now', e.target.value)} data-testid={`stat-now-${idx}`} />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" className="text-red-600" onClick={() => removeStat(idx)} data-testid={`remove-stat-${idx}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Top Posts (optional)</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addPost} data-testid="add-post">
              <Plus className="h-4 w-4 mr-1" />Add Post
            </Button>
          </CardHeader>
          <CardContent>
            {posts.length === 0 ? (
              <p className="text-sm text-slate-500">Add notable posts to highlight in the report (reach, likes, comments).</p>
            ) : (
              <div className="space-y-3">
                {posts.map((p, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end border rounded-md p-3" data-testid={`post-${idx}`}>
                    <div className="md:col-span-2">
                      <Label>Platform</Label>
                      <Select value={p.platform} onValueChange={(v) => updatePost(idx, 'platform', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{PLATFORMS.map((pl) => <SelectItem key={pl} value={pl}>{pl}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-4">
                      <Label>Caption / Title</Label>
                      <Input value={p.caption} onChange={(e) => updatePost(idx, 'caption', e.target.value)} />
                    </div>
                    <div className="md:col-span-3">
                      <Label>URL</Label>
                      <Input value={p.url} onChange={(e) => updatePost(idx, 'url', e.target.value)} />
                    </div>
                    <div className="md:col-span-1">
                      <Label>Reach</Label>
                      <Input type="number" min="0" value={p.reach} onChange={(e) => updatePost(idx, 'reach', e.target.value)} />
                    </div>
                    <div className="md:col-span-1">
                      <Label>Likes</Label>
                      <Input type="number" min="0" value={p.likes} onChange={(e) => updatePost(idx, 'likes', e.target.value)} />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" className="text-red-600" onClick={() => removePost(idx)} data-testid={`remove-post-${idx}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Notes for AI</CardTitle></CardHeader>
          <CardContent>
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any context to include in the executive summary (campaign goals, observations, next month focus, etc.)"
              data-testid="input-notes"
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link to="/wizbang/brand/reports">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={submitting} data-testid="generate-report-btn">
            <Sparkles className="h-4 w-4 mr-2" />
            {submitting ? 'Generating with Claude…' : 'Generate Report (PDF)'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BrandReportNew;
