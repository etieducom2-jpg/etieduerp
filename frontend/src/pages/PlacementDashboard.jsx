import React, { useEffect, useState } from 'react';
import { placementAPI } from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, GraduationCap, CheckCircle2, CalendarClock } from 'lucide-react';
import { Link } from 'react-router-dom';
import RoleHero from '@/components/dashboards/RoleHero';

const StatCard = ({ icon: Icon, label, value, tint, testid }) => (
  <Card data-testid={testid} className="border-0 shadow-sm">
    <CardContent className="p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tint}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
        <div className="text-3xl font-bold text-slate-900">{value}</div>
      </div>
    </CardContent>
  </Card>
);

export default function PlacementDashboard() {
  const [stats, setStats] = useState({
    completed_students: 0,
    placed_students: 0,
    pending_for_placement: 0,
    upcoming_interviews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: s }, { data: i }] = await Promise.all([
          placementAPI.stats(),
          placementAPI.listInterviews({ upcoming: true }),
        ]);
        setStats(s);
        setUpcoming((i.interviews || []).slice(0, 8));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto" data-testid="placement-dashboard">
      <RoleHero />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Placement Manager</h1>
        <p className="text-slate-500 mt-1">Track course-completed students and manage placements end-to-end.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard testid="stat-completed" icon={GraduationCap} label="Course Completed" value={stats.completed_students} tint="bg-blue-600" />
        <StatCard testid="stat-pending" icon={Briefcase} label="Pending Placement" value={stats.pending_for_placement} tint="bg-amber-500" />
        <StatCard testid="stat-placed" icon={CheckCircle2} label="Placed" value={stats.placed_students} tint="bg-emerald-600" />
        <StatCard testid="stat-interviews" icon={CalendarClock} label="Upcoming Interviews" value={stats.upcoming_interviews} tint="bg-violet-600" />
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Upcoming Interviews</CardTitle>
            <Link to="/placement/interviews" className="text-sm text-blue-600 hover:underline" data-testid="link-all-interviews">
              View all →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-slate-500">Loading…</div>
          ) : upcoming.length === 0 ? (
            <div className="text-slate-500 italic">No upcoming interviews scheduled.</div>
          ) : (
            <div className="divide-y">
              {upcoming.map((iv) => (
                <div key={iv.id} className="py-3 flex items-center justify-between" data-testid={`upcoming-iv-${iv.id}`}>
                  <div>
                    <div className="font-medium text-slate-900">{iv.student_name}</div>
                    <div className="text-sm text-slate-500">
                      {iv.company_name} · {iv.role || '—'}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    {iv.interview_date} {iv.interview_time && `· ${iv.interview_time}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
