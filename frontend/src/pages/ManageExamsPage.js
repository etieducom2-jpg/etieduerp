import React, { useState, useEffect } from 'react';
import { examsAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, GraduationCap, CheckCircle, Clock, XCircle, Gift, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const ManageExamsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isBranchAdmin = user.role === 'Branch Admin';

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await examsAPI.getBookings();
      setBookings(response.data);
    } catch (error) {
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      await examsAPI.updateBookingStatus(bookingId, newStatus);
      
      // Show appropriate message based on status
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

  const handleMarkRefundProcessed = async (bookingId) => {
    try {
      await examsAPI.markRefundProcessed(bookingId);
      toast.success('Refund marked as processed');
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process refund');
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

  return (
    <div className="space-y-6" data-testid="manage-exams-page">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Manage Exams</h1>
        <p className="text-slate-600">View and manage international exam bookings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                        <div className="flex items-center gap-1">
                          <Gift className="w-3 h-3 text-green-600" />
                          <span className="text-xs text-green-600 font-medium">
                            ₹{booking.counsellor_incentive || Math.round(booking.exam_price * 0.10)} earned
                          </span>
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
                      {booking.status === 'Pending' || booking.status === 'Confirmed' ? (
                        <span className="text-xs text-slate-400">10% on completion</span>
                      ) : null}
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
                {loading ? 'Loading...' : 'No bookings found'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageExamsPage;
