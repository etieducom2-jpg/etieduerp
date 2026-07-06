import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { recentLeadsAPI } from '@/api/api';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Phone, BookOpen } from 'lucide-react';
import React from 'react';

/**
 * Polls /api/leads/recent every 15s and surfaces brand-new leads as rich toast pop-ups.
 * Mount once at the layout level. Active only for Branch Admin and Counsellor roles.
 */
export default function NewLeadNotifier() {
  const navigate = useNavigate();
  const sinceRef = useRef(new Date().toISOString());
  const seenRef = useRef(new Set());
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const enabled = user.role === 'Branch Admin' || user.role === 'Counsellor';

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const { data } = await recentLeadsAPI.fetch(sinceRef.current);
        if (cancelled) return;
        const leads = data?.leads || [];
        // Update cursor first to avoid re-fetching same window
        if (data?.server_time) sinceRef.current = data.server_time;
        for (const lead of leads) {
          if (seenRef.current.has(lead.id)) continue;
          seenRef.current.add(lead.id);
          toast.custom((t) => (
            <div
              className="flex items-start gap-3 p-4 bg-white border-l-4 border-blue-600 shadow-lg rounded-r-lg max-w-md cursor-pointer"
              onClick={() => { navigate('/leads'); toast.dismiss(t); }}
              data-testid={`new-lead-toast-${lead.id}`}
            >
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  New lead {lead.lead_source ? `· ${lead.lead_source}` : ''}
                </div>
                <div className="font-semibold text-slate-900 truncate">{lead.name}</div>
                <div className="text-sm text-slate-600 flex items-center gap-3 mt-0.5">
                  {lead.number && (<span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.number}</span>)}
                  {lead.program_name && (<span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{lead.program_name}</span>)}
                </div>
                {lead.lead_id && (<div className="text-xs text-slate-400 mt-1">ID: {lead.lead_id}</div>)}
              </div>
            </div>
          ), { duration: 12000 });
        }
      } catch (e) {
        // silent — polling errors shouldn't bug the user
      }
    };

    poll(); // first run immediately
    const id = setInterval(poll, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, [enabled, navigate]);

  return null;
}
