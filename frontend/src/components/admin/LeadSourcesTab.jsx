import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, Plus, Trash2 } from 'lucide-react';

const LeadSourcesTab = ({ 
  sources, 
  onAddSource, 
  onDeleteSource 
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Lead Sources</h2>
        <Button onClick={onAddSource} className="bg-slate-900 hover:bg-slate-800" data-testid="add-lead-source-btn">
          <Plus className="w-4 h-4 mr-2" /> Add Lead Source
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map((source) => (
          <Card key={source.id} className="border-slate-200 shadow-soft" data-testid={`lead-source-${source.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link className="w-5 h-5 text-slate-600" />
                  <CardTitle className="text-lg">{source.name}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDeleteSource(source.id)}
                  data-testid={`delete-source-${source.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">{source.description || 'No description'}</p>
            </CardContent>
          </Card>
        ))}
        {sources.length === 0 && (
          <div className="col-span-3 text-center py-12 text-slate-500">
            No lead sources created yet. Click "Add Lead Source" to create one.
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadSourcesTab;
