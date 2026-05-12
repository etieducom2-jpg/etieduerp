import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet } from 'lucide-react';

const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Net Banking', 'Cheque'];

const PaymentDialog = ({
  open,
  onOpenChange,
  selectedStudent,
  paymentForm,
  setPaymentForm,
  installments,
  onInstallmentSelect,
  onRecordPayment,
  savingPayment
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-600" />
            Record Fee Payment
          </DialogTitle>
        </DialogHeader>
        
        {selectedStudent && (
          <div className="space-y-4">
            {/* Student Info */}
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="font-medium">{selectedStudent.student_name}</p>
              <p className="text-sm text-slate-500">{selectedStudent.enrollment_id}</p>
              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200">
                <div>
                  <p className="text-xs text-slate-500">Total Fee</p>
                  <p className="font-bold text-slate-800">₹{(selectedStudent.final_fee || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Paid</p>
                  <p className="font-bold text-green-600">₹{(selectedStudent.total_paid || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Pending</p>
                  <p className="font-bold text-amber-600">₹{((selectedStudent.final_fee || 0) - (selectedStudent.total_paid || 0)).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Installment Selection */}
            {installments.length > 0 && (
              <div className="space-y-2">
                <Label>Select Installment</Label>
                <Select 
                  value={paymentForm.installment_number} 
                  onValueChange={onInstallmentSelect}
                >
                  <SelectTrigger data-testid="installment-select">
                    <SelectValue placeholder="Choose installment" />
                  </SelectTrigger>
                  <SelectContent>
                    {installments.map((inst) => (
                      <SelectItem 
                        key={inst.installment_number} 
                        value={inst.installment_number.toString()}
                        disabled={inst.is_paid}
                      >
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>Installment {inst.installment_number}</span>
                          <span className="font-semibold">₹{inst.amount.toLocaleString()}</span>
                          {inst.is_paid && <span className="text-green-600 text-xs">(Paid)</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="Enter amount"
                data-testid="payment-amount"
              />
              <p className="text-xs text-slate-500">
                Max: ₹{((selectedStudent.final_fee || 0) - (selectedStudent.total_paid || 0)).toLocaleString()}
              </p>
            </div>

            {/* Payment Mode */}
            <div className="space-y-2">
              <Label>Payment Mode *</Label>
              <Select 
                value={paymentForm.payment_mode} 
                onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_mode: v })}
              >
                <SelectTrigger data-testid="payment-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                data-testid="payment-date"
              />
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label>Remarks (Optional)</Label>
              <Input
                value={paymentForm.remarks}
                onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                placeholder="Any additional notes..."
                data-testid="payment-remarks"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={onRecordPayment}
                disabled={savingPayment}
                className="bg-green-600 hover:bg-green-700"
                data-testid="save-payment-btn"
              >
                {savingPayment ? 'Saving...' : 'Save Payment'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;
