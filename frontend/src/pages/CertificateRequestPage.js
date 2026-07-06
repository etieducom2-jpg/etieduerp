import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Search, CheckCircle, FileText, ArrowLeft, GraduationCap, AlertCircle, Clock } from 'lucide-react';
import { certificateAPI } from '@/api/api';

const CertificateRequestPage = () => {
  const [step, setStep] = useState(1); // 1: Enter enrollment, 2: Select courses & fill details, 3: Success
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState({}); // { enrollmentId: { selected: bool, start_date, end_date, training_mode, training_hours } }
  const [contactInfo, setContactInfo] = useState({ email: '', phone: '' });
  const [submittedCertificates, setSubmittedCertificates] = useState([]);

  const handleFetchEnrollment = async () => {
    if (!enrollmentNumber.trim()) {
      toast.error('Please enter your enrollment number');
      return;
    }

    setLoading(true);
    try {
      const response = await certificateAPI.getEnrollmentInfo(enrollmentNumber);
      setStudentData(response.data);
      
      // Pre-fill contact info if available
      setContactInfo({
        email: response.data.email || '',
        phone: response.data.phone || ''
      });
      
      // Initialize selected courses state — pre-fill start_date with the
      // student's enrollment date so it isn't blank by default.
      const initialSelection = {};
      response.data.courses.forEach(course => {
        const enrolIso = (course.enrollment_date || '').substring(0, 10);
        initialSelection[course.enrollment_id] = {
          selected: false,
          start_date: enrolIso || '',
          end_date: '',
          training_mode: 'Offline',
          training_hours: ''
        };
      });
      setSelectedCourses(initialSelection);
      
      setStep(2);
      toast.success('Student found! Select the courses for certificate.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Enrollment not found');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseToggle = (enrollmentId) => {
    setSelectedCourses(prev => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        selected: !prev[enrollmentId].selected
      }
    }));
  };

  const handleCourseDataChange = (enrollmentId, field, value) => {
    setSelectedCourses(prev => ({
      ...prev,
      [enrollmentId]: {
        ...prev[enrollmentId],
        [field]: value
      }
    }));
  };

  const getSelectedCount = () => {
    return Object.values(selectedCourses).filter(c => c.selected).length;
  };

  const validateForm = () => {
    if (!contactInfo.email || !contactInfo.phone) {
      toast.error('Please enter email and phone number');
      return false;
    }

    const selected = Object.entries(selectedCourses).filter(([_, data]) => data.selected);
    
    if (selected.length === 0) {
      toast.error('Please select at least one course');
      return false;
    }

    for (const [enrollmentId, data] of selected) {
      if (!data.start_date || !data.end_date) {
        const course = studentData.courses.find(c => c.enrollment_id === enrollmentId);
        toast.error(`Please enter start and end date for ${course?.program_name || enrollmentId}`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    const results = [];
    
    try {
      const selected = Object.entries(selectedCourses).filter(([_, data]) => data.selected);
      
      for (const [enrollmentId, data] of selected) {
        try {
          const response = await certificateAPI.submitRequest({
            enrollment_number: enrollmentId,
            email: contactInfo.email,
            phone: contactInfo.phone,
            program_start_date: data.start_date,
            program_end_date: data.end_date,
            training_mode: data.training_mode,
            training_hours: data.training_hours ? parseInt(data.training_hours) : null
          });
          
          const course = studentData.courses.find(c => c.enrollment_id === enrollmentId);
          results.push({
            success: true,
            enrollmentId,
            programName: course?.program_name,
            certificateId: response.data.certificate_id
          });
        } catch (error) {
          const course = studentData.courses.find(c => c.enrollment_id === enrollmentId);
          results.push({
            success: false,
            enrollmentId,
            programName: course?.program_name,
            error: error.response?.data?.detail || 'Failed to submit'
          });
        }
      }
      
      setSubmittedCertificates(results);
      setStep(3);
      
      const successCount = results.filter(r => r.success).length;
      if (successCount === results.length) {
        toast.success(`All ${successCount} certificate request(s) submitted successfully!`);
      } else if (successCount > 0) {
        toast.warning(`${successCount} of ${results.length} requests submitted. Some failed.`);
      } else {
        toast.error('All certificate requests failed');
      }
    } catch (error) {
      toast.error('An error occurred while submitting requests');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setEnrollmentNumber('');
    setStudentData(null);
    setSelectedCourses({});
    setContactInfo({ email: '', phone: '' });
    setSubmittedCertificates([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="https://etieducom.com/wp-content/uploads/2024/03/eti-educom-logo.png" 
            alt="ETI Educom" 
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-white">Certificate Request Portal</h1>
          <p className="text-slate-400">ETI Educom - Request your course completion certificate</p>
        </div>

        {/* Step 1: Enter Enrollment Number */}
        {step === 1 && (
          <Card className="bg-white/95 backdrop-blur shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                Find Your Enrollment
              </CardTitle>
              <CardDescription>
                Enter your enrollment ID to fetch your details and courses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="enrollment">Enrollment Number *</Label>
                <Input
                  id="enrollment"
                  placeholder="e.g., PBPTKE0001"
                  value={enrollmentNumber}
                  onChange={(e) => setEnrollmentNumber(e.target.value.toUpperCase())}
                  className="text-lg"
                  data-testid="enrollment-number-input"
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchEnrollment()}
                />
                <p className="text-xs text-slate-500">
                  You can find this on your enrollment receipt or fee receipt
                </p>
              </div>
              <Button 
                onClick={handleFetchEnrollment} 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
                data-testid="fetch-enrollment-btn"
              >
                {loading ? 'Searching...' : 'Find My Enrollment'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Courses & Fill Details */}
        {step === 2 && studentData && (
          <Card className="bg-white/95 backdrop-blur shadow-2xl">
            <CardHeader>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setStep(1)}
                className="w-fit -ml-2 mb-2"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Request Certificates
              </CardTitle>
              <CardDescription>
                Select courses and provide details for each certificate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Student Details (Read-only) */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 text-sm mb-3">Student Details</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-500">Name:</span>
                      <p className="font-semibold text-slate-900">{studentData.student_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Branch:</span>
                      <p className="font-semibold text-slate-900">{studentData.branch_name}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="font-medium text-slate-900">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={contactInfo.email}
                        onChange={(e) => setContactInfo({...contactInfo, email: e.target.value})}
                        required
                        data-testid="email-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        placeholder="9876543210"
                        value={contactInfo.phone}
                        onChange={(e) => setContactInfo({...contactInfo, phone: e.target.value})}
                        required
                        data-testid="phone-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Course Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-900">Select Courses ({studentData.courses.length} found)</h3>
                    <span className="text-sm text-blue-600 font-medium">
                      {getSelectedCount()} selected
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {studentData.courses.map((course) => {
                      const notCompleted = !course.course_completed;
                      // Duplicate requests are allowed — the only hard block is unpaid fee
                      const isDisabled = !course.fee_cleared;
                      const courseData = selectedCourses[course.enrollment_id] || {};
                      
                      return (
                        <div 
                          key={course.enrollment_id}
                          className={`border rounded-lg p-4 transition-all ${
                            courseData.selected 
                              ? 'border-blue-500 bg-blue-50/50' 
                              : isDisabled 
                                ? 'border-slate-200 bg-slate-50 opacity-60' 
                                : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={`course-${course.enrollment_id}`}
                              checked={courseData.selected || false}
                              onCheckedChange={() => !isDisabled && handleCourseToggle(course.enrollment_id)}
                              disabled={isDisabled}
                              className="mt-1"
                              data-testid={`course-checkbox-${course.enrollment_id}`}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-blue-600" />
                                <label 
                                  htmlFor={`course-${course.enrollment_id}`}
                                  className={`font-semibold ${isDisabled ? 'text-slate-500' : 'text-slate-900 cursor-pointer'}`}
                                >
                                  {course.program_name}
                                </label>
                              </div>
                              <div className="text-sm text-slate-500 mt-1">
                                <span>Enrollment: {course.enrollment_id}</span>
                                {course.program_duration && <span className="ml-3">Duration: {course.program_duration}</span>}
                              </div>
                              
                              {/* Status Badges */}
                              {!course.fee_cleared && (
                                <div className="flex items-center gap-1 mt-2 text-red-600 text-sm" data-testid={`pending-fee-${course.enrollment_id}`}>
                                  <AlertCircle className="w-4 h-4" />
                                  <span>Pending Fee: ₹{course.pending_fee?.toLocaleString('en-IN')} — fee must be cleared before requesting</span>
                                </div>
                              )}
                              {course.fee_cleared && notCompleted && (
                                <div className="flex items-center gap-1 mt-2 text-amber-600 text-sm" data-testid={`course-not-completed-${course.enrollment_id}`}>
                                  <Clock className="w-4 h-4" />
                                  <span>Course not yet marked complete by trainer (you can still request — admin will verify)</span>
                                </div>
                              )}
                              {course.course_completed && course.fee_cleared && !course.certificate_requested && (
                                <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Course completed — ready for certificate</span>
                                </div>
                              )}
                              {course.certificate_requested && (
                                <div className="flex items-center gap-1 mt-2 text-blue-600 text-sm">
                                  <Clock className="w-4 h-4" />
                                  <span>An earlier certificate is {course.certificate_status} — you can still raise another request if needed.</span>
                                </div>
                              )}
                              
                              {/* Course-specific form fields (shown when selected) */}
                              {courseData.selected && (
                                <div className="mt-4 pt-4 border-t border-blue-200 space-y-3">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Start Date *</Label>
                                      <Input
                                        type="date"
                                        value={courseData.start_date || ''}
                                        onChange={(e) => handleCourseDataChange(course.enrollment_id, 'start_date', e.target.value)}
                                        required
                                        className="h-9"
                                        data-testid={`start-date-${course.enrollment_id}`}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">End Date *</Label>
                                      <Input
                                        type="date"
                                        value={courseData.end_date || ''}
                                        onChange={(e) => handleCourseDataChange(course.enrollment_id, 'end_date', e.target.value)}
                                        required
                                        className="h-9"
                                        data-testid={`end-date-${course.enrollment_id}`}
                                      />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Training Mode</Label>
                                      <Select
                                        value={courseData.training_mode || 'Offline'}
                                        onValueChange={(value) => handleCourseDataChange(course.enrollment_id, 'training_mode', value)}
                                      >
                                        <SelectTrigger className="h-9">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Offline">Offline</SelectItem>
                                          <SelectItem value="Online">Online</SelectItem>
                                          <SelectItem value="Hybrid">Hybrid</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Training Hours</Label>
                                      <Input
                                        type="number"
                                        placeholder="e.g., 120"
                                        value={courseData.training_hours || ''}
                                        onChange={(e) => handleCourseDataChange(course.enrollment_id, 'training_hours', e.target.value)}
                                        className="h-9"
                                        data-testid={`training-hours-${course.enrollment_id}`}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={loading || getSelectedCount() === 0}
                  data-testid="submit-request-btn"
                >
                  {loading 
                    ? 'Submitting...' 
                    : `Submit ${getSelectedCount()} Certificate Request${getSelectedCount() > 1 ? 's' : ''}`
                  }
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <Card className="bg-white/95 backdrop-blur shadow-2xl">
            <CardContent className="pt-8 pb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">
                {submittedCertificates.filter(r => r.success).length > 0 
                  ? 'Requests Submitted!' 
                  : 'Submission Complete'
                }
              </h2>
              <p className="text-slate-600 mb-6 text-center">
                {submittedCertificates.filter(r => r.success).length} of {submittedCertificates.length} certificate request(s) submitted successfully.
              </p>
              
              {/* Results List */}
              <div className="space-y-3 mb-6">
                {submittedCertificates.map((result, index) => (
                  <div 
                    key={index}
                    className={`p-4 rounded-lg ${
                      result.success 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}`}>
                          {result.programName}
                        </p>
                        <p className="text-sm text-slate-500">{result.enrollmentId}</p>
                      </div>
                      {result.success ? (
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Certificate ID</p>
                          <p className="font-mono font-bold text-green-700">{result.certificateId}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-red-600">{result.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-sm text-slate-500 mb-4 text-center">
                Our team will review your request(s) and you will receive a WhatsApp notification 
                once your certificate(s) are ready for download.
              </p>
              
              <Button 
                onClick={resetForm}
                variant="outline"
                className="w-full"
              >
                Submit Another Request
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-slate-500 text-sm mt-6">
          &copy; {new Date().getFullYear()} ETI Educom. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default CertificateRequestPage;
