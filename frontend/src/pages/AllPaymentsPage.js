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
      const receiptData = response.data;
      printReceipt(receiptData);
    } catch (error) {
      toast.error('Failed to generate receipt');
    }
  };

  const printReceipt = (receiptData) => {
    const printWindow = window.open('', '', 'height=1000,width=800');
    const logoUrl = 'https://etieducom.com/wp-content/uploads/2024/03/eti-educom-logo.png';
    
    const nextDueDate = new Date();
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    nextDueDate.setDate(10);
    const dueDateStr = nextDueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    
    const pendingAmount = (receiptData?.total_fee || 0) - (receiptData?.total_paid || 0);
    const paymentDateStr = receiptData?.payment_date ? new Date(receiptData.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    
    const termsAndConditions = [
      'Fee once paid is non-refundable and non-transferable.',
      'Students must maintain 75% attendance for certification.',
      'Course schedule subject to change with prior notice.',
      'Cheque bounce penalty: ₹500.'
    ];
    
    const receiptHTML = `
      <div class="receipt-copy">
        <div class="copy-label">COPY_TYPE</div>
        
        <!-- Header with Logo -->
        <div class="header">
          <div class="logo-section">
            <img src="${logoUrl}" alt="ETI Educom" class="logo" onerror="this.style.display='none'"/>
          </div>
          <div class="institute-info">
            <h1>ETI EDUCOM</h1>
            <p class="tagline">Professional Training & Skill Development</p>
            <p class="address">${receiptData?.branch_name || 'ETI Educom'}</p>
          </div>
          <div class="receipt-no-section">
            <p class="receipt-label">RECEIPT</p>
            <p class="receipt-num">${receiptData?.receipt_number || 'N/A'}</p>
            <p class="receipt-date">${paymentDateStr}</p>
          </div>
        </div>
        
        <!-- Student & Fee Details Side by Side -->
        <div class="main-content">
          <div class="left-section">
            <table class="info-table">
              <tr>
                <td class="label">Enrollment ID</td>
                <td class="value">${receiptData?.enrollment_id || 'N/A'}</td>
              </tr>
              <tr>
                <td class="label">Student Name</td>
                <td class="value">${receiptData?.student_name || ''}</td>
              </tr>
              <tr>
                <td class="label">Phone</td>
                <td class="value">${receiptData?.phone || ''}</td>
              </tr>
              <tr>
                <td class="label">Course</td>
                <td class="value">${receiptData?.program_name || ''}</td>
              </tr>
              <tr>
                <td class="label">Payment Mode</td>
                <td class="value">${receiptData?.payment_mode || ''}</td>
              </tr>
            </table>
          </div>
          
          <div class="right-section">
            <table class="fee-table">
              <tr>
                <td class="label">Total Course Fee</td>
                <td class="amount">₹${(receiptData?.total_fee || 0).toLocaleString('en-IN')}/-</td>
              </tr>
              <tr class="highlight-row">
                <td class="label"><strong>Amount Paid</strong></td>
                <td class="amount highlight">₹${(receiptData?.amount || 0).toLocaleString('en-IN')}/-</td>
              </tr>
              <tr>
                <td class="label">Total Paid (Till Date)</td>
                <td class="amount">₹${(receiptData?.total_paid || 0).toLocaleString('en-IN')}/-</td>
              </tr>
              <tr class="${pendingAmount > 0 ? 'pending-row' : 'paid-row'}">
                <td class="label">Balance</td>
                <td class="amount">${pendingAmount > 0 ? '₹' + pendingAmount.toLocaleString('en-IN') + '/-' : 'NIL'}</td>
              </tr>
              ${pendingAmount > 0 ? `
              <tr>
                <td class="label">Next Due Date</td>
                <td class="amount">${dueDateStr}</td>
              </tr>
              ` : ''}
            </table>
          </div>
        </div>
        
        <!-- Terms -->
        <div class="terms-section">
          <strong>Terms:</strong> ${termsAndConditions.join(' | ')}
        </div>
        
        <!-- Signatures -->
        <div class="signatures">
          <div class="signature">
            <div class="sign-line"></div>
            <p>Student Signature</p>
          </div>
          <div class="signature authorized">
            <div class="sign-line"></div>
            <p>Authorized Signatory</p>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for choosing ETI Educom! | Computer Generated Receipt</p>
        </div>
      </div>
    `;
    
    const cssStyles = `
      @page { 
        size: A4; 
        margin: 8mm; 
      }
      * { 
        box-sizing: border-box; 
        margin: 0; 
        padding: 0; 
      }
      body { 
        font-family: 'Segoe UI', Arial, sans-serif; 
        font-size: 10px; 
        line-height: 1.3; 
        color: #1a202c;
        background: white;
      }
      .receipt-copy { 
        border: 2px solid #1a365d; 
        padding: 12px 15px; 
        margin-bottom: 8px; 
        position: relative; 
        background: white;
        page-break-inside: avoid;
        height: 48%;
      }
      .copy-label { 
        position: absolute; 
        top: -1px; 
        right: 15px; 
        background: #1a365d; 
        color: white; 
        padding: 3px 15px; 
        font-size: 9px; 
        font-weight: bold; 
        border-radius: 0 0 5px 5px;
        letter-spacing: 1px;
      }
      
      /* Header */
      .header { 
        display: flex; 
        align-items: center; 
        border-bottom: 2px solid #1a365d; 
        padding-bottom: 8px; 
        margin-bottom: 10px; 
      }
      .logo-section { 
        width: 60px; 
        margin-right: 10px; 
      }
      .logo { 
        width: 55px; 
        height: auto; 
      }
      .institute-info { 
        flex: 1; 
      }
      .institute-info h1 { 
        font-size: 18px; 
        color: #1a365d; 
        letter-spacing: 2px; 
        margin-bottom: 1px; 
      }
      .institute-info .tagline { 
        font-size: 9px; 
        color: #4a5568; 
        font-style: italic; 
      }
      .institute-info .address { 
        font-size: 9px; 
        color: #718096; 
      }
      .receipt-no-section {
        text-align: right;
        border: 1px solid #1a365d;
        padding: 5px 10px;
        border-radius: 5px;
        background: #f7fafc;
      }
      .receipt-label {
        font-size: 8px;
        color: #718096;
        letter-spacing: 1px;
      }
      .receipt-num {
        font-size: 12px;
        font-weight: bold;
        color: #1a365d;
      }
      .receipt-date {
        font-size: 9px;
        color: #4a5568;
      }
      
      /* Main Content - Side by Side */
      .main-content {
        display: flex;
        gap: 15px;
        margin-bottom: 8px;
      }
      .left-section {
        flex: 1;
      }
      .right-section {
        flex: 1;
        border: 1px solid #1a365d;
        border-radius: 5px;
        overflow: hidden;
      }
      
      /* Info Table */
      .info-table { 
        width: 100%; 
        border-collapse: collapse; 
      }
      .info-table td { 
        padding: 4px 6px; 
        border: 1px solid #e2e8f0; 
        font-size: 9px;
      }
      .info-table .label { 
        background: #f7fafc; 
        color: #4a5568; 
        width: 35%; 
        font-weight: 500;
      }
      .info-table .value { 
        font-weight: 600; 
        color: #1a202c; 
      }
      
      /* Fee Table */
      .fee-table { 
        width: 100%; 
        border-collapse: collapse; 
      }
      .fee-table td { 
        padding: 5px 8px; 
        border-bottom: 1px solid #e2e8f0; 
        font-size: 9px;
      }
      .fee-table .label { 
        color: #4a5568; 
        width: 55%; 
      }
      .fee-table .amount { 
        text-align: right; 
        font-weight: 600; 
        font-size: 10px; 
      }
      .fee-table .highlight-row { 
        background: #c6f6d5; 
      }
      .fee-table .highlight { 
        color: #22543d; 
        font-size: 11px; 
      }
      .fee-table .pending-row { 
        background: #fed7d7; 
      }
      .fee-table .pending-row td { 
        color: #c53030; 
      }
      .fee-table .paid-row { 
        background: #c6f6d5; 
      }
      .fee-table .paid-row td { 
        color: #22543d; 
      }
      
      /* Terms */
      .terms-section { 
        font-size: 7px; 
        color: #744210; 
        background: #fffaf0;
        padding: 4px 8px;
        border: 1px solid #fbd38d;
        border-radius: 3px;
        margin-bottom: 8px;
      }
      
      /* Signatures */
      .signatures { 
        display: flex; 
        justify-content: space-between; 
        margin-top: 15px;
      }
      .signature { 
        text-align: center; 
        width: 35%; 
      }
      .sign-line { 
        border-top: 1px solid #2d3748; 
        margin-bottom: 3px; 
        width: 100%;
      }
      .signature p { 
        font-size: 8px; 
        color: #4a5568; 
      }
      
      /* Footer */
      .footer { 
        text-align: center; 
        margin-top: 5px; 
        padding-top: 5px; 
        border-top: 1px dashed #cbd5e0; 
      }
      .footer p { 
        font-size: 8px; 
        color: #718096; 
      }
      
      /* Divider */
      .divider { 
        border-top: 2px dashed #a0aec0; 
        margin: 5px 0; 
        position: relative;
      }
      .divider::after {
        content: '✂ CUT HERE';
        position: absolute;
        left: 50%;
        top: -6px;
        transform: translateX(-50%);
        background: white;
        padding: 0 10px;
        color: #a0aec0;
        font-size: 8px;
        letter-spacing: 1px;
      }
      
      @media print {
        body { background: white; }
        .receipt-copy { border-color: #000; }
      }
    `;
    
    printWindow.document.write('<!DOCTYPE html><html><head>');
    printWindow.document.write('<title>Fee Receipt - ETI Educom</title>');
    printWindow.document.write('<meta charset="UTF-8">');
    printWindow.document.write('<style>' + cssStyles + '</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(receiptHTML.replace('COPY_TYPE', 'STUDENT COPY'));
    printWindow.document.write('<div class="divider"></div>');
    printWindow.document.write(receiptHTML.replace('COPY_TYPE', 'CENTER COPY'));
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    setTimeout(() => { 
      printWindow.focus();
      printWindow.print(); 
    }, 500);
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
