import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { branchAdminAPI } from '@/api/api';
import { toast } from 'sonner';
import { MessageCircle, Star, CheckCircle2, Mail, Phone } from 'lucide-react';

const StudentFeedbackCard = () => {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await branchAdminAPI.getStudentFeedback(false);
      setItems(res.data?.feedback || []);
      setUnread(res.data?.unread || 0);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const markRead = async (id) => {
    try {
      await branchAdminAPI.markFeedbackRead(id);
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    } catch (e) {
      toast.error('Could not update');
    }
  };

  const visible = showAll ? items : items.slice(0, 5);

  return (
    <Card className="border-slate-200" data-testid="student-feedback-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-indigo-500" />
            Student Feedback
          </CardTitle>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <Badge className="bg-red-500 text-white" data-testid="feedback-unread-count">
                {unread} new
              </Badge>
            )}
            <Badge variant="outline">{items.length} total</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-slate-500 py-2">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">
            No feedback received yet. Students can send feedback from their portal.
          </p>
        ) : (
          <>
            <ul className="space-y-3">
              {visible.map((fb) => (
                <li
                  key={fb.id}
                  className={`rounded-lg border p-3 ${fb.is_read ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50/50'}`}
                  data-testid={`feedback-${fb.id}`}
                >
                  <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
                    <div>
                      <p className="font-medium text-slate-800">{fb.student_name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                        <span>{fb.program_name || 'General'}</span>
                        <span>•</span>
                        <span>{fb.enrollment_id}</span>
                        {fb.student_phone && (
                          <span className="flex items-center gap-0.5">
                            <Phone className="w-3 h-3" /> {fb.student_phone}
                          </span>
                        )}
                        {fb.student_email && (
                          <span className="flex items-center gap-0.5">
                            <Mail className="w-3 h-3" /> {fb.student_email}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {fb.rating && (
                        <span className="flex items-center gap-0.5 text-amber-500 text-sm">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star key={n} className={`w-3 h-3 ${n <= fb.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                          ))}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {fb.created_at ? new Date(fb.created_at).toLocaleString() : ''}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{fb.message}</p>
                  {!fb.is_read && (
                    <div className="mt-2">
                      <Button size="sm" variant="ghost" onClick={() => markRead(fb.id)} data-testid={`mark-read-${fb.id}`}>
                        <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                        Mark as read
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {items.length > 5 && (
              <div className="text-center pt-3">
                <Button variant="link" size="sm" onClick={() => setShowAll((s) => !s)}>
                  {showAll ? 'Show less' : `Show all (${items.length})`}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentFeedbackCard;
