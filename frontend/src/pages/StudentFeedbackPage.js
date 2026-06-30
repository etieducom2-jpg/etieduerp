import React, { useState, useEffect } from 'react';
import { feedbackAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { MessageSquare, Star, CheckCircle, Clock, User, Phone, GraduationCap, Brain, TrendingUp } from 'lucide-react';

const StarRating = ({ value, onChange, disabled }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !disabled && onChange(star)}
          disabled={disabled}
          className={`text-2xl transition-colors ${
            star <= value ? 'text-yellow-400' : 'text-gray-300'
          } ${!disabled && 'hover:text-yellow-400 cursor-pointer'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
};

const StudentFeedbackPage = () => {
  const [feedbackList, setFeedbackList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [feedbackForm, setFeedbackForm] = useState({
    doubt_clearance: 0,
    teacher_behavior: 0,
    facilities: 0,
    overall_rating: 0,
    remarks: ''
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isBranchAdmin = user.role === 'Branch Admin';

  // For Branch Admin - summary view
  const [summaryData, setSummaryData] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true); // Start true to show loading initially

  useEffect(() => {
    if (isBranchAdmin) {
      fetchMonths();
    } else {
      fetchFeedbackList();
    }
  }, []);

  const fetchMonths = async () => {
    setLoadingSummary(true);
    try {
      const response = await feedbackAPI.getMonths();
      setAvailableMonths(response.data);
      if (response.data.length > 0) {
        setSelectedMonth(response.data[0]);
        await fetchSummary(response.data[0]);
      } else {
        setLoadingSummary(false);
      }
    } catch (error) {
      console.error('Error fetching months:', error);
      setLoadingSummary(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async (month) => {
    setLoadingSummary(true);
    try {
      console.log('Fetching summary for month:', month);
      const response = await feedbackAPI.getSummary(month);
      console.log('Got summary response:', response.data);
      setSummaryData(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
      toast.error('Failed to load feedback summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchFeedbackList = async () => {
    try {
      const response = await feedbackAPI.getList(selectedMonth || undefined);
      setFeedbackList(response.data);
    } catch (error) {
      toast.error('Failed to load feedback list');
    } finally {
      setLoading(false);
    }
  };

  const openFeedbackDialog = (student) => {
    setSelectedStudent(student);
    setFeedbackForm({
      doubt_clearance: 0,
      teacher_behavior: 0,
      facilities: 0,
      overall_rating: 0,
      remarks: ''
    });
    setFeedbackDialog(true);
  };

  const handleSubmitFeedback = async () => {
    if (!selectedStudent) return;
    
    if (feedbackForm.doubt_clearance === 0 || feedbackForm.teacher_behavior === 0 || 
        feedbackForm.facilities === 0 || feedbackForm.overall_rating === 0) {
      toast.error('Please rate all categories');
      return;
    }
    
    setSubmitting(true);
    try {
      await feedbackAPI.submit({
        enrollment_id: selectedStudent.enrollment_id,
        ...feedbackForm
      });
      toast.success('Feedback submitted successfully');
      setFeedbackDialog(false);
      fetchFeedbackList();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = feedbackList?.students?.filter(s => s.feedback_status === 'Pending').length || 0;
  const completedCount = feedbackList?.students?.filter(s => s.feedback_status === 'Completed').length || 0;

  // Branch Admin View - Summary
  if (isBranchAdmin) {
    return (
      <div className="space-y-6" data-testid="feedback-summary-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Student Feedback Analysis</h1>
            <p className="text-slate-600">AI-powered analysis of monthly student feedback</p>
          </div>
          <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); fetchSummary(v); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loadingSummary ? (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        ) : summaryData ? (
          <>
            {/* Average Ratings */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-blue-700">Doubt Clearance</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-700">{summaryData.average_ratings?.doubt_clearance || 0}/5</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-700">Teacher Behavior</span>
                  </div>
                  <p className="text-3xl font-bold text-green-700">{summaryData.average_ratings?.teacher_behavior || 0}/5</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="w-5 h-5 text-purple-600" />
                    <span className="text-sm text-purple-700">Facilities</span>
                  </div>
                  <p className="text-3xl font-bold text-purple-700">{summaryData.average_ratings?.facilities || 0}/5</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-5 h-5 text-orange-600" />
                    <span className="text-sm text-orange-700">Overall Rating</span>
                  </div>
                  <p className="text-3xl font-bold text-orange-700">{summaryData.average_ratings?.overall || 0}/5</p>
                </CardContent>
              </Card>
            </div>

            {/* AI Analysis */}
            {summaryData.ai_analysis && (
              <Card className="border-slate-200 shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    AI Analysis Summary
                    <Badge className="bg-purple-100 text-purple-700 ml-2">GPT-4o Powered</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {summaryData.ai_analysis}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Individual Feedbacks */}
            <Card className="border-slate-200 shadow-soft">
              <CardHeader>
                <CardTitle>Individual Feedback ({summaryData.total_feedbacks})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {summaryData.feedbacks?.map((fb) => (
                    <div key={fb.id} className="p-4 bg-slate-50 rounded-lg border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{fb.student_name}</p>
                          <p className="text-xs text-slate-500">{fb.program_name}</p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-yellow-100 text-yellow-700">
                            Overall: {fb.overall_rating}/5
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                        <span>Doubt: {fb.doubt_clearance}/5</span>
                        <span>Teacher: {fb.teacher_behavior}/5</span>
                        <span>Facilities: {fb.facilities}/5</span>
                      </div>
                      {fb.remarks && (
                        <p className="text-sm text-slate-600 italic">"{fb.remarks}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center py-12 text-slate-500">
            No feedback data available. Feedback is collected on the 10th of each month.
          </div>
        )}
      </div>
    );
  }

  // Counsellor View - Feedback Collection
  return (
    <div className="space-y-6" data-testid="student-feedback-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Student Feedback</h1>
          <p className="text-slate-600">Collect monthly feedback from active students</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-50">
          <CardContent className="pt-4">
            <p className="text-sm text-slate-600">Total Students</p>
            <p className="text-2xl font-bold">{feedbackList?.students?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-700">Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">Completed</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{completedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      <Card className="border-slate-200 shadow-soft">
        <CardHeader>
          <CardTitle>Students for Feedback - {feedbackList?.month}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading...</div>
          ) : feedbackList?.students?.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No active students found for feedback collection.
            </div>
          ) : (
            <div className="space-y-3">
              {feedbackList?.students?.map((student) => (
                <div
                  key={student.enrollment_id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium">{student.student_name}</p>
                      <p className="text-sm text-slate-500">{student.program_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {student.student_phone && (
                      <span className="text-sm text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {student.student_phone}
                      </span>
                    )}
                    {student.feedback_status === 'Completed' ? (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" /> Completed
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => openFeedbackDialog(student)}
                        data-testid={`collect-feedback-${student.enrollment_id}`}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" /> Collect Feedback
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Collect Feedback</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedStudent.student_name}</p>
                <p className="text-sm text-slate-500">{selectedStudent.program_name}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="mb-2 block">Live Doubt Clearance</Label>
                  <StarRating
                    value={feedbackForm.doubt_clearance}
                    onChange={(v) => setFeedbackForm(prev => ({ ...prev, doubt_clearance: v }))}
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Teacher Behavior</Label>
                  <StarRating
                    value={feedbackForm.teacher_behavior}
                    onChange={(v) => setFeedbackForm(prev => ({ ...prev, teacher_behavior: v }))}
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Overall Facilities</Label>
                  <StarRating
                    value={feedbackForm.facilities}
                    onChange={(v) => setFeedbackForm(prev => ({ ...prev, facilities: v }))}
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Overall Rating</Label>
                  <StarRating
                    value={feedbackForm.overall_rating}
                    onChange={(v) => setFeedbackForm(prev => ({ ...prev, overall_rating: v }))}
                  />
                </div>

                <div>
                  <Label className="mb-2 block">Remarks</Label>
                  <Textarea
                    value={feedbackForm.remarks}
                    onChange={(e) => setFeedbackForm(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Any additional feedback from the student..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setFeedbackDialog(false)}>Cancel</Button>
                <Button onClick={handleSubmitFeedback} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentFeedbackPage;
