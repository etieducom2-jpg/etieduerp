import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Flame, RefreshCw, Filter, Phone, Calendar } from 'lucide-react';
import { analyticsAPI } from '@/api/api';
import { toast } from 'sonner';

const STAGE_REQUIRED = {
  'Demo Scheduled': ['demo_date', 'program_id'],
  'Counselling Scheduled': ['counselling_date'],
  'Admission Likely': ['fee_quoted'],
  'Converted': ['final_fee', 'enrollment_date'],
  'Lost': ['lost_reason'],
};

const stageColors = {
  New: 'bg-slate-100 border-slate-300 text-slate-700',
  'Contact Attempted': 'bg-sky-50 border-sky-300 text-sky-700',
  Connected: 'bg-blue-50 border-blue-300 text-blue-700',
  Interested: 'bg-indigo-50 border-indigo-300 text-indigo-700',
  'Counselling Scheduled': 'bg-violet-50 border-violet-300 text-violet-700',
  'Demo Scheduled': 'bg-purple-50 border-purple-300 text-purple-700',
  'Demo Attended': 'bg-fuchsia-50 border-fuchsia-300 text-fuchsia-700',
  'Admission Likely': 'bg-amber-50 border-amber-300 text-amber-700',
  Converted: 'bg-emerald-50 border-emerald-300 text-emerald-700',
  Lost: 'bg-rose-50 border-rose-300 text-rose-700',
};

const LeadsPipelinePage = () => {
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dragged, setDragged] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await analyticsAPI.getLeadsKanban();
      setBoard(res.data);
    } catch (err) {
      toast.error('Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const moveLead = async (lead, targetStage) => {
    const required = STAGE_REQUIRED[targetStage] || [];
    // If required fields exist on the lead, transition directly. Otherwise navigate to workspace.
    const missing = required.filter((f) => !lead[f]);
    if (missing.length > 0) {
      toast.info(`${targetStage} requires: ${missing.join(', ')} — opening workspace`);
      navigate(`/leads/${lead.id}`);
      return;
    }
    try {
      await analyticsAPI.transitionLeadStage(lead.id, targetStage, {}, 'Moved via pipeline drag-drop');
      toast.success(`Moved ${lead.name} to ${targetStage}`);
      load();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'object' && detail?.missing_fields) {
        toast.error(`Missing: ${detail.missing_fields.join(', ')} — opening workspace`);
        navigate(`/leads/${lead.id}`);
      } else {
        toast.error(typeof detail === 'string' ? detail : 'Move failed');
      }
    }
  };

  const onDragStart = (lead) => setDragged(lead);
  const onDragOver = (e, stage) => {
    e.preventDefault();
    setDragOverStage(stage);
  };
  const onDragLeave = () => setDragOverStage(null);
  const onDrop = (e, stage) => {
    e.preventDefault();
    setDragOverStage(null);
    if (dragged && dragged.status !== stage) {
      moveLead(dragged, stage);
    }
    setDragged(null);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-16 text-slate-500" data-testid="pipeline-loading">
        <Loader2 className="w-6 h-6 animate-spin mr-3" /> Loading pipeline…
      </div>
    );

  return (
    <div className="space-y-4" data-testid="leads-pipeline">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} data-testid="pipeline-back">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Dashboard
        </Button>
        <h1 className="text-xl font-bold text-slate-900 flex-1">Leads pipeline</h1>
        <Badge className="bg-indigo-100 text-indigo-700" data-testid="pipeline-total">
          {board?.total || 0} total leads
        </Badge>
        <Button variant="outline" size="sm" onClick={load} data-testid="pipeline-refresh">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/leads')} data-testid="pipeline-list-view">
          <Filter className="w-3.5 h-3.5 mr-1" /> List view
        </Button>
      </div>

      <p className="text-xs text-slate-500 italic">
        Drag any lead card to a different column to update its stage. If the target stage requires extra info (like demo date or fees), you&apos;ll be taken to the lead workspace.
      </p>

      <div className="flex gap-3 overflow-x-auto pb-4" data-testid="pipeline-board">
        {(board?.stages || []).map((col) => {
          const tone = stageColors[col.status] || stageColors.New;
          return (
            <div
              key={col.status}
              data-testid={`pipeline-col-${col.status.toLowerCase().replace(/\s+/g, '-')}`}
              className={`flex-shrink-0 w-64 rounded-xl border-2 ${tone} flex flex-col max-h-[70vh] ${
                dragOverStage === col.status ? 'ring-4 ring-indigo-300 scale-[1.01]' : ''
              } transition-all`}
              onDragOver={(e) => onDragOver(e, col.status)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, col.status)}
            >
              <div className="px-3 py-2.5 border-b border-current/15 flex items-center justify-between sticky top-0 bg-inherit rounded-t-xl">
                <span className="text-sm font-bold uppercase tracking-wide truncate">{col.status}</span>
                <Badge className="bg-white/70 text-current border border-current/30" data-testid={`pipeline-col-${col.status.toLowerCase().replace(/\s+/g, '-')}-count`}>
                  {col.count}
                </Badge>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {col.leads.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4">Drop leads here</p>
                )}
                {col.leads.map((l) => (
                  <Card
                    key={l.id}
                    draggable
                    onDragStart={() => onDragStart(l)}
                    onClick={() => navigate(`/leads/${l.id}`)}
                    data-testid={`pipeline-card-${l.id}`}
                    className="bg-white border border-slate-200 p-2.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow select-none"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{l.name}</p>
                      {l.priority === 'High' && (
                        <Flame className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{l.program_name || '—'}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                      {l.number && (
                        <span className="flex items-center gap-0.5">
                          <Phone className="w-3 h-3" /> {l.number.slice(-10)}
                        </span>
                      )}
                      {l.demo_date && (
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" /> {(l.demo_date || '').slice(0, 10)}
                        </span>
                      )}
                    </div>
                    {(l.fee_quoted || l.final_fee) && (
                      <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                        {l.final_fee ? `Final ₹${l.final_fee}` : `Quoted ₹${l.fee_quoted}`}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LeadsPipelinePage;
