import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

const ReceiptDialog = ({
  open,
  onOpenChange,
  receiptData,
  onPrintReceipt
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Payment Successful!</span>
            <Button onClick={onPrintReceipt} className="bg-slate-900 hover:bg-slate-800" data-testid="print-receipt-btn">
              <Printer className="w-4 h-4 mr-2" /> Print Receipt
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        {receiptData && (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-sm text-green-600">Amount Received</p>
              <p className="text-3xl font-bold text-green-700">₹{receiptData.amount?.toLocaleString()}</p>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-mono font-medium">{receiptData.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-medium">{receiptData.student_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Mode:</span>
                <span>{receiptData.payment_mode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Paid:</span>
                <span className="font-medium text-green-600">₹{receiptData.total_paid?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pending:</span>
                <span className="font-medium text-amber-600">₹{receiptData.pending?.toLocaleString()}</span>
              </div>
            </div>
            <Button 
              className="w-full" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptDialog;
