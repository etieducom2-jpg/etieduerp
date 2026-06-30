import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Phone, Mail, Calendar, User, Flame, ArrowLeft, MessageSquare, ChevronRight,
  CheckCircle2, AlertCircle, Sparkles, ClipboardList, Edit3, FileText, TrendingUp,
  Loader2, X, MessageCircle, ExternalLink, RotateCcw,
} from 'lucide-react';
import { analyticsAPI, leadsAPI } from '@/api/api';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';
import { ReengageDialog } from '@/pages/LostLeadsPage';

// Pipeline stages in canonical order — must match backend PIPELINE_STAGES
const PIPELINE_STAGES = [
  'New', 'Contact Attempted', 'Connected', 'Interested', 'Counselling Scheduled',
  'Demo Scheduled', 'Demo Attended', 'Admission Likely', 'Converted', 'Lost',
];

const STAGE_REQUIRED = {
  'Demo Scheduled': ['demo_date', 'program_id'],
  'Counselling Scheduled': ['counselling_date'],
  'Admission Likely': ['fee_quoted'],
  'Converted': ['final_fee', 'enrollment_date'],
  'Lost': ['lost_reason'],
};

const stageTone = (s) =>
  ({
    New: 'bg-slate-100 text-slate-700 border-slate-200',
    'Contact Attempted': 'bg-sky-100 text-sky-700 border-sky-200',
    Connected: 'bg-blue-100 text-blue-700 border-blue-200',
    Interested: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'Counselling Scheduled': 'bg-violet-100 text-violet-700 border-violet-200',
    'Demo Scheduled': 'bg-purple-100 text-purple-700 border-purple-200',
    'Demo Attended': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    'Admission Likely': 'bg-amber-100 text-amber-700 border-amber-200',
    Converted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Lost: 'bg-rose-100 text-rose-700 border-rose-200',
  }[s] || 'bg-slate-100 text-slate-700 border-slate-200');

// --- Stage Transition Dialog --------------------------------------------------
const StageTransitionDialog = ({ open, onClose, lead, targetStage, onSuccess }) => {
  const [fields, setFields] = useState({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const required = useMemo(() => STAGE_REQUIRED[targetStage] || [], [targetStage]);

  useEffect(() => {
    if (open) {
      // Pre-fill with existing lead values if present
      const init = {};
      required.forEach((f) => {
        if (lead?.[f]) init[f] = lead[f];
      });
      setFields(init);
      setNote('');
    }
  }, [open, targetStage, lead, required]);

  if (!open) return null;

  const labelFor = (f) =>
    ({
      demo_date: 'Demo date',
      program_id: 'Program ID',
      counselling_date: 'Counselling date',
      fee_quoted: 'Fee quoted (₹)',
      final_fee: 'Final fee (₹)',
      enrollment_date: 'Enrollment date',
      lost_reason: 'Lost reason',
      admission_no: 'Admission number',
    }[f] || f);

  const typeFor = (f) =>
    f.endsWith('_date') ? 'date' : f.includes('fee') ? 'number' : 'text';

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await analyticsAPI.transitionLeadStage(lead.id, targetStage, fields, note);
      toast.success(`Moved to ${targetStage}`);
      onSuccess?.(res.data);
      onClose();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'object' && detail?.missing_fields) {
        toast.error(`Missing: ${detail.missing_fields.join(', ')}`);
      } else {
        toast.error(typeof detail === 'string' ? detail : 'Transition failed');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="transition-dialog">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Move to {targetStage}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {required.length > 0
                ? 'Fill the fields required by this stage'
                : 'No additional fields required'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" data-testid="transition-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {required.map((f) => (
            <div key={f}>
              <Label className="text-xs font-medium text-slate-600">{labelFor(f)}</Label>
              {f === 'lost_reason' ? (
                <Textarea
                  data-testid={`transition-field-${f}`}
                  value={fields[f] || ''}
                  onChange={(e) => setFields((p) => ({ ...p, [f]: e.target.value }))}
                  placeholder="Why was this lead lost?"
                  rows={3}
                />
              ) : f.endsWith('_date') ? (
                <DatePicker
                  value={fields[f] || ''}
                  onChange={(iso) => setFields((p) => ({ ...p, [f]: iso }))}
                  placeholder={`Pick ${labelFor(f).toLowerCase()}`}
                  testid={`transition-field-${f}`}
                />
              ) : (
                <Input
                  data-testid={`transition-field-${f}`}
                  type={typeFor(f)}
                  value={fields[f] || ''}
                  onChange={(e) => setFields((p) => ({ ...p, [f]: e.target.value }))}
                />
              )}
            </div>
          ))}
          <div>
            <Label className="text-xs font-medium text-slate-600">Note (optional)</Label>
            <Textarea
              data-testid="transition-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything worth recording about this transition?"
              rows={2}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={onClose} data-testid="transition-cancel">
            Cancel
          </Button>
          <Button
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            onClick={handleSave}
            disabled={saving}
            data-testid="transition-confirm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm move'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- Stage Progress Bar -------------------------------------------------------
const StageProgress = ({ status, onTransition, onReengage, userRole }) => {
  const isLostOrConverted = ['Lost', 'Not Interested', 'Converted', 'Admitted'].includes(status);
  const isLost = ['Lost', 'Not Interested'].includes(status);
  const canReengage = isLost && ['Branch Admin', 'Admin'].includes(userRole);
  const progressStages = ['New', 'Contact Attempted', 'Connected', 'Interested', 'Counselling Scheduled', 'Demo Scheduled', 'Demo Attended', 'Admission Likely', 'Converted'];
  const currentIdx = progressStages.indexOf(status === 'Admitted' ? 'Converted' : status === 'Demo Booked' ? 'Demo Scheduled' : status);
  return (
    <Card className="border-0 shadow-sm" data-testid="stage-progress">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wide">Pipeline stage</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {progressStages.map((s, i) => {
            const done = currentIdx >= 0 && i < currentIdx;
            const current = currentIdx === i;
            return (
              <button
                key={s}
                onClick={() => !current && !isLostOrConverted && onTransition(s)}
                disabled={current || isLostOrConverted}
                data-testid={`stage-pill-${s.toLowerCase().replace(/\s+/g, '-')}`}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  current
                    ? 'bg-indigo-600 border-indigo-600 text-white font-semibold ring-2 ring-indigo-200'
                    : done
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : isLostOrConverted
                    ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                {done && '✓ '}{s}
              </button>
            );
          })}
        </div>
        {!isLostOrConverted && (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="text-rose-700 border-rose-200 hover:bg-rose-50 flex-1"
              onClick={() => onTransition('Lost')}
              data-testid="btn-mark-lost"
            >
              Mark as Lost
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 flex-1"
              onClick={() => onTransition('Converted')}
              data-testid="btn-mark-converted"
            >
              Convert (Admission)
            </Button>
          </div>
        )}
        {status === 'Converted' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-sm text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Lead converted. Edit via Branch Admin if needed.
          </div>
        )}
        {(status === 'Lost' || status === 'Not Interested') && (
          <div className="space-y-2">
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-sm text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> This lead is in a lost state.
              {!canReengage && ' You can re-open from the Lost Leads page.'}
            </div>
            {canReengage && (
              <Button
                size="sm"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={() => onReengage?.()}
                data-testid="btn-reengage"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Re-engage lead
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// --- Activity Timeline --------------------------------------------------------
const ActivityTimeline = ({ leadId }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyticsAPI.getLeadTimeline(leadId);
      const list = res.data?.events || res.data?.timeline || res.data || [];
      setEvents(Array.isArray(list) ? list : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (leadId) load();
  }, [leadId, load]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-8 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading timeline…
      </div>
    );

  if (events.length === 0)
    return (
      <p className="text-sm text-slate-500 text-center py-6" data-testid="timeline-empty">
        No activity recorded yet.
      </p>
    );

  return (
    <div className="space-y-3" data-testid="activity-timeline">
      {events.map((e, idx) => (
        <div key={idx} className="flex gap-3" data-testid={`timeline-event-${idx}`}>
          <div className="flex flex-col items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                e.type === 'status_change'
                  ? 'bg-indigo-100 text-indigo-700'
                  : e.type === 'created'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-sky-100 text-sky-700'
              }`}
            >
              {e.type === 'status_change' ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : e.type === 'created' ? (
                <Sparkles className="w-3.5 h-3.5" />
              ) : (
                <MessageSquare className="w-3.5 h-3.5" />
              )}
            </div>
            {idx < events.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
          </div>
          <div className="flex-1 pb-3">
            <p className="text-sm font-medium text-slate-900">{e.title}</p>
            {e.note && <p className="text-xs text-slate-600 mt-0.5">{e.note}</p>}
            <p className="text-[11px] text-slate-400 mt-1">
              {e.actor_name || 'System'} · {e.timestamp ? new Date(e.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- Follow-ups list ----------------------------------------------------------
const FollowupsList = ({ leadId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    leadsAPI
      .getFollowups(leadId)
      .then((res) => alive && setItems(res.data || []))
      .catch(() => alive && setItems([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [leadId]);

  if (loading)
    return (
      <div className="flex items-center justify-center py-6 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
      </div>
    );

  if (items.length === 0)
    return <p className="text-sm text-slate-500 text-center py-6">No follow-ups scheduled.</p>;

  return (
    <div className="space-y-2" data-testid="followups-list">
      {items.map((f, idx) => (
        <div key={f.id || idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900">{f.followup_type || 'Follow-up'}</p>
            <p className="text-xs text-slate-500">{(f.followup_date || '').slice(0, 16).replace('T', ' ')}</p>
            {f.note && <p className="text-xs text-slate-600 mt-1 italic">&ldquo;{f.note}&rdquo;</p>}
          </div>
          <Badge className={f.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
            {f.status || 'Pending'}
          </Badge>
        </div>
      ))}
    </div>
  );
};

// --- Main Workspace ----------------------------------------------------------
const LeadWorkspacePage = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transitionTarget, setTransitionTarget] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reengageOpen, setReengageOpen] = useState(false);
  const [owners, setOwners] = useState([]);
  const userRole = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}').role || '';
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    leadsAPI?.getBranchLeadOwners?.()
      .then((res) => setOwners(res.data || []))
      .catch(() => setOwners([]));
  }, []);

  const loadLead = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await analyticsAPI.getLeadById(leadId);
      setLead(res.data);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Lead not found');
      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadLead();
  }, [loadLead, refreshKey]);

  const onTransitionSuccess = (resData) => {
    if (resData?.lead) setLead(resData.lead);
    setRefreshKey((k) => k + 1);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-16 text-slate-500" data-testid="workspace-loading">
        <Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading lead workspace…
      </div>
    );

  if (error || !lead)
    return (
      <div className="text-center py-12" data-testid="workspace-error">
        <p className="text-rose-600 font-medium">{error || 'Lead not found'}</p>
        <Button variant="outline" className="mt-3" onClick={() => navigate('/leads')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to leads
        </Button>
      </div>
    );

  const waLink = lead.number
    ? `https://wa.me/${(lead.number || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${lead.name}, this is regarding your enquiry about ${lead.program_name || 'our programs'}.`)}`
    : null;

  return (
    <div className="space-y-4" data-testid="lead-workspace">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/leads')} data-testid="workspace-back">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Leads
        </Button>
        <ChevronRight className="w-4 h-4 text-slate-400" />
        <h1 className="text-xl font-bold text-slate-900 truncate flex-1" data-testid="workspace-lead-name">
          {lead.name}
        </h1>
        <Badge className={`${stageTone(lead.status)} border`} data-testid="workspace-lead-status">
          {lead.status}
        </Badge>
        {lead.priority === 'High' && (
          <Badge className="bg-rose-100 text-rose-700 border border-rose-200">
            <Flame className="w-3 h-3 mr-1" /> High
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left rail — profile + actions */}
        <div className="space-y-4">
          <Card className="border-0 shadow-sm" data-testid="lead-profile-card">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-800">Profile</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2.5 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800">{lead.number || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800 truncate">{lead.email || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800">{lead.program_name || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-600">Source: {lead.lead_source || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-600">Owner: {lead.counsellor_name || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-600">Created: {(lead.created_at || '').slice(0, 10)}</span>
              </div>
              {lead.fee_quoted && (
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-700 font-semibold">Quoted: ₹{lead.fee_quoted}</span>
                </div>
              )}
              {lead.final_fee && (
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-700 font-semibold">Final: ₹{lead.final_fee}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="border-0 shadow-sm" data-testid="lead-quick-actions">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-800">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 grid grid-cols-2 gap-2">
              {lead.number && (
                <a
                  href={`tel:${lead.number}`}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-50 border border-sky-200 text-sky-700 rounded-lg text-sm font-medium hover:bg-sky-100"
                  data-testid="action-call"
                >
                  <Phone className="w-3.5 h-3.5" /> Call
                </a>
              )}
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100"
                  data-testid="action-whatsapp"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
              )}
              <Link
                to="/leads"
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
                data-testid="action-edit"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </Link>
              <Link
                to="/followups"
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100"
                data-testid="action-followup"
              >
                <Calendar className="w-3.5 h-3.5" /> Follow-up
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Center — tabs */}
        <div className="lg:col-span-2 space-y-4">
          <StageProgress
            status={lead.status}
            onTransition={setTransitionTarget}
            onReengage={() => setReengageOpen(true)}
            userRole={userRole}
          />

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4">
              <Tabs defaultValue="timeline" className="w-full">
                <TabsList className="grid grid-cols-3 mb-4" data-testid="workspace-tabs">
                  <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="followups" data-testid="tab-followups">Follow-ups</TabsTrigger>
                  <TabsTrigger value="notes" data-testid="tab-notes">Details</TabsTrigger>
                </TabsList>
                <TabsContent value="timeline">
                  <ActivityTimeline leadId={lead.id} />
                </TabsContent>
                <TabsContent value="followups">
                  <FollowupsList leadId={lead.id} />
                  <Button
                    variant="outline"
                    className="w-full mt-3 text-indigo-700 border-indigo-200"
                    onClick={() => navigate('/followups')}
                    data-testid="btn-manage-followups"
                  >
                    Manage in Follow-ups page <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </TabsContent>
                <TabsContent value="notes">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-slate-500">Notes</Label>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 mt-1 min-h-[60px]">
                        {lead.notes || '—'}
                      </p>
                    </div>
                    {lead.parent_status && (
                      <div>
                        <Label className="text-xs text-slate-500">Parent status</Label>
                        <p className="text-sm text-slate-800">{lead.parent_status}</p>
                      </div>
                    )}
                    {lead.demo_date && (
                      <div>
                        <Label className="text-xs text-slate-500">Demo</Label>
                        <p className="text-sm text-slate-800">
                          {(lead.demo_date || '').slice(0, 10)} {lead.demo_time || ''} {lead.trainer_name ? `— ${lead.trainer_name}` : ''}
                        </p>
                      </div>
                    )}
                    {lead.lost_reason && (
                      <div>
                        <Label className="text-xs text-slate-500">Lost reason</Label>
                        <p className="text-sm text-rose-700">{lead.lost_reason}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {transitionTarget && (
        <StageTransitionDialog
          open={!!transitionTarget}
          lead={lead}
          targetStage={transitionTarget}
          onClose={() => setTransitionTarget(null)}
          onSuccess={onTransitionSuccess}
        />
      )}

      <ReengageDialog
        open={reengageOpen}
        lead={lead}
        owners={owners}
        onClose={() => setReengageOpen(false)}
        onSuccess={() => {
          setReengageOpen(false);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
};

export default LeadWorkspacePage;
