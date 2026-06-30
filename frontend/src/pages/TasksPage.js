import React, { useState, useEffect } from 'react';
import { tasksAPI, adminAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, CheckCircle, Clock, AlertCircle, User } from 'lucide-react';
import { format } from 'date-fns';

const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'Normal',
    due_date: ''
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isBranchAdmin = user.role === 'Branch Admin';
  const isCounsellor = user.role === 'Counsellor';
  // Branch Admin and Admin can assign to anyone, Counsellor can assign to Trainers and FDEs
  const canAssign = isBranchAdmin || user.role === 'Admin' || isCounsellor;

  useEffect(() => {
    fetchTasks();
    if (canAssign) {
      fetchUsers();
    }
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await tasksAPI.getAll();
      setTasks(response.data);
    } catch (error) {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      // Use getBranchUsers instead of getUsers - this works for both Admin and Branch Admin
      const response = await adminAPI.getBranchUsers();
      // Filter out inactive users and self
      let filteredUsers = response.data.filter(u => 
        u.is_active !== false && u.id !== user.id
      );
      // Counsellors can only assign to Trainers and FDEs
      if (isCounsellor) {
        filteredUsers = filteredUsers.filter(u => 
          u.role === 'Trainer' || u.role === 'Front Desk Executive'
        );
      }
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await tasksAPI.create(formData);
      toast.success('Task created successfully');
      setCreateDialog(false);
      setFormData({
        title: '',
        description: '',
        assigned_to: '',
        priority: 'Normal',
        due_date: ''
      });
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create task');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await tasksAPI.updateStatus(taskId, newStatus);
      toast.success('Task status updated');
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update task');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending': return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'In Progress': return <Badge className="bg-blue-100 text-blue-700"><AlertCircle className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'Completed': return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Urgent': return <Badge className="bg-red-500 text-white">Urgent</Badge>;
      case 'High': return <Badge className="bg-orange-500 text-white">High</Badge>;
      case 'Normal': return <Badge className="bg-slate-500 text-white">Normal</Badge>;
      case 'Low': return <Badge className="bg-slate-300 text-slate-700">Low</Badge>;
      default: return <Badge>{priority}</Badge>;
    }
  };

  const myTasks = tasks.filter(t => t.assigned_to === user.id);
  const assignedByMe = tasks.filter(t => t.assigned_by === user.id);

  const TaskCard = ({ task, showAssignedTo = false }) => (
    <Card className="border-slate-200 shadow-soft hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg">{task.title}</h3>
          {getPriorityBadge(task.priority)}
        </div>
        
        {task.description && (
          <p className="text-sm text-slate-600 mb-3">{task.description}</p>
        )}
        
        <div className="flex flex-wrap gap-2 mb-3">
          {getStatusBadge(task.status)}
          {task.due_date && (
            <Badge variant="outline" className="text-xs">
              Due: {task.due_date}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            <span>{showAssignedTo ? `To: ${task.assigned_to_name}` : `From: ${task.assigned_by_name}`}</span>
          </div>
          <span>{task.created_at ? format(new Date(task.created_at), 'dd MMM yyyy') : ''}</span>
        </div>
        
        {/* Status Change Buttons */}
        <div className="flex gap-2 mt-4 pt-3 border-t">
          {task.status !== 'Completed' && (
            <>
              {task.status === 'Pending' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange(task.id, 'In Progress')}
                >
                  Start
                </Button>
              )}
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleStatusChange(task.id, 'Completed')}
              >
                Mark Complete
              </Button>
            </>
          )}
          {task.status === 'Completed' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusChange(task.id, 'Pending')}
            >
              Reopen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6" data-testid="tasks-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Tasks</h1>
          <p className="text-slate-600">Manage your tasks and assignments</p>
        </div>
        {canAssign && (
          <Button 
            onClick={() => setCreateDialog(true)} 
            className="bg-slate-900 hover:bg-slate-800"
            data-testid="create-task-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> Assign Task
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <p className="text-sm text-slate-600">My Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {myTasks.filter(t => t.status === 'Pending').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <p className="text-sm text-slate-600">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">
              {myTasks.filter(t => t.status === 'In Progress').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <p className="text-sm text-slate-600">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {myTasks.filter(t => t.status === 'Completed').length}
            </p>
          </CardContent>
        </Card>
        {canAssign && (
          <Card className="border-slate-200 shadow-soft">
            <CardContent className="pt-4">
              <p className="text-sm text-slate-600">Assigned by Me</p>
              <p className="text-2xl font-bold">{assignedByMe.length}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tasks Tabs */}
      <Tabs defaultValue="my-tasks" className="w-full">
        <TabsList>
          <TabsTrigger value="my-tasks">My Tasks ({myTasks.length})</TabsTrigger>
          {canAssign && (
            <TabsTrigger value="assigned">Assigned by Me ({assignedByMe.length})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-tasks" className="mt-4">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading...</div>
          ) : myTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No tasks assigned to you yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTasks.map((task) => (
                <TaskCard key={task.id} task={task} showAssignedTo={false} />
              ))}
            </div>
          )}
        </TabsContent>

        {canAssign && (
          <TabsContent value="assigned" className="mt-4">
            {assignedByMe.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                You haven't assigned any tasks yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignedByMe.map((task) => (
                  <TaskCard key={task.id} task={task} showAssignedTo={true} />
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Create Task Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Task Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter task title"
                required
                data-testid="task-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="w-full min-h-20 px-3 py-2 border border-slate-200 rounded-md text-sm"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Task description..."
              />
            </div>

            <div className="space-y-2">
              <Label>Assign To *</Label>
              <Select 
                value={formData.assigned_to} 
                onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}
              >
                <SelectTrigger data-testid="assign-to-select">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.id !== user.id).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v) => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
                Assign Task
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TasksPage;
