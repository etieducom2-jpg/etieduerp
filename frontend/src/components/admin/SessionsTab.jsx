import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';

const SessionsTab = ({ 
  sessions, 
  sessionsLoading,
  onAddSession, 
  onDeleteSession 
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Academic Sessions</h2>
        <Button onClick={onAddSession} className="bg-slate-900 hover:bg-slate-800" data-testid="add-session-btn">
          <Plus className="w-4 h-4 mr-2" /> Add Session
        </Button>
      </div>
      
      <Card className="border-slate-200">
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Session</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Year</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sessionsLoading ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-500">Loading...</td></tr>
              ) : sessions.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-500">No sessions found. Click "Add Session" to create one.</td></tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.value} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium">{session.label}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{session.value}</td>
                    <td className="px-4 py-3">
                      <Badge className={session.is_custom ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}>
                        {session.is_custom ? 'Custom' : 'Default'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {session.is_custom && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteSession(parseInt(session.value))}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
      
      <p className="text-sm text-slate-500">
        Note: Default sessions are auto-generated from 2016 to the current year. Custom sessions can be added for future years.
      </p>
    </div>
  );
};

export default SessionsTab;
