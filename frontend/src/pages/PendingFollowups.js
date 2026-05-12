import React, { useState, useEffect } from 'react';
import { followupAPI } from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Clock, CheckCircle, Phone, PhoneOff, PhoneMissed, Calendar, History, MessageSquare, ArrowRight, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const OUTCOMES = [
  { value: 'Connected', label: 'Connected', icon: Phone, color: 'text-green-600 bg-green-50' },
  { value: 'Not Connected', label: 'Not Connected', icon: PhoneOff, color: 'text-red-600 bg-red-50' },
  { value: 'Busy', label: 'Busy', icon: PhoneMissed, color: 'text-orange-600 bg-orange-50' },
  { value: 'No Answer', label: 'No Answer', icon: PhoneMissed, color: 'text-yellow-600 bg-yellow-50' },
  { value: 'Switched Off', label: 'Switched Off', icon: PhoneOff, color: 'text-slate-600 bg-slate-50' },
  { value: 'Wrong Number', label: 'Wrong Number', icon: PhoneOff, color: 'text-red-600 bg-red-50' },
  { value: 'Callback Requested', label: 'Callback Requested', icon: Calendar, color: 'text-blue-600 bg-blue-50' },
];

const PendingFollowups = () => {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logDialog, setLogDialog] = useState(false);
  const [trailDialog, setTrailDialog] = useState(false);
  const [selectedFollowup, setSelectedFollowup] = useState(null);
  const [trailData, setTrailData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [logForm, setLogForm] = useState({
    outcome: '',
    notes: '',
    next_action: '',
    next_followup_date: ''
  });

  useEffect(() => {
    fetchFollowups();
  }, []);

  const fetchFollowups = async () => {
    try {
      const response = await followupAPI.getPending();
      setFollowups(response.data);
    } catch (error) {
      toast.error('Failed to fetch follow-ups');
    } finally {
      setLoading(false);
    }
  };

  const openLogDialog = (followup) => {
    setSelectedFollowup(followup);
    setLogForm({
      outcome: '',
      notes: '',
      next_action: '',
      next_followup_date: ''
    });
    setLogDialog(true);
  };

  const openTrailDialog = async (followup) => {
    setSelectedFollowup(followup);
    try {
      const response = await followupAPI.getLeadTrail(followup.lead_id);
      setTrailData(response.data);
      setTrailDialog(true);
    } catch (error) {
      toast.error('Failed to fetch follow-up trail');
    }
  };

  const handleLogSubmit = async () => {
    if (!logForm.outcome) {
      toast.error('Please select an outcome');
      return;
    }
    if (!logForm.notes.trim()) {
      toast.error('Please add notes about the call');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        followup_id: selectedFollowup.id,
        outcome: logForm.outcome,
        notes: logForm.notes,
        next_action: logForm.next_action || null,
        next_followup_date: logForm.next_followup_date ? new Date(logForm.next_followup_date).toISOString() : null
      };
      
      await followupAPI.logOutcome(selectedFollowup.id, data);
      toast.success('Follow-up logged successfully');
      setLogDialog(false);
      fetchFollowups();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to log follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickComplete = async (id) => {
    try {
      await followupAPI.updateStatus(id, 'Completed');
      toast.success('Follow-up marked as completed');
      fetchFollowups();
    } catch (error) {
      toast.error('Failed to update follow-up');
    }
  };

  const getOutcomeStyle = (outcome) => {
    const found = OUTCOMES.find(o => o.value === outcome);
    return found ? found.color : 'text-slate-600 bg-slate-50';
  };

  return (
    <div className="space-y-6" data-testid="pending-followups-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1 flex items-center gap-3">
            <Phone className="w-8 h-8 text-indigo-600" />
            Follow-ups
          </h1>
          <p className="text-slate-600">Track and log your follow-up calls</p>
        </div>
        <Button variant="outline" onClick={fetchFollowups}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-indigo-600">Total Pending</p>
            <p className="text-3xl font-bold text-indigo-700">{followups.length}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-orange-600">Overdue</p>
            <p className="text-3xl font-bold text-orange-700">
              {followups.filter(f => new Date(f.followup_date) < new Date()).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-green-600">Today</p>
            <p className="text-3xl font-bold text-green-700">
              {followups.filter(f => format(new Date(f.followup_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-blue-600">With Attempts</p>
            <p className="text-3xl font-bold text-blue-700">
              {followups.filter(f => (f.call_attempts || 0) > 0).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-600">Loading follow-ups...</p>
        </div>
      ) : followups.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
            <p className="text-slate-600">No pending follow-ups</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {followups.map((followup) => {
            const isOverdue = new Date(followup.followup_date) < new Date();
            const isToday = format(new Date(followup.followup_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            
            return (
              <Card 
                key={followup.id} 
                className={`border-slate-200 shadow-soft hover:shadow-lifted transition-shadow ${
                  isOverdue ? 'border-l-4 border-l-red-500' : 
                  isToday ? 'border-l-4 border-l-green-500' : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isOverdue ? 'bg-red-100' : isToday ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          <Phone className={`w-6 h-6 ${
                            isOverdue ? 'text-red-600' : isToday ? 'text-green-600' : 'text-blue-600'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{followup.lead_name}</h3>
                          <p className="text-sm text-slate-600 flex items-center gap-2">
                            {followup.lead_number}
                            <a href={`tel:${followup.lead_number}`} className="text-blue-600 hover:underline text-xs">
                              (Call)
                            </a>
                          </p>
                        </div>
                        {isOverdue && <Badge className="bg-red-100 text-red-700">Overdue</Badge>}
                        {isToday && !isOverdue && <Badge className="bg-green-100 text-green-700">Today</Badge>}
                      </div>
                      
                      <div className="ml-15 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="w-4 h-4" />
                          <span>{format(new Date(followup.followup_date), 'PPp')}</span>
                          {followup.reminder_time && (
                            <Badge variant="outline" className="ml-2">{followup.reminder_time}</Badge>
                          )}
                        </div>
                        
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-slate-700 mb-1">Note:</p>
                          <p className="text-sm text-slate-600">{followup.note}</p>
                        </div>
                        
                        {/* Call Attempts Info */}
                        {followup.call_attempts > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {followup.call_attempts} attempt(s)
                            </Badge>
                            {followup.last_outcome && (
                              <Badge className={getOutcomeStyle(followup.last_outcome)}>
                                Last: {followup.last_outcome}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs text-slate-500">
                          Created by {followup.created_by_name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => openLogDialog(followup)}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        data-testid={`log-followup-${followup.id}`}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Log Call
                      </Button>
                      <Button
                        onClick={() => openTrailDialog(followup)}
                        size="sm"
                        variant="outline"
                        data-testid={`trail-followup-${followup.id}`}
                      >
                        <History className="w-4 h-4 mr-2" />
                        View Trail
                      </Button>
                      <Button
                        onClick={() => handleQuickComplete(followup.id)}
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:bg-green-50"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Log Call Dialog */}
      <Dialog open={logDialog} onOpenChange={setLogDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-indigo-600" />
              Log Follow-up Call
            </DialogTitle>
          </DialogHeader>
          
          {selectedFollowup && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="font-medium">{selectedFollowup.lead_name}</p>
                <p className="text-sm text-slate-600">{selectedFollowup.lead_number}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Call Outcome *</Label>
                <Select value={logForm.outcome} onValueChange={(v) => setLogForm({...logForm, outcome: v})}>
                  <SelectTrigger data-testid="outcome-select">
                    <SelectValue placeholder="What happened?" />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTCOMES.map((outcome) => (
                      <SelectItem key={outcome.value} value={outcome.value}>
                        <div className="flex items-center gap-2">
                          <outcome.icon className={`w-4 h-4 ${outcome.color.split(' ')[0]}`} />
                          {outcome.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes *</Label>
                <Textarea
                  value={logForm.notes}
                  onChange={(e) => setLogForm({...logForm, notes: e.target.value})}
                  placeholder="What did you discuss? What did the student say?"
                  rows={3}
                  data-testid="notes-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Next Action</Label>
                <Input
                  value={logForm.next_action}
                  onChange={(e) => setLogForm({...logForm, next_action: e.target.value})}
                  placeholder="e.g., Send brochure, Call again, Schedule demo"
                  data-testid="next-action-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Schedule Next Follow-up</Label>
                <Input
                  type="datetime-local"
                  value={logForm.next_followup_date}
                  onChange={(e) => setLogForm({...logForm, next_followup_date: e.target.value})}
                  data-testid="next-followup-date"
                />
                <p className="text-xs text-slate-500">Leave empty if no follow-up needed</p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setLogDialog(false)}>Cancel</Button>
                <Button 
                  onClick={handleLogSubmit} 
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {submitting ? 'Saving...' : 'Save Log'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Follow-up Trail Dialog */}
      <Dialog open={trailDialog} onOpenChange={setTrailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Follow-up Trail
            </DialogTitle>
          </DialogHeader>
          
          {selectedFollowup && trailData && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-medium">{selectedFollowup.lead_name}</p>
                  <p className="text-sm text-slate-600">{selectedFollowup.lead_number}</p>
                </div>
                <div className="text-right text-sm">
                  <p>Total Follow-ups: <strong>{trailData.total_followups}</strong></p>
                  <p>Total Calls: <strong>{trailData.total_calls}</strong></p>
                </div>
              </div>

              <div className="space-y-3">
                {trailData.timeline.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No activity yet</p>
                ) : (
                  trailData.timeline.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`relative pl-8 pb-4 border-l-2 ${
                        idx === trailData.timeline.length - 1 ? 'border-transparent' : 'border-slate-200'
                      }`}
                    >
                      <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full ${
                        item.type === 'call_logged' ? 'bg-indigo-500' : 'bg-green-500'
                      }`} />
                      
                      <div className="bg-slate-50 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={item.type === 'call_logged' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}>
                            {item.type === 'call_logged' ? 'Call Logged' : 'Follow-up Created'}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {item.date ? format(new Date(item.date), 'dd MMM yyyy, h:mm a') : '-'}
                          </span>
                        </div>
                        
                        {item.type === 'call_logged' ? (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getOutcomeStyle(item.data.outcome)}>
                                {item.data.outcome}
                              </Badge>
                              {item.data.logged_by_name && (
                                <span className="text-xs text-slate-500">by {item.data.logged_by_name}</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-700">{item.data.notes}</p>
                            {item.data.next_action && (
                              <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" />
                                Next: {item.data.next_action}
                              </p>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-slate-700">{item.data.note}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              Scheduled: {item.data.followup_date ? format(new Date(item.data.followup_date), 'PPp') : '-'}
                            </p>
                            {item.data.created_by_name && (
                              <p className="text-xs text-slate-500">by {item.data.created_by_name}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendingFollowups;
