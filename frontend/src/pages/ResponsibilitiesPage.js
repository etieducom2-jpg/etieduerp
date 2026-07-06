import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { responsibilitiesAPI, adminAPI } from '@/api/api';
import { 
  ClipboardList, Plus, Edit, Trash2, CheckCircle, AlertTriangle, 
  Info, Calendar, Clock, Star, Users, Building2, Shield
} from 'lucide-react';

const ROLES = [
  'Admin',
  'Branch Admin',
  'Counsellor',
  'Front Desk Executive',
  'Trainer',
  'Academic Controller',
  'Certificate Manager'
];

const CATEGORIES = [
  { value: 'daily', label: 'Daily Tasks', icon: Clock },
  { value: 'weekly', label: 'Weekly Tasks', icon: Calendar },
  { value: 'monthly', label: 'Monthly Tasks', icon: Calendar },
  { value: 'general', label: 'General', icon: Info },
];

const PRIORITIES = [
  { value: 'high', label: 'High', color: 'bg-red-100 text-red-700' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-700' },
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-700' },
];

const ResponsibilitiesPage = () => {
  const [responsibilities, setResponsibilities] = useState([]);
  const [allResponsibilities, setAllResponsibilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingResp, setEditingResp] = useState(null);
  const [filterRole, setFilterRole] = useState('');
  
  const [formData, setFormData] = useState({
    role: '',
    user_id: '',
    branch_id: '',
    title: '',
    description: '',
    priority: 'medium',
    category: 'general'
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'Admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Always fetch user's own responsibilities
      const myResp = await responsibilitiesAPI.getMyResponsibilities();
      setResponsibilities(myResp.data);

      // Super Admin can see and manage all
      if (isSuperAdmin) {
        const [allResp, branchRes, usersRes] = await Promise.all([
          responsibilitiesAPI.getAll(),
          adminAPI.getBranches(),
          adminAPI.getUsers()
        ]);
        setAllResponsibilities(allResp.data);
        setBranches(branchRes.data);
        setUsers(usersRes.data);
      }
    } catch (error) {
      toast.error('Failed to load responsibilities');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        user_id: formData.user_id || null,
        branch_id: formData.branch_id || null,
      };

      if (editingResp) {
        await responsibilitiesAPI.update(editingResp.id, payload);
        toast.success('Responsibility updated');
      } else {
        await responsibilitiesAPI.create(payload);
        toast.success('Responsibility created');
      }
      
      setDialogOpen(false);
      setEditingResp(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save responsibility');
    }
  };

  const handleEdit = (resp) => {
    setEditingResp(resp);
    setFormData({
      role: resp.role || '',
      user_id: resp.user_id || '',
      branch_id: resp.branch_id || '',
      title: resp.title || '',
      description: resp.description || '',
      priority: resp.priority || 'medium',
      category: resp.category || 'general'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this responsibility?')) return;
    
    try {
      await responsibilitiesAPI.delete(id);
      toast.success('Responsibility deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete responsibility');
    }
  };

  const resetForm = () => {
    setFormData({
      role: '',
      user_id: '',
      branch_id: '',
      title: '',
      description: '',
      priority: 'medium',
      category: 'general'
    });
  };

  const getPriorityBadge = (priority) => {
    const p = PRIORITIES.find(pr => pr.value === priority) || PRIORITIES[1];
    return <Badge className={p.color}>{p.label}</Badge>;
  };

  const getCategoryIcon = (category) => {
    const cat = CATEGORIES.find(c => c.value === category);
    const Icon = cat?.icon || Info;
    return <Icon className="w-4 h-4" />;
  };

  const filteredAllResponsibilities = filterRole 
    ? allResponsibilities.filter(r => r.role === filterRole)
    : allResponsibilities;

  // Group responsibilities by category
  const groupedResponsibilities = responsibilities.reduce((acc, resp) => {
    const cat = resp.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(resp);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <ClipboardList className="w-16 h-16 text-slate-400 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="responsibilities-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-500" />
            My Responsibilities
          </h1>
          <p className="text-slate-500 mt-1">Your assigned duties and tasks</p>
        </div>
        
        {isSuperAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingResp(null); resetForm(); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Responsibility
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingResp ? 'Edit' : 'Add'} Responsibility</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Role *</Label>
                    <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(role => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Branch (Optional)</Label>
                    <Select value={formData.branch_id || 'all_branches'} onValueChange={(v) => setFormData({ ...formData, branch_id: v === 'all_branches' ? '' : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="All branches" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_branches">All Branches</SelectItem>
                        {branches.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Specific User (Optional)</Label>
                  <Select value={formData.user_id || 'all_users'} onValueChange={(v) => setFormData({ ...formData, user_id: v === 'all_users' ? '' : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="All users with this role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_users">All users with this role</SelectItem>
                      {users.filter(u => !formData.role || u.role === formData.role).map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input 
                    value={formData.title} 
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Daily Lead Follow-up"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detailed description of the responsibility..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITIES.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingResp ? 'Update' : 'Create'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* My Responsibilities View */}
      {responsibilities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700">No Responsibilities Assigned</h3>
            <p className="text-slate-500 mt-2">You don't have any responsibilities assigned yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CATEGORIES.map(category => {
            const items = groupedResponsibilities[category.value] || [];
            if (items.length === 0) return null;
            
            return (
              <Card key={category.value} className="overflow-hidden">
                <CardHeader className="bg-slate-50 border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <category.icon className="w-5 h-5 text-indigo-500" />
                    {category.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {items.map(resp => (
                      <div key={resp.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-slate-800">{resp.title}</h4>
                              {getPriorityBadge(resp.priority)}
                            </div>
                            <p className="text-sm text-slate-600 mt-1">{resp.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Super Admin: Manage All Responsibilities */}
      {isSuperAdmin && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Manage All Responsibilities</CardTitle>
                <CardDescription>View and manage responsibilities across all roles</CardDescription>
              </div>
              <Select value={filterRole || 'all_roles'} onValueChange={(v) => setFilterRole(v === 'all_roles' ? '' : v)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_roles">All Roles</SelectItem>
                  {ROLES.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredAllResponsibilities.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No responsibilities found</p>
            ) : (
              <div className="space-y-3">
                {filteredAllResponsibilities.map(resp => (
                  <div key={resp.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{resp.title}</h4>
                        {getPriorityBadge(resp.priority)}
                        <Badge variant="outline" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          {resp.role}
                        </Badge>
                        {resp.branch_id && branches.find(b => b.id === resp.branch_id) && (
                          <Badge variant="outline" className="text-xs">
                            <Building2 className="w-3 h-3 mr-1" />
                            {branches.find(b => b.id === resp.branch_id)?.name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{resp.description}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(resp)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(resp.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ResponsibilitiesPage;
