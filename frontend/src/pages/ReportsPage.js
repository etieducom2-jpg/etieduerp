import React, { useState, useEffect } from 'react';
import { reportsAPI, adminAPI, deletedLeadsAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, Filter, FileText, DollarSign, Users, CreditCard, Clock, Calendar, FileSpreadsheet, Trash2, RotateCcw, Search } from 'lucide-react';

const STATUSES = ['All', 'New', 'Contacted', 'Demo Booked', 'Follow-up', 'Converted', 'Lost'];
const SOURCES = ['All', 'Website', 'Social Media', 'Referral', 'Walk-in', 'Phone Call', 'Google'];

const ReportsPage = () => {
  const [programs, setPrograms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [reportType, setReportType] = useState('leads');
  const [filters, setFilters] = useState({
    status: 'All',
    source: 'All',
    program_id: 'All',
    branch_id: 'All',
    start_date: '',
    end_date: '',
  });
  const [generating, setGenerating] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'Admin';
  const isBranchAdmin = user.role === 'Branch Admin';
  const isCounsellor = user.role === 'Counsellor';
  const isFDE = user.role === 'Front Desk Executive';

  // Define all report types
  const allReportTypes = [
    { id: 'leads', label: 'Leads Report', icon: Users, description: 'Lead ID, Name, Phone, Course, Source', roles: ['Admin', 'Branch Admin', 'Counsellor', 'Front Desk Executive'] },
    { id: 'enrollments', label: 'Enrollments Report', icon: FileText, description: 'Student enrollments and program details', roles: ['Admin', 'Branch Admin', 'Front Desk Executive'] },
    { id: 'income', label: 'Monthly Collection Report', icon: DollarSign, description: 'Receipt No, Name, Number, Amount, Mode, Date', roles: ['Admin', 'Branch Admin', 'Front Desk Executive'] },
    { id: 'expenses', label: 'Expense Report', icon: CreditCard, description: 'Name, Date, Amount, Description', roles: ['Admin', 'Branch Admin'] },
    { id: 'pending_payments', label: 'Pending Payment Report', icon: Clock, description: 'Name, Course, Number, Final/Paid/Pending Fee', roles: ['Admin', 'Branch Admin', 'Front Desk Executive'] },
    { id: 'fee_collection', label: 'Monthly Fee Collection', icon: Calendar, description: 'Installments due in selected month', roles: ['Admin', 'Branch Admin'] },
    { id: 'deleted_leads', label: 'Deleted Leads', icon: Trash2, description: 'View and restore deleted leads', roles: ['Admin', 'Branch Admin'] },
  ];

  // Deleted Leads State
  const [deletedLeads, setDeletedLeads] = useState([]);
  const [deletedLeadsLoading, setDeletedLeadsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [restoringId, setRestoringId] = useState(null);

  // Filter report types based on user role
  const reportTypes = allReportTypes.filter(type => type.roles.includes(user.role));

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (reportType === 'deleted_leads') {
      fetchDeletedLeads();
    }
  }, [reportType]);

  const fetchOptions = async () => {
    try {
      const [programRes, branchRes] = await Promise.all([
        adminAPI.getPrograms(),
        adminAPI.getBranches(),
      ]);
      setPrograms(programRes.data);
      setBranches(branchRes.data);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const fetchDeletedLeads = async () => {
    setDeletedLeadsLoading(true);
    try {
      const response = await deletedLeadsAPI.getAll();
      setDeletedLeads(response.data);
    } catch (error) {
      toast.error('Failed to fetch deleted leads');
    } finally {
      setDeletedLeadsLoading(false);
    }
  };

  const handleRestoreLead = async (leadId) => {
    setRestoringId(leadId);
    try {
      await deletedLeadsAPI.restore(leadId);
      toast.success('Lead restored successfully!');
      fetchDeletedLeads();
    } catch (error) {
      toast.error('Failed to restore lead');
    } finally {
      setRestoringId(null);
    }
  };

  const filteredDeletedLeads = deletedLeads.filter(lead => 
    lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.number?.includes(searchTerm)
  );

  const handleGenerateReport = async (customReportType = null, customStartDate = null) => {
    setGenerating(true);
    try {
      const actualReportType = customReportType || reportType;
      const cleanFilters = { report_type: actualReportType };
      
      // Use custom start_date if provided (for quick fee collection)
      if (customStartDate) {
        cleanFilters.start_date = customStartDate;
      } else {
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value !== 'All') {
            cleanFilters[key] = value;
          }
        });
      }

      const response = await reportsAPI.generateReport(cleanFilters);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${actualReportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Report generated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleQuickFeeCollection = () => {
    const currentMonthStart = new Date().toISOString().slice(0, 7) + '-01';
    handleGenerateReport('fee_collection', currentMonthStart);
  };

  const resetFilters = () => {
    setFilters({
      status: 'All',
      source: 'All',
      program_id: 'All',
      branch_id: 'All',
      start_date: '',
      end_date: '',
    });
  };

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Reports</h1>
        <p className="text-slate-600">Generate custom reports with filters</p>
      </div>

      {/* Report Type Selection */}
      <Card className="border-slate-200 shadow-soft">
        <CardHeader>
          <CardTitle>Select Report Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {reportTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setReportType(type.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  reportType === type.id
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                data-testid={`report-type-${type.id}`}
              >
                <type.icon className={`w-6 h-6 mb-2 ${reportType === type.id ? 'text-slate-900' : 'text-slate-500'}`} />
                <p className="font-medium text-sm">{type.label}</p>
                <p className="text-xs text-slate-500 mt-1">{type.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Monthly Fee Collection Download - Branch Admin only */}
      {(isBranchAdmin || isSuperAdmin) && (
        <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <FileSpreadsheet className="w-5 h-5" />
              Monthly Fee Collection Report
            </CardTitle>
            <CardDescription className="text-green-700">
              Download installments due for any month - Available on 1st of every month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-green-800">
                  <strong>Current Month:</strong> {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Includes: Student ID, Name, Phone, Course, Total Fee, Paid Fee, Due Amount, Due Date
                </p>
              </div>
              <Button 
                onClick={handleQuickFeeCollection}
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={generating}
                data-testid="quick-fee-collection-btn"
              >
                <Download className="w-4 h-4 mr-2" />
                Download {new Date().toLocaleString('default', { month: 'short' })} Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border-slate-200 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Branch Filter - Super Admin only */}
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select
                  value={filters.branch_id}
                  onValueChange={(value) => setFilters({ ...filters, branch_id: value })}
                >
                  <SelectTrigger data-testid="branch-filter">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date Filters */}
            {reportType !== 'fee_collection' && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={filters.start_date}
                    onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                    data-testid="start-date-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={filters.end_date}
                    onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                    data-testid="end-date-input"
                  />
                </div>
              </>
            )}

            {/* Month Picker for Fee Collection Report */}
            {reportType === 'fee_collection' && (
              <div className="space-y-2">
                <Label>Select Month</Label>
                <Input
                  type="month"
                  value={filters.start_date ? filters.start_date.slice(0, 7) : new Date().toISOString().slice(0, 7)}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value + '-01' })}
                  data-testid="month-picker"
                />
                <p className="text-xs text-slate-500">Select the month to view all installments due</p>
              </div>
            )}

            {/* Lead-specific Filters */}
            {reportType === 'leads' && (
              <>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters({ ...filters, status: value })}
                  >
                    <SelectTrigger data-testid="status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Lead Source</Label>
                  <Select
                    value={filters.source}
                    onValueChange={(value) => setFilters({ ...filters, source: value })}
                  >
                    <SelectTrigger data-testid="source-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCES.map((source) => (
                        <SelectItem key={source} value={source}>
                          {source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Program</Label>
                  <Select
                    value={filters.program_id}
                    onValueChange={(value) => setFilters({ ...filters, program_id: value })}
                  >
                    <SelectTrigger data-testid="program-filter">
                      <SelectValue placeholder="All Programs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Programs</SelectItem>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetFilters}>
              Reset Filters
            </Button>
            <Button
              onClick={() => handleGenerateReport()}
              disabled={generating}
              className="bg-slate-900 hover:bg-slate-800"
              data-testid="generate-report-button"
            >
              <Download className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'Download Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deleted Leads Section */}
      {reportType === 'deleted_leads' && (
        <Card className="border-slate-200 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Deleted Leads
            </CardTitle>
            <CardDescription>
              View and restore previously deleted leads
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="deleted-leads-search"
              />
            </div>

            {deletedLeadsLoading ? (
              <div className="text-center py-8 text-slate-500">Loading deleted leads...</div>
            ) : filteredDeletedLeads.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                {searchTerm ? 'No matching deleted leads found' : 'No deleted leads'}
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {filteredDeletedLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <p className="font-semibold">{lead.name}</p>
                      <p className="text-sm text-slate-500">{lead.email} • {lead.number}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{lead.program || 'N/A'}</Badge>
                        <Badge className="bg-red-100 text-red-700 text-xs">{lead.status || 'Deleted'}</Badge>
                      </div>
                      {lead.deleted_at && (
                        <p className="text-xs text-slate-400 mt-1">
                          Deleted: {new Date(lead.deleted_at).toLocaleDateString()}
                          {lead.deleted_by_name && ` by ${lead.deleted_by_name}`}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestoreLead(lead.id)}
                      disabled={restoringId === lead.id}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                      data-testid={`restore-lead-${lead.id}`}
                    >
                      <RotateCcw className={`w-4 h-4 mr-1 ${restoringId === lead.id ? 'animate-spin' : ''}`} />
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report Info */}
      <Card className="border-slate-200 shadow-soft">
        <CardHeader>
          <CardTitle>Report Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
            <p className="text-sm text-slate-600">
              Reports are generated in CSV format and can be opened in Excel or Google Sheets
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
            <p className="text-sm text-slate-600">
              {isBranchAdmin 
                ? 'Reports are automatically filtered to your branch data only'
                : 'Super Admin can generate reports for all branches or filter by specific branch'
              }
            </p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
            <p className="text-sm text-slate-600">
              Use date filters to generate reports for specific time periods
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage;
