import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { royaltyAPI } from '@/api/api';
import { DollarSign, CheckCircle, Clock, Building2, RefreshCw, Calendar, TrendingUp, AlertCircle } from 'lucide-react';

const RoyaltyCollectionPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, branch: null });
  const [marking, setMarking] = useState(false);

  // Get last month as default
  useEffect(() => {
    const today = new Date();
    if (today.getMonth() === 0) {
      setSelectedMonth(12);
      setSelectedYear(today.getFullYear() - 1);
    } else {
      setSelectedMonth(today.getMonth());
      setSelectedYear(today.getFullYear());
    }
  }, []);

  useEffect(() => {
    if (selectedMonth && selectedYear) {
      fetchData();
    }
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await royaltyAPI.getAllRoyalty(selectedMonth, selectedYear);
      setData(response.data);
    } catch (error) {
      toast.error('Failed to load royalty data');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!confirmDialog.branch) return;
    
    setMarking(true);
    try {
      await royaltyAPI.markPaid(confirmDialog.branch.branch_id, selectedMonth, selectedYear);
      toast.success(`Royalty marked as paid for ${confirmDialog.branch.branch_name}`);
      setConfirmDialog({ open: false, branch: null });
      fetchData();
    } catch (error) {
      toast.error('Failed to mark royalty as paid');
    } finally {
      setMarking(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Generate month options
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 3; y--) {
    years.push(y);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="royalty-collection-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-green-600" />
            Royalty Collection
          </h1>
          <p className="text-slate-600 mt-1">
            Track and manage branch royalty payments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total Royalty</p>
                    <p className="text-2xl font-bold text-slate-800">{formatCurrency(data.summary.total_royalty)}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Collected</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(data.summary.total_paid)}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Pending</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(data.summary.total_pending)}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Due Date</p>
                    <p className="text-lg font-bold text-slate-800">{data.due_date}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Branch-wise Table */}
          <Card>
            <CardHeader>
              <CardTitle>Branch-wise Royalty - {data.month_name}</CardTitle>
              <CardDescription>Royalty calculated on enrollment payments (excluding certification fees)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Branch</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">City</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">Royalty %</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">Collection</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">Royalty Amount</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-slate-500">Status</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-slate-500">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.branches.map((branch) => (
                      <tr key={branch.branch_id} className="border-b hover:bg-slate-50">
                        <td className="py-3 px-2 font-medium">{branch.branch_name}</td>
                        <td className="py-3 px-2 text-slate-600">{branch.city}</td>
                        <td className="py-3 px-2 text-right">{branch.royalty_percentage}%</td>
                        <td className="py-3 px-2 text-right">{formatCurrency(branch.total_collection)}</td>
                        <td className="py-3 px-2 text-right font-semibold">{formatCurrency(branch.royalty_amount)}</td>
                        <td className="py-3 px-2 text-center">
                          {branch.is_paid ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" /> Paid
                            </Badge>
                          ) : branch.royalty_amount > 0 ? (
                            <Badge className="bg-orange-100 text-orange-700">
                              <Clock className="w-3 h-3 mr-1" /> Pending
                            </Badge>
                          ) : (
                            <Badge variant="secondary">No Royalty</Badge>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {!branch.is_paid && branch.royalty_amount > 0 && (
                            <Button 
                              size="sm" 
                              onClick={() => setConfirmDialog({ open: true, branch })}
                            >
                              Mark Paid
                            </Button>
                          )}
                          {branch.is_paid && branch.paid_date && (
                            <span className="text-xs text-slate-500">
                              {new Date(branch.paid_date).toLocaleDateString()}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, branch: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Royalty Payment</DialogTitle>
          </DialogHeader>
          {confirmDialog.branch && (
            <div className="py-4">
              <p className="text-slate-600">
                Mark royalty as paid for <strong>{confirmDialog.branch.branch_name}</strong>?
              </p>
              <div className="mt-4 p-4 bg-slate-100 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-slate-600">Amount:</span>
                  <span className="font-bold">{formatCurrency(confirmDialog.branch.royalty_amount)}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-slate-600">Period:</span>
                  <span>{data?.month_name}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, branch: null })}>
              Cancel
            </Button>
            <Button onClick={handleMarkPaid} disabled={marking}>
              {marking ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoyaltyCollectionPage;
