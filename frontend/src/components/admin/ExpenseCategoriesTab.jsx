import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Plus, Trash2 } from 'lucide-react';

const ExpenseCategoriesTab = ({ 
  categories, 
  onAddCategory, 
  onDeleteCategory 
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Expense Categories</h2>
        <Button onClick={onAddCategory} className="bg-slate-900 hover:bg-slate-800" data-testid="add-category-btn">
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card key={category.id} className="border-slate-200 shadow-soft" data-testid={`category-${category.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-slate-600" />
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDeleteCategory(category.id)}
                  data-testid={`delete-category-${category.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">{category.description || 'No description'}</p>
            </CardContent>
          </Card>
        ))}
        {categories.length === 0 && (
          <div className="col-span-3 text-center py-12 text-slate-500">
            No expense categories created yet. Click "Add Category" to create one.
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseCategoriesTab;
