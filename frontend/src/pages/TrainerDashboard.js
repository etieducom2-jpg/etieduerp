import React, { useState, useEffect } from 'react';
import { trainerAPI, attendanceAPI, courseCompletionAPI, batchAPI } from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Users, Calendar, Clock, BookOpen, CheckCircle, 
  GraduationCap, ClipboardList, Award, UserCheck, UserX, Cake 
} from 'lucide-react';

const TrainerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [attendanceDialog, setAttendanceDialog] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchStudents, setBatchStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  
  const [completionDialog, setCompletionDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [completionForm, setCompletionForm] = useState({
    exam_status: 'Passed',
    exam_score: '',
    remarks: ''
  });
  
  const [curriculumDialog, setCurriculumDialog] = useState(false);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [dashboardRes, batchesRes] = await Promise.all([
        trainerAPI.getDashboard(),
        trainerAPI.getBatches()
      ]);
      setDashboard(dashboardRes.data);
      setBatches(batchesRes.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const openAttendanceDialog = async (batch) => {
    setSelectedBatch(batch);
    try {
      const studentsRes = await batchAPI.getStudents(batch.id);
      setBatchStudents(studentsRes.data);
      
      // Initialize attendance records
      const records = {};
      studentsRes.data.forEach(s => {
        records[s.enrollment_id] = 'Present';
      });
      setAttendanceRecords(records);
      
      // Check existing attendance for the date
      const existingRes = await attendanceAPI.getBatch(batch.id, attendanceDate);
      existingRes.data.forEach(a => {
        records[a.enrollment_id] = a.status;
      });
      setAttendanceRecords({...records});
      
      setAttendanceDialog(true);
    } catch (error) {
      toast.error('Failed to load batch students');
    }
  };

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    try {
      const attendanceData = {
        batch_id: selectedBatch.id,
        date: attendanceDate,
        attendance_records: Object.entries(attendanceRecords).map(([enrollment_id, status]) => ({
          enrollment_id,
          status
        }))
      };
      
      await attendanceAPI.markBulk(attendanceData);
      toast.success('Attendance saved successfully');
      setAttendanceDialog(false);
      fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save attendance');
    } finally {
      setSavingAttendance(false);
    }
  };

  const openCompletionDialog = (student) => {
    setSelectedStudent(student);
    setCompletionForm({
      exam_status: 'Passed',
      exam_score: '',
      remarks: ''
    });
    setCompletionDialog(true);
  };

  const handleMarkComplete = async () => {
    try {
      await courseCompletionAPI.mark({
        enrollment_id: selectedStudent.id,
        exam_status: completionForm.exam_status,
        exam_score: completionForm.exam_score ? parseFloat(completionForm.exam_score) : null,
        remarks: completionForm.remarks || null
      });
      toast.success('Course marked as complete');
      setCompletionDialog(false);
      fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to mark completion');
    }
  };

  const viewCurriculum = (curriculum) => {
    setSelectedCurriculum(curriculum);
    setCurriculumDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="trainer-dashboard">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-6 rounded-xl">
        <h1 className="text-3xl font-bold mb-2">Welcome, {user.name}!</h1>
        <p className="text-slate-300">Trainer Dashboard - Manage your batches and students</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard?.total_students || 0}</p>
                <p className="text-sm text-slate-500">Active Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{batches.length}</p>
                <p className="text-sm text-slate-500">Active Batches</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <ClipboardList className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard?.today_attendance?.length || 0}</p>
                <p className="text-sm text-slate-500">Marked Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Award className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{dashboard?.total_passed || 0}</p>
                <p className="text-sm text-slate-500">Passed Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="batches" className="w-full">
        <TabsList>
          <TabsTrigger value="batches" data-testid="batches-tab">My Batches</TabsTrigger>
          <TabsTrigger value="students" data-testid="students-tab">Students</TabsTrigger>
          <TabsTrigger value="passed" data-testid="passed-tab">Passed Students</TabsTrigger>
          <TabsTrigger value="curriculum" data-testid="curriculum-tab">Curriculum</TabsTrigger>
        </TabsList>

        {/* Batches Tab */}
        <TabsContent value="batches" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.map((batch) => (
              <Card key={batch.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-500" />
                    {batch.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Timing:</span>
                      <Badge variant="outline">{batch.timing || 'Not set'}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Program:</span>
                      <span className="font-medium">{batch.program_name || 'Not assigned'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Students:</span>
                      <span className="font-medium">{batch.student_count || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Status:</span>
                      <Badge className={batch.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}>
                        {batch.status}
                      </Badge>
                    </div>
                    
                    <div className="pt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => openAttendanceDialog(batch)}
                        className="flex-1"
                        disabled={!batch.student_count}
                        data-testid={`mark-attendance-${batch.id}`}
                      >
                        <UserCheck className="w-4 h-4 mr-1" />
                        Mark Attendance
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-4">
          {/* Upcoming Birthdays Section */}
          {dashboard?.upcoming_birthdays?.length > 0 && (
            <Card className="border-pink-200 bg-pink-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-pink-700">
                  <Cake className="w-5 h-5" />
                  Upcoming Birthdays
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {dashboard.upcoming_birthdays.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-pink-200 shadow-sm">
                      <Cake className="w-4 h-4 text-pink-500" />
                      <div>
                        <p className="font-medium text-sm">{b.student_name}</p>
                        <p className="text-xs text-slate-500">
                          {b.days_until === 0 ? '🎉 Today!' : `${b.days_until} day${b.days_until > 1 ? 's' : ''} - ${new Date(b.birthday).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left text-sm font-semibold">Name</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Contact</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Program</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Birthday</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard?.students?.map((student) => {
                    // Check if this student has an upcoming birthday
                    const upcomingBday = dashboard?.upcoming_birthdays?.find(b => b.enrollment_id === student.id);
                    return (
                      <tr key={student.id} className="border-b hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{student.student_name}</p>
                          <p className="text-xs text-slate-500">{student.email}</p>
                        </td>
                        <td className="px-4 py-3 text-sm">{student.phone}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{student.program_name}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {student.dob ? (
                            <div className="flex items-center gap-1">
                              {upcomingBday && upcomingBday.days_until <= 7 && (
                                <Cake className="w-4 h-4 text-pink-500" />
                              )}
                              <span className={upcomingBday && upcomingBday.days_until <= 7 ? 'text-pink-600 font-medium' : ''}>
                                {new Date(student.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openCompletionDialog(student)}
                            data-testid={`mark-complete-${student.id}`}
                          >
                            <Award className="w-4 h-4 mr-1" />
                            Mark Complete
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {(!dashboard?.students || dashboard.students.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No students assigned yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Curriculum Tab */}
        <TabsContent value="curriculum" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboard?.curricula?.map((curriculum) => (
              <Card key={curriculum.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => viewCurriculum(curriculum)}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    {curriculum.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-2">{curriculum.description || 'No description'}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{curriculum.program_name}</Badge>
                    {curriculum.duration_weeks && (
                      <Badge variant="secondary">{curriculum.duration_weeks} weeks</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-2">{curriculum.topics?.length || 0} topics</p>
                </CardContent>
              </Card>
            ))}
            {(!dashboard?.curricula || dashboard.curricula.length === 0) && (
              <div className="col-span-2 text-center py-12 text-slate-500">
                No curriculum assigned for your programs yet
              </div>
            )}
          </div>
        </TabsContent>

        {/* Passed Students Tab */}
        <TabsContent value="passed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Passed Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left text-sm font-semibold">Name</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Program</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Completion Date</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Exam Status</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard?.passed_students?.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{student.student_name}</p>
                        <p className="text-xs text-slate-500">{student.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{student.program_name}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {student.completion_date || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={student.exam_status === 'Passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {student.exam_status || 'Passed'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {student.exam_score ? `${student.exam_score}%` : '-'}
                      </td>
                    </tr>
                  ))}
                  {(!dashboard?.passed_students || dashboard.passed_students.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No students have completed their course yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Attendance Dialog */}
      <Dialog open={attendanceDialog} onOpenChange={setAttendanceDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Mark Attendance - {selectedBatch?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-slate-500">Note: Past date attendance can only be edited if it was already marked. New entries are allowed only for today.</p>
            </div>
            
            <div className="border rounded-lg divide-y">
              {batchStudents.map((student) => (
                <div key={student.enrollment_id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{student.student_name}</p>
                    <p className="text-sm text-slate-500">{student.enrollment_id?.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={attendanceRecords[student.enrollment_id] === 'Present' ? 'default' : 'outline'}
                      onClick={() => setAttendanceRecords({...attendanceRecords, [student.enrollment_id]: 'Present'})}
                      className={attendanceRecords[student.enrollment_id] === 'Present' ? 'bg-green-600 hover:bg-green-700' : ''}
                    >
                      <UserCheck className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={attendanceRecords[student.enrollment_id] === 'Absent' ? 'default' : 'outline'}
                      onClick={() => setAttendanceRecords({...attendanceRecords, [student.enrollment_id]: 'Absent'})}
                      className={attendanceRecords[student.enrollment_id] === 'Absent' ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                      <UserX className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={attendanceRecords[student.enrollment_id] === 'Late' ? 'default' : 'outline'}
                      onClick={() => setAttendanceRecords({...attendanceRecords, [student.enrollment_id]: 'Late'})}
                      className={attendanceRecords[student.enrollment_id] === 'Late' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                    >
                      Late
                    </Button>
                  </div>
                </div>
              ))}
              {batchStudents.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  No students in this batch
                </div>
              )}
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleSaveAttendance} 
              disabled={savingAttendance || batchStudents.length === 0}
            >
              {savingAttendance ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Course Completion Dialog */}
      <Dialog open={completionDialog} onOpenChange={setCompletionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Mark Course Complete
            </DialogTitle>
          </DialogHeader>
          
          {selectedStudent && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="font-medium">{selectedStudent.student_name}</p>
                <p className="text-sm text-slate-500">{selectedStudent.program_name}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Exam Status</Label>
                <Select
                  value={completionForm.exam_status}
                  onValueChange={(v) => setCompletionForm({...completionForm, exam_status: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Passed">Passed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Exam Score (Optional)</Label>
                <Input
                  type="number"
                  value={completionForm.exam_score}
                  onChange={(e) => setCompletionForm({...completionForm, exam_score: e.target.value})}
                  placeholder="Enter score"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Remarks (Optional)</Label>
                <Input
                  value={completionForm.remarks}
                  onChange={(e) => setCompletionForm({...completionForm, remarks: e.target.value})}
                  placeholder="Any additional remarks"
                />
              </div>
              
              <Button className="w-full" onClick={handleMarkComplete}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Complete
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Curriculum View Dialog */}
      <Dialog open={curriculumDialog} onOpenChange={setCurriculumDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              {selectedCurriculum?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCurriculum && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant="outline">{selectedCurriculum.program_name}</Badge>
                {selectedCurriculum.duration_weeks && (
                  <Badge variant="secondary">{selectedCurriculum.duration_weeks} weeks</Badge>
                )}
              </div>
              
              {selectedCurriculum.description && (
                <p className="text-slate-600">{selectedCurriculum.description}</p>
              )}
              
              <div>
                <h4 className="font-semibold mb-2">Topics</h4>
                <ol className="list-decimal list-inside space-y-1">
                  {selectedCurriculum.topics?.map((topic, idx) => (
                    <li key={idx} className="text-slate-700">{topic}</li>
                  ))}
                  {(!selectedCurriculum.topics || selectedCurriculum.topics.length === 0) && (
                    <p className="text-slate-500">No topics defined</p>
                  )}
                </ol>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainerDashboard;
