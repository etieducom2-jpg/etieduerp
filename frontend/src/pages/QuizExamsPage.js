import React, { useState, useEffect, useRef } from 'react';
import { quizAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Clock, FileText, Users, Copy, Trash2, CheckCircle, XCircle, Eye, QrCode, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';

const QuizExamsPage = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [viewAttemptsDialog, setViewAttemptsDialog] = useState(false);
  const [qrCodeDialog, setQrCodeDialog] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [selectedAttempts, setSelectedAttempts] = useState([]);
  const [importDialog, setImportDialog] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: 30,
    pass_percentage: 60,
    questions_per_attempt: 100,
    questions: []
  });
  
  const [currentQuestion, setCurrentQuestion] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'A'
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'Admin';
  const isAcademicController = user.role === 'Academic Controller';
  const isFDE = user.role === 'Front Desk Executive';
  const canCreateQuiz = isAcademicController; // Only Academic Controller can create quizzes
  
  useEffect(() => {
    fetchQuizzes();
    fetchAttempts();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const response = await quizAPI.getAll();
      setQuizzes(response.data);
    } catch (error) {
      toast.error('Failed to fetch quizzes');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttempts = async () => {
    try {
      const response = await quizAPI.getAttempts();
      setAttempts(response.data);
    } catch (error) {
      console.error('Failed to fetch attempts');
    }
  };

  const addQuestion = () => {
    if (!currentQuestion.question_text.trim()) {
      toast.error('Please enter a question');
      return;
    }
    if (!currentQuestion.option_a || !currentQuestion.option_b || !currentQuestion.option_c || !currentQuestion.option_d) {
      toast.error('Please fill all 4 options');
      return;
    }
    
    setFormData({
      ...formData,
      questions: [...formData.questions, { ...currentQuestion }]
    });
    setCurrentQuestion({
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A'
    });
    toast.success('Question added');
  };

  const removeQuestion = (index) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index)
    });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter exam name');
      return;
    }
    if (formData.questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }
    
    try {
      await quizAPI.create(formData);
      toast.success('Quiz exam created successfully');
      setCreateDialog(false);
      resetForm();
      fetchQuizzes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create quiz');
    }
  };

  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter exam name');
      return;
    }
    
    try {
      await quizAPI.update(selectedQuiz.id, formData);
      toast.success('Quiz exam updated successfully');
      setEditDialog(false);
      resetForm();
      fetchQuizzes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update quiz');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;
    
    try {
      await quizAPI.delete(id);
      toast.success('Quiz deleted successfully');
      fetchQuizzes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete quiz');
    }
  };

  const copyExamLink = (examId) => {
    const link = `${window.location.origin}/public/quiz/${examId}`;
    navigator.clipboard.writeText(link);
    toast.success('Quiz link copied to clipboard!');
  };

  const showQRCode = async (quiz) => {
    try {
      const response = await quizAPI.getQRCode(quiz.id);
      setQrCodeData({
        examName: quiz.name,
        url: response.data.quiz_url,
        qrCode: response.data.qr_code_base64
      });
      setQrCodeDialog(true);
    } catch (error) {
      toast.error('Failed to generate QR code');
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeData?.qrCode) return;
    
    const link = document.createElement('a');
    link.href = qrCodeData.qrCode;
    link.download = `quiz-qr-${qrCodeData.examName.replace(/\s+/g, '-')}.png`;
    link.click();
    toast.success('QR code downloaded!');
  };

  // Download sample CSV file
  const downloadSampleFormat = () => {
    const sampleCSV = `question_text,option_a,option_b,option_c,option_d,correct_answer
"What is the capital of France?","London","Berlin","Paris","Madrid","C"
"Which planet is closest to the Sun?","Venus","Mercury","Mars","Earth","B"
"What is 2 + 2?","3","4","5","6","B"
"Who wrote Romeo and Juliet?","Charles Dickens","William Shakespeare","Jane Austen","Mark Twain","B"`;
    
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'quiz_questions_sample.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    toast.success('Sample CSV downloaded!');
  };

  // Download sample Excel file via backend endpoint (returns proper .xlsx)
  const downloadSampleExcel = async () => {
    try {
      const response = await quizAPI.downloadSampleXlsx();
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'quiz_questions_sample.xlsx';
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Sample Excel downloaded!');
    } catch (error) {
      toast.error('Failed to download sample Excel');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast.error('Please select a CSV or Excel file');
        return;
      }
      setImportFile(file);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Please select a file to import');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Please enter an exam name first');
      return;
    }

    setImporting(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', importFile);
      formDataUpload.append('exam_name', formData.name);
      formDataUpload.append('description', formData.description || '');
      formDataUpload.append('duration_minutes', formData.duration_minutes);
      formDataUpload.append('pass_percentage', formData.pass_percentage);
      formDataUpload.append('questions_per_attempt', formData.questions_per_attempt || 100);

      const response = await quizAPI.importQuestions(formDataUpload);
      toast.success(`Quiz created — ${response.data.bank_size || response.data.question_count} questions imported. Each student will see ${response.data.questions_per_attempt || 100} random questions.`);
      setImportDialog(false);
      setImportFile(null);
      resetForm();
      fetchQuizzes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to import questions');
    } finally {
      setImporting(false);
    }
  };

  const openEdit = async (quiz) => {
    try {
      const response = await quizAPI.getDetails(quiz.id);
      setSelectedQuiz(quiz);
      setFormData({
        name: response.data.name,
        description: response.data.description || '',
        duration_minutes: response.data.duration_minutes,
        pass_percentage: response.data.pass_percentage,
        questions_per_attempt: response.data.questions_per_attempt || 100,
        questions: response.data.questions || []
      });
      setEditDialog(true);
    } catch (error) {
      toast.error('Failed to load quiz details');
    }
  };

  const viewAttempts = (quiz) => {
    const quizAttempts = attempts.filter(a => a.exam_id === quiz.id);
    setSelectedQuiz(quiz);
    setSelectedAttempts(quizAttempts);
    setViewAttemptsDialog(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      duration_minutes: 30,
      pass_percentage: 60,
      questions_per_attempt: 100,
      questions: []
    });
    setCurrentQuestion({
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'A'
    });
    setSelectedQuiz(null);
  };

  const QuizCard = ({ quiz }) => (
    <Card className="border-slate-200 shadow-soft hover:shadow-md transition-shadow" data-testid={`quiz-${quiz.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{quiz.name}</CardTitle>
            <p className="text-sm text-slate-500 mt-1">{quiz.description || 'No description'}</p>
          </div>
          <Badge className="bg-green-100 text-green-700">Active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 mb-4 text-sm">
          <div className="flex items-center gap-1 text-slate-600">
            <Clock className="w-4 h-4" />
            <span>{quiz.duration_minutes} mins</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <FileText className="w-4 h-4" />
            <span>{quiz.total_questions || 0} questions</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <Users className="w-4 h-4" />
            <span>{quiz.total_attempts || 0} attempts</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => copyExamLink(quiz.id)}
            data-testid={`copy-link-${quiz.id}`}
          >
            <Copy className="w-4 h-4 mr-1" /> Copy Link
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => showQRCode(quiz)}
            data-testid={`qr-code-${quiz.id}`}
          >
            <QrCode className="w-4 h-4 mr-1" /> QR Code
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => viewAttempts(quiz)}
          >
            <Eye className="w-4 h-4 mr-1" /> Attempts
          </Button>
          {canCreateQuiz && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openEdit(quiz)}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-700"
                onClick={() => handleDelete(quiz.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6" data-testid="quiz-exams-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Quiz Exams</h1>
          <p className="text-slate-600">Create and manage MCQ-based quiz exams</p>
        </div>
        {canCreateQuiz && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => { resetForm(); setImportDialog(true); }}
              data-testid="import-quiz-btn"
            >
              <Upload className="w-4 h-4 mr-2" /> Import from Excel/CSV
            </Button>
            <Button
              onClick={() => { resetForm(); setCreateDialog(true); }}
              className="bg-slate-900 hover:bg-slate-800"
              data-testid="create-quiz-btn"
            >
              <Plus className="w-4 h-4 mr-2" /> Create Quiz
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <p className="text-sm text-slate-600">Total Quizzes</p>
            <p className="text-2xl font-bold">{quizzes.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <p className="text-sm text-slate-600">Total Attempts</p>
            <p className="text-2xl font-bold text-blue-600">{attempts.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <p className="text-sm text-slate-600">Pass Rate</p>
            <p className="text-2xl font-bold text-green-600">
              {attempts.length > 0 
                ? `${Math.round(attempts.filter(a => a.passed).length / attempts.length * 100)}%`
                : '0%'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quizzes Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : quizzes.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center text-slate-500">
            No quiz exams created yet. {canCreateQuiz && 'Click "Create Quiz" to get started.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      )}

      {/* Create/Edit Quiz Dialog */}
      <Dialog open={createDialog || editDialog} onOpenChange={(open) => { 
        if (!open) { setCreateDialog(false); setEditDialog(false); resetForm(); }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editDialog ? 'Edit Quiz Exam' : 'Create Quiz Exam'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Exam Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., English Proficiency Test"
                  data-testid="quiz-name-input"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Description</Label>
                <textarea
                  className="w-full min-h-16 px-3 py-2 border border-slate-200 rounded-md text-sm"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the exam..."
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })}
                  min="5"
                  max="180"
                />
              </div>
              <div className="space-y-2">
                <Label>Pass Percentage (%)</Label>
                <Input
                  type="number"
                  value={formData.pass_percentage}
                  onChange={(e) => setFormData({ ...formData, pass_percentage: parseInt(e.target.value) || 60 })}
                  min="1"
                  max="100"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Questions per Attempt <span className="text-xs text-slate-500">(students see this many random questions from the bank)</span></Label>
                <Input
                  type="number"
                  value={formData.questions_per_attempt}
                  onChange={(e) => setFormData({ ...formData, questions_per_attempt: parseInt(e.target.value) || 100 })}
                  min="1"
                  max="1000"
                  data-testid="questions-per-attempt-input"
                />
              </div>
            </div>

            {/* Questions Section */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">Question Bank ({formData.questions.length} total; each student sees {Math.min(formData.questions_per_attempt || 100, formData.questions.length || formData.questions_per_attempt || 100)} random)</h3>
              
              {/* Add New Question Form */}
              <Card className="border-slate-200 mb-4">
                <CardContent className="pt-4 space-y-3">
                  <div className="space-y-2">
                    <Label>Question Text</Label>
                    <textarea
                      className="w-full min-h-16 px-3 py-2 border border-slate-200 rounded-md text-sm"
                      value={currentQuestion.question_text}
                      onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
                      placeholder="Enter your question..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Option A</Label>
                      <Input
                        value={currentQuestion.option_a}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_a: e.target.value })}
                        placeholder="Option A"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Option B</Label>
                      <Input
                        value={currentQuestion.option_b}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_b: e.target.value })}
                        placeholder="Option B"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Option C</Label>
                      <Input
                        value={currentQuestion.option_c}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_c: e.target.value })}
                        placeholder="Option C"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Option D</Label>
                      <Input
                        value={currentQuestion.option_d}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, option_d: e.target.value })}
                        placeholder="Option D"
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Correct Answer</Label>
                      <select
                        className="h-9 px-3 border border-slate-200 rounded-md text-sm"
                        value={currentQuestion.correct_answer}
                        onChange={(e) => setCurrentQuestion({ ...currentQuestion, correct_answer: e.target.value })}
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                    <Button
                      type="button"
                      onClick={addQuestion}
                      className="mt-5"
                      disabled={formData.questions.length >= 100}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Question
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Questions List */}
              {formData.questions.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {formData.questions.map((q, index) => (
                    <div key={index} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">Q{index + 1}: {q.question_text}</p>
                        <div className="text-xs text-slate-500 mt-1">
                          A: {q.option_a} | B: {q.option_b} | C: {q.option_c} | D: {q.option_d}
                        </div>
                        <Badge className="mt-1 bg-green-100 text-green-700 text-xs">
                          Correct: {q.correct_answer}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                        onClick={() => removeQuestion(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => { setCreateDialog(false); setEditDialog(false); resetForm(); }}>
                Cancel
              </Button>
              <Button 
                onClick={editDialog ? handleUpdate : handleCreate}
                className="bg-slate-900 hover:bg-slate-800"
                data-testid="save-quiz-btn"
              >
                {editDialog ? 'Update Quiz' : 'Create Quiz'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Attempts Dialog */}
      <Dialog open={viewAttemptsDialog} onOpenChange={setViewAttemptsDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exam Attempts: {selectedQuiz?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedAttempts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No attempts yet for this exam.
            </div>
          ) : (
            <div className="space-y-2">
              {selectedAttempts.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">{attempt.student_name || 'Unknown Student'}</p>
                    <p className="text-sm text-slate-500">Enrollment: {attempt.enrollment_number}</p>
                    <p className="text-xs text-slate-400">
                      {attempt.completed_at ? format(new Date(attempt.completed_at), 'dd MMM yyyy, HH:mm') : 'In progress'}
                    </p>
                  </div>
                  <div className="text-right">
                    {attempt.completed_at ? (
                      <>
                        <div className="flex items-center gap-2">
                          {attempt.passed ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" /> PASS
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700">
                              <XCircle className="w-3 h-3 mr-1" /> FAIL
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-semibold mt-1">
                          {attempt.score}/{attempt.total_questions} ({attempt.percentage}%)
                        </p>
                      </>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-700">In Progress</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrCodeDialog} onOpenChange={setQrCodeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Quiz QR Code
            </DialogTitle>
          </DialogHeader>
          
          {qrCodeData && (
            <div className="text-center space-y-4">
              <p className="text-slate-600 font-medium">{qrCodeData.examName}</p>
              
              <div className="flex justify-center">
                <img 
                  src={qrCodeData.qrCode} 
                  alt="Quiz QR Code" 
                  className="w-64 h-64 border rounded-lg shadow-sm"
                />
              </div>
              
              <p className="text-xs text-slate-500 break-all px-4">{qrCodeData.url}</p>
              
              <div className="flex gap-2 justify-center">
                <Button onClick={downloadQRCode} className="bg-slate-900 hover:bg-slate-800">
                  <Download className="w-4 h-4 mr-2" /> Download QR
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    navigator.clipboard.writeText(qrCodeData.url);
                    toast.success('Link copied!');
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" /> Copy Link
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Questions Dialog */}
      <Dialog open={importDialog} onOpenChange={setImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Questions from CSV/Excel
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Sample Format Download */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-blue-800">Download Sample Template</p>
                    <p className="text-sm text-blue-600">Fill in your questions and upload back</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={downloadSampleExcel} data-testid="sample-xlsx-btn">
                      <FileSpreadsheet className="w-4 h-4 mr-1" />
                      Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadSampleFormat} data-testid="sample-csv-btn">
                      <FileSpreadsheet className="w-4 h-4 mr-1" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Exam Details */}
            <div className="space-y-3">
              <div>
                <Label>Exam Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Python Programming Quiz"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })}
                  />
                </div>
                <div>
                  <Label>Pass Percentage</Label>
                  <Input
                    type="number"
                    value={formData.pass_percentage}
                    onChange={(e) => setFormData({ ...formData, pass_percentage: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </div>
              <div>
                <Label>Questions per Attempt <span className="text-xs text-slate-500">(each student sees this many random questions)</span></Label>
                <Input
                  type="number"
                  value={formData.questions_per_attempt}
                  onChange={(e) => setFormData({ ...formData, questions_per_attempt: parseInt(e.target.value) || 100 })}
                  min="1"
                  max="1000"
                  data-testid="import-questions-per-attempt-input"
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Upload Questions File (CSV or Excel)</Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                />
                {importFile ? (
                  <div className="space-y-2">
                    <FileSpreadsheet className="w-12 h-12 text-green-500 mx-auto" />
                    <p className="font-medium text-green-700">{importFile.name}</p>
                    <Button variant="outline" size="sm" onClick={() => setImportFile(null)}>
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto" />
                    <p className="text-slate-600">Drag and drop or click to select</p>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      Select File
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Format Instructions */}
            <Card className="bg-slate-50">
              <CardContent className="pt-4 text-sm">
                <p className="font-medium mb-2">CSV Format Instructions:</p>
                <ul className="list-disc list-inside text-slate-600 space-y-1">
                  <li>Columns: question_text, option_a, option_b, option_c, option_d, correct_answer</li>
                  <li>correct_answer should be: A, B, C, or D</li>
                  <li>First row should be the header</li>
                  <li>Enclose text with commas in quotes</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportDialog(false); setImportFile(null); }}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={importing || !importFile}>
              {importing ? 'Importing...' : 'Import & Create Quiz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuizExamsPage;
