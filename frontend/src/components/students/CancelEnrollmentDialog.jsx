import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const CancelEnrollmentDialog = ({
  open,
  onOpenChange,
  cancelReason,
  setCancelReason,
  onConfirmCancel
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Enrollment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to cancel this enrollment? This action cannot be undone.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for cancellation</label>
            <textarea
              className="w-full min-h-20 px-3 py-2 border border-slate-200 rounded-md"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter reason for cancellation..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="destructive" onClick={onConfirmCancel}>
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CancelEnrollmentDialog;
