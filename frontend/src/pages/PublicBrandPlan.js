import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { publicBrandAPI } from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle2, Calendar, MessageSquare, PenLine, Sparkles } from 'lucide-react';

const statusBadge = (status) => {
  const map = {
    Draft: 'bg-slate-100 text-slate-700',
    Shared: 'bg-blue-100 text-blue-700',
    Acknowledged: 'bg-amber-100 text-amber-800',
    Accepted: 'bg-emerald-100 text-emerald-700',
  };
  return map[status] || 'bg-slate-100 text-slate-700';
};

const PublicBrandPlan = () => {
  const { token } = useParams();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [signature, setSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const r = await publicBrandAPI.getPlan(token);
      setPlan(r.data);
      setRemarks(r.data.client_remarks || '');
      setSignature(r.data.accepted_by_name || '');
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const submit = async (action) => {
    if (action === 'accept' && !signature.trim()) {
      toast.error('Please type your full name as signature to accept.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        action,
        remarks: remarks.trim() || null,
        accepted_by_name: signature.trim() || null,
      };
      const r = await publicBrandAPI.respond(token, payload);
      toast.success(action === 'accept' ? 'Plan accepted. Thank you!' : 'Comment sent to the team.');
      // Refresh to reflect new status
      await load();
      // Local fallback in case of caching
      if (r?.data?.status) {
        setPlan((p) => (p ? { ...p, status: r.data.status } : p));
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500" data-testid="public-plan-loading">Loading plan…</div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md w-full" data-testid="public-plan-error">
          <CardHeader>
            <CardTitle>Plan unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">{error || 'This link is invalid or has expired.'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAccepted = plan.status === 'Accepted';
  const days = plan.days || [];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4" data-testid="public-plan-page">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-90">
              <Sparkles className="h-4 w-4" /> Monthly Content Plan
            </div>
            <h1 className="text-3xl font-bold mt-1" data-testid="public-plan-title">{plan.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" /> {plan.month}</span>
              <span>·</span>
              <span>{plan.client_name}</span>
              <span>·</span>
              <Badge className={statusBadge(plan.status)} data-testid="public-plan-status">{plan.status}</Badge>
            </div>
          </div>
          <CardContent className="p-4 text-sm text-slate-600">
            Please review the day-by-day deliverables below. Add your comments or accept the plan at the bottom of the page.
          </CardContent>
        </Card>

        {/* Day-by-day */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Deliverables ({days.length} days)</CardTitle>
          </CardHeader>
          <CardContent>
            {days.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No deliverables planned.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {days.map((d, i) => (
                  <div
                    key={i}
                    className="rounded-lg border bg-white p-3 hover:shadow-sm transition"
                    data-testid={`public-day-${d.day}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900">Day {d.day}</div>
                      <div className="flex gap-1">
                        {d.platform && <Badge variant="outline" className="text-xs">{d.platform}</Badge>}
                        {d.content_type && <Badge variant="outline" className="text-xs">{d.content_type}</Badge>}
                      </div>
                    </div>
                    {d.caption && (
                      <p className="text-sm text-slate-800 mt-2 whitespace-pre-wrap">{d.caption}</p>
                    )}
                    {d.notes && (
                      <p className="text-xs text-slate-500 mt-2 whitespace-pre-wrap italic">{d.notes}</p>
                    )}
                    {!d.caption && !d.notes && !d.platform && !d.content_type && (
                      <p className="text-xs text-slate-400 mt-2 italic">No content planned for this day.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accept / Comment */}
        {isAccepted ? (
          <Card className="border-emerald-300 bg-emerald-50/40" data-testid="public-plan-accepted-banner">
            <CardContent className="p-6 flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 mt-0.5" />
              <div>
                <div className="font-semibold text-emerald-900">Plan accepted</div>
                <p className="text-sm text-emerald-900/80 mt-1">
                  Accepted by <span className="font-medium">{plan.accepted_by_name}</span>
                  {plan.accepted_at && <> on {new Date(plan.accepted_at).toLocaleString()}</>}
                </p>
                {plan.client_remarks && (
                  <p className="text-sm text-emerald-900/80 mt-2 whitespace-pre-wrap">
                    <span className="font-medium">Your note:</span> {plan.client_remarks}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-amber-600" /> Your response
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="remarks">Comments / change requests (optional)</Label>
                <Textarea
                  id="remarks"
                  rows={4}
                  placeholder="Anything you'd like the team to adjust before approving?"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  data-testid="public-plan-remarks"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="signature" className="flex items-center gap-1">
                  <PenLine className="h-4 w-4" /> Signature (type your full name)
                </Label>
                <Input
                  id="signature"
                  placeholder="e.g. Priya Sharma"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  data-testid="public-plan-signature"
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  By typing your name and clicking Accept, you confirm approval of this content plan.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => submit('remark')}
                  disabled={submitting || (!remarks.trim() && !signature.trim())}
                  data-testid="public-plan-comment-btn"
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {submitting ? 'Sending…' : 'Send comments only'}
                </Button>
                <Button
                  onClick={() => submit('accept')}
                  disabled={submitting || !signature.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  data-testid="public-plan-accept-btn"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {submitting ? 'Submitting…' : 'Accept Plan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center text-xs text-slate-400 pt-2">
          Powered by Wizbang Brand Manager
        </div>
      </div>
    </div>
  );
};

export default PublicBrandPlan;
