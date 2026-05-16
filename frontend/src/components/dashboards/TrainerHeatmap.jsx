import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Activity, RefreshCw, Users } from 'lucide-react';

const formatHour = (h) => {
  const ampm = h < 12 ? 'AM' : 'PM';
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return `${hh}${ampm}`;
};

// Color ramp: 0 batches => green, 1 => amber, 2 => orange, 3+ => red
const cellStyle = (count) => {
  if (!count || count === 0) return { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' };
  if (count === 1) return { background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' };
  if (count === 2) return { background: '#FED7AA', color: '#9A3412', border: '1px solid #FDBA74' };
  return { background: '#FECACA', color: '#991B1B', border: '1px solid #FCA5A5' };
};

const TrainerHeatmap = ({ data, loading, onRefresh }) => {
  if (loading) {
    return (
      <Card className="border-slate-200" data-testid="trainer-heatmap-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            Trainer Load &amp; Availability Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-slate-500">
          <RefreshCw className="w-4 h-4 inline-block mr-2 animate-spin" />
          Loading trainer schedule…
        </CardContent>
      </Card>
    );
  }
  if (!data) {
    return (
      <Card className="border-slate-200" data-testid="trainer-heatmap-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" />
              Trainer Load &amp; Availability Heatmap
            </CardTitle>
            {onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh} className="h-7 px-2" data-testid="trainer-heatmap-refresh">
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 text-center text-slate-500">
          Couldn't load trainer schedule. Click refresh to try again.
        </CardContent>
      </Card>
    );
  }

  const { hours = [], trainers = [], ai_summary, ai_powered, totals = {} } = data;

  return (
    <Card className="border-slate-200" data-testid="trainer-heatmap-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            Trainer Load &amp; Availability Heatmap
            {ai_powered && (
              <Badge className="bg-purple-100 text-purple-700 text-[10px] ml-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI summary
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              {totals.trainer_count || 0} trainers
            </Badge>
            <Badge variant="outline" className="text-xs">
              {totals.active_batches || 0} batches
            </Badge>
            <Badge variant="outline" className="text-xs">
              {totals.total_students || 0} students
            </Badge>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="h-7 px-2"
                data-testid="trainer-heatmap-refresh"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {trainers.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">No active trainers found for your branch.</p>
        ) : (
          <>
            {/* AI Summary */}
            <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-indigo-50 via-purple-50 to-white border border-indigo-100" data-testid="trainer-heatmap-summary">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{ai_summary}</pre>
              </div>
            </div>

            {/* Heatmap grid */}
            <div className="overflow-x-auto">
              <table className="text-xs border-separate" style={{ borderSpacing: '4px' }}>
                <thead>
                  <tr>
                    <th className="text-left text-slate-500 font-medium pr-3 sticky left-0 bg-white z-10">Trainer</th>
                    {hours.map((h) => (
                      <th key={h} className="text-slate-500 font-medium text-center min-w-[44px]">
                        {formatHour(h)}
                      </th>
                    ))}
                    <th className="text-slate-500 font-medium pl-3">Load</th>
                  </tr>
                </thead>
                <tbody>
                  {trainers.map((t) => (
                    <tr key={t.trainer_id} data-testid={`heatmap-row-${t.trainer_id}`}>
                      <td className="font-medium text-slate-800 pr-3 whitespace-nowrap sticky left-0 bg-white z-10">
                        {t.trainer_name}
                        <span className="text-slate-400 ml-1">({t.total_batches}b)</span>
                      </td>
                      {t.cells.map((c) => {
                        const style = cellStyle(c.batch_count);
                        const tip = c.batch_count === 0
                          ? `Free • ${formatHour(c.hour)}`
                          : c.batches.map((b) => `${b.name || 'Batch'} (${b.students || 0} stu)`).join('\n');
                        return (
                          <td key={c.hour} className="text-center">
                            <div
                              title={tip}
                              className="w-11 h-9 rounded-md flex items-center justify-center font-semibold cursor-default transition-transform hover:scale-110"
                              style={style}
                            >
                              {c.batch_count === 0 ? '·' : c.batch_count}
                            </div>
                          </td>
                        );
                      })}
                      <td className="pl-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full ${t.utilization_pct >= 70 ? 'bg-red-500' : t.utilization_pct >= 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${t.utilization_pct}%` }}
                            />
                          </div>
                          <span className="text-slate-600 font-semibold">{t.utilization_pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded" style={cellStyle(0)} /> Free
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded" style={cellStyle(1)} /> 1 batch
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded" style={cellStyle(2)} /> 2 batches
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded" style={cellStyle(3)} /> 3+ batches
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TrainerHeatmap;
