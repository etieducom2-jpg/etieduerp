import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Plus } from 'lucide-react';

const BranchesTab = ({ 
  branches, 
  onAddBranch, 
  onEditBranch, 
  onDeleteBranch 
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Branches</h2>
        <Button onClick={onAddBranch} className="bg-slate-900 hover:bg-slate-800">
          <Plus className="w-4 h-4 mr-2" /> Add Branch
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((branch) => (
          <Card key={branch.id} className="border-slate-200 shadow-soft">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-slate-600" />
                  <CardTitle className="text-lg">{branch.name}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditBranch(branch)}
                    className="h-8 w-8 p-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteBranch(branch.id)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-sm text-slate-600">{branch.location}</p>
                <p className="text-xs text-slate-500">{branch.city}, {branch.state} - {branch.pincode}</p>
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-700">Branch Owner:</p>
                  <p className="text-xs text-slate-600">{branch.owner_name} ({branch.owner_designation})</p>
                  <p className="text-xs text-slate-500">{branch.branch_phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BranchesTab;
