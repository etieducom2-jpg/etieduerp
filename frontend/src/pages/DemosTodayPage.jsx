import React, { useEffect, useState } from 'react';
import { demosAPI } from '@/api/api';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, User, Phone, BookOpen, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DemosTodayPage() {
  const [data, setData] = useState({ date: '', count: 0, demos: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data: d } = await demosAPI.today();
      setData(d);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto" data-testid="demos-today-page">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" /> Today's Demos
          </h1>
          <p className="text-slate-500 mt-1">{data.date} · {data.count} demo{data.count === 1 ? '' : 's'} scheduled</p>
        </div>
        <Button variant="outline" onClick={load} data-testid="btn-refresh-demos">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : data.demos.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center text-slate-500 italic">
            No demos scheduled for today.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.demos.map((d) => (
            <Card key={d.id} className="border-0 shadow-sm hover:shadow-md transition" data-testid={`demo-card-${d.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-slate-900 text-lg">{d.name}</div>
                    <div className="text-sm text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{d.number}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">Time</div>
                    <div className="font-bold text-slate-900 flex items-center gap-1"><Clock className="w-4 h-4" />{d.demo_time || '—'}</div>
                  </div>
                </div>
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-700"><BookOpen className="w-4 h-4 text-slate-400" /> {d.program_name || '—'}</div>
                  <div className="flex items-center gap-2 text-sm text-slate-700"><User className="w-4 h-4 text-slate-400" /> {d.trainer_name || 'Trainer TBA'}</div>
                  {d.counsellor_name && (
                    <div className="text-xs text-slate-500">Counsellor: {d.counsellor_name}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
