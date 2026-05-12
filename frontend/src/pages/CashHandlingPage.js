import React, { useState, useEffect } from 'react';
import { cashHandlingAPI, uploadAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Banknote, Upload, Image, Calendar, CheckCircle, Clock, Eye } from 'lucide-react';
import { format } from 'date-fns';

const CashHandlingPage = () => {
  const [loading, setLoading] = useState(true);
  const [todayCash, setTodayCash] = useState(null);
  const [history, setHistory] = useState([]);
  const [submitDialog, setSubmitDialog] = useState(false);
  const [viewReceiptDialog, setViewReceiptDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Filter state for Branch Admin
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Submit form state
  const [depositReceiptUrl, setDepositReceiptUrl] = useState('');
  const [remarks, setRemarks] = useState('');
  const [manualTotal, setManualTotal] = useState('');
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isFDE = user.role === 'Front Desk Executive';
  const isBranchAdmin = user.role === 'Branch Admin' || user.role === 'Admin';

  // Check if within submission time window (4 PM - 5 PM)
  const currentHour = new Date().getHours();
  const isWithinSubmissionWindow = currentHour >= 16 && currentHour < 17; // 4 PM to 5 PM
  const canSubmit = isWithinSubmissionWindow || isBranchAdmin; // Branch Admin can always view

  useEffect(() => {
    if (isFDE) {
      fetchTodayCash();
    }
    if (isBranchAdmin) {
      fetchHistory();
    }
  }, []);

  const fetchTodayCash = async () => {
    try {
      const response = await cashHandlingAPI.getToday();
      setTodayCash(response.data);
    } catch (error) {
      toast.error('Failed to fetch cash data');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const response = await cashHandlingAPI.getHistory(params);
      setHistory(response.data);
    } catch (error) {
      toast.error('Failed to fetch cash handling history');
    } finally {
      setLoading(false);
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

  const handleSubmit = async () => {
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
      // Add manual total if entered
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

  // FDE View - Today's Cash
  if (isFDE) {
    return (
      <div className="space-y-6" data-testid="cash-handling-page">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Cash Handling</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Today's Cash Card */}
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
                ) : canSubmit ? (
                  <Button onClick={() => setSubmitDialog(true)} className="w-full bg-green-600 hover:bg-green-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Submit Deposit Record
                  </Button>
                ) : (
                  <div className="text-center">
                    <Badge variant="outline" className="text-orange-600 border-orange-300 mb-2">
                      <Clock className="w-4 h-4 mr-1" /> Submission Window: 4 PM - 5 PM
                    </Badge>
                    <p className="text-xs text-slate-500">You can submit the deposit record between 4 PM and 5 PM only</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment List */}
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

        {/* Submit Dialog */}
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
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    disabled={uploadingReceipt}
                  />
                </div>
                {depositReceiptUrl && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Receipt uploaded
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
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Record'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Branch Admin View - History with filters
  return (
    <div className="space-y-6" data-testid="cash-handling-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Cash Handling Records</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={fetchHistory}>
              <Calendar className="w-4 h-4 mr-2" />
              Apply Filter
            </Button>
            <Button variant="outline" onClick={() => { setStartDate(''); setEndDate(''); fetchHistory(); }}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Handling History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : history.length > 0 ? (
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
                  {history.map((record, idx) => (
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
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openViewReceipt(record)}
                          >
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

export default CashHandlingPage;
