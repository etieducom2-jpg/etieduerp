import React, { useState, useEffect } from 'react';
import { batchAPI, adminAPI, studentsAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Users, Plus, GraduationCap, Clock, Calendar, Edit, Trash2, UserPlus, UserMinus, BookOpen } from 'lucide-react';

const BatchManagementPage = () => {
  const [batches, setBatches] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [trainerStats, setTrainerStats] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [batchDialog, setBatchDialog] = useState(false);
  const [editBatch, setEditBatch] = useState(null);
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [viewStudentsDialog, setViewStudentsDialog] = useState(false);

  const [batchForm, setBatchForm] = useState({
    name: '',
    program_id: '',
    trainer_id: '',
    start_date: '',
    end_date: '',
    timing: '',
    max_students: 30
  });

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [saving, setSaving] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isBranchAdmin = user.role === 'Branch Admin' || user.role === 'Admin';
  const canEdit = user.role === 'Branch Admin' || user.role === 'Admin';
  const canAssign = user.role === 'Branch Admin' || user.role === 'Admin' || user.role === 'Front Desk Executive';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [batchRes, trainerRes, programRes, studentRes] = await Promise.all([
        batchAPI.getAll(),
        batchAPI.getTrainers(),
        adminAPI.getPrograms(),
        studentsAPI.getAll()
      ]);
      setBatches(batchRes.data);
      setTrainers(trainerRes.data);
      setPrograms(programRes.data);
      setStudents(studentRes.data.filter(s => s.status === 'Active'));

      if (isBranchAdmin) {
        const statsRes = await batchAPI.getTrainerStats();
        setTrainerStats(statsRes.data);
      }
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setBatchForm({
      name: '',
      program_id: '',
      trainer_id: '',
      start_date: '',
      end_date: '',
      timing: '',
      max_students: 30
    });
    setEditBatch(null);
  };

  const openCreateBatch = () => {
    resetForm();
    setBatchDialog(true);
  };

  const openEditBatch = (batch) => {
    setEditBatch(batch);
    setBatchForm({
      name: batch.name,
      program_id: batch.program_id,
      trainer_id: batch.trainer_id,
      start_date: batch.start_date || '',
      end_date: batch.end_date || '',
      timing: batch.timing || '',
      max_students: batch.max_students || 30
    });
    setBatchDialog(true);
  };

  const handleSaveBatch = async () => {
    if (!batchForm.name || !batchForm.program_id || !batchForm.trainer_id) {
      toast.error('Please fill required fields');
      return;
    }

    setSaving(true);
    try {
      if (editBatch) {
        await batchAPI.update(editBatch.id, batchForm);
        toast.success('Batch updated');
      } else {
        await batchAPI.create(batchForm);
        toast.success('Batch created');
      }
      setBatchDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save batch');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBatch = async (batch) => {
    if (!window.confirm(`Delete batch "${batch.name}"?`)) return;
    try {
      await batchAPI.delete(batch.id);
      toast.success('Batch deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete batch');
    }
  };

  const openAssignStudent = (batch) => {
    setSelectedBatch(batch);
    setSelectedStudentId('');
    setAssignDialog(true);
  };

  const handleAssignStudent = async () => {
    if (!selectedStudentId) {
      toast.error('Please select a student');
      return;
    }

    setSaving(true);
    try {
      await batchAPI.assignStudent(selectedBatch.id, { enrollment_id: selectedStudentId });
      toast.success('Student assigned to batch');
      setAssignDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign student');
    } finally {
      setSaving(false);
    }
  };

  const openViewStudents = async (batch) => {
    setSelectedBatch(batch);
    try {
      const res = await batchAPI.getStudents(batch.id);
      setBatchStudents(res.data);
      setViewStudentsDialog(true);
    } catch (error) {
      toast.error('Failed to load students');
    }
  };

  const handleRemoveStudent = async (enrollmentId) => {
    if (!window.confirm('Remove this student from batch?')) return;
    try {
      await batchAPI.removeStudent(selectedBatch.id, enrollmentId);
      toast.success('Student removed from batch');
      const res = await batchAPI.getStudents(selectedBatch.id);
      setBatchStudents(res.data);
      fetchData();
    } catch (error) {
      toast.error('Failed to remove student');
    }
  };

  const stats = {
    totalBatches: batches.length,
    activeBatches: batches.filter(b => b.status === 'Active').length,
    totalTrainers: trainers.length,
    totalAssignments: batches.reduce((sum, b) => sum + (b.student_count || 0), 0)
  };

  return (
    <div className="space-y-6" data-testid="batch-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Batch Management</h1>
          <p className="text-slate-600">Manage batches and assign students to trainers</p>
        </div>
        {canEdit && (
          <Button onClick={openCreateBatch} data-testid="create-batch-btn">
            <Plus className="w-4 h-4 mr-2" />
            Create Batch
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-slate-600">Total Batches</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalBatches}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <p className="text-sm text-green-600">Active Batches</p>
            <p className="text-2xl font-bold text-green-600">{stats.activeBatches}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <p className="text-sm text-purple-600">Trainers</p>
            <p className="text-2xl font-bold text-purple-600">{stats.totalTrainers}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <p className="text-sm text-orange-600">Total Assignments</p>
            <p className="text-2xl font-bold text-orange-600">{stats.totalAssignments}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="batches" className="w-full">
        <TabsList>
          <TabsTrigger value="batches">Batches</TabsTrigger>
          {isBranchAdmin && <TabsTrigger value="trainer-stats">Trainer Stats</TabsTrigger>}
        </TabsList>

        <TabsContent value="batches" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Batch</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Program</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Trainer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Timing</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Students</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                      {(canEdit || canAssign) && (
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {batches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{batch.name}</p>
                          {batch.start_date && (
                            <p className="text-xs text-slate-500">{batch.start_date} - {batch.end_date || 'Ongoing'}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">{batch.program_name}</td>
                        <td className="px-4 py-3 text-sm">{batch.trainer_name}</td>
                        <td className="px-4 py-3 text-sm">{batch.timing || '-'}</td>
                        <td className="px-4 py-3">
                          <Badge 
                            variant="outline" 
                            className="cursor-pointer"
                            onClick={() => openViewStudents(batch)}
                          >
                            <Users className="w-3 h-3 mr-1" />
                            {batch.student_count || 0} / {batch.max_students}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={batch.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                            {batch.status}
                          </Badge>
                        </td>
                        {(canEdit || canAssign) && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {canAssign && (
                                <Button variant="ghost" size="sm" onClick={() => openAssignStudent(batch)} title="Assign Student">
                                  <UserPlus className="w-4 h-4 text-green-500" />
                                </Button>
                              )}
                              {canEdit && (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => openEditBatch(batch)} title="Edit">
                                    <Edit className="w-4 h-4 text-orange-500" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteBatch(batch)} title="Delete">
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {batches.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    {loading ? 'Loading...' : 'No batches created yet'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isBranchAdmin && (
          <TabsContent value="trainer-stats" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trainer-wise Student Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trainerStats.map((trainer) => (
                    <Card key={trainer.trainer_id} className="border-slate-200 hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">{trainer.trainer_name}</p>
                            <p className="text-xs text-slate-500">{trainer.email}</p>
                          </div>
                        </div>
                        
                        {/* Main Stats */}
                        <div className="grid grid-cols-2 gap-2 text-center mb-3">
                          <div className="bg-blue-50 rounded-lg p-2">
                            <p className="text-2xl font-bold text-blue-600">{trainer.total_students || trainer.unique_student_count || 0}</p>
                            <p className="text-xs text-slate-600">Total Students</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-2">
                            <p className="text-2xl font-bold text-green-600">{trainer.active_batches || 0}</p>
                            <p className="text-xs text-slate-600">Active Batches</p>
                          </div>
                        </div>
                        
                        {/* Detailed Stats */}
                        <div className="space-y-1 text-sm border-t pt-2">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Active Students:</span>
                            <span className="font-medium text-green-600">{trainer.active_students || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Completed:</span>
                            <span className="font-medium text-slate-600">{trainer.completed_students || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Total Batches:</span>
                            <span className="font-medium">{trainer.total_batches || 0}</span>
                          </div>
                        </div>
                        
                        {/* Batch List */}
                        {trainer.batches && trainer.batches.length > 0 && (
                          <div className="mt-3 pt-2 border-t">
                            <p className="text-xs font-medium text-slate-500 mb-2">Batches:</p>
                            <div className="flex flex-wrap gap-1">
                              {trainer.batches.slice(0, 4).map((batch, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant={batch.status === 'Active' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {batch.name?.split(' - ')[0] || batch.name}
                                </Badge>
                              ))}
                              {trainer.batches.length > 4 && (
                                <Badge variant="outline" className="text-xs">
                                  +{trainer.batches.length - 4} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {trainerStats.length === 0 && (
                    <div className="col-span-3 text-center py-8 text-slate-500">
                      No trainers found. Add trainers from Admin Panel.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Create/Edit Batch Dialog */}
      <Dialog open={batchDialog} onOpenChange={setBatchDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editBatch ? 'Edit Batch' : 'Create New Batch'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Batch Name *</Label>
              <Input 
                value={batchForm.name} 
                onChange={(e) => setBatchForm({...batchForm, name: e.target.value})}
                placeholder="e.g., DM Batch Jan 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Program *</Label>
                <Select value={batchForm.program_id} onValueChange={(v) => setBatchForm({...batchForm, program_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Trainer *</Label>
                <Select value={batchForm.trainer_id} onValueChange={(v) => setBatchForm({...batchForm, trainer_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trainer" />
                  </SelectTrigger>
                  <SelectContent>
                    {trainers.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input 
                  type="date"
                  value={batchForm.start_date} 
                  onChange={(e) => setBatchForm({...batchForm, start_date: e.target.value})}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input 
                  type="date"
                  value={batchForm.end_date} 
                  onChange={(e) => setBatchForm({...batchForm, end_date: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Timing</Label>
                <Input 
                  value={batchForm.timing} 
                  onChange={(e) => setBatchForm({...batchForm, timing: e.target.value})}
                  placeholder="e.g., 10:00 AM - 12:00 PM"
                />
              </div>
              <div>
                <Label>Max Students</Label>
                <Input 
                  type="number"
                  value={batchForm.max_students} 
                  onChange={(e) => setBatchForm({...batchForm, max_students: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBatchDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveBatch} disabled={saving}>
                {saving ? 'Saving...' : editBatch ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Student Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Student to Batch</DialogTitle>
          </DialogHeader>
          {selectedBatch && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm">Batch: <strong>{selectedBatch.name}</strong></p>
                <p className="text-sm">Trainer: <strong>{selectedBatch.trainer_name}</strong></p>
              </div>
              <div>
                <Label>Select Student *</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.student_name} ({s.program_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAssignDialog(false)}>Cancel</Button>
                <Button onClick={handleAssignStudent} disabled={saving}>
                  {saving ? 'Assigning...' : 'Assign'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Batch Students Dialog */}
      <Dialog open={viewStudentsDialog} onOpenChange={setViewStudentsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Students in {selectedBatch?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Student</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Program</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Phone</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {batchStudents.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2">{s.student_name}</td>
                    <td className="px-4 py-2 text-sm">{s.program_name}</td>
                    <td className="px-4 py-2 text-sm">{s.phone}</td>
                    <td className="px-4 py-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRemoveStudent(s.enrollment_id)}
                      >
                        <UserMinus className="w-4 h-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {batchStudents.length === 0 && (
              <p className="text-center py-6 text-slate-500">No students assigned yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BatchManagementPage;
