import React, { useState, useEffect } from 'react';
import { examsAPI } from '@/api/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, GraduationCap, Phone, Mail, Calendar, Search, CheckCircle, Clock, XCircle, Gift, RefreshCw, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';

const InternationalExamsPage = () => {
  const [activeTab, setActiveTab] = useState('book');
  
  // Book Exam State
  const [exams, setExams] = useState([]);
  const [bookingDialog, setBookingDialog] = useState(false);
  const [examsLoading, setExamsLoading] = useState(true);
  const [formData, setFormData] = useState({
    student_name: '',
    student_phone: '',
    student_email: '',
    exam_id: '',
    exam_date: '',
    notes: ''
  });

  // Manage Bookings State
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isBranchAdmin = user.role === 'Branch Admin';
  const isSuperAdmin = user.role === 'Admin';
  const isCounsellor = user.role === 'Counsellor';
  const canMarkPaid = isBranchAdmin || isSuperAdmin;

  useEffect(() => {
    fetchExams();
    fetchBookings();
  }, []);

  // Fetch exam types
  const fetchExams = async () => {
    try {
      const response = await examsAPI.getTypes();
      setExams(response.data);
    } catch (error) {
      toast.error('Failed to fetch exam types');
    } finally {
      setExamsLoading(false);
    }
  };

  // Fetch bookings
  const fetchBookings = async () => {
    try {
      const response = await examsAPI.getBookings();
      setBookings(response.data);
    } catch (error) {
      toast.error('Failed to fetch bookings');
    } finally {
      setBookingsLoading(false);
    }
  };

  // Handle new booking submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.exam_id) {
      toast.error('Please select an exam');
      return;
    }

    try {
      await examsAPI.createBooking(formData);
      toast.success('Exam booking created successfully!');
      setBookingDialog(false);
      setFormData({
        student_name: '',
        student_phone: '',
        student_email: '',
        exam_id: '',
        exam_date: '',
        notes: ''
      });
      // Refresh bookings and switch to bookings tab
      fetchBookings();
      setActiveTab('bookings');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create booking');
    }
  };

  // Handle status change
  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await examsAPI.updateBookingStatus(bookingId, newStatus);
      
      if (newStatus === 'Completed') {
        toast.success('Exam marked as completed. Counsellor incentive (10%) has been credited.');
      } else if (newStatus === 'Cancelled') {
        toast.success('Exam cancelled. Refund is now pending.');
      } else {
        toast.success('Status updated successfully');
      }
      
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    }
  };

  // Handle refund processed
  const handleMarkRefundProcessed = async (bookingId) => {
    try {
      await examsAPI.markRefundProcessed(bookingId);
      toast.success('Refund marked as processed');
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process refund');
    }
  };

  // Handle mark incentive as paid
  const handleMarkIncentivePaid = async (booking) => {
    const bookingId = booking?.id || booking?.booking_id;
    if (!bookingId) {
      toast.error('Cannot identify this booking. Please refresh the page and try again.');
      return;
    }
    try {
      const res = await examsAPI.markIncentivePaid(bookingId);
      toast.success(`Incentive released: ₹${(res?.data?.incentive_amount || booking.counsellor_incentive || 0).toLocaleString()}`);
      fetchBookings();
    } catch (error) {
      const detail = error.response?.data?.detail || 'Failed to mark incentive as paid';
      toast.error(detail);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending': return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'Confirmed': return <Badge className="bg-blue-100 text-blue-700"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case 'Completed': return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'Cancelled': return <Badge className="bg-red-100 text-red-700"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesSearch = 
      b.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.booking_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.student_phone?.includes(searchTerm) ||
      b.exam_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'Pending').length,
    confirmed: bookings.filter(b => b.status === 'Confirmed').length,
    completed: bookings.filter(b => b.status === 'Completed').length,
    revenue: bookings.filter(b => b.status !== 'Cancelled').reduce((sum, b) => sum + (b.exam_price || 0), 0)
  };

  const selectedExam = exams.find(e => e.id === formData.exam_id);

  // Render Book New Exam Tab
  const renderBookExamTab = () => (
    <div className="space-y-6">
      {/* Available Exams */}
      <Card className="border-slate-200 shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Available Exams
          </CardTitle>
          <Button 
            onClick={() => setBookingDialog(true)} 
            className="bg-slate-900 hover:bg-slate-800"
            data-testid="new-booking-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> New Booking
          </Button>
        </CardHeader>
        <CardContent>
          {examsLoading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : exams.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No exams available. Please contact Super Admin to add exam types.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exams.map((exam) => (
                <Card key={exam.id} className="border-slate-200 hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <h3 className="font-semibold text-lg">{exam.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">{exam.description || 'No description'}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-2xl font-bold text-green-600">₹{exam.price?.toLocaleString()}</span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setFormData({ ...formData, exam_id: exam.id });
                          setBookingDialog(true);
                        }}
                      >
                        Book Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Render Manage Bookings Tab
  const renderManageBookingsTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <p className="text-sm text-slate-600">Total Bookings</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <p className="text-sm text-yellow-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <p className="text-sm text-blue-600">Confirmed</p>
            <p className="text-2xl font-bold text-blue-600">{stats.confirmed}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <p className="text-sm text-green-600">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <p className="text-sm text-slate-600">Total Revenue</p>
            <p className="text-2xl font-bold">₹{stats.revenue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, ID, phone, or exam..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-bookings"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Confirmed">Confirmed</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bookings Table */}
      <Card className="border-slate-200 shadow-soft">
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Booking ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Exam</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Exam Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Incentive/Refund</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50" data-testid={`booking-row-${booking.id}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium text-blue-600">
                        {booking.booking_id || booking.id?.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{booking.student_name}</p>
                      <p className="text-xs text-slate-500">{booking.student_phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{booking.exam_name}</Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      ₹{booking.exam_price?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {booking.exam_date || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(booking.status)}
                    </td>
                    <td className="px-4 py-3">
                      {booking.status === 'Completed' && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Gift className="w-3 h-3 text-green-600" />
                            <span className="text-xs text-green-600 font-medium">
                              ₹{booking.counsellor_incentive || Math.round(booking.exam_price * 0.10)} incentive
                            </span>
                          </div>
                          {booking.incentive_status === 'Paid' ? (
                            <Badge className="text-xs bg-emerald-100 text-emerald-700" data-testid={`incentive-status-${booking.id}`}>
                              {isCounsellor ? 'Earned' : 'Released'}
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Badge className="text-xs bg-yellow-100 text-yellow-700">
                                {booking.incentive_status === 'Earned' ? 'Earned' : 'Pending'}
                              </Badge>
                              {canMarkPaid && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkIncentivePaid(booking)}
                                  className="text-xs h-6 px-2 text-green-700 border-green-300 hover:bg-green-50"
                                  data-testid={`mark-incentive-paid-${booking.id || booking.booking_id}`}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Mark Paid
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {booking.status === 'Cancelled' && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 text-orange-600" />
                            <span className="text-xs text-orange-600 font-medium">
                              ₹{booking.refund_amount || booking.exam_price} refund
                            </span>
                          </div>
                          <Badge className={`text-xs ${booking.refund_status === 'Processed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {booking.refund_status || 'Pending'}
                          </Badge>
                        </div>
                      )}
                      {(booking.status === 'Pending' || booking.status === 'Confirmed') && (
                        <span className="text-xs text-slate-400">10% on completion</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <Select
                          value={booking.status}
                          onValueChange={(v) => handleStatusChange(booking.id, v)}
                          disabled={booking.status === 'Completed'}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending">Pending</SelectItem>
                            <SelectItem value="Confirmed">Confirmed</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {/* Refund action for Branch Admin */}
                        {isBranchAdmin && booking.status === 'Cancelled' && booking.refund_status !== 'Processed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkRefundProcessed(booking.id)}
                            className="text-xs h-7"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Mark Refunded
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredBookings.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                {bookingsLoading ? 'Loading...' : 'No bookings found'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="international-exams-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-blue-600" />
          International Exams
        </h1>
        <p className="text-slate-600">Book and manage international exam bookings</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-100">
          <TabsTrigger value="book" className="flex items-center gap-2" data-testid="book-exam-tab">
            <Plus className="w-4 h-4" />
            Book New Exam
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2" data-testid="manage-bookings-tab">
            <ClipboardList className="w-4 h-4" />
            Bookings ({bookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="book" className="mt-6">
          {renderBookExamTab()}
        </TabsContent>

        <TabsContent value="bookings" className="mt-6">
          {renderManageBookingsTab()}
        </TabsContent>
      </Tabs>

      {/* Booking Dialog */}
      <Dialog open={bookingDialog} onOpenChange={setBookingDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Book International Exam</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Select Exam *</Label>
              <Select value={formData.exam_id} onValueChange={(v) => setFormData({ ...formData, exam_id: v })}>
                <SelectTrigger data-testid="exam-select">
                  <SelectValue placeholder="Choose an exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name} - ₹{exam.price?.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedExam && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>{selectedExam.name}</strong> - ₹{selectedExam.price?.toLocaleString()}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Student Name *</Label>
              <Input
                value={formData.student_name}
                onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                placeholder="Enter student name"
                required
                data-testid="student-name-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input
                  value={formData.student_phone}
                  onChange={(e) => setFormData({ ...formData, student_phone: e.target.value })}
                  placeholder="Phone number"
                  required
                  data-testid="student-phone-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.student_email}
                  onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                  placeholder="Email address"
                  data-testid="student-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preferred Exam Date</Label>
              <Input
                type="date"
                value={formData.exam_date}
                onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                data-testid="exam-date-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                className="w-full min-h-20 px-3 py-2 border border-slate-200 rounded-md text-sm"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBookingDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
                Create Booking
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InternationalExamsPage;
