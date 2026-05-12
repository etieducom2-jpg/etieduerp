import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, Plus, Trash2 } from 'lucide-react';

const ExamsTab = ({ 
  exams, 
  onAddExam, 
  onDeleteExam 
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">International Exams</h2>
          <p className="text-slate-600 text-sm">Manage exam types and their prices</p>
        </div>
        <Button onClick={onAddExam} className="bg-slate-900 hover:bg-slate-800" data-testid="add-exam-btn">
          <Plus className="w-4 h-4 mr-2" /> Add Exam Type
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exams.map((exam) => (
          <Card key={exam.id} className="border-slate-200 shadow-soft" data-testid={`exam-${exam.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-lg">{exam.name}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDeleteExam(exam.id)}
                  data-testid={`delete-exam-${exam.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">{exam.description || 'No description'}</p>
              <p className="text-2xl font-bold text-green-600 mt-2">₹{exam.price?.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
        {exams.length === 0 && (
          <div className="col-span-3 text-center py-12 text-slate-500">
            No exam types created yet. Click "Add Exam Type" to create one.
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamsTab;
