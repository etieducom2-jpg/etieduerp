import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { GraduationCap, LogOut, BookOpen, MessageCircle, CheckCircle2, Star, Sparkles } from 'lucide-react';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const studentRaw = localStorage.getItem('student');
  const student = studentRaw ? JSON.parse(studentRaw) : null;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackEnrollment, setFeedbackEnrollment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchCurricula = async () => {
    setLoading(true);
    try {
      const res = await studentAPI.myCurricula();
      setData(res.data);
      if (res.data?.programs?.length > 0 && !activeTab) {
        setActiveTab(res.data.programs[0].enrollment.enrollment_id);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load your courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('student_token')) {
      navigate('/student/login');
      return;
    }
    fetchCurricula();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('student_token');
    localStorage.removeItem('student');
    navigate('/student/login');
  };

  const toggleTopic = async (program, topic, newDone) => {
    try {
      await studentAPI.markTopic({
        enrollment_id: program.enrollment.enrollment_id,
        program_id: program.enrollment.program_id,
        curriculum_id: program.curriculum.id,
        topic_index: topic.topic_index,
        topic_name: topic.topic_name,
        done: newDone,
      });
      // Optimistic local update
      setData((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        next.programs = prev.programs.map((p) => {
          if (p.enrollment.enrollment_id !== program.enrollment.enrollment_id) return p;
          const newTopics = p.topics.map((t) =>
            t.topic_index === topic.topic_index ? { ...t, done: newDone } : t
          );
          const done_count = newTopics.filter((t) => t.done).length;
          return {
            ...p,
            topics: newTopics,
            topics_done: done_count,
            progress_percent: newTopics.length ? Math.round((done_count / newTopics.length) * 100) : 0,
          };
        });
        return next;
      });
    } catch (e) {
      toast.error('Could not save progress. Try again.');
    }
  };

  const openFeedbackFor = (program) => {
    setFeedbackEnrollment(program);
    setFeedbackMsg('');
    setFeedbackRating(0);
    setFeedbackOpen(true);
  };

  const submitFeedback = async () => {
    if (!feedbackMsg.trim()) {
      toast.error('Please write something before sending.');
      return;
    }
    setSubmitting(true);
    try {
      await studentAPI.submitFeedback({
        enrollment_id: feedbackEnrollment.enrollment.enrollment_id,
        program_id: feedbackEnrollment.enrollment.program_id,
        message: feedbackMsg.trim(),
        rating: feedbackRating || null,
      });
      toast.success('Feedback sent to your branch admin. Thank you!');
      setFeedbackOpen(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Could not send feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500" data-testid="student-dashboard-loading">
        Loading your courses…
      </div>
    );
  }
  if (!data || !data.programs?.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <BookOpen className="w-10 h-10 text-slate-400" />
        <p className="text-slate-600">No active enrollments found on your account.</p>
        <Button variant="outline" onClick={handleLogout}>Logout</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/30 via-white to-cyan-50/30" data-testid="student-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800" data-testid="student-name">{student?.name || 'Student'}</p>
              <p className="text-xs text-slate-500">
                {data.programs.length} program{data.programs.length > 1 ? 's' : ''} enrolled
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="student-logout">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto bg-white border border-slate-200 p-1">
            {data.programs.map((p) => (
              <TabsTrigger
                key={p.enrollment.enrollment_id}
                value={p.enrollment.enrollment_id}
                data-testid={`tab-${p.enrollment.enrollment_id}`}
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
              >
                {p.enrollment.program_name}
              </TabsTrigger>
            ))}
          </TabsList>

          {data.programs.map((p) => (
            <TabsContent key={p.enrollment.enrollment_id} value={p.enrollment.enrollment_id} className="space-y-4 mt-4">
              {/* Program summary */}
              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-emerald-600" />
                        {p.enrollment.program_name}
                      </CardTitle>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <Badge variant="outline">Enrollment: {p.enrollment.enrollment_id}</Badge>
                        <Badge variant="outline">Started: {p.enrollment.enrollment_date || 'N/A'}</Badge>
                        <Badge className="bg-emerald-100 text-emerald-700">
                          {p.topics_done}/{p.topics_total} topics ({p.progress_percent}%)
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openFeedbackFor(p)}
                      data-testid={`feedback-btn-${p.enrollment.enrollment_id}`}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Send Feedback
                    </Button>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                        style={{ width: `${p.progress_percent}%` }}
                      />
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Curriculum / topics */}
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {p.curriculum.title || 'Curriculum'}
                  </CardTitle>
                  {p.curriculum.description && (
                    <p className="text-sm text-slate-500">{p.curriculum.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  {!p.curriculum.available ? (
                    <div className="text-center py-8 text-slate-500">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      Your trainer hasn't published a curriculum for this program yet.
                    </div>
                  ) : p.topics.length === 0 ? (
                    <p className="text-sm text-slate-500">Curriculum is published but no topics added yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {p.topics.map((t) => (
                        <li
                          key={t.topic_index}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition ${
                            t.done
                              ? 'border-emerald-200 bg-emerald-50/50'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                          data-testid={`topic-${p.enrollment.enrollment_id}-${t.topic_index}`}
                        >
                          <Checkbox
                            checked={t.done}
                            onCheckedChange={(checked) => toggleTopic(p, t, !!checked)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <p className={`text-sm ${t.done ? 'text-emerald-800 line-through decoration-emerald-300' : 'text-slate-800'}`}>
                              {t.topic_name}
                            </p>
                            {t.done && t.updated_at && (
                              <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                                <CheckCircle2 className="w-3 h-3" />
                                Marked done {new Date(t.updated_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">#{t.topic_index + 1}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </main>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send feedback to your Branch Admin</DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              About <b>{feedbackEnrollment?.enrollment?.program_name}</b>. Your branch admin will be notified.
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">How would you rate this program so far?</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setFeedbackRating(n)}
                    className="p-1"
                    data-testid={`rating-${n}`}
                  >
                    <Star
                      className={`w-6 h-6 transition ${
                        feedbackRating >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Your message</p>
              <Textarea
                rows={5}
                value={feedbackMsg}
                onChange={(e) => setFeedbackMsg(e.target.value)}
                placeholder="Share suggestions, concerns, or appreciation…"
                data-testid="feedback-textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
            <Button onClick={submitFeedback} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700" data-testid="submit-feedback-btn">
              {submitting ? 'Sending…' : 'Send Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentDashboard;
