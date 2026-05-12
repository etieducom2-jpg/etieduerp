import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { quizAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Clock, CheckCircle, XCircle, ArrowRight, ArrowLeft } from 'lucide-react';

const PublicExamPage = () => {
  const { examId } = useParams();
  const [step, setStep] = useState('enrollment'); // enrollment, exam, result
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [attemptId, setAttemptId] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExam();
  }, [examId]);

  useEffect(() => {
    if (step === 'exam' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmit(); // Auto-submit when time runs out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  const fetchExam = async () => {
    try {
      const response = await quizAPI.getPublicQuiz(examId);
      setExam(response.data);
    } catch (error) {
      toast.error('Failed to load exam. It may not exist or is inactive.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async () => {
    if (!enrollmentNumber.trim()) {
      toast.error('Please enter your enrollment number');
      return;
    }

    try {
      const response = await quizAPI.startAttempt(examId, { 
        exam_id: examId,
        enrollment_number: enrollmentNumber 
      });
      setAttemptId(response.data.attempt_id);
      setStudentName(response.data.student_name || '');
      // Attach the randomly-picked questions returned by the server to the exam state
      setExam(prev => ({
        ...prev,
        questions: response.data.questions || [],
        total_questions: response.data.total_questions || (response.data.questions || []).length,
      }));
      setTimeLeft((response.data.duration_minutes || exam.duration_minutes) * 60);
      setStep('exam');
      toast.success('Exam started! Good luck!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start exam');
    }
  };

  const handleAnswerChange = (questionNumber, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionNumber]: answer
    }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const response = await quizAPI.submitAttempt(attemptId, { answers });
      setResult(response.data);
      setStep('result');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit exam');
      setSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading exam...</div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Exam Not Found</h2>
            <p className="text-slate-600">This exam does not exist or is no longer active.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 1: Enter Enrollment Number
  if (step === 'enrollment') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{exam.name}</CardTitle>
            {exam.description && (
              <p className="text-slate-600 text-sm mt-2">{exam.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center gap-4 text-sm text-slate-600 mb-4">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{exam.duration_minutes} minutes</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{exam.total_questions} questions</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Enter Your Enrollment Number</Label>
              <Input
                value={enrollmentNumber}
                onChange={(e) => setEnrollmentNumber(e.target.value.toUpperCase())}
                placeholder="e.g., PBPTKLE0001"
                className="text-center font-mono"
                data-testid="enrollment-input"
              />
            </div>
            
            <Button
              onClick={handleStartExam}
              className="w-full bg-slate-900 hover:bg-slate-800"
              data-testid="start-exam-btn"
            >
              Start Exam
            </Button>
            
            <p className="text-xs text-center text-slate-500">
              Make sure you have a stable internet connection. The exam will auto-submit when time runs out.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Take Exam
  if (step === 'exam') {
    const question = exam.questions[currentQuestion];
    const totalQuestions = exam.questions.length;
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="min-h-screen bg-slate-100">
        {/* Header with Timer */}
        <div className="bg-slate-900 text-white px-4 py-3 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="font-semibold">{exam.name}</h1>
              {studentName && <p className="text-sm text-slate-300">{studentName}</p>}
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-white border-white">
                {answeredCount}/{totalQuestions} answered
              </Badge>
              <div className={`flex items-center gap-2 font-mono text-lg ${timeLeft < 60 ? 'text-red-400 animate-pulse' : ''}`}>
                <Clock className="w-5 h-5" />
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4">
          {/* Question Navigator */}
          <div className="mb-4 flex flex-wrap gap-2">
            {exam.questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQuestion(i)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  i === currentQuestion
                    ? 'bg-slate-900 text-white'
                    : answers[exam.questions[i].question_number]
                    ? 'bg-green-500 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Question Card */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge className="bg-slate-100 text-slate-700">
                  Question {currentQuestion + 1} of {totalQuestions}
                </Badge>
              </div>
              <CardTitle className="text-lg mt-2">{question.question_text}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {['A', 'B', 'C', 'D'].map((option) => (
                <label
                  key={option}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    answers[question.question_number] === option
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${question.question_number}`}
                    value={option}
                    checked={answers[question.question_number] === option}
                    onChange={() => handleAnswerChange(question.question_number, option)}
                    className="sr-only"
                  />
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                    answers[question.question_number] === option
                      ? 'bg-white text-slate-900'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {option}
                  </span>
                  <span className="flex-1">{question[`option_${option.toLowerCase()}`]}</span>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            
            {currentQuestion === totalQuestions - 1 ? (
              <Button
                onClick={handleSubmit}
                className="bg-green-600 hover:bg-green-700"
                disabled={submitting}
                data-testid="submit-exam-btn"
              >
                {submitting ? 'Submitting...' : 'Submit Exam'}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentQuestion(prev => Math.min(totalQuestions - 1, prev + 1))}
              >
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Result
  if (step === 'result' && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg text-center">
          <CardContent className="pt-8 pb-6">
            {result.passed ? (
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
            ) : (
              <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
            )}
            
            <h1 className={`text-4xl font-bold mb-2 ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
              {result.result}
            </h1>
            
            <p className="text-slate-600 mb-6">
              {result.passed 
                ? 'Congratulations! You have passed the exam.'
                : 'Unfortunately, you did not pass. Better luck next time!'}
            </p>

            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-sm text-slate-500">Score</p>
                  <p className="text-2xl font-bold">{result.score}/{result.total_questions}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Percentage</p>
                  <p className="text-2xl font-bold">{result.percentage}%</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-sm text-slate-500">Time Taken</p>
                <p className="font-semibold">
                  {Math.floor(result.time_taken_seconds / 60)} min {result.time_taken_seconds % 60} sec
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => window.close()}
              className="w-full"
            >
              Close Window
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

export default PublicExamPage;
