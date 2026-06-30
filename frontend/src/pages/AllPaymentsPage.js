import React, { useState, useEffect } from 'react';
import { paymentAPI, adminAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Filter, CreditCard, Trash2, Edit2, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { printFeeReceipt } from '@/utils/printFeeReceipt';

const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Net Banking', 'Cheque'];

const AllPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    payment_mode: '',
    payment_date: '',
    remarks: ''
  });
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    student_name: '',
    contact_number: '',
    payment_mode: '',
    branch_id: ''
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'Admin';
  const isBranchAdmin = user.role === 'Branch Admin';
  const canModify = isBranchAdmin;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [paymentsRes, branchesRes] = await Promise.all([
        paymentAPI.getAllPayments(filters),
        isAdmin ? adminAPI.getBranches() : Promise.resolve({ data: [] })
      ]);
      setPayments(paymentsRes.data);
      setBranches(branchesRes.data);
    } catch (error) {
      toast.error('Failed to fetch payments');
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
      payment_mode: '',
      branch_id: ''
    });
  };

  const handleDelete = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    
    try {
      await paymentAPI.deletePayment(paymentId);
      toast.success('Payment deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete payment');
    }
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setEditForm({
      amount: payment.amount?.toString() || '',
      payment_mode: payment.payment_mode || '',
      payment_date: payment.payment_date ? payment.payment_date.split('T')[0] : '',
      remarks: payment.remarks || ''
    });
    setEditDialog(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await paymentAPI.updatePayment(editingPayment.id, {
        amount: parseFloat(editForm.amount),
        payment_mode: editForm.payment_mode,
        payment_date: editForm.payment_date,
        remarks: editForm.remarks
      });
      toast.success('Payment updated successfully');
      setEditDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update payment');
    }
  };

  const handlePrintReceipt = async (payment) => {
    try {
      const response = await paymentAPI.generateReceipt(payment.id);
      printFeeReceipt(response.data);
    } catch (error) {
      toast.error('Failed to generate receipt');
    }
  };


  const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const getPaymentModeColor = (mode) => {
    switch (mode) {
      case 'Cash': return 'bg-green-100 text-green-700';
      case 'Card': return 'bg-blue-100 text-blue-700';
      case 'UPI': return 'bg-purple-100 text-purple-700';
      case 'Net Banking': return 'bg-indigo-100 text-indigo-700';
      case 'Cheque': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6" data-testid="all-payments-page">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">All Payments</h1>
        <p className="text-slate-600">View and search all collected payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700">Total Payments</span>
            </div>
            <p className="text-2xl font-bold text-green-700 mt-1">{payments.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-700">Total Amount Collected</span>
            </div>
            <p className="text-2xl font-bold text-blue-700 mt-1">₹{totalAmount.toLocaleString()}</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                data-testid="filter-start-date"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
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
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={filters.payment_mode} onValueChange={(v) => setFilters({ ...filters, payment_mode: v === 'all' ? '' : v })}>
                <SelectTrigger data-testid="filter-mode">
                  <SelectValue placeholder="All Modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  {PAYMENT_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Payments Table */}
      <Card className="border-slate-200 shadow-soft">
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Receipt #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Program</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Installment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50" data-testid={`payment-row-${payment.id}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">{payment.receipt_number || payment.id?.slice(0, 8).toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {payment.payment_date ? format(new Date(payment.payment_date), 'dd MMM yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{payment.student_name}</p>
                      <p className="text-xs text-slate-500">{payment.student_email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">{payment.student_phone}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{payment.program_name}</Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-600">
                      ₹{payment.amount?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getPaymentModeColor(payment.payment_mode)}>
                        {payment.payment_mode}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {payment.installment_number ? `#${payment.installment_number}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {/* Print Receipt Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrintReceipt(payment)}
                          title="Print Receipt"
                          data-testid={`print-receipt-${payment.id}`}
                        >
                          <Printer className="w-4 h-4 text-green-600" />
                        </Button>
                        {canModify && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(payment)}
                              data-testid={`edit-payment-${payment.id}`}
                            >
                              <Edit2 className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(payment.id)}
                              data-testid={`delete-payment-${payment.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payments.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                {loading ? 'Loading...' : 'No payments found'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Payment Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Mode</Label>
              <Select value={editForm.payment_mode} onValueChange={(v) => setEditForm({ ...editForm, payment_mode: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={editForm.payment_date}
                onChange={(e) => setEditForm({ ...editForm, payment_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Input
                value={editForm.remarks}
                onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                placeholder="Optional remarks..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
                Update Payment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllPaymentsPage;
