import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, RefreshCw } from 'lucide-react';

const SystemSettingsTab = ({ 
  onResetData,
  resetLoading
}) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-red-600">System Settings</h2>
      
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Reset System Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 font-medium mb-2">⚠️ Danger Zone</p>
            <p className="text-red-600 text-sm mb-4">
              This action will permanently delete ALL operational data from the system including:
            </p>
            <ul className="text-red-600 text-sm list-disc list-inside space-y-1 mb-4">
              <li>All leads and follow-ups</li>
              <li>All enrollments and student records</li>
              <li>All payments and financial data</li>
              <li>All expenses and audit logs</li>
              <li>All tasks and notifications</li>
              <li>All certificate requests</li>
              <li>All quiz attempts</li>
              <li>All users (except your admin account)</li>
            </ul>
            <p className="text-red-700 text-sm font-medium">
              This will NOT delete: Branches, Programs, Expense Categories, Lead Sources, Settings
            </p>
          </div>
          
          <Button 
            variant="destructive" 
            onClick={onResetData}
            disabled={resetLoading}
            className="w-full"
            data-testid="reset-data-btn"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {resetLoading ? 'Resetting...' : 'Reset All Operational Data'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Automated Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-700 font-medium mb-2">📅 Scheduled Jobs</p>
            <ul className="text-slate-600 text-sm space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <strong>Fee Reminders:</strong> Daily at 9:00 AM (7, 5, 3, 1 days before due date & on due date)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <strong>Birthday Wishes:</strong> Daily at 8:00 AM
              </li>
            </ul>
          </div>
          <p className="text-slate-500 text-sm">
            Note: WhatsApp messages will only be sent if the relevant event templates are configured in the WhatsApp Settings tab.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettingsTab;
