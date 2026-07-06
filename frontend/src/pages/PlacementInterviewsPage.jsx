import React, { useEffect, useState } from 'react';
import { placementAPI } from '@/api/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STATUS_COLORS = {
  Scheduled: 'bg-blue-100 text-blue-700',
  Completed: 'bg-slate-100 text-slate-700',
  Cancelled: 'bg-red-100 text-red-700',
  Selected: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-orange-100 text-orange-700',
};

export default function PlacementInterviewsPage() {
  const [interviews, setInterviews] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const { data } = await placementAPI.listInterviews();
      setInterviews(data.interviews || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await placementAPI.updateInterview(id, { status });
      toast.success('Status updated');
      reload();
    } catch (e) { toast.error('Update failed'); }
  };

  const shown = filter === 'all' ? interviews : interviews.filter((x) => x.status === filter);

  return (
    <div className="p-8 max-w-7xl mx-auto" data-testid="placement-interviews-page">
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Interviews</h1>
          <p className="text-slate-500 mt-1">Track every scheduled interview and outcome.</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48" data-testid="iv-status-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Scheduled">Scheduled</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Selected">Selected</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-slate-500">Loading…</div>
          ) : shown.length === 0 ? (
            <div className="p-8 text-center text-slate-500 italic">No interviews found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="p-3">Student</th>
                    <th className="p-3">Company / Role</th>
                    <th className="p-3">Date / Time</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Update</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {shown.map((iv) => (
                    <tr key={iv.id} className="hover:bg-slate-50" data-testid={`iv-row-${iv.id}`}>
                      <td className="p-3 font-medium text-slate-900">{iv.student_name}
                        <div className="text-xs text-slate-400">{iv.program_name}</div>
                      </td>
                      <td className="p-3 text-slate-700">{iv.company_name}
                        <div className="text-xs text-slate-500">{iv.role}</div>
                      </td>
                      <td className="p-3 text-slate-700">{iv.interview_date}<div className="text-xs text-slate-500">{iv.interview_time}</div></td>
                      <td className="p-3 text-slate-700">{iv.mode}</td>
                      <td className="p-3">
                        <Badge className={(STATUS_COLORS[iv.status] || 'bg-slate-100 text-slate-700') + ' hover:opacity-90'}>{iv.status}</Badge>
                      </td>
                      <td className="p-3">
                        <Select value={iv.status} onValueChange={(v) => updateStatus(iv.id, v)}>
                          <SelectTrigger className="w-36" data-testid={`update-status-${iv.id}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Scheduled">Scheduled</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Selected">Selected</SelectItem>
                            <SelectItem value="Rejected">Rejected</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
