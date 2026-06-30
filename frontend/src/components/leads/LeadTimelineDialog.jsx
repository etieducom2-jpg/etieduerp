import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { leadsAPI } from '@/api/api';
import api from '@/api/api';
import {
  Phone, MessageSquare, Calendar, GraduationCap, FileText, Activity,
  Clock, AlertCircle, Sparkles,
} from 'lucide-react';

const TYPE_ICON = {
  created: FileText,
  followup: Phone,
  status_change: Activity,
  demo_scheduled: GraduationCap,
  whatsapp: MessageSquare,
  call: Phone,
  meeting: Calendar,
};

const AGING_TONE = {
  'Fresh Leads': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'Needs Follow-Up': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'At Risk': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Recovery Required': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

const PRIORITY_TONE = {
  High: 'bg-rose-100 text-rose-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-emerald-100 text-emerald-700',
};

const fmtTime = (ts) => {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch (e) {
    return String(ts);
  }
};

const LeadTimelineDialog = ({ leadId, leadName, open, onClose }) => {
  const [data, setData] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !leadId) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [tl, sg] = await Promise.all([
          leadsAPI.getTimeline(leadId),
          api.get(`/leads/${leadId}/suggestions`),
        ]);
        if (alive) {
          setData(tl.data);
          setSuggestions(sg.data?.suggestions || []);
        }
      } catch (e) {
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [open, leadId]);

  const agingTone = data ? (AGING_TONE[data.aging_bucket] || AGING_TONE['Fresh Leads']) : AGING_TONE['Fresh Leads'];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="lead-timeline-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Communication Timeline — {leadName}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="space-y-3 py-4" data-testid="timeline-loading">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        )}

        {!loading && data && (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${agingTone.bg} ${agingTone.text} ${agingTone.border}`} data-testid="timeline-aging-bucket">
                <Clock className="w-3 h-3 inline mr-1" />
                {data.aging_bucket} ({data.age_days}d)
              </div>
              {data.priority && (
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${PRIORITY_TONE[data.priority] || 'bg-slate-100 text-slate-700'}`} data-testid="timeline-priority-badge">
                  {data.priority} Priority
                </div>
              )}
            </div>

            {/* Smart Suggestions */}
            {suggestions.length > 0 && (
              <div className="mb-4 p-4 rounded-lg bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100" data-testid="smart-suggestions">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  <p className="text-sm font-semibold text-violet-900">Suggested next actions</p>
                </div>
                <ul className="space-y-2">
                  {suggestions.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-start gap-3 p-2 bg-white/70 rounded border border-violet-100"
                      data-testid={`suggestion-${s.id}`}
                    >
                      <span className={`flex-none w-2 h-2 rounded-full mt-2 ${s.priority === 'high' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{s.title}</p>
                        <p className="text-xs text-slate-500">{s.rationale}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.events.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <AlertCircle className="w-4 h-4 mr-2" />
                No activity yet for this lead.
              </div>
            ) : (
              <ol className="relative border-l-2 border-slate-200 ml-3 space-y-4" data-testid="timeline-events">
                {data.events.map((e, idx) => {
                  const Icon = TYPE_ICON[e.type] || Activity;
                  return (
                    <li key={idx} className="pl-6 relative" data-testid={`timeline-event-${idx}`}>
                      <span className="absolute -left-3 top-1 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center border-2 border-white">
                        <Icon className="w-3 h-3" />
                      </span>
                      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-800">{e.title}</p>
                          <span className="text-[11px] text-slate-500">{fmtTime(e.timestamp)}</span>
                        </div>
                        {e.note && <p className="text-xs text-slate-600 mt-1">{e.note}</p>}
                        {e.actor_name && (
                          <Badge variant="outline" className="text-[10px] mt-2 border-slate-200 text-slate-600">
                            by {e.actor_name}
                          </Badge>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}

        {!loading && !data && (
          <div className="text-center py-8 text-slate-500" data-testid="timeline-error">
            Could not load timeline.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LeadTimelineDialog;
