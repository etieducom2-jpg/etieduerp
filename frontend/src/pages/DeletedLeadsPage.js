import React, { useState, useEffect } from 'react';
import { deletedLeadsAPI } from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Trash2, User, Calendar, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const DeletedLeadsPage = () => {
  const [deletedLeads, setDeletedLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeletedLeads();
  }, []);

  const fetchDeletedLeads = async () => {
    try {
      const res = await deletedLeadsAPI.getDeleted();
      setDeletedLeads(res.data);
    } catch (error) {
      toast.error('Failed to fetch deleted leads');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-700';
      case 'Contacted': return 'bg-yellow-100 text-yellow-700';
      case 'Demo Booked': return 'bg-purple-100 text-purple-700';
      case 'Follow-up': return 'bg-orange-100 text-orange-700';
      case 'Converted': return 'bg-green-100 text-green-700';
      case 'Lost': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6" data-testid="deleted-leads-page">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-red-100 rounded-lg">
          <Trash2 className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-1">Deleted Leads</h1>
          <p className="text-slate-600">View all leads that have been deleted from the system</p>
        </div>
      </div>

      <Card className="bg-red-50 border-red-200">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-red-700">Total Deleted Leads: <strong>{deletedLeads.length}</strong></span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-soft">
        <CardHeader>
          <CardTitle>Deleted Leads History</CardTitle>
          <CardDescription>Audit trail of all deleted leads with deletion details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Lead Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Program</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Last Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Deleted By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Deleted On</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {deletedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50" data-testid={`deleted-lead-${lead.id}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-xs text-slate-500">{lead.city || 'N/A'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm">{lead.number}</p>
                      <p className="text-xs text-slate-500">{lead.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{lead.program_name || 'N/A'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {lead.created_at ? format(new Date(lead.created_at), 'dd MMM yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-500" />
                        <span className="text-sm">{lead.deleted_by_name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        {lead.deleted_at ? format(new Date(lead.deleted_at), 'dd MMM yyyy HH:mm') : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                      {lead.deletion_reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {deletedLeads.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                {loading ? 'Loading...' : 'No deleted leads found'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeletedLeadsPage;
