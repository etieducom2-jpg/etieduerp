import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { adminAPI, metaAPI } from '@/api/api';
import { Facebook, Instagram, Settings, Plus, Check, X, Copy, ExternalLink, AlertTriangle, RefreshCw } from 'lucide-react';

const MetaSettingsPage = () => {
  const [branches, setBranches] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    branch_id: '',
    app_id: '',
    app_secret: '',
    page_id: '',
    page_ids: [],
    ad_account_id: '',
    instagram_account_id: '',
    access_token: ''
  });

  const API_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [branchesRes, configsRes] = await Promise.all([
        adminAPI.getBranches(),
        metaAPI.getAllConfigs()
      ]);
      setBranches(branchesRes.data);
      setConfigs(configsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (branch = null, config = null) => {
    if (config) {
      // Edit mode
      setEditMode(true);
      setSelectedBranch(branch);
      setFormData({
        branch_id: config.branch_id,
        app_id: config.app_id || '',
        app_secret: '', // Don't populate for security
        page_id: config.page_id || '',
        page_ids: config.page_ids || [],
        ad_account_id: config.ad_account_id || '',
        instagram_account_id: config.instagram_account_id || '',
        access_token: '' // Don't populate for security
      });
    } else {
      // Create mode
      setEditMode(false);
      setSelectedBranch(null);
      setFormData({
        branch_id: '',
        app_id: '',
        app_secret: '',
        page_id: '',
        page_ids: [],
        ad_account_id: '',
        instagram_account_id: '',
        access_token: ''
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.branch_id || !formData.app_id || !formData.page_id) {
      toast.error('Branch, App ID, and Page ID are required');
      return;
    }

    setSaving(true);
    try {
      if (editMode) {
        // Update only non-empty fields
        const updateData = {};
        if (formData.app_id) updateData.app_id = formData.app_id;
        if (formData.app_secret) updateData.app_secret = formData.app_secret;
        if (formData.page_id) updateData.page_id = formData.page_id;
        if (formData.page_ids.length > 0) updateData.page_ids = formData.page_ids;
        if (formData.ad_account_id) updateData.ad_account_id = formData.ad_account_id;
        if (formData.instagram_account_id) updateData.instagram_account_id = formData.instagram_account_id;
        if (formData.access_token) updateData.access_token = formData.access_token;

        await metaAPI.updateConfig(formData.branch_id, updateData);
        toast.success('Meta configuration updated');
      } else {
        if (!formData.app_secret) {
          toast.error('App Secret is required for new configuration');
          setSaving(false);
          return;
        }
        const response = await metaAPI.createConfig(formData);
        toast.success('Meta configuration saved! Webhook verify token: ' + response.data.webhook_verify_token);
      }
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getConfigForBranch = (branchId) => {
    return configs.find(c => c.branch_id === branchId);
  };

  const configuredBranchIds = configs.map(c => c.branch_id);
  const unconfiguredBranches = branches.filter(b => !configuredBranchIds.includes(b.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="meta-settings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Facebook className="w-7 h-7 text-blue-600" />
            Meta Integration Settings
          </h1>
          <p className="text-slate-600 mt-1">
            Configure Facebook & Instagram integration for each branch
          </p>
        </div>
        {unconfiguredBranches.length > 0 && (
          <Button onClick={() => handleOpenDialog()} data-testid="add-meta-config-btn">
            <Plus className="w-4 h-4 mr-2" />
            Add Configuration
          </Button>
        )}
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Setup Instructions:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Create a Meta Developer App at <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">developers.facebook.com</a></li>
                <li>Enable "Webhooks" and "Page" products in your app</li>
                <li>Generate a Page Access Token with <code className="bg-blue-100 px-1 rounded">leads_retrieval</code> and <code className="bg-blue-100 px-1 rounded">pages_read_engagement</code> permissions</li>
                <li>Configure the webhook URL shown below for each branch</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook URL Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Webhook Endpoint</CardTitle>
          <CardDescription>Use this URL in your Meta App's Webhook configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg font-mono text-sm">
            <code className="flex-1 break-all">{API_URL}/api/webhooks/facebook-leads</code>
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`${API_URL}/api/webhooks/facebook-leads`)}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Select "page" object and subscribe to "leadgen" field when setting up the webhook
          </p>
        </CardContent>
      </Card>

      {/* Configured Branches */}
      <div className="grid gap-4 md:grid-cols-2">
        {branches.map(branch => {
          const config = getConfigForBranch(branch.id);
          return (
            <Card key={branch.id} className={config ? 'border-green-200' : 'border-slate-200'}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{branch.name}</CardTitle>
                  {config ? (
                    <Badge className="bg-green-100 text-green-700">
                      <Check className="w-3 h-3 mr-1" /> Configured
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <X className="w-3 h-3 mr-1" /> Not Configured
                    </Badge>
                  )}
                </div>
                <CardDescription>{branch.city}, {branch.state}</CardDescription>
              </CardHeader>
              <CardContent>
                {config ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-500">App ID:</span>
                        <span className="ml-2 font-mono">{config.app_id}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Page ID:</span>
                        <span className="ml-2 font-mono">{config.page_id}</span>
                      </div>
                      {config.ad_account_id && (
                        <div className="col-span-2">
                          <span className="text-slate-500">Ad Account:</span>
                          <span className="ml-2 font-mono">{config.ad_account_id}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => handleOpenDialog(branch, config)}>
                        <Settings className="w-4 h-4 mr-1" /> Edit
                      </Button>
                      <div className="flex-1 text-xs text-slate-500">
                        Verify Token: <code className="bg-slate-100 px-1 rounded">{config.webhook_verify_token?.substring(0, 12)}...</code>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-1" onClick={() => copyToClipboard(config.webhook_verify_token)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => {
                    setFormData(prev => ({ ...prev, branch_id: branch.id }));
                    handleOpenDialog();
                  }}>
                    <Plus className="w-4 h-4 mr-1" /> Configure
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configuration Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Facebook className="w-5 h-5 text-blue-600" />
              {editMode ? 'Edit Meta Configuration' : 'Add Meta Configuration'}
            </DialogTitle>
            <DialogDescription>
              Enter your Meta App credentials for this branch
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!editMode && (
              <div>
                <Label>Branch *</Label>
                <Select
                  value={formData.branch_id}
                  onValueChange={(value) => setFormData({ ...formData, branch_id: value })}
                >
                  <SelectTrigger data-testid="branch-select">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {unconfiguredBranches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name} - {branch.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>App ID *</Label>
                <Input
                  data-testid="app-id-input"
                  value={formData.app_id}
                  onChange={(e) => setFormData({ ...formData, app_id: e.target.value })}
                  placeholder="1234567890"
                />
              </div>
              <div>
                <Label>App Secret {!editMode && '*'}</Label>
                <Input
                  data-testid="app-secret-input"
                  type="password"
                  value={formData.app_secret}
                  onChange={(e) => setFormData({ ...formData, app_secret: e.target.value })}
                  placeholder={editMode ? '(leave blank to keep existing)' : 'Enter app secret'}
                />
              </div>
            </div>

            <div>
              <Label>Primary Page ID *</Label>
              <Input
                data-testid="page-id-input"
                value={formData.page_id}
                onChange={(e) => setFormData({ ...formData, page_id: e.target.value })}
                placeholder="123456789012345"
              />
            </div>

            <div>
              <Label>Additional Page IDs (comma-separated)</Label>
              <Input
                value={formData.page_ids.join(', ')}
                onChange={(e) => setFormData({
                  ...formData,
                  page_ids: e.target.value.split(',').map(id => id.trim()).filter(Boolean)
                })}
                placeholder="page_id_1, page_id_2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ad Account ID</Label>
                <Input
                  value={formData.ad_account_id}
                  onChange={(e) => setFormData({ ...formData, ad_account_id: e.target.value })}
                  placeholder="act_123456789"
                />
                <p className="text-xs text-slate-500 mt-1">For ads performance data</p>
              </div>
              <div>
                <Label>Instagram Account ID</Label>
                <Input
                  value={formData.instagram_account_id}
                  onChange={(e) => setFormData({ ...formData, instagram_account_id: e.target.value })}
                  placeholder="17841234567890"
                />
                <p className="text-xs text-slate-500 mt-1">For Instagram insights</p>
              </div>
            </div>

            <div>
              <Label>Page Access Token {!editMode && '*'}</Label>
              <Input
                data-testid="access-token-input"
                type="password"
                value={formData.access_token}
                onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                placeholder={editMode ? '(leave blank to keep existing)' : 'Enter access token'}
              />
              <p className="text-xs text-slate-500 mt-1">
                Long-lived token with leads_retrieval, pages_read_engagement permissions
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} data-testid="save-meta-config-btn">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              {editMode ? 'Update' : 'Save'} Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MetaSettingsPage;
