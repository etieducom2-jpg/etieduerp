import React, { useState, useEffect } from 'react';
import { curriculumAPI, adminAPI } from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { BookOpen, Plus, Edit, Trash2, ListOrdered } from 'lucide-react';

const CurriculumPage = () => {
  const [curricula, setCurricula] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    program_id: '',
    title: '',
    description: '',
    topics: [],
    duration_weeks: ''
  });
  
  const [newTopic, setNewTopic] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [curriculaRes, programsRes] = await Promise.all([
        curriculumAPI.getAll(),
        adminAPI.getPrograms()
      ]);
      setCurricula(curriculaRes.data);
      setPrograms(programsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (curriculum = null) => {
    if (curriculum) {
      setEditingCurriculum(curriculum);
      setForm({
        program_id: curriculum.program_id,
        title: curriculum.title,
        description: curriculum.description || '',
        topics: curriculum.topics || [],
        duration_weeks: curriculum.duration_weeks?.toString() || ''
      });
    } else {
      setEditingCurriculum(null);
      setForm({
        program_id: '',
        title: '',
        description: '',
        topics: [],
        duration_weeks: ''
      });
    }
    setNewTopic('');
    setDialogOpen(true);
  };

  const addTopic = () => {
    if (newTopic.trim()) {
      setForm({ ...form, topics: [...form.topics, newTopic.trim()] });
      setNewTopic('');
    }
  };

  const removeTopic = (index) => {
    setForm({ ...form, topics: form.topics.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    if (!form.program_id || !form.title) {
      toast.error('Please fill in required fields');
      return;
    }
    
    setSaving(true);
    try {
      const data = {
        ...form,
        duration_weeks: form.duration_weeks ? parseInt(form.duration_weeks) : null
      };
      
      if (editingCurriculum) {
        await curriculumAPI.update(editingCurriculum.id, data);
        toast.success('Curriculum updated successfully');
      } else {
        await curriculumAPI.create(data);
        toast.success('Curriculum created successfully');
      }
      
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save curriculum');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this curriculum?')) return;
    
    try {
      await curriculumAPI.delete(id);
      toast.success('Curriculum deleted successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete curriculum');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="curriculum-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Curriculum Management</h1>
          <p className="text-slate-600">Create and manage course curricula for trainers</p>
        </div>
        <Button onClick={() => openDialog()} data-testid="add-curriculum-btn">
          <Plus className="w-4 h-4 mr-2" />
          Add Curriculum
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {curricula.map((curriculum) => (
          <Card key={curriculum.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                {curriculum.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{curriculum.program_name}</Badge>
                  {curriculum.duration_weeks && (
                    <Badge variant="secondary">{curriculum.duration_weeks} weeks</Badge>
                  )}
                </div>
                
                {curriculum.description && (
                  <p className="text-sm text-slate-600 line-clamp-2">{curriculum.description}</p>
                )}
                
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <ListOrdered className="w-4 h-4" />
                  {curriculum.topics?.length || 0} topics
                </div>
                
                {curriculum.topics && curriculum.topics.length > 0 && (
                  <div className="text-sm">
                    <p className="font-medium mb-1">Topics:</p>
                    <ul className="list-disc list-inside text-slate-600 max-h-24 overflow-y-auto">
                      {curriculum.topics.slice(0, 3).map((topic, idx) => (
                        <li key={idx} className="truncate">{topic}</li>
                      ))}
                      {curriculum.topics.length > 3 && (
                        <li className="text-slate-400">+{curriculum.topics.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openDialog(curriculum)}
                    data-testid={`edit-curriculum-${curriculum.id}`}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(curriculum.id)}
                    data-testid={`delete-curriculum-${curriculum.id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {curricula.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            No curricula created yet. Click "Add Curriculum" to get started.
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCurriculum ? 'Edit Curriculum' : 'Add New Curriculum'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Program *</Label>
              <Select
                value={form.program_id}
                onValueChange={(v) => setForm({ ...form, program_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Digital Marketing Fundamentals"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of the curriculum"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Duration (Weeks)</Label>
              <Input
                type="number"
                value={form.duration_weeks}
                onChange={(e) => setForm({ ...form, duration_weeks: e.target.value })}
                placeholder="e.g., 12"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Topics</Label>
              <div className="flex gap-2">
                <Input
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Enter a topic"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                />
                <Button type="button" onClick={addTopic} variant="outline">
                  Add
                </Button>
              </div>
              
              {form.topics.length > 0 && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {form.topics.map((topic, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2">
                      <span className="text-sm">
                        <span className="text-slate-400 mr-2">{idx + 1}.</span>
                        {topic}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeTopic(idx)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        &times;
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Saving...' : editingCurriculum ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CurriculumPage;
