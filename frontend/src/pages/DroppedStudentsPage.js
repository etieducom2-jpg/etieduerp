import React, { useState, useEffect } from 'react';
import { studentsAPI, adminAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { UserX, Search, Trash2, AlertTriangle, Ban } from 'lucide-react';
import { format } from 'date-fns';

const DroppedStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Permanent delete dialog
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'Admin';
  const isBranchAdmin = user.role === 'Branch Admin';
  const canDelete = isAdmin || isBranchAdmin;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studRes, branchesRes] = await Promise.all([
        studentsAPI.getAll(),
        isAdmin ? adminAPI.getBranches() : Promise.resolve({ data: [] }),
      ]);
      // Only Dropped / Cancelled / Inactive students
      const dropped = (studRes.data || []).filter((s) =>
        ['Dropped', 'Cancelled', 'Inactive'].includes(s.status)
      );
      setStudents(dropped);
      setBranches(branchesRes.data || []);
      setCurrentPage(1);
    } catch (error) {
      toast.error('Failed to fetch dropped students');
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter((s) => {
    if (branchFilter !== 'all' && s.branch_id !== branchFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.student_name || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q) ||
      (s.phone || '').toLowerCase().includes(q) ||
      (s.enrollment_id || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const openDeleteDialog = (student) => {
    setDeletingStudent(student);
    setDeleteReason('');
    setDeleteDialog(true);
  };

  const handlePermanentDelete = async () => {
    if (!deletingStudent) return;
    setDeleteLoading(true);
    try {
      const res = await studentsAPI.permanentDelete(deletingStudent.id, deleteReason);
      if (res?.data?.already_deleted) {
        toast.info(`${deletingStudent.student_name} was already removed — list refreshed`);
      } else {
        toast.success(`${deletingStudent.student_name} permanently deleted`);
      }
      setDeleteDialog(false);
      setDeletingStudent(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete student');
      fetchData();
    } finally {
      setDeleteLoading(false);
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case 'Dropped':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'Cancelled':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'Inactive':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserX className="w-7 h-7 text-red-600" /> Dropped Students
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Students who left the program (Dropped / Cancelled / Inactive).{' '}
            {canDelete && 'Branch Admin can permanently delete a student only if no fee has been received.'}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Total Dropped</p>
                <p className="text-2xl font-bold text-slate-900">
                  {students.filter((s) => s.status === 'Dropped').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Ban className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Cancelled</p>
                <p className="text-2xl font-bold text-slate-900">
                  {students.filter((s) => s.status === 'Cancelled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Inactive</p>
                <p className="text-2xl font-bold text-slate-900">
                  {students.filter((s) => s.status === 'Inactive').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search &amp; Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-3 text-slate-400" />
                <Input
                  className="pl-8"
                  placeholder="Name, email, phone or enrollment ID"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
            {isAdmin && branches.length > 0 && (
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select
                  value={branchFilter}
                  onValueChange={(v) => {
                    setBranchFilter(v);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Program</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Fee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Paid / Balance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Enrolled</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Reason</th>
                  {canDelete && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pageRows.map((s) => {
                  const totalPaid = s.total_paid || 0;
                  const canPermDelete = canDelete && totalPaid === 0;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50" data-testid={`dropped-row-${s.id}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{s.student_name}</p>
                        <p className="text-xs text-slate-500 font-mono">{s.enrollment_id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{s.phone}</p>
                        <p className="text-xs text-slate-500">{s.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{s.program_name}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusColor(s.status)}>{s.status}</Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        ₹{(s.final_fee || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-green-700 font-semibold">
                          ₹{totalPaid.toLocaleString()}
                        </p>
                        {(s.pending_amount || 0) > 0 && (
                          <p className="text-xs text-slate-500">
                            Bal: ₹{(s.pending_amount || 0).toLocaleString()}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {s.enrollment_date
                          ? format(new Date(s.enrollment_date), 'dd MMM yyyy')
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-[200px]">
                        {s.cancellation_reason || <span className="text-slate-400 italic">—</span>}
                      </td>
                      {canDelete && (
                        <td className="px-4 py-3">
                          {canPermDelete ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => openDeleteDialog(s)}
                              data-testid={`perm-delete-${s.id}`}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Delete Permanently
                            </Button>
                          ) : (
                            <span
                              className="text-xs text-slate-400 italic"
                              title="Cannot delete: fee has been received"
                            >
                              Fee received — locked
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                {loading ? 'Loading...' : 'No dropped students found'}
              </div>
            )}
          </div>

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-2 py-3 border-t border-slate-200 mt-2">
              <p className="text-sm text-slate-600">
                Showing <span className="font-semibold">{pageStart + 1}</span> to{' '}
                <span className="font-semibold">{Math.min(pageStart + PAGE_SIZE, filtered.length)}</span> of{' '}
                <span className="font-semibold">{filtered.length}</span> students
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                  First
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-700 px-2">
                  Page <span className="font-semibold">{currentPage}</span> of{' '}
                  <span className="font-semibold">{totalPages}</span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permanent Delete Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Permanently Delete Student
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to <b>permanently delete</b>{' '}
              <b className="text-slate-900">{deletingStudent?.student_name}</b> (
              {deletingStudent?.enrollment_id}) from the system. This will remove the enrollment,
              payment plan, installment schedule, batch assignment, attendance, and add-on courses.
              <br />
              <br />
              This action <b>cannot be undone</b>. It is only allowed because no fee has been received
              for this student.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label>Reason (optional)</Label>
            <Input
              placeholder="e.g. Duplicate entry, wrong enrollment, etc."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-perm-delete"
            >
              {deleteLoading ? 'Deleting...' : 'Yes, Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DroppedStudentsPage;
