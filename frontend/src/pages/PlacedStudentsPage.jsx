import React, { useEffect, useState } from 'react';
import { placementAPI } from '@/api/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Award, Search } from 'lucide-react';

export default function PlacedStudentsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await placementAPI.listPlacements();
        setList(data.placements || []);
      } finally { setLoading(false); }
    })();
  }, []);

  const s = search.trim().toLowerCase();
  const shown = !s ? list : list.filter((p) =>
    (p.student_name || '').toLowerCase().includes(s) ||
    (p.company_name || '').toLowerCase().includes(s) ||
    (p.city || '').toLowerCase().includes(s) ||
    (p.program_name || '').toLowerCase().includes(s)
  );

  const totalLpa = shown.reduce((acc, x) => acc + (Number(x.salary_lpa) || 0), 0);
  const avgLpa = shown.length ? (totalLpa / shown.length).toFixed(2) : 0;

  return (
    <div className="p-8 max-w-7xl mx-auto" data-testid="placed-students-page">
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Award className="w-8 h-8 text-emerald-600" /> Placed Students
          </h1>
          <p className="text-slate-500 mt-1">{shown.length} placed · Avg salary {avgLpa} LPA</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input className="pl-10 w-72" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="placed-search" />
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-slate-500">Loading…</div>
          ) : shown.length === 0 ? (
            <div className="p-8 text-center text-slate-500 italic">No placements yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="p-3">Student</th>
                    <th className="p-3">Program</th>
                    <th className="p-3">Company</th>
                    <th className="p-3">Designation</th>
                    <th className="p-3">Salary (LPA)</th>
                    <th className="p-3">City</th>
                    <th className="p-3">Joining</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {shown.map((p) => (
                    <tr key={p.id || p.student_id} className="hover:bg-slate-50" data-testid={`placed-row-${p.student_id}`}>
                      <td className="p-3 font-medium text-slate-900">{p.student_name}</td>
                      <td className="p-3 text-slate-700">{p.program_name || '—'}</td>
                      <td className="p-3 text-slate-700">{p.company_name}</td>
                      <td className="p-3 text-slate-700">{p.designation || '—'}</td>
                      <td className="p-3 text-emerald-700 font-semibold">{p.salary_lpa || '—'}</td>
                      <td className="p-3 text-slate-700">{p.city || '—'}</td>
                      <td className="p-3 text-slate-700">{p.joining_date || '—'}</td>
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
