import React, { useState, useEffect } from 'react';
import { expenseAPI, cashHandlingAPI, uploadAPI } from '@/api/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Banknote, Upload, Calendar, CheckCircle, Clock, Eye, Wallet, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Net Banking', 'Cheque'];

const FinancesPage = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isBranchAdmin = user.role === 'Branch Admin';
  const isFDE = user.role === 'Front Desk Executive';
  const canDeleteExpense = isBranchAdmin;
  
  // FDE starts with cash tab, others with expenses
  const [activeTab, setActiveTab] = useState(isFDE ? 'cash' : 'expenses');
  
  // Expenses State
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({
    category_id: '',
    name: '',
    amount: '',
    payment_mode: 'Cash',
    expense_date: new Date().toISOString().split('T')[0],
    remarks: ''
  });
  const [expensesLoading, setExpensesLoading] = useState(true);

  // Cash Handling State
  const [cashLoading, setCashLoading] = useState(true);
  const [todayCash, setTodayCash] = useState(null);
  const [cashHistory, setCashHistory] = useState([]);
  const [submitDialog, setSubmitDialog] = useState(false);
  const [viewReceiptDialog, setViewReceiptDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [depositReceiptUrl, setDepositReceiptUrl] = useState('');
  const [remarks, setRemarks] = useState('');
  const [manualTotal, setManualTotal] = useState('');

  // Check if within submission time window (4 PM - 5 PM)
  const currentHour = new Date().getHours();
  const isWithinSubmissionWindow = currentHour >= 16 && currentHour < 17;
  const canSubmitCash = isWithinSubmissionWindow || isBranchAdmin;

  useEffect(() => {
    // Only fetch expenses if not FDE
    if (!isFDE) {
      fetchExpensesData();
    }
    if (isFDE) {
      fetchTodayCash();
    }
    if (isBranchAdmin) {
      fetchCashHistory();
    }
  }, []);

  // Expenses Functions
  const fetchExpensesData = async () => {
    try {
      const [expensesRes, categoriesRes] = await Promise.all([
        expenseAPI.getExpenses(),
        expenseAPI.getCategories()
      ]);
      setExpenses(expensesRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      toast.error('Failed to fetch expenses data');
    } finally {
      setExpensesLoading(false);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      await expenseAPI.createExpense({
        ...expenseFormData,
        amount: parseFloat(expenseFormData.amount)
      });
      toast.success('Expense added successfully');
      setExpenseDialog(false);
      setExpenseFormData({
        category_id: '',
        name: '',
        amount: '',
        payment_mode: 'Cash',
        expense_date: new Date().toISOString().split('T')[0],
        remarks: ''
      });
      fetchExpensesData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add expense');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await expenseAPI.deleteExpense(expenseId);
      toast.success('Expense deleted successfully');
      fetchExpensesData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete expense');
    }
  };

  // Cash Handling Functions
  const fetchTodayCash = async () => {
    try {
      const response = await cashHandlingAPI.getToday();
      setTodayCash(response.data);
    } catch (error) {
      toast.error('Failed to fetch cash data');
    } finally {
      setCashLoading(false);
    }
  };

  const fetchCashHistory = async () => {
    setCashLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const response = await cashHandlingAPI.getHistory(params);
      setCashHistory(response.data);
    } catch (error) {
      toast.error('Failed to fetch cash handling history');
    } finally {
      setCashLoading(false);
    }
  };

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await uploadAPI.uploadFile(formData);
      setDepositReceiptUrl(response.data.url);
      toast.success('Receipt uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload receipt');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleCashSubmit = async () => {
    if (!depositReceiptUrl && !remarks) {
      toast.error('Please upload a receipt or add remarks');
      return;
    }
    setSubmitting(true);
    try {
      const params = {
        deposit_receipt_url: depositReceiptUrl || null,
        remarks: remarks || null
      };
      if (manualTotal && parseFloat(manualTotal) > 0) {
        params.manual_total = parseFloat(manualTotal);
      }
      await cashHandlingAPI.submit(params);
      toast.success('Cash handling record submitted successfully');
      setSubmitDialog(false);
      setDepositReceiptUrl('');
      setRemarks('');
      setManualTotal('');
      fetchTodayCash();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit record');
    } finally {
      setSubmitting(false);
    }
  };

  const openViewReceipt = (record) => {
    setSelectedRecord(record);
    setViewReceiptDialog(true);
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const thisMonthExpenses = expenses.filter(e => new Date(e.expense_date).getMonth() === new Date().getMonth()).reduce((sum, e) => sum + e.amount, 0);

  // Render Expenses Tab
  const renderExpensesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => setExpenseDialog(true)} className="bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-2" /> Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{totalExpenses.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{thisMonthExpenses.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{expenses.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-soft">
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Payment Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Remarks</th>
                  {canDeleteExpense && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">{format(new Date(expense.expense_date), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800">
                        {expense.category_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{expense.name}</td>
                    <td className="px-4 py-3 text-sm font-semibold">₹{expense.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{expense.payment_mode}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{expense.remarks || '-'}</td>
                    {canDeleteExpense && (
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteExpense(expense.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {expenses.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                {expensesLoading ? 'Loading...' : 'No expenses recorded yet'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render Cash Handling Tab (FDE View)
  const renderCashHandlingFDE = () => (
    <div className="space-y-6">
      {cashLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="w-6 h-6 text-green-600" />
                Today's Cash Collection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600 mb-4">
                ₹{(todayCash?.total_cash || 0).toLocaleString()}
              </div>
              <p className="text-sm text-slate-500 mb-4">
                {todayCash?.payments?.length || 0} cash payments received today
              </p>
              {todayCash?.record?.status === 'Deposited' ? (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle className="w-4 h-4 mr-1" /> Deposited
                </Badge>
              ) : canSubmitCash ? (
                <Button onClick={() => setSubmitDialog(true)} className="w-full bg-green-600 hover:bg-green-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Submit Deposit Record
                </Button>
              ) : (
                <div className="text-center">
                  <Badge variant="outline" className="text-orange-600 border-orange-300 mb-2">
                    <Clock className="w-4 h-4 mr-1" /> Submission Window: 4 PM - 5 PM
                  </Badge>
                  <p className="text-xs text-slate-500">Submit between 4 PM and 5 PM</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today's Cash Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {todayCash?.payments?.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {todayCash.payments.map((payment, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <span className="text-sm">{payment.student_name || 'Unknown'}</span>
                      <span className="font-medium text-green-600">₹{payment.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">No cash payments today</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  // Render Cash Handling Tab (Branch Admin View)
  const renderCashHandlingAdmin = () => (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button onClick={fetchCashHistory}>
              <Calendar className="w-4 h-4 mr-2" /> Apply Filter
            </Button>
            <Button variant="outline" onClick={() => { setStartDate(''); setEndDate(''); fetchCashHistory(); }}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cash Handling History</CardTitle>
        </CardHeader>
        <CardContent>
          {cashLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : cashHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Date</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Deposited</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Current Total</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Remarks</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {cashHistory.map((record, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm">
                        {record.date ? format(new Date(record.date), 'dd MMM yyyy') : '-'}
                      </td>
                      <td className="px-4 py-3 font-medium text-green-600">
                        ₹{(record.total_cash || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-blue-600">
                        ₹{(record.current_total || record.total_cash || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {record.status === 'Deposited' ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" /> Deposited
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            <Clock className="w-3 h-3 mr-1" /> Pending
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                        {record.remarks || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {record.deposit_receipt_url ? (
                          <Button size="sm" variant="ghost" onClick={() => openViewReceipt(record)}>
                            <Eye className="w-4 h-4 mr-1" /> View
                          </Button>
                        ) : (
                          <span className="text-sm text-slate-400">No receipt</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">No cash handling records found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6" data-testid="finances-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-green-600" />
          Finances
        </h1>
        <p className="text-slate-600">Manage expenses and cash handling</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full max-w-md bg-slate-100 ${isFDE ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {!isFDE && (
            <TabsTrigger value="expenses" className="flex items-center gap-2" data-testid="expenses-tab">
              <Wallet className="w-4 h-4" />
              Expenses
            </TabsTrigger>
          )}
          <TabsTrigger value="cash" className="flex items-center gap-2" data-testid="cash-handling-tab">
            <Banknote className="w-4 h-4" />
            Cash Handling
          </TabsTrigger>
        </TabsList>

        {!isFDE && (
          <TabsContent value="expenses" className="mt-6">
            {renderExpensesTab()}
          </TabsContent>
        )}

        <TabsContent value="cash" className="mt-6">
          {isFDE ? renderCashHandlingFDE() : renderCashHandlingAdmin()}
        </TabsContent>
      </Tabs>

      {/* Add Expense Dialog */}
      <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={expenseFormData.category_id} onValueChange={(value) => setExpenseFormData({ ...expenseFormData, category_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expense Name *</Label>
              <Input
                value={expenseFormData.name}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, name: e.target.value })}
                placeholder="Office supplies"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  value={expenseFormData.amount}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                  placeholder="5000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Mode *</Label>
                <Select value={expenseFormData.payment_mode} onValueChange={(value) => setExpenseFormData({ ...expenseFormData, payment_mode: value })}>
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
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={expenseFormData.expense_date}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, expense_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <textarea
                className="w-full min-h-20 px-3 py-2 border border-slate-200 rounded-md"
                value={expenseFormData.remarks}
                onChange={(e) => setExpenseFormData({ ...expenseFormData, remarks: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setExpenseDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800">Add Expense</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submit Cash Dialog */}
      <Dialog open={submitDialog} onOpenChange={setSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Cash Deposit Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <p className="text-sm text-slate-500">System Calculated Cash</p>
              <p className="text-2xl font-bold text-green-600">₹{(todayCash?.total_cash || 0).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <Label>Actual Cash Deposited (if different)</Label>
              <Input
                type="number"
                value={manualTotal}
                onChange={(e) => setManualTotal(e.target.value)}
                placeholder={`Enter amount if different from ₹${(todayCash?.total_cash || 0).toLocaleString()}`}
              />
              <p className="text-xs text-slate-500">Leave empty to use system calculated amount</p>
            </div>
            <div className="space-y-2">
              <Label>Upload Bank Deposit Receipt</Label>
              <Input type="file" accept="image/*" onChange={handleReceiptUpload} disabled={uploadingReceipt} />
              {depositReceiptUrl && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" /> Receipt uploaded
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Remarks (Optional)</Label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any notes about the cash deposit..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setSubmitDialog(false)}>Cancel</Button>
              <Button onClick={handleCashSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Record'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Receipt Dialog */}
      <Dialog open={viewReceiptDialog} onOpenChange={setViewReceiptDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Deposit Receipt - {selectedRecord?.date}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedRecord?.deposit_receipt_url && (
              <div className="flex justify-center">
                <img
                  src={selectedRecord.deposit_receipt_url}
                  alt="Deposit Receipt"
                  className="max-h-96 rounded-lg border"
                />
              </div>
            )}
            {selectedRecord?.remarks && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <Label className="text-xs text-slate-500">Remarks</Label>
                <p className="text-sm">{selectedRecord.remarks}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinancesPage;
