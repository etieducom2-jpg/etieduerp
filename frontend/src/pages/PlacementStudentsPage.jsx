import React, { useEffect, useState } from 'react';
import { placementAPI } from '@/api/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, CalendarPlus, MessageSquarePlus, Award } from 'lucide-react';
import { toast } from 'sonner';
import StudentPlacementDrawer from '@/components/placement/StudentPlacementDrawer';

export default function PlacementStudentsPage() {
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [drawerStudent, setDrawerStudent] = useState(null);
  const [drawerMode, setDrawerMode] = useState('view'); // view | resume | interview | remark | placed

  const reload = async () => {
    setLoading(true);
    try {
      const { data } = await placementAPI.listStudents();
      setStudents(data.students || []);
    } catch (e) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    const s = search.trim().toLowerCase();
    if (!s) { setFiltered(students); return; }
    setFiltered(students.filter((x) =>
      (x.name || '').toLowerCase().includes(s) ||
      (x.email || '').toLowerCase().includes(s) ||
      (x.phone || '').toLowerCase().includes(s) ||
      (x.program_name || '').toLowerCase().includes(s)
    ));
  }, [search, students]);

  const openDrawer = (student, mode) => {
    setDrawerStudent(student);
    setDrawerMode(mode);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto" data-testid="placement-students-page">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Course-Completed Students</h1>
          <p className="text-slate-500 mt-1">Generate resumes, schedule interviews, and mark placements.</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            data-testid="student-search-input"
            placeholder="Search name, email, phone, program…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-80"
          />
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-slate-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500 italic">
              No course-completed students found yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="p-3">Name</th>
                    <th className="p-3">Contact</th>
                    <th className="p-3">Program</th>
                    <th className="p-3">Qualification</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50" data-testid={`student-row-${s.id}`}>
                      <td className="p-3 font-medium text-slate-900">{s.name}</td>
                      <td className="p-3 text-slate-600">
                        <div>{s.phone}</div>
                        <div className="text-xs text-slate-400">{s.email}</div>
                      </td>
                      <td className="p-3 text-slate-700">{s.program_name || '—'}</td>
                      <td className="p-3 text-slate-700">{s.highest_qualification || '—'}</td>
                      <td className="p-3">
                        {s.is_placed ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Placed</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pending</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openDrawer(s, 'resume')} data-testid={`btn-resume-${s.id}`}>
                            <FileText className="w-4 h-4 mr-1" /> Resume
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openDrawer(s, 'interview')} data-testid={`btn-interview-${s.id}`}>
                            <CalendarPlus className="w-4 h-4 mr-1" /> Interview
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openDrawer(s, 'remark')} data-testid={`btn-remark-${s.id}`}>
                            <MessageSquarePlus className="w-4 h-4 mr-1" /> Remark
                          </Button>
                          {!s.is_placed && (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openDrawer(s, 'placed')} data-testid={`btn-placed-${s.id}`}>
                              <Award className="w-4 h-4 mr-1" /> Mark Placed
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {drawerStudent && (
        <StudentPlacementDrawer
          student={drawerStudent}
          mode={drawerMode}
          onClose={() => setDrawerStudent(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}
