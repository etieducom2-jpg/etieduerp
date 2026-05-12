import React, { useState, useEffect } from 'react';
import { organizationsAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, Plus, Building2, Phone, MapPin, Edit, Trash2, MessageSquare, Calendar, User } from 'lucide-react';

const ORGANIZATION_TYPES = ['School', 'College'];
const OUTCOME_OPTIONS = ['Interested', 'Not Interested', 'Call Back', 'Meeting Scheduled', 'Visit Done', 'MOU Signed'];

const OrganizationsPage = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  
  // Dialog states
  const [addDialog, setAddDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [followUpDialog, setFollowUpDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  
  // Form state
  const [form, setForm] = useState({
    organization_type: 'School',
    name: '',
    city: '',
    address: '',
    contact_person_name: '',
    contact_number: '',
    email: '',
    alternate_number: '',
    alternate_email: '',
    notes: ''
  });
  
  // Follow-up form
  const [followUpForm, setFollowUpForm] = useState({
    follow_up_date: new Date().toISOString().split('T')[0],
    follow_up_time: '',
    notes: '',
    outcome: ''
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await organizationsAPI.getAll();
      setOrganizations(response.data);
    } catch (error) {
      toast.error('Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      organization_type: 'School',
      name: '',
      city: '',
      address: '',
      contact_person_name: '',
      contact_number: '',
      email: '',
      alternate_number: '',
      alternate_email: '',
      notes: ''
    });
  };

  const handleAdd = async () => {
    if (!form.name || !form.city || !form.contact_person_name || !form.contact_number) {
      toast.error('Please fill required fields');
      return;
    }
    
    setSaving(true);
    try {
      await organizationsAPI.create(form);
      toast.success('Organization added successfully');
      setAddDialog(false);
      resetForm();
      fetchOrganizations();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add organization');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!form.name || !form.city || !form.contact_person_name || !form.contact_number) {
      toast.error('Please fill required fields');
      return;
    }
    
    setSaving(true);
    try {
      await organizationsAPI.update(selectedOrg.id, form);
      toast.success('Organization updated successfully');
      setEditDialog(false);
      fetchOrganizations();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (org) => {
    if (!window.confirm(`Delete "${org.name}"? This will also delete all follow-ups.`)) return;
    
    try {
      await organizationsAPI.delete(org.id);
      toast.success('Organization deleted');
      fetchOrganizations();
    } catch (error) {
      toast.error('Failed to delete organization');
    }
  };

  const openEditDialog = (org) => {
    setSelectedOrg(org);
    setForm({
      organization_type: org.organization_type,
      name: org.name,
      city: org.city,
      address: org.address || '',
      contact_person_name: org.contact_person_name,
      contact_number: org.contact_number,
      email: org.email || '',
      alternate_number: org.alternate_number || '',
      alternate_email: org.alternate_email || '',
      notes: org.notes || ''
    });
    setEditDialog(true);
  };

  const openFollowUpDialog = (org) => {
    setSelectedOrg(org);
    setFollowUpForm({
      follow_up_date: new Date().toISOString().split('T')[0],
      follow_up_time: '',
      notes: '',
      outcome: ''
    });
    setFollowUpDialog(true);
  };

  const handleAddFollowUp = async () => {
    if (!followUpForm.notes) {
      toast.error('Please add follow-up notes');
      return;
    }
    
    setSaving(true);
    try {
      await organizationsAPI.addFollowUp(selectedOrg.id, followUpForm);
      toast.success('Follow-up added successfully');
      setFollowUpDialog(false);
      fetchOrganizations();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add follow-up');
    } finally {
      setSaving(false);
    }
  };

  const openViewDialog = async (org) => {
    try {
      const response = await organizationsAPI.getOne(org.id);
      setSelectedOrg(response.data);
      setViewDialog(true);
    } catch (error) {
      toast.error('Failed to load organization details');
    }
  };

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = 
      org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.contact_person_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.contact_number?.includes(searchTerm);
    const matchesType = typeFilter === 'All' || org.organization_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: organizations.length,
    schools: organizations.filter(o => o.organization_type === 'School').length,
    colleges: organizations.filter(o => o.organization_type === 'College').length,
    withFollowups: organizations.filter(o => o.followup_count > 0).length
  };

  return (
    <div className="space-y-6" data-testid="organizations-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Schools / Colleges</h1>
          <p className="text-slate-600">Manage outreach database for local schools and colleges</p>
        </div>
        <Button onClick={() => { resetForm(); setAddDialog(true); }} data-testid="add-org-btn">
          <Plus className="w-4 h-4 mr-2" />
          Add Organization
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-slate-600">Total Organizations</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <p className="text-sm text-green-600">Schools</p>
            <p className="text-2xl font-bold text-green-600">{stats.schools}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <p className="text-sm text-purple-600">Colleges</p>
            <p className="text-2xl font-bold text-purple-600">{stats.colleges}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <p className="text-sm text-orange-600">With Follow-ups</p>
            <p className="text-2xl font-bold text-orange-600">{stats.withFollowups}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, city, contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-orgs"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Types</SelectItem>
            <SelectItem value="School">Schools</SelectItem>
            <SelectItem value="College">Colleges</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-slate-200 shadow-soft">
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Organization</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">City</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact Person</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Follow-ups</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50" data-testid={`org-row-${org.id}`}>
                    <td className="px-4 py-3">
                      <Badge className={org.organization_type === 'School' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}>
                        {org.organization_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{org.name}</p>
                      {org.email && <p className="text-xs text-slate-500">{org.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="text-sm">{org.city}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="text-sm">{org.contact_person_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="text-sm">{org.contact_number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge 
                        variant="outline" 
                        className="cursor-pointer"
                        onClick={() => openViewDialog(org)}
                      >
                        <MessageSquare className="w-3 h-3 mr-1" />
                        {org.followup_count || 0}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openFollowUpDialog(org)}
                          title="Add Follow-up"
                        >
                          <Calendar className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(org)}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-orange-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(org)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrgs.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                {loading ? 'Loading...' : 'No organizations found'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Add New Organization
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Organization Type *</Label>
              <Select value={form.organization_type} onValueChange={(v) => setForm({...form, organization_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORGANIZATION_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Organization Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <Label>City *</Label>
              <Input value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
            </div>
            <div>
              <Label>Contact Person Name *</Label>
              <Input value={form.contact_person_name} onChange={(e) => setForm({...form, contact_person_name: e.target.value})} />
            </div>
            <div>
              <Label>Contact Number *</Label>
              <Input value={form.contact_number} onChange={(e) => setForm({...form, contact_number: e.target.value})} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <Label>Alternate Number</Label>
              <Input value={form.alternate_number} onChange={(e) => setForm({...form, alternate_number: e.target.value})} />
            </div>
            <div>
              <Label>Alternate Email</Label>
              <Input type="email" value={form.alternate_email} onChange={(e) => setForm({...form, alternate_email: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving...' : 'Add Organization'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-orange-600" />
              Edit Organization
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Organization Type *</Label>
              <Select value={form.organization_type} onValueChange={(v) => setForm({...form, organization_type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORGANIZATION_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Organization Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <Label>City *</Label>
              <Input value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} />
            </div>
            <div>
              <Label>Contact Person Name *</Label>
              <Input value={form.contact_person_name} onChange={(e) => setForm({...form, contact_person_name: e.target.value})} />
            </div>
            <div>
              <Label>Contact Number *</Label>
              <Input value={form.contact_number} onChange={(e) => setForm({...form, contact_number: e.target.value})} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <Label>Alternate Number</Label>
              <Input value={form.alternate_number} onChange={(e) => setForm({...form, alternate_number: e.target.value})} />
            </div>
            <div>
              <Label>Alternate Email</Label>
              <Input type="email" value={form.alternate_email} onChange={(e) => setForm({...form, alternate_email: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Update Organization'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={followUpDialog} onOpenChange={setFollowUpDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Add Follow-up
            </DialogTitle>
          </DialogHeader>
          {selectedOrg && (
            <p className="text-sm text-slate-600 mb-4">
              For: <strong>{selectedOrg.name}</strong>
            </p>
          )}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Follow-up Date *</Label>
                <Input 
                  type="date" 
                  value={followUpForm.follow_up_date} 
                  onChange={(e) => setFollowUpForm({...followUpForm, follow_up_date: e.target.value})} 
                />
              </div>
              <div>
                <Label>Time</Label>
                <Input 
                  type="time" 
                  value={followUpForm.follow_up_time} 
                  onChange={(e) => setFollowUpForm({...followUpForm, follow_up_time: e.target.value})} 
                />
              </div>
            </div>
            <div>
              <Label>Outcome</Label>
              <Select value={followUpForm.outcome} onValueChange={(v) => setFollowUpForm({...followUpForm, outcome: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOME_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes *</Label>
              <Textarea 
                value={followUpForm.notes} 
                onChange={(e) => setFollowUpForm({...followUpForm, notes: e.target.value})} 
                rows={3}
                placeholder="Enter follow-up details..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setFollowUpDialog(false)}>Cancel</Button>
            <Button onClick={handleAddFollowUp} disabled={saving}>
              {saving ? 'Saving...' : 'Add Follow-up'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Organization Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Organization Details
            </DialogTitle>
          </DialogHeader>
          {selectedOrg && (
            <div className="space-y-6">
              {/* Organization Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">Organization</p>
                  <p className="font-medium">{selectedOrg.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Type</p>
                  <Badge className={selectedOrg.organization_type === 'School' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}>
                    {selectedOrg.organization_type}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500">City</p>
                  <p>{selectedOrg.city}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Contact Person</p>
                  <p>{selectedOrg.contact_person_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p>{selectedOrg.contact_number}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p>{selectedOrg.email || '-'}</p>
                </div>
              </div>

              {/* Follow-ups */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Follow-up History</h3>
                  <Button size="sm" onClick={() => { setViewDialog(false); openFollowUpDialog(selectedOrg); }}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Follow-up
                  </Button>
                </div>
                {selectedOrg.followups && selectedOrg.followups.length > 0 ? (
                  <div className="space-y-3">
                    {selectedOrg.followups.map((fu) => (
                      <div key={fu.id} className="p-3 border border-slate-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium">{fu.follow_up_date}</span>
                            {fu.follow_up_time && <span className="text-sm text-slate-500">at {fu.follow_up_time}</span>}
                          </div>
                          {fu.outcome && (
                            <Badge variant="outline">{fu.outcome}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{fu.notes}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          By {fu.created_by_name} on {fu.created_at?.split('T')[0]}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-6 text-slate-500">No follow-ups yet</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizationsPage;
