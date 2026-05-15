import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { studentAuthAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { GraduationCap, ArrowLeft, Lock, IdCard } from 'lucide-react';

const StudentLogin = () => {
  const navigate = useNavigate();
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!enrollmentNumber.trim() || !password.trim()) {
      toast.error('Please enter your enrollment number and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await studentAuthAPI.login(enrollmentNumber.trim(), password.trim());
      localStorage.setItem('student_token', res.data.access_token);
      localStorage.setItem('student', JSON.stringify(res.data.student));
      toast.success(`Welcome back, ${res.data.student?.name || 'Student'}!`);
      navigate('/student/dashboard');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 flex items-center justify-center p-4" data-testid="student-login-page">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4" data-testid="back-to-staff-login">
          <ArrowLeft className="w-3 h-3" />
          Back to staff login
        </Link>
        <Card className="border-slate-200 shadow-xl">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
              <GraduationCap className="w-7 h-7 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl">Student Portal</CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Log in with your enrollment number to access your course.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="enrollment_number">Enrollment Number</Label>
                <div className="relative">
                  <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="enrollment_number"
                    value={enrollmentNumber}
                    onChange={(e) => setEnrollmentNumber(e.target.value)}
                    placeholder="e.g. PBPTKE0001"
                    className="pl-9"
                    autoComplete="username"
                    data-testid="student-enrollment-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Same as your enrollment number"
                    className="pl-9"
                    autoComplete="current-password"
                    data-testid="student-password-input"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Tip: Your initial password is the <b>same as your enrollment number</b>.
                </p>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                data-testid="student-login-submit"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentLogin;
