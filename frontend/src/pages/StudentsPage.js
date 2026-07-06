import React, { useState, useEffect } from 'react';
import { studentsAPI, paymentAPI, enrollmentAPI, adminAPI, uploadAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, GraduationCap, User, Phone, Mail, CreditCard, Printer, XCircle, Eye, Wallet, PlusCircle, BookPlus, Edit, Upload, Plus, IndianRupee, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

// Modular Dialog Components
import { PaymentDialog, ReceiptDialog, CancelEnrollmentDialog } from '@/components/students';
import { printFeeReceipt } from '@/utils/printFeeReceipt';

const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Net Banking', 'Cheque'];

const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 10;
  
  // Payment dialog state
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_mode: 'Cash',
    payment_date: new Date().toISOString().split('T')[0],
    installment_number: '',
    remarks: ''
  });
  const [savingPayment, setSavingPayment] = useState(false);
  
  // Receipt dialog
  const [receiptDialog, setReceiptDialog] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  
  // Add-on Course dialog
  const [addonDialog, setAddonDialog] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [addonForm, setAddonForm] = useState({
    program_id: '',
    fee_quoted: '',
    discount_percent: 0
  });
  const [savingAddon, setSavingAddon] = useState(false);
  const [addonCourses, setAddonCourses] = useState([]);
  
  // Edit Student dialog
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Permanent Delete dialog
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Create Payment Plan dialog
  const [createPlanDialog, setCreatePlanDialog] = useState(false);
  const [planForm, setPlanForm] = useState({
    plan_type: 'One-time',
    installments_count: 2,
    installments: []
  });
  const [savingPlan, setSavingPlan] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isBranchAdmin = user.role === 'Branch Admin';
  const isFDE = user.role === 'Front Desk Executive';
  const isSuperAdmin = user.role === 'Admin';
  const canCancel = isBranchAdmin;
  const canPay = isBranchAdmin || isFDE || user.role === 'Admin';
  const canEdit = isBranchAdmin || isFDE || isSuperAdmin;
  const canEditRestricted = isBranchAdmin || isSuperAdmin; // Can edit name, phone

  useEffect(() => {
    fetchStudents();
    fetchPrograms();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await studentsAPI.getAll();
      setStudents(response.data);
    } catch (error) {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    try {
      const response = await adminAPI.getPrograms();
      setPrograms(response.data);
    } catch (error) {
      console.error('Failed to fetch programs');
    }
  };

  const openAddonDialog = async (student) => {
    setSelectedStudent(student);
    setAddonForm({ program_id: '', fee_quoted: '', discount_percent: 0, discount_amount: 0, discount_type: 'percent' });
    try {
      const addons = await studentsAPI.getAddonCourses(student.id);
      setAddonCourses(addons.data);
    } catch (error) {
      setAddonCourses([]);
    }
    setAddonDialog(true);
  };

  const handleAddAddonCourse = async () => {
    if (!addonForm.program_id || !addonForm.fee_quoted) {
      toast.error('Please select a program and enter fee');
      return;
    }
    
    setSavingAddon(true);
    try {
      const response = await studentsAPI.addAddonCourse(selectedStudent.id, {
        enrollment_id: selectedStudent.id,
        program_id: addonForm.program_id,
        fee_quoted: parseFloat(addonForm.fee_quoted),
        discount_percent: addonForm.discount_type === 'percent' ? (parseFloat(addonForm.discount_percent) || 0) : 0,
        discount_amount: addonForm.discount_type === 'amount' ? (parseFloat(addonForm.discount_amount) || 0) : 0
      });
      toast.success(response.data.message);
      setAddonDialog(false);
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add course');
    } finally {
      setSavingAddon(false);
    }
  };

  // Open Create Payment Plan dialog
  const openCreatePlanDialog = (student) => {
    setSelectedStudent(student);
    const totalAmount = (student.final_fee || 0) - (student.total_paid || 0);
    setPlanForm({
      plan_type: 'One-time',
      installments_count: 2,
      installments: [
        { amount: Math.ceil(totalAmount / 2), due_date: '' },
        { amount: Math.floor(totalAmount / 2), due_date: '' }
      ]
    });
    setCreatePlanDialog(true);
  };

  // Handle installment count change
  const handleInstallmentCountChange = (count) => {
    const totalAmount = (selectedStudent?.final_fee || 0) - (selectedStudent?.total_paid || 0);
    const baseAmount = Math.floor(totalAmount / count);
    const remainder = totalAmount - (baseAmount * count);
    
    const newInstallments = [];
    for (let i = 0; i < count; i++) {
      newInstallments.push({
        amount: i === 0 ? baseAmount + remainder : baseAmount,
        due_date: ''
      });
    }
    setPlanForm(prev => ({
      ...prev,
      installments_count: count,
      installments: newInstallments
    }));
  };

  // Handle create payment plan
  const handleCreatePaymentPlan = async () => {
    if (!selectedStudent) return;
    
    if (planForm.plan_type === 'Installments') {
      // Validate installments
      const totalInstallmentAmount = planForm.installments.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
      const expectedAmount = (selectedStudent.final_fee || 0) - (selectedStudent.total_paid || 0);
      
      if (Math.abs(totalInstallmentAmount - expectedAmount) > 1) {
        toast.error(`Installment amounts must total ${expectedAmount.toFixed(2)}`);
        return;
      }
      
      // Check for missing dates - ensure we check the actual value, not just truthy
      const missingDates = planForm.installments.some(i => !i.due_date || i.due_date.trim() === '');
      if (missingDates) {
        toast.error('Please set due dates for all installments');
        return;
      }
    }
    
    setSavingPlan(true);
    try {
      const payload = {
        enrollment_id: selectedStudent.id,
        plan_type: planForm.plan_type,
        total_amount: (selectedStudent.final_fee || 0) - (selectedStudent.total_paid || 0)
      };
      
      if (planForm.plan_type === 'Installments') {
        payload.installments_count = planForm.installments_count;
        payload.installments = planForm.installments.map(i => ({
          amount: parseFloat(i.amount),
          due_date: i.due_date
        }));
      }
      
      await paymentAPI.createPaymentPlan(payload);
      toast.success('Payment plan created successfully');
      setCreatePlanDialog(false);
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create payment plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const calculateAddonFinalFee = () => {
    const quoted = parseFloat(addonForm.fee_quoted) || 0;
    if (addonForm.discount_type === 'amount') {
      const discountAmt = parseFloat(addonForm.discount_amount) || 0;
      return quoted - discountAmt;
    } else {
      const discountPct = parseFloat(addonForm.discount_percent) || 0;
      return quoted * (1 - discountPct / 100);
    }
  };

  const viewDetails = async (student) => {
    setSelectedStudent(student);
    try {
      const response = await studentsAPI.getDetails(student.id);
      setStudentDetails(response.data);
      setDetailsDialog(true);
    } catch (error) {
      toast.error('Failed to fetch student details');
    }
  };

  const openPaymentDialog = async (student) => {
    setSelectedStudent(student);
    try {
      // Fetch payment plan and installments
      const planRes = await enrollmentAPI.getPaymentPlan(student.id);
      setPaymentPlan(planRes.data);
      
      if (planRes.data?.installments) {
        // Get paid installments
        const paymentsRes = await enrollmentAPI.getEnrollmentPayments(student.id);
        const paidInstallments = paymentsRes.data
          .filter(p => p.installment_number)
          .map(p => p.installment_number);
        
        // Mark which installments are paid
        const installmentsWithStatus = planRes.data.installments.map(inst => ({
          ...inst,
          is_paid: paidInstallments.includes(inst.installment_number)
        }));
        setInstallments(installmentsWithStatus);
        
        // Auto-select first unpaid installment
        const firstUnpaid = installmentsWithStatus.find(i => !i.is_paid);
        if (firstUnpaid) {
          setPaymentForm(prev => ({
            ...prev,
            installment_number: firstUnpaid.installment_number.toString(),
            amount: firstUnpaid.amount.toString()
          }));
        }
      } else {
        setInstallments([]);
        // For one-time payment, set remaining amount
        const remaining = (student.final_fee || 0) - (student.total_paid || 0);
        setPaymentForm(prev => ({
          ...prev,
          amount: remaining > 0 ? remaining.toString() : '',
          installment_number: ''
        }));
      }
      
      setPaymentForm(prev => ({
        ...prev,
        payment_mode: 'Cash',
        payment_date: new Date().toISOString().split('T')[0],
        remarks: ''
      }));
      
      setPaymentDialog(true);
    } catch (error) {
      // No payment plan exists - need to create one first
      toast.error('Please create a payment plan first from Enrollments page');
    }
  };

  const handleInstallmentSelect = (installmentNum) => {
    const inst = installments.find(i => i.installment_number === parseInt(installmentNum));
    if (inst) {
      setPaymentForm(prev => ({
        ...prev,
        installment_number: installmentNum,
        amount: inst.amount.toString()
      }));
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    const totalFee = selectedStudent?.final_fee || 0;
    const totalPaid = selectedStudent?.total_paid || 0;
    const remainingAmount = totalFee - totalPaid;
    const paymentAmount = parseFloat(paymentForm.amount);
    
    if (paymentAmount > remainingAmount) {
      toast.error(`Payment amount (₹${paymentAmount.toLocaleString()}) cannot exceed pending fee (₹${remainingAmount.toLocaleString()})`);
      return;
    }
    
    setSavingPayment(true);
    try {
      const paymentRes = await paymentAPI.createPayment({
        enrollment_id: selectedStudent.id,
        payment_plan_id: paymentPlan?.id,
        amount: paymentAmount,
        payment_mode: paymentForm.payment_mode,
        payment_date: paymentForm.payment_date,
        installment_number: paymentForm.installment_number ? parseInt(paymentForm.installment_number) : null,
        remarks: paymentForm.remarks
      });
      
      toast.success('Payment recorded successfully!');
      setPaymentDialog(false);
      
      // Show receipt
      try {
        const receiptRes = await paymentAPI.generateReceipt(paymentRes.data.id);
        setReceiptData(receiptRes.data);
        setReceiptDialog(true);
      } catch {
        // Receipt generation failed, but payment was successful
      }
      
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    } finally {
      setSavingPayment(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!receiptData) return;
    printFeeReceipt(receiptData);
  };

  const handleCancelEnrollment = async () => {
    if (!selectedStudent) return;
    
    try {
      await studentsAPI.cancelEnrollment(selectedStudent.id, cancelReason);
      toast.success('Enrollment cancelled successfully');
      setCancelDialog(false);
      setCancelReason('');
      setDetailsDialog(false);
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel enrollment');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStatusChange = async (studentId, newStatus) => {
    try {
      await studentsAPI.updateStatus(studentId, newStatus);
      toast.success(`Student status updated to ${newStatus}`);
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    }
  };

  // Edit Student functions
  const openEditDialog = (student) => {
    setEditForm({
      student_name: student.student_name || '',
      student_phone: student.phone || student.student_phone || '',
      student_email: student.email || student.student_email || '',
      date_of_birth: student.date_of_birth || '',
      gender: student.gender || '',
      address: student.address || '',
      city: student.city || '',
      state: student.state || '',
      pincode: student.pincode || '',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      highest_qualification: student.highest_qualification || '',
      institution_name: student.institution_name || '',
      passing_year: student.passing_year || '',
      percentage: student.percentage || '',
      student_photo_url: student.student_photo_url || '',
      aadhar_photo_url: student.aadhar_photo_url || '',
      aadhar_documents: student.aadhar_documents || [],
      enrollment_date: student.enrollment_date || '',
      // Fee & Course fields for Branch Admin
      program_id: student.program_id || '',
      fee_quoted: student.fee_quoted || 0,
      discount_percent: student.discount_percent || 0,
      discount_amount: student.discount_amount || 0,
      final_fee: student.final_fee || 0,
    });
    setSelectedStudent(student);
    setEditDialog(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingPhoto(true);
    try {
      const response = await uploadAPI.uploadImage(file);
      setEditForm(prev => ({ ...prev, student_photo_url: response.data.url }));
      toast.success('Photo uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const [uploadingAadhar, setUploadingAadhar] = useState(false);

  const handleAadharUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingAadhar(true);
    const uploadedUrls = [...(editForm.aadhar_documents || [])];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const response = await uploadAPI.uploadImage(files[i]);
        uploadedUrls.push(response.data.url);
      }
      setEditForm(prev => ({ ...prev, aadhar_documents: uploadedUrls }));
      toast.success(`${files.length} Aadhar document(s) uploaded`);
    } catch (error) {
      toast.error('Failed to upload Aadhar documents');
    } finally {
      setUploadingAadhar(false);
    }
  };

  const removeAadharDoc = (index) => {
    const updatedDocs = [...(editForm.aadhar_documents || [])];
    updatedDocs.splice(index, 1);
    setEditForm(prev => ({ ...prev, aadhar_documents: updatedDocs }));
  };

  const handleSaveEdit = async () => {
    if (!selectedStudent) return;
    setSavingEdit(true);
    
    try {
      // Only send changed fields
      const updateData = {};
      Object.entries(editForm).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          // Skip student_name for FDE - they can't edit it
          if (key === 'student_name' && !isBranchAdmin && !isSuperAdmin) {
            return;
          }
          // Skip enrollment_date for FDE - only Branch Admin can edit
          if (key === 'enrollment_date' && !isBranchAdmin && !isSuperAdmin) {
            return;
          }
          // Skip fee/course fields for FDE - only Branch Admin can edit
          if (['discount_percent', 'discount_amount', 'final_fee', 'program_id', 'fee_quoted'].includes(key) && !isBranchAdmin && !isSuperAdmin) {
            return;
          }
          updateData[key] = value;
        }
      });
      
      await studentsAPI.updateDetails(selectedStudent.id, updateData);
      toast.success('Student details updated successfully');
      setEditDialog(false);
      fetchStudents();
      
      // Refresh details if viewing
      if (detailsDialog) {
        const detailsRes = await studentsAPI.getDetails(selectedStudent.id);
        setStudentDetails(detailsRes.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update student details');
    } finally {
      setSavingEdit(false);
    }
  };

  // Permanent Delete handlers
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
      setDeleteReason('');
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete student');
      // Always refresh the list on error so stale rows are cleaned up
      fetchStudents();
    } finally {
      setDeleteLoading(false);
    }
  };


  const filteredStudents = students.filter(s => {
    // Text search
    const matchesSearch = 
      s.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.enrollment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone?.includes(searchTerm) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Date filters
    const enrollmentDate = s.enrollment_date || s.created_at?.split('T')[0] || '';
    if (dateFrom && enrollmentDate < dateFrom) return false;
    if (dateTo && enrollmentDate > dateTo) return false;
    
    return true;
  });
  // Backend already returns data sorted by enrollment_date (latest first)
  // No additional frontend sorting needed
  
  // Paginated students
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * studentsPerPage,
    currentPage * studentsPerPage
  );
  
  // Reset page when filters change
  const resetPagination = () => setCurrentPage(1);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active': return <Badge className="bg-green-100 text-green-700">Active</Badge>;
      case 'Completed': return <Badge className="bg-blue-100 text-blue-700">Completed</Badge>;
      case 'Cancelled': return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
      case 'Dropped': return <Badge className="bg-orange-100 text-orange-700">Dropped</Badge>;
      case 'Inactive': return <Badge className="bg-gray-100 text-gray-700">Inactive</Badge>;
      default: return <Badge>{status || 'Active'}</Badge>;
    }
  };

  const getPaymentStatus = (paid, total) => {
    if (paid >= total) return <Badge className="bg-green-100 text-green-700">Paid</Badge>;
    if (paid > 0) return <Badge className="bg-yellow-100 text-yellow-700">Partial</Badge>;
    return <Badge className="bg-red-100 text-red-700">Pending</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="students-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Students</h1>
          <p className="text-slate-600">View enrolled students and manage fee payments</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-slate-600">Total Students</span>
            </div>
            <p className="text-2xl font-bold mt-1">{students.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              <span className="text-sm text-slate-600">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              ₹{students.reduce((sum, s) => sum + (s.total_paid || 0), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-slate-600">Pending Amount</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              ₹{students.reduce((sum, s) => sum + (s.pending_amount || 0), 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-soft">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-slate-600">Active Students</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {students.filter(s => s.status === 'Active' || !s.status).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Date Filters */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, ID, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-students"
          />
        </div>
        <div className="flex gap-2 items-center">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36"
            placeholder="From"
            data-testid="date-from"
          />
          <span className="text-slate-400">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36"
            placeholder="To"
            data-testid="date-to"
          />
          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-slate-500"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Students Table */}
      <Card className="border-slate-200 shadow-soft">
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Enrollment ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Program</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Paid / Total</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50" data-testid={`student-row-${student.id}`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium text-blue-600">
                        {student.enrollment_id || student.id?.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* Student Photo */}
                        {student.student_photo_url ? (
                          <img 
                            src={student.student_photo_url} 
                            alt={student.student_name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200">
                            <User className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{student.student_name}</p>
                          <p className="text-xs text-slate-500">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{student.phone}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{student.program_name}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-green-600">₹{(student.total_paid || 0).toLocaleString()}</span>
                        <span className="text-xs text-slate-500">of ₹{(student.final_fee || 0).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(student.status)}
                        {getPaymentStatus(student.total_paid || 0, student.final_fee || 0)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Pay Fee Button - Only show if payment plan exists */}
                        {canPay && student.has_payment_plan && (student.total_paid || 0) < (student.final_fee || 0) && student.status === 'Active' && (
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => openPaymentDialog(student)}
                            data-testid={`pay-fee-${student.id}`}
                          >
                            <Wallet className="w-4 h-4 mr-1" />
                            Pay Fee
                          </Button>
                        )}
                        {/* Create Payment Plan Button - Only show if no plan exists */}
                        {canPay && !student.has_payment_plan && (student.total_paid || 0) < (student.final_fee || 0) && student.status === 'Active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-orange-600 border-orange-400 hover:bg-orange-50"
                            onClick={() => openCreatePlanDialog(student)}
                            data-testid={`create-plan-${student.id}`}
                          >
                            <PlusCircle className="w-4 h-4 mr-1" />
                            Create Plan
                          </Button>
                        )}
                        {/* View Details Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewDetails(student)}
                          data-testid={`view-student-${student.id}`}
                        >
                          <Eye className="w-4 h-4 text-blue-500" />
                        </Button>
                        {/* Edit Student Button */}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(student)}
                            title="Edit Student"
                            data-testid={`edit-student-${student.id}`}
                          >
                            <Edit className="w-4 h-4 text-green-500" />
                          </Button>
                        )}
                        {/* Add Course Button */}
                        {canPay && student.status === 'Active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAddonDialog(student)}
                            title="Add Course"
                            data-testid={`add-course-${student.id}`}
                          >
                            <BookPlus className="w-4 h-4 text-purple-500" />
                          </Button>
                        )}
                        {/* Status Change Dropdown - Branch Admin/Admin only */}
                        {(isBranchAdmin || user.role === 'Admin') && (
                          <Select
                            value={student.status || 'Active'}
                            onValueChange={(newStatus) => handleStatusChange(student.id, newStatus)}
                          >
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Active">Active</SelectItem>
                              <SelectItem value="Dropped">Dropped</SelectItem>
                              <SelectItem value="Inactive">Inactive</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {/* Delete Student Button - Branch Admin/Admin only (blocked if any fee paid) */}
                        {(isBranchAdmin || user.role === 'Admin') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(student)}
                            title="Delete Student (only if no fee paid)"
                            data-testid={`delete-student-${student.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStudents.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                {loading ? 'Loading...' : 'No students found'}
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {filteredStudents.length > studentsPerPage && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-600">
                Showing {((currentPage - 1) * studentsPerPage) + 1} to {Math.min(currentPage * studentsPerPage, filteredStudents.length)} of {filteredStudents.length} students
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-slate-600">
                  Page {currentPage} of {Math.ceil(filteredStudents.length / studentsPerPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredStudents.length / studentsPerPage), p + 1))}
                  disabled={currentPage >= Math.ceil(filteredStudents.length / studentsPerPage)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-green-600" />
              Record Fee Payment
            </DialogTitle>
          </DialogHeader>
          
          {selectedStudent && (
            <div className="space-y-4">
              {/* Student Info */}
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="font-medium">{selectedStudent.student_name}</p>
                <p className="text-sm text-slate-500">{selectedStudent.enrollment_id}</p>
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">Total Fee</p>
                    <p className="font-bold text-slate-800">₹{(selectedStudent.final_fee || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Paid</p>
                    <p className="font-bold text-green-600">₹{(selectedStudent.total_paid || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Pending</p>
                    <p className="font-bold text-amber-600">₹{((selectedStudent.final_fee || 0) - (selectedStudent.total_paid || 0)).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Installment Selection (if installment plan) */}
              {installments.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Installment</Label>
                  <Select 
                    value={paymentForm.installment_number} 
                    onValueChange={handleInstallmentSelect}
                  >
                    <SelectTrigger data-testid="installment-select">
                      <SelectValue placeholder="Choose installment" />
                    </SelectTrigger>
                    <SelectContent>
                      {installments.map((inst) => (
                        <SelectItem 
                          key={inst.installment_number} 
                          value={inst.installment_number.toString()}
                          disabled={inst.is_paid}
                        >
                          <div className="flex items-center justify-between w-full gap-4">
                            <span>Installment {inst.installment_number}</span>
                            <span className="font-semibold">₹{inst.amount.toLocaleString()}</span>
                            {inst.is_paid && <Badge className="bg-green-100 text-green-700 ml-2">Paid</Badge>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Amount */}
              <div className="space-y-2">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="Enter amount"
                  data-testid="payment-amount"
                />
                <p className="text-xs text-slate-500">
                  Max: ₹{((selectedStudent.final_fee || 0) - (selectedStudent.total_paid || 0)).toLocaleString()}
                </p>
              </div>

              {/* Payment Mode */}
              <div className="space-y-2">
                <Label>Payment Mode *</Label>
                <Select 
                  value={paymentForm.payment_mode} 
                  onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_mode: v })}
                >
                  <SelectTrigger data-testid="payment-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Date */}
              <div className="space-y-2">
                <Label>Payment Date *</Label>
                <Input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  data-testid="payment-date"
                />
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <Label>Remarks (Optional)</Label>
                <Input
                  value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                  placeholder="Any additional notes..."
                  data-testid="payment-remarks"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleRecordPayment}
                  disabled={savingPayment}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="save-payment-btn"
                >
                  {savingPayment ? 'Saving...' : 'Save Payment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog - Modular Component */}
      <ReceiptDialog
        open={receiptDialog}
        onOpenChange={setReceiptDialog}
        receiptData={receiptData}
        onPrintReceipt={handlePrintReceipt}
      />

      {/* Student Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-full">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Student Details</span>
              <div className="flex gap-2 print:hidden">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" /> Print
                </Button>
                {canCancel && studentDetails?.enrollment?.status !== 'Cancelled' && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => setCancelDialog(true)}
                    data-testid="cancel-enrollment-btn"
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Cancel Enrollment
                  </Button>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {studentDetails && (
            <div className="space-y-6 print:space-y-4">
              {/* Header */}
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold">ETI Educom</h2>
                <p className="text-slate-600">Student Enrollment Certificate</p>
              </div>

              {/* Enrollment ID */}
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <p className="text-sm text-blue-600">Enrollment ID</p>
                <p className="text-2xl font-bold font-mono">
                  {studentDetails.enrollment?.enrollment_id || studentDetails.enrollment?.id?.slice(0, 8).toUpperCase()}
                </p>
              </div>

              {/* Personal Details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5" /> Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Name</p>
                      <p className="font-medium">{studentDetails.enrollment?.student_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Email</p>
                      <p className="font-medium">{studentDetails.enrollment?.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Phone</p>
                      <p className="font-medium">{studentDetails.enrollment?.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Date of Birth</p>
                      <p className="font-medium">{studentDetails.enrollment?.date_of_birth || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Gender</p>
                      <p className="font-medium">{studentDetails.enrollment?.gender || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Address</p>
                      <p className="font-medium">{studentDetails.enrollment?.address || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">City</p>
                      <p className="font-medium">{studentDetails.enrollment?.city || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">State</p>
                      <p className="font-medium">{studentDetails.enrollment?.state || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Pincode</p>
                      <p className="font-medium">{studentDetails.enrollment?.pincode || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Program Details */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" /> Program Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Program</p>
                      <p className="font-medium">{studentDetails.enrollment?.program_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Enrollment Date</p>
                      <p className="font-medium">
                        {studentDetails.enrollment?.enrollment_date 
                          ? format(new Date(studentDetails.enrollment.enrollment_date), 'dd MMM yyyy')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Branch</p>
                      <p className="font-medium">{studentDetails.branch?.name || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5" /> Payment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-sm text-slate-500">Fee Quoted</p>
                      <p className="text-xl font-bold">₹{(studentDetails.enrollment?.fee_quoted || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-600">Total Fee</p>
                      <p className="text-xl font-bold text-blue-600">₹{(studentDetails.current_enrollment_total_fee || studentDetails.enrollment?.final_fee || 0).toLocaleString()}</p>
                      {studentDetails.addon_total_fee > 0 && (
                        <p className="text-xs text-blue-500 mt-1">Incl. ₹{(studentDetails.addon_total_fee || 0).toLocaleString()} add-ons</p>
                      )}
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm text-green-600">Total Paid</p>
                      <p className="text-xl font-bold text-green-600">₹{(studentDetails.total_paid || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <p className="text-sm text-orange-600">Pending</p>
                      <p className="text-xl font-bold text-orange-600">₹{(studentDetails.pending_amount || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Payment History */}
                  {studentDetails.payments && studentDetails.payments.length > 0 && (
                    <div>
                      <p className="font-medium mb-2">Payment History</p>
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-3 py-2 text-left">Receipt #</th>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">Amount</th>
                            <th className="px-3 py-2 text-left">Mode</th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentDetails.payments.map((p, idx) => (
                            <tr key={idx} className="border-b">
                              <td className="px-3 py-2 font-mono">{p.receipt_number}</td>
                              <td className="px-3 py-2">
                                {p.payment_date ? format(new Date(p.payment_date), 'dd MMM yyyy') : '-'}
                              </td>
                              <td className="px-3 py-2 font-semibold text-green-600">₹{(p.amount || 0).toLocaleString()}</td>
                              <td className="px-3 py-2">{p.payment_mode}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add-on Courses Section */}
              {studentDetails.addon_courses && studentDetails.addon_courses.length > 0 && (
                <Card className="border-purple-200 bg-purple-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2 text-purple-800">
                      <Plus className="w-5 h-5" /> Add-on Courses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {studentDetails.addon_courses.map((addon, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-lg border border-purple-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-purple-800">{addon.program_name}</p>
                              <p className="text-sm text-slate-500">
                                Added: {addon.added_at ? format(new Date(addon.added_at), 'dd MMM yyyy') : '-'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-slate-500">Fee: ₹{(addon.fee_quoted || 0).toLocaleString()}</p>
                              {addon.discount_percent > 0 && (
                                <p className="text-xs text-green-600">Discount: {addon.discount_percent}%</p>
                              )}
                              <p className="font-bold text-purple-700">Final: ₹{(addon.final_fee || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-end pt-2 border-t border-purple-200">
                        <p className="font-bold text-purple-800">Add-on Total: ₹{(studentDetails.addon_total_fee || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Other Enrollments for Same Student */}
              {studentDetails.other_enrollments && studentDetails.other_enrollments.length > 0 && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                      <GraduationCap className="w-5 h-5" /> Other Courses by Same Student
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {studentDetails.other_enrollments.map((other, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-lg border border-blue-200">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-blue-800">{other.program_name}</p>
                              <p className="text-sm text-slate-500">
                                Enrollment ID: {other.enrollment_id || other.id?.slice(0, 8).toUpperCase()}
                              </p>
                              <p className="text-sm text-slate-500">
                                Enrolled: {other.enrollment_date ? format(new Date(other.enrollment_date), 'dd MMM yyyy') : '-'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-slate-500">Fee: ₹{(other.fee_quoted || 0).toLocaleString()}</p>
                              <p className="font-bold text-blue-700">Final: ₹{(other.final_fee || 0).toLocaleString()}</p>
                              <p className="text-sm">Paid: ₹{(other.total_paid || 0).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Grand Total Summary (if multiple courses) */}
              {(studentDetails.addon_courses?.length > 0 || studentDetails.other_enrollments?.length > 0) && (
                <Card className="border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                      <IndianRupee className="w-5 h-5" /> Grand Total (All Courses)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white p-3 rounded-lg border border-green-200 text-center">
                        <p className="text-sm text-slate-500">Total Fee</p>
                        <p className="text-2xl font-bold text-slate-800">₹{(studentDetails.grand_total_fee || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-green-200 text-center">
                        <p className="text-sm text-green-600">Total Paid</p>
                        <p className="text-2xl font-bold text-green-600">₹{(studentDetails.grand_total_paid || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-orange-200 text-center">
                        <p className="text-sm text-orange-600">Total Pending</p>
                        <p className="text-2xl font-bold text-orange-600">₹{(studentDetails.grand_pending || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Enrollment Dialog - Modular Component */}
      <CancelEnrollmentDialog
        open={cancelDialog}
        onOpenChange={setCancelDialog}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        onConfirmCancel={handleCancelEnrollment}
      />

      {/* Add-on Course Dialog */}
      <Dialog open={addonDialog} onOpenChange={setAddonDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookPlus className="w-5 h-5 text-purple-600" />
              Add Course
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">Student: <strong>{selectedStudent.student_name}</strong></p>
                <p className="text-sm text-slate-600">Current Program: <strong>{selectedStudent.program_name}</strong></p>
                <p className="text-sm text-slate-600">Current Fee: <strong>₹{selectedStudent.final_fee?.toLocaleString()}</strong></p>
              </div>

              {addonCourses.length > 0 && (
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-purple-700 mb-2">Added Courses:</p>
                  {addonCourses.map((addon) => (
                    <div key={addon.id} className="flex justify-between text-sm">
                      <span>{addon.program_name}</span>
                      <span className="font-medium">₹{addon.final_fee?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Label>Select New Course *</Label>
                <Select 
                  value={addonForm.program_id} 
                  onValueChange={(v) => {
                    const program = programs.find(p => p.id === v);
                    setAddonForm({
                      ...addonForm, 
                      program_id: v,
                      fee_quoted: program?.fee || ''
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs
                      .filter(p => p.id !== selectedStudent.program_id)
                      .map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name} (₹{program.fee?.toLocaleString()})
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fee Quoted (₹) *</Label>
                  <Input
                    type="number"
                    value={addonForm.fee_quoted}
                    onChange={(e) => setAddonForm({...addonForm, fee_quoted: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Discount Type</Label>
                  <Select 
                    value={addonForm.discount_type || 'percent'} 
                    onValueChange={(v) => setAddonForm({...addonForm, discount_type: v, discount_percent: 0, discount_amount: 0})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentage (%)</SelectItem>
                      <SelectItem value="amount">Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                {addonForm.discount_type === 'amount' ? (
                  <div>
                    <Label>Discount Amount (₹)</Label>
                    <Input
                      type="number"
                      value={addonForm.discount_amount}
                      onChange={(e) => setAddonForm({...addonForm, discount_amount: e.target.value})}
                      min="0"
                      placeholder="Enter discount amount"
                    />
                  </div>
                ) : (
                  <div>
                    <Label>Discount %</Label>
                    <Input
                      type="number"
                      value={addonForm.discount_percent}
                      onChange={(e) => setAddonForm({...addonForm, discount_percent: e.target.value})}
                      min="0"
                      max="100"
                      placeholder="Enter discount percentage"
                    />
                  </div>
                )}
              </div>

              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Add-on Course Fee:</span>
                  <span className="font-medium">₹{calculateAddonFinalFee().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-600">New Total Fee:</span>
                  <span className="font-bold text-green-600">
                    ₹{(selectedStudent.final_fee + calculateAddonFinalFee()).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddonDialog(false)}>Cancel</Button>
                <Button onClick={handleAddAddonCourse} disabled={savingAddon}>
                  {savingAddon ? 'Adding...' : 'Add Course'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Student Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Photo Upload */}
            <div className="flex items-center gap-4">
              <div className="relative">
                {editForm.student_photo_url ? (
                  <img 
                    src={editForm.student_photo_url} 
                    alt="Student" 
                    className="w-20 h-20 rounded-full object-cover border-2 border-slate-300"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                    <User className="w-8 h-8 text-slate-400" />
                  </div>
                )}
              </div>
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-slate-50">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">{uploadingPhoto ? 'Uploading...' : 'Change Photo'}</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
              </label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Name - Restricted for FDE */}
              <div className="space-y-2">
                <Label>Student Name</Label>
                <Input
                  value={editForm.student_name}
                  onChange={(e) => handleEditFormChange('student_name', e.target.value)}
                  disabled={!canEditRestricted}
                  className={!canEditRestricted ? 'bg-slate-100' : ''}
                />
                {!canEditRestricted && <p className="text-xs text-slate-500">Contact Branch Admin to edit</p>}
              </div>
              
              {/* Phone - Restricted for FDE */}
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={editForm.student_phone}
                  onChange={(e) => handleEditFormChange('student_phone', e.target.value)}
                  disabled={!canEditRestricted}
                  className={!canEditRestricted ? 'bg-slate-100' : ''}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={editForm.student_email}
                  onChange={(e) => handleEditFormChange('student_email', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={editForm.date_of_birth}
                  onChange={(e) => handleEditFormChange('date_of_birth', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={editForm.gender} onValueChange={(v) => handleEditFormChange('gender', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Admission Date - Branch Admin only */}
              {(isBranchAdmin || isSuperAdmin) && (
                <div className="space-y-2">
                  <Label>Admission Date</Label>
                  <Input
                    type="date"
                    value={editForm.enrollment_date}
                    onChange={(e) => handleEditFormChange('enrollment_date', e.target.value)}
                    data-testid="enrollment-date-input"
                  />
                </div>
              )}
              
              {/* Fee Adjustment - Branch Admin only */}
              {(isBranchAdmin || isSuperAdmin) && (
                <div className="col-span-2 p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-3">Course & Fee Adjustment (Branch Admin Only)</h4>

                  {/* Course selector */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Course / Program</Label>
                      <Select
                        value={editForm.program_id || ''}
                        onValueChange={(v) => {
                          const prog = programs.find(p => p.id === v);
                          setEditForm(prev => ({
                            ...prev,
                            program_id: v,
                            fee_quoted: prog?.fee || prev.fee_quoted,
                          }));
                        }}
                      >
                        <SelectTrigger data-testid="edit-program-select">
                          <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        <SelectContent>
                          {programs.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Course Fee (₹)</Label>
                      <Input
                        type="number"
                        placeholder="Course fee"
                        value={editForm.fee_quoted || ''}
                        onChange={(e) => handleEditFormChange('fee_quoted', parseFloat(e.target.value) || 0)}
                        data-testid="edit-fee-quoted-input"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Discount Amount (₹)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 500"
                        value={editForm.discount_amount || ''}
                        onChange={(e) => handleEditFormChange('discount_amount', parseFloat(e.target.value) || 0)}
                        data-testid="discount-amount-input"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">OR Discount %</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 10"
                        value={editForm.discount_percent || ''}
                        onChange={(e) => handleEditFormChange('discount_percent', parseFloat(e.target.value) || 0)}
                        data-testid="discount-percent-input"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Final Fee (₹)</Label>
                      <Input
                        type="number"
                        placeholder="Final fee after discount"
                        value={editForm.final_fee || ''}
                        onChange={(e) => handleEditFormChange('final_fee', parseFloat(e.target.value) || 0)}
                        data-testid="final-fee-input"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Tip: Changing the course will suggest the default fee. Either enter a discount OR directly edit the final fee.
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Parent/Guardian Name</Label>
                <Input
                  value={editForm.parent_name}
                  onChange={(e) => handleEditFormChange('parent_name', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Parent Phone</Label>
                <Input
                  value={editForm.parent_phone}
                  onChange={(e) => handleEditFormChange('parent_phone', e.target.value)}
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                <Label>Address</Label>
                <Input
                  value={editForm.address}
                  onChange={(e) => handleEditFormChange('address', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={editForm.city}
                  onChange={(e) => handleEditFormChange('city', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={editForm.state}
                  onChange={(e) => handleEditFormChange('state', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input
                  value={editForm.pincode}
                  onChange={(e) => handleEditFormChange('pincode', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Highest Qualification</Label>
                <Input
                  value={editForm.highest_qualification}
                  onChange={(e) => handleEditFormChange('highest_qualification', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Institution Name</Label>
                <Input
                  value={editForm.institution_name}
                  onChange={(e) => handleEditFormChange('institution_name', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Passing Year</Label>
                <Input
                  value={editForm.passing_year}
                  onChange={(e) => handleEditFormChange('passing_year', e.target.value)}
                />
              </div>
            </div>
            
            {/* Aadhar Documents Section */}
            <div className="space-y-3 pt-4 border-t">
              <Label className="font-semibold">Aadhar Documents</Label>
              <div className="flex flex-wrap gap-2">
                {editForm.aadhar_documents?.map((doc, idx) => (
                  <div key={idx} className="relative">
                    <img src={doc} alt={`Aadhar ${idx + 1}`} className="w-16 h-16 object-cover rounded border" />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute -top-2 -right-2 w-5 h-5 p-0 rounded-full"
                      onClick={() => removeAadharDoc(idx)}
                    >×</Button>
                  </div>
                ))}
                <label className="w-16 h-16 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-slate-400">{uploadingAadhar ? '...' : 'Add'}</span>
                  <input type="file" accept="image/*,.pdf" multiple className="hidden" onChange={handleAadharUpload} disabled={uploadingAadhar} />
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Payment Plan Dialog */}
      <Dialog open={createPlanDialog} onOpenChange={setCreatePlanDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Payment Plan</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 py-4">
              {/* Student Info */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium">{selectedStudent.student_name}</p>
                <p className="text-sm text-slate-500">{selectedStudent.program_name}</p>
                <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                  <div>
                    <span className="text-slate-500">Total Fee:</span>
                    <p className="font-medium">₹{(selectedStudent.final_fee || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Paid:</span>
                    <p className="font-medium text-green-600">₹{(selectedStudent.total_paid || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Pending:</span>
                    <p className="font-medium text-red-600">₹{((selectedStudent.final_fee || 0) - (selectedStudent.total_paid || 0)).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Plan Type */}
              <div className="space-y-2">
                <Label>Payment Plan Type</Label>
                <Select 
                  value={planForm.plan_type} 
                  onValueChange={(v) => setPlanForm(prev => ({ ...prev, plan_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="One-time">Full Payment</SelectItem>
                    <SelectItem value="Installments">Installments</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Installments Configuration */}
              {planForm.plan_type === 'Installments' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Number of Installments</Label>
                    <Select 
                      value={planForm.installments_count.toString()} 
                      onValueChange={(v) => handleInstallmentCountChange(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n} Installments</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {planForm.installments.map((inst, idx) => (
                      <div key={idx} className="flex gap-3 items-center p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm font-medium w-16">#{idx + 1}</span>
                        <div className="flex-1">
                          <Label className="text-xs">Amount (₹)</Label>
                          <Input
                            type="number"
                            value={inst.amount}
                            onChange={(e) => {
                              const newInstallments = [...planForm.installments];
                              newInstallments[idx].amount = e.target.value;
                              setPlanForm(prev => ({ ...prev, installments: newInstallments }));
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs">Due Date</Label>
                          <Input
                            type="date"
                            value={inst.due_date || ''}
                            onChange={(e) => {
                              const newInstallments = [...planForm.installments];
                              newInstallments[idx] = { ...newInstallments[idx], due_date: e.target.value };
                              setPlanForm(prev => ({ ...prev, installments: newInstallments }));
                            }}
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setCreatePlanDialog(false)}>Cancel</Button>
                <Button onClick={handleCreatePaymentPlan} disabled={savingPlan}>
                  {savingPlan ? 'Creating...' : 'Create Plan'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Permanently Delete Student
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium">
                This action cannot be undone.
              </p>
              <p className="text-xs text-red-700 mt-1">
                Deletion is only allowed if <strong>no fee has been received</strong> for this student.
                All related payment plans, batch assignments and attendance records will also be removed.
              </p>
            </div>
            {deletingStudent && (
              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                <p><span className="font-medium">Student:</span> {deletingStudent.student_name}</p>
                <p><span className="font-medium">Enrollment ID:</span> {deletingStudent.enrollment_id || deletingStudent.id}</p>
                <p><span className="font-medium">Course:</span> {deletingStudent.program_name}</p>
                <p><span className="font-medium">Status:</span> {deletingStudent.status}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Input
                placeholder="e.g., Enrolled by mistake, duplicate entry"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                data-testid="delete-reason-input"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setDeleteDialog(false)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button
                onClick={handlePermanentDelete}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
                data-testid="confirm-delete-student-btn"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentsPage;
