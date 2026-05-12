import React, { useState, useEffect } from 'react';
import { resourcesAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, FileText, Image, Video, File, Trash2, ExternalLink, Download } from 'lucide-react';

const RESOURCE_TYPES = [
  { value: 'Brochure', label: 'Brochure', icon: FileText },
  { value: 'Creative', label: 'Creative', icon: Image },
  { value: 'Video', label: 'Video', icon: Video },
  { value: 'Document', label: 'Document', icon: File },
];

const ResourcesPage = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [form, setForm] = useState({
    title: '',
    description: '',
    resource_type: 'Brochure',
    file_url: '',
    video_link: ''
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'Admin';

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const res = await resourcesAPI.getAll();
      setResources(res.data);
    } catch (error) {
      toast.error('Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.resource_type) {
      toast.error('Please fill in required fields');
      return;
    }
    try {
      await resourcesAPI.create(form);
      toast.success('Resource created successfully');
      setCreateDialog(false);
      setForm({
        title: '',
        description: '',
        resource_type: 'Brochure',
        file_url: '',
        video_link: ''
      });
      fetchResources();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create resource');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      await resourcesAPI.delete(id);
      toast.success('Resource deleted');
      fetchResources();
    } catch (error) {
      toast.error('Failed to delete resource');
    }
  };

  const getResourceIcon = (type) => {
    const resourceType = RESOURCE_TYPES.find(r => r.value === type);
    const IconComponent = resourceType?.icon || File;
    return <IconComponent className="w-8 h-8" />;
  };

  const getResourceTypeColor = (type) => {
    switch (type) {
      case 'Brochure': return 'bg-blue-100 text-blue-700';
      case 'Creative': return 'bg-purple-100 text-purple-700';
      case 'Video': return 'bg-red-100 text-red-700';
      case 'Document': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredResources = activeTab === 'all' 
    ? resources 
    : resources.filter(r => r.resource_type === activeTab);

  return (
    <div className="space-y-6" data-testid="resources-page">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Marketing Resources</h1>
          <p className="text-slate-600">Brochures, creatives, videos, and learning materials</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateDialog(true)} className="bg-slate-900 hover:bg-slate-800" data-testid="add-resource-btn">
            <Plus className="w-4 h-4 mr-2" /> Add Resource
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({resources.length})</TabsTrigger>
          {RESOURCE_TYPES.map(type => (
            <TabsTrigger key={type.value} value={type.value}>
              {type.label} ({resources.filter(r => r.resource_type === type.value).length})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((resource) => (
              <Card key={resource.id} className="border-slate-200 shadow-soft hover:shadow-lifted transition-shadow" data-testid={`resource-${resource.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg ${getResourceTypeColor(resource.resource_type)}`}>
                      {getResourceIcon(resource.resource_type)}
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(resource.id)}
                        data-testid={`delete-resource-${resource.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <CardTitle className="text-lg mt-3">{resource.title}</CardTitle>
                  <CardDescription>{resource.description || 'No description'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge className={getResourceTypeColor(resource.resource_type)}>
                    {resource.resource_type}
                  </Badge>
                  <div className="mt-4 flex gap-2">
                    {resource.file_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(resource.file_url, '_blank')}
                      >
                        <Download className="w-4 h-4 mr-1" /> Download
                      </Button>
                    )}
                    {resource.video_link && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(resource.video_link, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" /> Watch
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredResources.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              {loading ? 'Loading...' : 'No resources found'}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Resource Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Marketing Resource</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Resource title"
                required
                data-testid="resource-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="w-full min-h-20 px-3 py-2 border border-slate-200 rounded-md text-sm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description..."
              />
            </div>
            <div className="space-y-2">
              <Label>Resource Type *</Label>
              <Select value={form.resource_type} onValueChange={(v) => setForm({ ...form, resource_type: v })}>
                <SelectTrigger data-testid="resource-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.resource_type === 'Video' ? (
              <div className="space-y-2">
                <Label>Video Link (YouTube/Vimeo)</Label>
                <Input
                  value={form.video_link}
                  onChange={(e) => setForm({ ...form, video_link: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                  data-testid="video-link"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>File URL</Label>
                <Input
                  value={form.file_url}
                  onChange={(e) => setForm({ ...form, file_url: e.target.value })}
                  placeholder="https://drive.google.com/..."
                  data-testid="file-url"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="save-resource-btn">
                Add Resource
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResourcesPage;
