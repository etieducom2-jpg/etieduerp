import React, { useState, useEffect } from 'react';
import { campaignAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, TrendingUp, Target, DollarSign, Users, BarChart3, Edit, Trash2, Eye, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const PLATFORMS = ['Google Ads', 'Meta (Facebook/Instagram)', 'LinkedIn', 'Twitter', 'YouTube', 'Other'];

const CampaignManagement = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [analyticsDialog, setAnalyticsDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignAnalytics, setCampaignAnalytics] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    campaign_name: '',
    platform: '',
    campaign_link: '',
    start_date: '',
    end_date: '',
    total_spend: 0,
    total_leads: 0,
    total_messages: 0,
    status: 'Active',
    notes: ''
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await campaignAPI.getAll();
      setCampaigns(response.data);
    } catch (error) {
      toast.error('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      campaign_name: '',
      platform: '',
      campaign_link: '',
      start_date: '',
      end_date: '',
      total_spend: 0,
      total_leads: 0,
      total_messages: 0,
      status: 'Active',
      notes: ''
    });
  };

  const handleCreate = async () => {
    if (!formData.campaign_name || !formData.platform || !formData.start_date || !formData.end_date) {
      toast.error('Please fill in required fields');
      return;
    }
    
    setSaving(true);
    try {
      await campaignAPI.create(formData);
      toast.success('Campaign created successfully');
      setCreateDialog(false);
      resetForm();
      fetchCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCampaign) return;
    
    setSaving(true);
    try {
      await campaignAPI.update(selectedCampaign.id, formData);
      toast.success('Campaign updated successfully');
      setEditDialog(false);
      setSelectedCampaign(null);
      fetchCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update campaign');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    
    try {
      await campaignAPI.delete(campaignId);
      toast.success('Campaign deleted successfully');
      fetchCampaigns();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete campaign');
    }
  };

  const openEditDialog = (campaign) => {
    setFormData({
      campaign_name: campaign.campaign_name,
      platform: campaign.platform,
      campaign_link: campaign.campaign_link || '',
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      total_spend: campaign.total_spend,
      total_leads: campaign.total_leads,
      total_messages: campaign.total_messages,
      status: campaign.status,
      notes: campaign.notes || ''
    });
    setSelectedCampaign(campaign);
    setEditDialog(true);
  };

  const viewAnalytics = async (campaign) => {
    setSelectedCampaign(campaign);
    try {
      const response = await campaignAPI.getAnalytics(campaign.id);
      setCampaignAnalytics(response.data);
      setAnalyticsDialog(true);
    } catch (error) {
      toast.error('Failed to fetch analytics');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      'Active': 'bg-green-100 text-green-700',
      'Completed': 'bg-blue-100 text-blue-700',
      'Paused': 'bg-yellow-100 text-yellow-700'
    };
    return <Badge className={colors[status] || 'bg-slate-100'}>{status}</Badge>;
  };

  // Summary stats
  const totalSpend = campaigns.reduce((sum, c) => sum + (c.total_spend || 0), 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + (c.total_leads || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'Active').length;

  return (
    <div className="space-y-6" data-testid="campaign-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Campaign Management</h1>
          <p className="text-slate-600">Track and analyze your marketing campaigns</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateDialog(true); }} data-testid="create-campaign-btn">
          <Plus className="w-4 h-4 mr-2" /> Add Campaign
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-slate-600">Total Campaigns</span>
            </div>
            <p className="text-2xl font-bold mt-1">{campaigns.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm text-slate-600">Active Campaigns</span>
            </div>
            <p className="text-2xl font-bold mt-1">{activeCampaigns}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-slate-600">Total Spend</span>
            </div>
            <p className="text-2xl font-bold mt-1">₹{totalSpend.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-slate-600">Total Leads Reported</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalLeads}</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card className="border-slate-200 shadow-soft">
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading...</div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              No campaigns yet. Click "Add Campaign" to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Campaign</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Platform</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Spend</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Leads</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{campaign.campaign_name}</p>
                          {campaign.campaign_link && (
                            <a href={campaign.campaign_link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" /> View Link
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{campaign.platform}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {campaign.start_date} to {campaign.end_date}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        ₹{campaign.total_spend?.toLocaleString() || 0}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{campaign.total_leads || 0}</span>
                        <span className="text-xs text-slate-500 ml-1">leads</span>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(campaign.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => viewAnalytics(campaign)} title="View Analytics">
                            <BarChart3 className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(campaign)} title="Edit">
                            <Edit className="w-4 h-4 text-green-500" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(campaign.id)} title="Delete">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Campaign Dialog */}
      <Dialog open={createDialog || editDialog} onOpenChange={(open) => { if (!open) { setCreateDialog(false); setEditDialog(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editDialog ? 'Edit Campaign' : 'Create New Campaign'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input
                value={formData.campaign_name}
                onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                placeholder="e.g., Summer Enrollment Drive 2026"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Platform *</Label>
              <Select value={formData.platform} onValueChange={(v) => setFormData({ ...formData, platform: v })}>
                <SelectTrigger><SelectValue placeholder="Select Platform" /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Campaign Link</Label>
              <Input
                value={formData.campaign_link}
                onChange={(e) => setFormData({ ...formData, campaign_link: e.target.value })}
                placeholder="https://..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Total Spend (₹)</Label>
                <Input
                  type="number"
                  value={formData.total_spend}
                  onChange={(e) => setFormData({ ...formData, total_spend: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Total Leads</Label>
                <Input
                  type="number"
                  value={formData.total_leads}
                  onChange={(e) => setFormData({ ...formData, total_leads: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Messages</Label>
                <Input
                  type="number"
                  value={formData.total_messages}
                  onChange={(e) => setFormData({ ...formData, total_messages: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Paused">Paused</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this campaign..."
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => { setCreateDialog(false); setEditDialog(false); }}>Cancel</Button>
              <Button onClick={editDialog ? handleUpdate : handleCreate} disabled={saving}>
                {saving ? 'Saving...' : (editDialog ? 'Update Campaign' : 'Create Campaign')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={analyticsDialog} onOpenChange={setAnalyticsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Campaign Analytics: {selectedCampaign?.campaign_name}</DialogTitle>
          </DialogHeader>
          {campaignAnalytics && (
            <div className="space-y-6 py-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-3">
                    <p className="text-xs text-blue-700">Leads Acquired</p>
                    <p className="text-xl font-bold text-blue-700">{campaignAnalytics.analytics.total_leads_acquired}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="pt-3">
                    <p className="text-xs text-green-700">Converted</p>
                    <p className="text-xl font-bold text-green-700">{campaignAnalytics.analytics.converted_leads}</p>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="pt-3">
                    <p className="text-xs text-orange-700">Cost/Lead</p>
                    <p className="text-xl font-bold text-orange-700">₹{campaignAnalytics.analytics.cost_per_lead}</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="pt-3">
                    <p className="text-xs text-purple-700">Conversion Rate</p>
                    <p className="text-xl font-bold text-purple-700">{campaignAnalytics.analytics.conversion_rate}%</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Lead Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Lead Status Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {Object.entries(campaignAnalytics.lead_status_breakdown).map(([status, count]) => (
                      <div key={status} className="text-center p-2 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-600 capitalize">{status.replace('_', ' ')}</p>
                        <p className="text-lg font-bold">{count}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* ROI Indicator */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-600">Total Spend</p>
                  <p className="text-xl font-bold">₹{campaignAnalytics.analytics.total_spend?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Cost per Conversion</p>
                  <p className="text-xl font-bold">₹{campaignAnalytics.analytics.cost_per_conversion}</p>
                </div>
                <div>
                  <Badge className={campaignAnalytics.analytics.roi_indicator === 'Positive' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                    {campaignAnalytics.analytics.roi_indicator}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignManagement;
