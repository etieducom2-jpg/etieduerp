import React, { useState, useEffect } from 'react';
import { adminAPI, expenseAPI, leadSourceAPI, whatsappAPI, examsAPI, webhookAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Building, Users, BookOpen, Wallet, Trash2, Link, MessageSquare, Key, UserX, UserCheck, Webhook, Copy, RefreshCw } from 'lucide-react';

// Modular Tab Components
import { BranchesTab, ProgramsTab, SessionsTab, ExpenseCategoriesTab, LeadSourcesTab, UsersTab, WhatsAppSettingsTab, ExamsTab, SystemSettingsTab } from '@/components/admin';

// Webhook Card Component for displaying branch webhook info
const WebhookCard = ({ branch, onRefresh }) => {
  const [webhookInfo, setWebhookInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchWebhookInfo = async () => {
    setLoading(true);
    try {
      const response = await webhookAPI.getBranchWebhookInfo(branch.id);
      setWebhookInfo(response.data);
    } catch (error) {
      toast.error('Failed to fetch webhook info');
    } finally {
      setLoading(false);
    }
  };

  const regenerateKey = async () => {
    if (!window.confirm('Are you sure? This will invalidate the current webhook URL.')) return;
    
    setRegenerating(true);
    try {
      await webhookAPI.regenerateWebhookKey(branch.id);
      await fetchWebhookInfo();
      toast.success('Webhook key regenerated');
      onRefresh();
    } catch (error) {
      toast.error('Failed to regenerate key');
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  useEffect(() => {
    fetchWebhookInfo();
  }, [branch.id]);

  return (
    <Card className="border border-slate-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Webhook className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg">{branch.name}</CardTitle>
              <p className="text-sm text-slate-500">{branch.city}, {branch.state}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={regenerateKey}
            disabled={regenerating}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate Key
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-center py-4 text-slate-500">Loading...</div>
        ) : webhookInfo ? (
          <>
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Webhook URL (for Google Ads / Meta)</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={webhookInfo.webhook_url} 
                  readOnly 
                  className="font-mono text-xs bg-slate-50"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(webhookInfo.webhook_url, 'Webhook URL')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-lg p-3 mt-3">
              <p className="text-xs font-medium text-slate-700 mb-2">Sample Payload (POST JSON)</p>
              <pre className="text-xs text-slate-600 bg-slate-100 p-2 rounded overflow-x-auto">
{`{
  "name": "Lead Name",
  "phone": "9876543210",
  "email": "lead@example.com",
  "source": "Google Ads",
  "campaign": "Campaign Name",
  "program_name": "Course Name"
}`}
              </pre>
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-slate-500">
            Failed to load webhook info. Click refresh to retry.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AdminPanel = () => {
  const [branches, setBranches] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [users, setUsers] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [internationalExams, setInternationalExams] = useState([]);
  const [whatsappSettings, setWhatsappSettings] = useState({
    enabled: true,
    integrated_number: '918728054145',
    events: {
      enquiry_saved: { enabled: true, template_name: '', namespace: '', variables: ['name', 'course'], description: 'When a new enquiry/lead is saved' },
      demo_booked: { enabled: true, template_name: '', namespace: '', variables: ['name', 'demo_date', 'demo_time', 'trainer'], description: 'When demo is scheduled' },
      enrollment_confirmed: { enabled: true, template_name: '', namespace: '', variables: ['name', 'enrollment_number', 'course'], description: 'Thank you message on enrollment' },
      payment_received: { enabled: true, template_name: '', namespace: '', variables: ['name', 'amount', 'total_fee', 'paid_fee', 'pending_fee', 'receipt_number'], description: 'Fee payment confirmation with details' },
      fee_reminder: { enabled: true, template_name: '', namespace: '', variables: ['name', 'amount_due', 'due_date'], description: 'Pending fee reminders' },
      birthday_wishes: { enabled: true, template_name: '', namespace: '', variables: ['name'], description: 'Birthday wishes on DOB' }
    }
  });
  const [whatsappLoading, setWhatsappLoading] = useState(false);
  const [testNumber, setTestNumber] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [branchDialog, setBranchDialog] = useState(false);
  const [programDialog, setProgramDialog] = useState(false);
  const [userDialog, setUserDialog] = useState(false);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [leadSourceDialog, setLeadSourceDialog] = useState(false);
  const [examDialog, setExamDialog] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [leadSourceForm, setLeadSourceForm] = useState({ name: '', description: '' });
  const [examForm, setExamForm] = useState({ name: '', description: '', price: '' });
  
  // Session management state
  const [sessions, setSessions] = useState([]);
  const [sessionDialog, setSessionDialog] = useState(false);
  const [sessionForm, setSessionForm] = useState({ year: new Date().getFullYear() + 1 });
  const [sessionsLoading, setSessionsLoading] = useState(false);
  
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = currentUser.role === 'Admin';
  const isBranchAdmin = currentUser.role === 'Branch Admin';
  
  const [branchForm, setBranchForm] = useState({ 
    name: '', 
    location: '', 
    address: '', 
    city: '', 
    state: '', 
    pincode: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    owner_designation: '',
    branch_phone: '',
    branch_email: '',
    royalty_percentage: 0
  });
  const [programForm, setProgramForm] = useState({ name: '', duration: '', fee: '', max_discount_percent: '' });
  const [userForm, setUserForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    role: isBranchAdmin ? 'Trainer' : 'Counsellor', 
    branch_id: isBranchAdmin ? currentUser.branch_id : '',
    phone: '',
    alternate_phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    date_of_birth: '',
    designation: '',
    photo_url: ''
  });
  const [editingBranch, setEditingBranch] = useState(null);
  const [editingProgram, setEditingProgram] = useState(null);

  useEffect(() => {
    fetchData();
    fetchWhatsAppSettings();
    fetchExams();
  }, []);

  const fetchData = async () => {
    try {
      const [branchRes, programRes, userRes, categoryRes, sourcesRes] = await Promise.all([
        adminAPI.getBranches(),
        adminAPI.getPrograms(),
        adminAPI.getUsers(),
        expenseAPI.getCategories(),
        leadSourceAPI.getAll(),
      ]);
      setBranches(branchRes.data);
      setPrograms(programRes.data);
      setUsers(userRes.data);
      setExpenseCategories(categoryRes.data);
      setLeadSources(sourcesRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    }
  };

  const fetchWhatsAppSettings = async () => {
    try {
      const response = await whatsappAPI.getSettings();
      setWhatsappSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch WhatsApp settings');
    }
  };

  const fetchExams = async () => {
    try {
      const response = await examsAPI.getTypes();
      setInternationalExams(response.data);
    } catch (error) {
      console.error('Failed to fetch exams');
    }
  };

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const response = await adminAPI.getSessions();
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to fetch sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleCreateSession = async () => {
    try {
      await adminAPI.createSession(sessionForm);
      toast.success('Session created successfully');
      setSessionDialog(false);
      setSessionForm({ year: new Date().getFullYear() + 1 });
      fetchSessions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create session');
    }
  };

  const handleDeleteSession = async (year) => {
    if (!window.confirm(`Are you sure you want to delete session ${year}-${year+1}?`)) return;
    try {
      await adminAPI.deleteSession(year);
      toast.success('Session deleted successfully');
      fetchSessions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete session');
    }
  };

  const handleWhatsAppSettingChange = async (key, value) => {
    setWhatsappLoading(true);
    try {
      const updatedSettings = { ...whatsappSettings, [key]: value };
      await whatsappAPI.updateSettings(updatedSettings);
      setWhatsappSettings(updatedSettings);
      toast.success('WhatsApp settings updated');
    } catch (error) {
      toast.error('Failed to update WhatsApp settings');
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleEventSettingChange = async (eventKey, field, value) => {
    setWhatsappLoading(true);
    try {
      const updatedEvents = { 
        ...whatsappSettings.events,
        [eventKey]: { 
          ...whatsappSettings.events[eventKey], 
          [field]: value 
        }
      };
      const updatedSettings = { ...whatsappSettings, events: updatedEvents };
      await whatsappAPI.updateSettings(updatedSettings);
      setWhatsappSettings(updatedSettings);
      toast.success('Event settings updated');
    } catch (error) {
      toast.error('Failed to update event settings');
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleSaveWhatsAppSettings = async () => {
    setWhatsappLoading(true);
    try {
      await whatsappAPI.updateSettings(whatsappSettings);
      toast.success('WhatsApp settings saved successfully');
    } catch (error) {
      toast.error('Failed to save WhatsApp settings');
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!testNumber) {
      toast.error('Please enter a phone number');
      return;
    }
    setTestLoading(true);
    try {
      await whatsappAPI.sendTestMessage({ phone: testNumber });
      toast.success('Test message sent successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send test message');
    } finally {
      setTestLoading(false);
    }
  };

  const handleResetSystem = async () => {
    const confirmation = window.prompt(
      'This action cannot be undone. Type "RESET ALL DATA" to confirm:'
    );
    if (confirmation === 'RESET ALL DATA') {
      setResetLoading(true);
      try {
        await adminAPI.resetSystem();
        toast.success('System data has been reset successfully');
        fetchData();
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Failed to reset system');
      } finally {
        setResetLoading(false);
      }
    } else if (confirmation !== null) {
      toast.error('Confirmation text did not match. Reset cancelled.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await adminAPI.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      await adminAPI.changeUserPassword(selectedUser.id, { new_password: newPassword });
      toast.success('Password changed successfully');
      setPasswordDialog(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    }
  };

  const handleToggleUserStatus = async (user) => {
    try {
      await adminAPI.updateUserStatus(user.id, { is_active: !user.is_active });
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user status');
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      await examsAPI.createType({
        name: examForm.name,
        description: examForm.description,
        price: parseFloat(examForm.price)
      });
      toast.success('Exam type created successfully');
      setExamDialog(false);
      setExamForm({ name: '', description: '', price: '' });
      fetchExams();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create exam');
    }
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this exam type?')) return;
    try {
      await examsAPI.deleteType(examId);
      toast.success('Exam type deleted successfully');
      fetchExams();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete exam');
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    try {
      if (editingBranch) {
        await adminAPI.updateBranch(editingBranch.id, branchForm);
        toast.success('Branch updated successfully');
      } else {
        await adminAPI.createBranch(branchForm);
        toast.success('Branch created successfully');
      }
      setBranchDialog(false);
      setBranchForm({ 
        name: '', location: '', address: '', city: '', state: '', pincode: '',
        owner_name: '', owner_email: '', owner_phone: '', owner_designation: '',
        branch_phone: '', branch_email: '', royalty_percentage: 0
      });
      setEditingBranch(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save branch');
    }
  };

  const handleDeleteBranch = async (id) => {
    if (!window.confirm('Are you sure you want to delete this branch?')) return;
    try {
      await adminAPI.deleteBranch(id);
      toast.success('Branch deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete branch');
    }
  };

  const handleCreateProgram = async (e) => {
    e.preventDefault();
    try {
      const programData = {
        ...programForm,
        fee: parseFloat(programForm.fee),
        max_discount_percent: parseFloat(programForm.max_discount_percent),
      };
      
      if (editingProgram) {
        await adminAPI.updateProgram(editingProgram.id, programData);
        toast.success('Program updated successfully');
      } else {
        await adminAPI.createProgram(programData);
        toast.success('Program created successfully');
      }
      setProgramDialog(false);
      setProgramForm({ name: '', duration: '', fee: '', max_discount_percent: '' });
      setEditingProgram(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save program');
    }
  };

  const handleDeleteProgram = async (id) => {
    if (!window.confirm('Are you sure you want to delete this program?')) return;
    try {
      await adminAPI.deleteProgram(id);
      toast.success('Program deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete program');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createUser(userForm);
      toast.success('User created successfully');
      setUserDialog(false);
      setUserForm({ name: '', email: '', password: '', role: 'Counsellor', branch_id: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    try {
      await expenseAPI.createCategory(categoryForm);
      toast.success('Expense category created successfully');
      setCategoryDialog(false);
      setCategoryForm({ name: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create category');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense category?')) return;
    try {
      await expenseAPI.deleteCategory(id);
      toast.success('Category deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete category');
    }
  };

  const handleCreateLeadSource = async (e) => {
    e.preventDefault();
    try {
      await leadSourceAPI.create(leadSourceForm);
      toast.success('Lead source created successfully');
      setLeadSourceDialog(false);
      setLeadSourceForm({ name: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create lead source');
    }
  };

  const handleDeleteLeadSource = async (id) => {
    if (!window.confirm('Are you sure you want to delete this lead source?')) return;
    try {
      await leadSourceAPI.delete(id);
      toast.success('Lead source deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete lead source');
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-panel">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Admin Panel</h1>
        <p className="text-slate-600">Manage branches, programs, and users</p>
      </div>

      <Tabs defaultValue={isBranchAdmin ? "users" : "branches"} className="w-full" onValueChange={(value) => { if (value === 'sessions') fetchSessions(); }}>
        <TabsList className={`grid w-full ${isSuperAdmin ? 'grid-cols-10' : 'grid-cols-2'}`}>
          {isSuperAdmin && <TabsTrigger value="branches">Branches</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="programs">Programs</TabsTrigger>}
          <TabsTrigger value="users">Users</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="sessions" data-testid="sessions-tab">Sessions</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="expense-categories" data-testid="expense-categories-tab">Expenses</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="lead-sources" data-testid="lead-sources-tab">Sources</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="exams" data-testid="exams-tab">Exams</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="whatsapp" data-testid="whatsapp-settings-tab">WhatsApp</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="webhooks" data-testid="webhooks-tab">Webhooks</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="system" data-testid="system-tab" className="text-red-600">System</TabsTrigger>}
          {isBranchAdmin && <TabsTrigger value="batches-info">Batch Info</TabsTrigger>}
        </TabsList>

        {isSuperAdmin && (
        <TabsContent value="branches" className="space-y-4">
          <BranchesTab 
            branches={branches}
            onAddBranch={() => setBranchDialog(true)}
            onEditBranch={(branch) => {
              setEditingBranch(branch);
              setBranchForm({
                name: branch.name,
                location: branch.location,
                address: branch.address || '',
                city: branch.city || '',
                state: branch.state || '',
                pincode: branch.pincode || '',
                owner_name: branch.owner_name || '',
                owner_email: branch.owner_email || '',
                owner_phone: branch.owner_phone || '',
                owner_designation: branch.owner_designation || '',
                branch_phone: branch.branch_phone || '',
                branch_email: branch.branch_email || '',
                royalty_percentage: branch.royalty_percentage || 0
              });
              setBranchDialog(true);
            }}
            onDeleteBranch={handleDeleteBranch}
          />
        </TabsContent>
        )}

        {isSuperAdmin && (
        <TabsContent value="programs" className="space-y-4">
          <ProgramsTab 
            programs={programs}
            onAddProgram={() => setProgramDialog(true)}
            onEditProgram={(program) => {
              setEditingProgram(program);
              setProgramForm({
                name: program.name,
                duration: program.duration,
                fee: program.fee.toString(),
                max_discount_percent: program.max_discount_percent.toString()
              });
              setProgramDialog(true);
            }}
            onDeleteProgram={handleDeleteProgram}
          />
        </TabsContent>
        )}

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">{isBranchAdmin ? 'Trainers' : 'Users'}</h2>
            <Button onClick={() => {
              setUserForm({
                name: '', email: '', password: '', 
                role: isBranchAdmin ? 'Trainer' : 'Counsellor', 
                branch_id: isBranchAdmin ? currentUser.branch_id : '',
                phone: '', alternate_phone: '', address: '', city: '', state: '', pincode: '',
                date_of_birth: '', designation: '', photo_url: ''
              });
              setUserDialog(true);
            }} className="bg-slate-900 hover:bg-slate-800">
              <Plus className="w-4 h-4 mr-2" /> Add {isBranchAdmin ? 'Trainer' : 'User'}
            </Button>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-xl shadow-soft overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Photo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Role</th>
                  {isSuperAdmin && <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Branch</th>}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users
                  .filter(user => {
                    // Branch Admin sees only Trainers from their branch
                    if (isBranchAdmin) {
                      return user.role === 'Trainer' && user.branch_id === currentUser.branch_id;
                    }
                    return true;
                  })
                  .map((user) => (
                  <tr key={user.id} className={`hover:bg-slate-50 ${user.is_active === false ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      {user.photo_url ? (
                        <img src={user.photo_url} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                          <span className="text-slate-600 font-semibold text-sm">
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.designation || user.role}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-600">{user.email}</p>
                      <p className="text-xs text-slate-500">{user.phone || 'No phone'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge className="bg-blue-100 text-blue-800">{user.role}</Badge>
                    </td>
                    {isSuperAdmin && (
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {branches.find(b => b.id === user.branch_id)?.name || 'All'}
                    </td>
                    )}
                    <td className="px-4 py-3">
                      {user.is_active === false ? (
                        <Badge className="bg-red-100 text-red-700">Inactive</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setPasswordDialog(true);
                          }}
                          title="Change Password"
                          data-testid={`change-password-${user.id}`}
                        >
                          <Key className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleUserStatus(user)}
                          title={user.is_active === false ? 'Activate User' : 'Deactivate User'}
                          data-testid={`toggle-status-${user.id}`}
                        >
                          {user.is_active === false ? (
                            <UserCheck className="w-4 h-4 text-green-500" />
                          ) : (
                            <UserX className="w-4 h-4 text-orange-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          title="Delete User"
                          data-testid={`delete-user-${user.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        {isSuperAdmin && (
        <TabsContent value="sessions" className="space-y-4">
          <SessionsTab 
            sessions={sessions}
            sessionsLoading={sessionsLoading}
            onAddSession={() => { setSessionDialog(true); fetchSessions(); }}
            onDeleteSession={handleDeleteSession}
          />
        </TabsContent>
        )}

        {/* Expense Categories Tab */}
        <TabsContent value="expense-categories" className="space-y-4">
          <ExpenseCategoriesTab 
            categories={expenseCategories}
            onAddCategory={() => setCategoryDialog(true)}
            onDeleteCategory={handleDeleteCategory}
          />
        </TabsContent>

        {/* Lead Sources Tab */}
        <TabsContent value="lead-sources" className="space-y-4">
          <LeadSourcesTab 
            sources={leadSources}
            onAddSource={() => setLeadSourceDialog(true)}
            onDeleteSource={handleDeleteLeadSource}
          />
        </TabsContent>

        {/* WhatsApp Settings Tab */}
        {/* WhatsApp Settings Tab - Modular Component */}
        <TabsContent value="whatsapp" className="space-y-4">
          <WhatsAppSettingsTab
            whatsappSettings={whatsappSettings}
            whatsappLoading={whatsappLoading}
            testNumber={testNumber}
            setTestNumber={setTestNumber}
            testLoading={testLoading}
            onSettingChange={handleWhatsAppSettingChange}
            onEventSettingChange={handleEventSettingChange}
            onSaveSettings={handleSaveWhatsAppSettings}
            onTestMessage={handleTestWhatsApp}
          />
        </TabsContent>

        {/* International Exams Tab */}
        <TabsContent value="exams" className="space-y-4">
          <ExamsTab 
            exams={internationalExams}
            onAddExam={() => setExamDialog(true)}
            onDeleteExam={handleDeleteExam}
          />
        </TabsContent>

        {/* Webhooks Tab - Lead Capture Endpoints for Google Ads & Meta */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">Lead Capture Webhooks</h2>
              <p className="text-sm text-slate-500 mt-1">
                Unique URLs for each branch to auto-capture leads from Google Ads, Meta (Facebook), etc.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">How to Use</h3>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>Copy the webhook URL for the desired branch</li>
              <li>In Google Ads: Go to Lead Form Extensions → Set webhook URL</li>
              <li>In Meta Ads: Go to Lead Ads → Instant Forms → CRM Integration → Paste URL</li>
              <li>Leads will automatically appear in the CRM under that branch</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {branches.map((branch) => (
              <WebhookCard key={branch.id} branch={branch} onRefresh={fetchData} />
            ))}
            {branches.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No branches created yet. Create a branch first to get webhook URLs.
              </div>
            )}
          </div>
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="system" className="space-y-4">
          <SystemSettingsTab 
            onResetData={handleResetSystem}
            resetLoading={resetLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Branch Dialog */}
      <Dialog open={branchDialog} onOpenChange={setBranchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBranch ? 'Edit Branch' : 'Add New Branch'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBranch} className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="text-sm font-semibold text-slate-700 mb-2">Branch Information</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Branch Name *</Label>
                <Input
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder="Mumbai Branch"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Location *</Label>
                <Input
                  value={branchForm.location}
                  onChange={(e) => setBranchForm({ ...branchForm, location: e.target.value })}
                  placeholder="Andheri West"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Address *</Label>
              <Input
                value={branchForm.address}
                onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                placeholder="Building Name, Street"
                required
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input
                  value={branchForm.city}
                  onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                  placeholder="Mumbai"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>State *</Label>
                <Input
                  value={branchForm.state}
                  onChange={(e) => setBranchForm({ ...branchForm, state: e.target.value })}
                  placeholder="Maharashtra"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Pincode *</Label>
                <Input
                  value={branchForm.pincode}
                  onChange={(e) => setBranchForm({ ...branchForm, pincode: e.target.value })}
                  placeholder="400058"
                  required
                />
              </div>
            </div>

            <div className="text-sm font-semibold text-slate-700 mt-4 mb-2">Branch Contact</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Branch Phone *</Label>
                <Input
                  value={branchForm.branch_phone}
                  onChange={(e) => setBranchForm({ ...branchForm, branch_phone: e.target.value })}
                  placeholder="+91 9876543210"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Branch Email *</Label>
                <Input
                  type="email"
                  value={branchForm.branch_email}
                  onChange={(e) => setBranchForm({ ...branchForm, branch_email: e.target.value })}
                  placeholder="[email protected]"
                  required
                />
              </div>
            </div>

            <div className="text-sm font-semibold text-slate-700 mt-4 mb-2">Branch Owner Details</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Owner Name *</Label>
                <Input
                  value={branchForm.owner_name}
                  onChange={(e) => setBranchForm({ ...branchForm, owner_name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Owner Designation *</Label>
                <Input
                  value={branchForm.owner_designation}
                  onChange={(e) => setBranchForm({ ...branchForm, owner_designation: e.target.value })}
                  placeholder="Branch Manager"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Owner Email *</Label>
                <Input
                  type="email"
                  value={branchForm.owner_email}
                  onChange={(e) => setBranchForm({ ...branchForm, owner_email: e.target.value })}
                  placeholder="[email protected]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Owner Phone *</Label>
                <Input
                  value={branchForm.owner_phone}
                  onChange={(e) => setBranchForm({ ...branchForm, owner_phone: e.target.value })}
                  placeholder="+91 9876543210"
                  required
                />
              </div>
            </div>

            {/* Royalty Percentage - Only visible to Super Admin */}
            {currentUser.role === 'Admin' && (
              <div className="space-y-2 pt-4 border-t">
                <Label>Royalty Percentage (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={branchForm.royalty_percentage}
                  onChange={(e) => setBranchForm({ ...branchForm, royalty_percentage: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g., 10"
                />
                <p className="text-xs text-slate-500">Royalty charged on enrollment payments (1st-31st of each month, due 5th next month)</p>
              </div>
            )}
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => {
                setBranchDialog(false);
                setEditingBranch(null);
                setBranchForm({ 
                  name: '', location: '', address: '', city: '', state: '', pincode: '',
                  owner_name: '', owner_email: '', owner_phone: '', owner_designation: '',
                  branch_phone: '', branch_email: '', royalty_percentage: 0
                });
              }}>Cancel</Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
                {editingBranch ? 'Update' : 'Create'} Branch
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Program Dialog */}
      <Dialog open={programDialog} onOpenChange={setProgramDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProgram ? 'Edit Program' : 'Add New Program'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProgram} className="space-y-4">
            <div className="space-y-2">
              <Label>Program Name *</Label>
              <Input
                value={programForm.name}
                onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                placeholder="Data Science"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Duration *</Label>
              <Input
                value={programForm.duration}
                onChange={(e) => setProgramForm({ ...programForm, duration: e.target.value })}
                placeholder="6 months"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Fee (₹) *</Label>
              <Input
                type="number"
                value={programForm.fee}
                onChange={(e) => setProgramForm({ ...programForm, fee: e.target.value })}
                placeholder="50000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Max Discount (%) *</Label>
              <Input
                type="number"
                value={programForm.max_discount_percent}
                onChange={(e) => setProgramForm({ ...programForm, max_discount_percent: e.target.value })}
                placeholder="20"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setProgramDialog(false);
                setEditingProgram(null);
                setProgramForm({ name: '', duration: '', fee: '', max_discount_percent: '' });
              }}>Cancel</Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800">
                {editingProgram ? 'Update' : 'Create'} Program
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Dialog */}
      <Dialog open={userDialog} onOpenChange={setUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="text-sm font-semibold text-slate-700 mb-2">Basic Information</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="[email protected]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={userForm.date_of_birth}
                  onChange={(e) => setUserForm({ ...userForm, date_of_birth: e.target.value })}
                />
              </div>
            </div>

            <div className="text-sm font-semibold text-slate-700 mt-4 mb-2">Contact Details</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Alternate Phone</Label>
                <Input
                  value={userForm.alternate_phone}
                  onChange={(e) => setUserForm({ ...userForm, alternate_phone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={userForm.address}
                onChange={(e) => setUserForm({ ...userForm, address: e.target.value })}
                placeholder="Complete address"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={userForm.city}
                  onChange={(e) => setUserForm({ ...userForm, city: e.target.value })}
                  placeholder="Mumbai"
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={userForm.state}
                  onChange={(e) => setUserForm({ ...userForm, state: e.target.value })}
                  placeholder="Maharashtra"
                />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  value={userForm.pincode}
                  onChange={(e) => setUserForm({ ...userForm, pincode: e.target.value })}
                  placeholder="400058"
                />
              </div>
            </div>

            <div className="text-sm font-semibold text-slate-700 mt-4 mb-2">Role & Branch</div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={userForm.role} onValueChange={(value) => setUserForm({ ...userForm, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isSuperAdmin ? (
                      <>
                        <SelectItem value="Admin">Super Admin</SelectItem>
                        <SelectItem value="Branch Admin">Branch Admin</SelectItem>
                        <SelectItem value="Counsellor">Counsellor</SelectItem>
                        <SelectItem value="Front Desk Executive">Front Desk Executive</SelectItem>
                        <SelectItem value="Trainer">Trainer</SelectItem>
                        <SelectItem value="Certificate Manager">Certificate Manager</SelectItem>
                        <SelectItem value="Academic Controller">Academic Controller</SelectItem>
                      </>
                    ) : (
                      <SelectItem value="Trainer">Trainer</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input
                  value={userForm.designation}
                  onChange={(e) => setUserForm({ ...userForm, designation: e.target.value })}
                  placeholder="Senior Counsellor"
                />
              </div>
            </div>

            {/* Branch selection - Only for Super Admin, Branch Admin's branch is auto-assigned */}
            {isSuperAdmin && (
            <div className="space-y-2">
              <Label>Branch {userForm.role !== 'Admin' && '*'}</Label>
              <Select value={userForm.branch_id} onValueChange={(value) => setUserForm({ ...userForm, branch_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}

            {isBranchAdmin && (
            <div className="space-y-2">
              <Label>Branch</Label>
              <Input
                value={branches.find(b => b.id === currentUser.branch_id)?.name || 'Your Branch'}
                disabled
                className="bg-slate-100"
              />
              <p className="text-xs text-slate-500">Trainers are automatically assigned to your branch</p>
            </div>
            )}

            <div className="space-y-2">
              <Label>Photo URL (Optional)</Label>
              <Input
                value={userForm.photo_url}
                onChange={(e) => setUserForm({ ...userForm, photo_url: e.target.value })}
                placeholder="https://example.com/photo.jpg or upload below"
              />
              <p className="text-xs text-slate-500">You can paste image URL or upload a file</p>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setUserDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800">Create User</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Category Dialog */}
      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Office Supplies, Rent, Utilities..."
                required
                data-testid="category-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="w-full min-h-20 px-3 py-2 border border-slate-200 rounded-md"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Brief description of this expense category..."
                data-testid="category-description-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setCategoryDialog(false);
                setCategoryForm({ name: '', description: '' });
              }}>Cancel</Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="save-category-btn">
                Create Category
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lead Source Dialog */}
      <Dialog open={leadSourceDialog} onOpenChange={setLeadSourceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Lead Source</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLeadSource} className="space-y-4">
            <div className="space-y-2">
              <Label>Source Name *</Label>
              <Input
                value={leadSourceForm.name}
                onChange={(e) => setLeadSourceForm({ ...leadSourceForm, name: e.target.value })}
                placeholder="Google, Facebook, Referral, Walk-in..."
                required
                data-testid="lead-source-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="w-full min-h-20 px-3 py-2 border border-slate-200 rounded-md"
                value={leadSourceForm.description}
                onChange={(e) => setLeadSourceForm({ ...leadSourceForm, description: e.target.value })}
                placeholder="Brief description of this lead source..."
                data-testid="lead-source-description-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setLeadSourceDialog(false);
                setLeadSourceForm({ name: '', description: '' });
              }}>Cancel</Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="save-lead-source-btn">
                Create Lead Source
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* International Exam Dialog */}
      <Dialog open={examDialog} onOpenChange={setExamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add International Exam</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateExam} className="space-y-4">
            <div className="space-y-2">
              <Label>Exam Name *</Label>
              <Input
                value={examForm.name}
                onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                placeholder="IELTS, TOEFL, GRE..."
                required
                data-testid="exam-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Price (₹) *</Label>
              <Input
                type="number"
                value={examForm.price}
                onChange={(e) => setExamForm({ ...examForm, price: e.target.value })}
                placeholder="15000"
                required
                data-testid="exam-price-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="w-full min-h-20 px-3 py-2 border border-slate-200 rounded-md"
                value={examForm.description}
                onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                placeholder="Brief description of this exam..."
                data-testid="exam-description-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => {
                setExamDialog(false);
                setExamForm({ name: '', description: '', price: '' });
              }}>Cancel</Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="save-exam-btn">
                Create Exam
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password for {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Password *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                data-testid="new-password-input"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setPasswordDialog(false);
                setNewPassword('');
                setSelectedUser(null);
              }}>Cancel</Button>
              <Button onClick={handleChangePassword} className="bg-slate-900 hover:bg-slate-800">
                Change Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Session Dialog */}
      <Dialog open={sessionDialog} onOpenChange={setSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Academic Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Session Start Year *</Label>
              <Input
                type="number"
                value={sessionForm.year}
                onChange={(e) => setSessionForm({ ...sessionForm, year: parseInt(e.target.value) })}
                min={2016}
                max={2050}
                placeholder="e.g., 2026"
              />
              <p className="text-sm text-slate-500">
                This will create session: {sessionForm.year}-{sessionForm.year + 1}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSessionDialog(false)}>Cancel</Button>
              <Button onClick={handleCreateSession} className="bg-slate-900 hover:bg-slate-800">
                Create Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
