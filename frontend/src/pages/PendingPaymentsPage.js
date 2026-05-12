import React, { useState, useEffect } from 'react';
import { paymentAPI, adminAPI, studentsAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Filter, Clock, AlertTriangle, Calendar, UserX } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const PendingPaymentsPage = () => {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    student_name: '',
    contact_number: '',
    branch_id: ''
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'Admin';
  const isBranchAdmin = user.role === 'Branch Admin';

  // Drop student dialog
  const [dropDialog, setDropDialog] = useState(false);
  const [dropTarget, setDropTarget] = useState(null);
  const [dropReason, setDropReason] = useState('');
  const [dropping, setDropping] = useState(false);

  const handleMarkDropped = async () => {
    if (!dropTarget) return;
    setDropping(true);
    try {
      await studentsAPI.updateStatus(dropTarget.enrollment_id, 'Dropped', dropReason || 'Student Dropped Program');
      toast.success(`${dropTarget.student_name} marked as Dropped`);
      setDropDialog(false);
      setDropTarget(null);
      setDropReason('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    } finally {
      setDropping(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pendingRes, branchesRes] = await Promise.all([
        paymentAPI.getPendingPayments(filters),
        isAdmin ? adminAPI.getBranches() : Promise.resolve({ data: [] })
      ]);
      setPendingPayments(pendingRes.data);
      setBranches(branchesRes.data);
    } catch (error) {
      toast.error('Failed to fetch pending payments');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    fetchData();
  };

  const clearFilters = () => {
    setFilters({
      start_date: '',
      end_date: '',
      student_name: '',
      contact_number: '',
      branch_id: ''
    });
  };

  const totalPending = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const overduePayments = pendingPayments.filter(p => p.is_overdue);
  const overdueAmount = overduePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const getDueDateBadge = (dueDate, isOverdue) => {
    const today = new Date();
    const due = new Date(dueDate);
    const daysDiff = differenceInDays(due, today);
    
    if (isOverdue) {
      return <Badge className="bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3 mr-1" /> Overdue</Badge>;
    } else if (daysDiff <= 3) {
      return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" /> Due Soon</Badge>;
    } else {
      return <Badge className="bg-blue-100 text-blue-700"><Calendar className="w-3 h-3 mr-1" /> Upcoming</Badge>;
    }
  };

  return (
    <div className="space-y-6" data-testid="pending-payments-page">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Pending Payments</h1>
        <p className="text-slate-600">Upcoming installments and overdue payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-yellow-700">Total Pending</span>
            </div>
            <p className="text-2xl font-bold text-yellow-700 mt-1">{pendingPayments.length}</p>
            <p className="text-sm text-yellow-600">₹{totalPending.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-700">Overdue</span>
            </div>
            <p className="text-2xl font-bold text-red-700 mt-1">{overduePayments.length}</p>
            <p className="text-sm text-red-600">₹{overdueAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-700">Upcoming</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 mt-1">{pendingPayments.length - overduePayments.length}</p>
            <p className="text-sm text-blue-600">₹{(totalPending - overdueAmount).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Due Date From</Label>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                data-testid="filter-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date To</Label>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                data-testid="filter-end-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Student Name</Label>
              <Input
                placeholder="Search by name..."
                value={filters.student_name}
                onChange={(e) => setFilters({ ...filters, student_name: e.target.value })}
                data-testid="filter-student-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input
                placeholder="Search by number..."
                value={filters.contact_number}
                onChange={(e) => setFilters({ ...filters, contact_number: e.target.value })}
                data-testid="filter-contact"
              />
            </div>
            {isAdmin && (
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={filters.branch_id} onValueChange={(v) => setFilters({ ...filters, branch_id: v === 'all' ? '' : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSearch} className="bg-slate-900 hover:bg-slate-800" data-testid="search-btn">
              <Search className="w-4 h-4 mr-2" /> Search
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Payments Table */}
      <Card className="border-slate-200 shadow-soft">
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Program</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Amount Due</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Due Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  {(isBranchAdmin || isAdmin) && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pendingPayments.map((payment, index) => (
                  <tr 
                    key={`${payment.enrollment_id}-${payment.installment_number || 'onetime'}-${index}`} 
                    className={`hover:bg-slate-50 ${payment.is_overdue ? 'bg-red-50' : ''}`}
                    data-testid={`pending-row-${index}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{payment.student_name}</p>
                      <p className="text-xs text-slate-500">{payment.student_email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">{payment.student_phone}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{payment.program_name}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {payment.type === 'installment' ? (
                        <span>
                          <Badge className="bg-purple-100 text-purple-700">Installment</Badge>
                          <span className="ml-2 font-medium">#{payment.installment_number}</span>
                          <span className="text-slate-500"> of {payment.total_installments}</span>
                        </span>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-700">One-Time</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-amber-600">₹{payment.amount?.toLocaleString()}</span>
                      {payment.type === 'one_time' && payment.total_paid > 0 && (
                        <p className="text-xs text-slate-500">
                          Paid: ₹{payment.total_paid?.toLocaleString()} / ₹{payment.total_fee?.toLocaleString()}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {payment.due_date ? format(new Date(payment.due_date), 'dd MMM yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {getDueDateBadge(payment.due_date, payment.is_overdue)}
                    </td>
                    {(isBranchAdmin || isAdmin) && (
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDropTarget(payment);
                            setDropReason('');
                            setDropDialog(true);
                          }}
                          className="text-xs h-7 text-red-600 border-red-300 hover:bg-red-50"
                          data-testid={`mark-dropped-${payment.enrollment_id}`}
                        >
                          <UserX className="w-3 h-3 mr-1" />
                          Mark Dropped
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {pendingPayments.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                {loading ? 'Loading...' : 'No pending payments found'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Drop Student Confirmation Dialog */}
      <Dialog open={dropDialog} onOpenChange={setDropDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <UserX className="w-5 h-5" />
              Mark Student as Dropped
            </DialogTitle>
          </DialogHeader>
          {dropTarget && (
            <div className="space-y-4">
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="font-medium">{dropTarget.student_name}</p>
                <p className="text-sm text-slate-600">{dropTarget.program_name}</p>
                <p className="text-sm text-slate-500">Pending: ₹{dropTarget.amount?.toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Input
                  placeholder="e.g., Student not interested, Financial issues..."
                  value={dropReason}
                  onChange={(e) => setDropReason(e.target.value)}
                  data-testid="drop-reason-input"
                />
              </div>
              <p className="text-xs text-slate-500">
                This will change the enrollment status to "Dropped" and remove the student from pending payments.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDropDialog(false)}>Cancel</Button>
                <Button 
                  onClick={handleMarkDropped} 
                  disabled={dropping}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  data-testid="confirm-drop-btn"
                >
                  {dropping ? 'Updating...' : 'Confirm Drop'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingPaymentsPage;
