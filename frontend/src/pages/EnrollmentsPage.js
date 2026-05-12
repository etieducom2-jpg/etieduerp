import React, { useState, useEffect, useRef } from 'react';
import { enrollmentAPI, paymentAPI, adminAPI, uploadAPI, paymentPlanAPI, leadsAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, ChevronRight, ChevronLeft, UserPlus, CreditCard, FileText, Eye, Printer, CheckCircle, Clock, Upload, Image, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const PAYMENT_MODES = ['Cash', 'Card', 'UPI', 'Net Banking', 'Cheque'];

const EnrollmentsPage = () => {
  const [activeTab, setActiveTab] = useState('converted');
  const [convertedLeads, setConvertedLeads] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Enrollment dialog
  const [enrollDialog, setEnrollDialog] = useState(false);
  const [enrollingLead, setEnrollingLead] = useState(null);
  const [enrollStep, setEnrollStep] = useState(1);
  const [enrollForm, setEnrollForm] = useState({
    student_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    highest_qualification: '',
    institution_name: '',
    passing_year: '',
    percentage: '',
    program_id: '',
    fee_quoted: '',
    discount_percent: '',
    discount_amount: '',
    enrollment_date: new Date().toISOString().split('T')[0],
    student_photo_url: '',
    aadhar_photo_url: '',
    aadhar_documents: [],
  });
  
  // Photo upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingAadhar, setUploadingAadhar] = useState(false);

  // Payment plan dialog
  const [paymentPlanDialog, setPaymentPlanDialog] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [paymentPlanType, setPaymentPlanType] = useState('One-time');
  const [installmentsCount, setInstallmentsCount] = useState(3);
  const [installments, setInstallments] = useState([]);

  // Record payment dialog
  const [recordPaymentDialog, setRecordPaymentDialog] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_mode: 'Cash',
    payment_date: new Date().toISOString().split('T')[0],
    installment_number: '',
    remarks: ''
  });
  const [existingPaymentPlan, setExistingPaymentPlan] = useState(null);

  // View payments dialog
  const [viewPaymentsDialog, setViewPaymentsDialog] = useState(false);
  const [enrollmentPayments, setEnrollmentPayments] = useState([]);

  // Receipt dialog
  const [receiptDialog, setReceiptDialog] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const receiptRef = useRef(null);

  // Enrollment payment status cache
  const [enrollmentPaymentStatus, setEnrollmentPaymentStatus] = useState({});
  
  // Edit Payment Plan dialog (for Branch Admin)
  const [editPlanDialog, setEditPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editInstallments, setEditInstallments] = useState([]);

  // Delete lead confirmation dialog
  const [deleteLeadDialog, setDeleteLeadDialog] = useState(false);
  const [deletingLead, setDeletingLead] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isBranchAdmin = user.role === 'Branch Admin' || user.role === 'Admin';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [convertedRes, enrollmentsRes, programsRes] = await Promise.all([
        enrollmentAPI.getConvertedLeads(),
        enrollmentAPI.getEnrollments(),
        adminAPI.getPrograms()
      ]);
      setConvertedLeads(convertedRes.data);
      setEnrollments(enrollmentsRes.data);
      setPrograms(programsRes.data);

      // Fetch payment status for each enrollment
      const statusMap = {};
      for (const enrollment of enrollmentsRes.data) {
        try {
          const [paymentsRes, planRes] = await Promise.all([
            enrollmentAPI.getEnrollmentPayments(enrollment.id),
            enrollmentAPI.getPaymentPlan(enrollment.id)
          ]);
          const totalPaid = paymentsRes.data.reduce((sum, p) => sum + p.amount, 0);
          const totalFee = enrollment.final_fee || 0;
          statusMap[enrollment.id] = {
            totalPaid,
            totalFee,
            hasPlan: !!planRes.data,
            isPaidFull: totalPaid >= totalFee
          };
        } catch {
          statusMap[enrollment.id] = { totalPaid: 0, totalFee: enrollment.final_fee, hasPlan: false, isPaidFull: false };
        }
      }
      setEnrollmentPaymentStatus(statusMap);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEnrollment = (lead) => {
    setEnrollingLead(lead);
    const program = programs.find(p => p.id === lead.program_id);
    setEnrollForm({
      student_name: lead.name,
      email: lead.email,
      phone: lead.number,
      date_of_birth: '',
      gender: '',
      address: lead.address || '',
      city: lead.city || '',
      state: lead.state || '',
      pincode: '',
      highest_qualification: '',
      institution_name: '',
      passing_year: '',
      percentage: '',
      program_id: lead.program_id,
      fee_quoted: lead.fee_quoted?.toString() || program?.fee?.toString() || '',
      discount_percent: lead.discount_percent?.toString() || '0',
      enrollment_date: new Date().toISOString().split('T')[0],
    });
    setEnrollStep(1);
    setEnrollDialog(true);
  };

  // Handle delete lead from Ready to Enroll list
  const handleDeleteLead = async () => {
    if (!deletingLead) return;
    
    setDeleteLoading(true);
    try {
      await leadsAPI.delete(deletingLead.id, 'Removed from Ready to Enroll list');
      toast.success(`${deletingLead.name} removed from Ready to Enroll list`);
      setConvertedLeads(convertedLeads.filter(l => l.id !== deletingLead.id));
      setDeleteLeadDialog(false);
      setDeletingLead(null);
    } catch (error) {
      console.error('Error deleting lead:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to delete lead';
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEnrollmentSubmit = async () => {
    try {
      await enrollmentAPI.createEnrollment({
        lead_id: enrollingLead.id,
        ...enrollForm,
        fee_quoted: parseFloat(enrollForm.fee_quoted),
        discount_percent: enrollForm.discount_percent ? parseFloat(enrollForm.discount_percent) : 0,
        percentage: enrollForm.percentage ? parseFloat(enrollForm.percentage) : null,
      });
      toast.success('Student enrolled successfully!');
      setEnrollDialog(false);
      setEnrollingLead(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create enrollment');
    }
  };

  const handlePhotoUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (type === 'student') setUploadingPhoto(true);
    else setUploadingAadhar(true);
    
    try {
      const response = await uploadAPI.uploadImage(file);
      setEnrollForm(prev => ({
        ...prev,
        [type === 'student' ? 'student_photo_url' : 'aadhar_photo_url']: response.data.url
      }));
      toast.success(`${type === 'student' ? 'Student photo' : 'Aadhar card'} uploaded successfully`);
    } catch (error) {
      toast.error(`Failed to upload ${type === 'student' ? 'photo' : 'Aadhar'}`);
    } finally {
      if (type === 'student') setUploadingPhoto(false);
      else setUploadingAadhar(false);
    }
  };

  const handleMultipleAadharUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingAadhar(true);
    const uploadedUrls = [...(enrollForm.aadhar_documents || [])];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const response = await uploadAPI.uploadImage(file);
        uploadedUrls.push(response.data.url);
      }
      
      setEnrollForm(prev => ({
        ...prev,
        aadhar_documents: uploadedUrls
      }));
      toast.success(`${files.length} Aadhar document(s) uploaded successfully`);
    } catch (error) {
      toast.error('Failed to upload Aadhar documents');
    } finally {
      setUploadingAadhar(false);
    }
  };

  const removeAadharDocument = (index) => {
    const updatedDocs = [...(enrollForm.aadhar_documents || [])];
    updatedDocs.splice(index, 1);
    setEnrollForm(prev => ({
      ...prev,
      aadhar_documents: updatedDocs
    }));
  };

  const handleCreatePaymentPlan = async () => {
    try {
      const planData = {
        enrollment_id: selectedEnrollment.id,
        plan_type: paymentPlanType,
        total_amount: selectedEnrollment.final_fee,
        installments_count: paymentPlanType === 'Installments' ? installmentsCount : null,
        installments: paymentPlanType === 'Installments' ? installments : null,
      };
      await paymentAPI.createPaymentPlan(planData);
      toast.success('Payment plan created successfully!');
      setPaymentPlanDialog(false);
      setSelectedEnrollment(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create payment plan');
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    // Validate that payment doesn't exceed remaining amount
    const totalFee = selectedEnrollment?.total_fee || 0;
    const totalPaid = existingPaymentPlan?.total_paid || 0;
    const remainingAmount = totalFee - totalPaid;
    const paymentAmount = parseFloat(paymentForm.amount);
    
    if (paymentAmount > remainingAmount) {
      toast.error(`Payment amount (Rs.${paymentAmount.toLocaleString('en-IN')}) cannot exceed pending fee (Rs.${remainingAmount.toLocaleString('en-IN')})`);
      return;
    }
    
    try {
      const paymentRes = await paymentAPI.createPayment({
        enrollment_id: selectedEnrollment.id,
        payment_plan_id: existingPaymentPlan.id,
        amount: paymentAmount,
        payment_mode: paymentForm.payment_mode,
        payment_date: paymentForm.payment_date,
        installment_number: paymentForm.installment_number ? parseInt(paymentForm.installment_number) : null,
        remarks: paymentForm.remarks
      });
      toast.success('Payment recorded successfully!');
      setRecordPaymentDialog(false);
      
      // Show receipt
      const receiptRes = await paymentAPI.generateReceipt(paymentRes.data.id);
      setReceiptData(receiptRes.data);
      setReceiptDialog(true);
      
      setPaymentForm({
        amount: '',
        payment_mode: 'Cash',
        payment_date: new Date().toISOString().split('T')[0],
        installment_number: '',
        remarks: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    }
  };

  // Open Edit Payment Plan Dialog (Branch Admin only)
  const openEditPlanDialog = async (enrollment) => {
    try {
      const planRes = await enrollmentAPI.getPaymentPlan(enrollment.id);
      setEditingPlan({
        enrollment,
        plan: planRes.data.payment_plan,
        planId: planRes.data.payment_plan?.id
      });
      
      // Prepare installments for editing
      if (planRes.data.installments?.length > 0) {
        setEditInstallments(planRes.data.installments.map(inst => ({
          amount: inst.amount,
          due_date: inst.due_date,
          status: inst.status
        })));
      } else {
        setEditInstallments([{ amount: '', due_date: '', status: 'Pending' }]);
      }
      
      setEditPlanDialog(true);
    } catch (error) {
      toast.error('Failed to load payment plan');
    }
  };

  const handleSaveEditedPlan = async () => {
    if (!editingPlan?.planId) {
      toast.error('No payment plan found');
      return;
    }
    
    // Validate installments
    const validInstallments = editInstallments.filter(i => i.amount && i.due_date);
    if (validInstallments.length === 0) {
      toast.error('Please add at least one installment');
      return;
    }
    
    try {
      await paymentPlanAPI.edit(editingPlan.planId, {
        installments: validInstallments.map(i => ({
          amount: parseFloat(i.amount),
          due_date: i.due_date
        }))
      });
      toast.success('Payment plan updated successfully');
      setEditPlanDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update plan');
    }
  };

  const handleDeletePlan = async () => {
    if (!window.confirm('Delete this payment plan? You can create a new one after deletion.')) return;
    
    try {
      await paymentPlanAPI.delete(editingPlan.planId);
      toast.success('Payment plan deleted. You can now create a new plan.');
      setEditPlanDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete plan');
    }
  };

  const addEditInstallment = () => {
    setEditInstallments([...editInstallments, { amount: '', due_date: '', status: 'Pending' }]);
  };

  const removeEditInstallment = (index) => {
    setEditInstallments(editInstallments.filter((_, i) => i !== index));
  };

  const handlePrintReceipt = () => {
    const printWindow = window.open('', '', 'height=900,width=800');
    const logoUrl = 'https://etieducom.com/wp-content/uploads/2024/03/eti-educom-logo.png';
    
    // Calculate next due date (next month)
    const nextDueDate = new Date();
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    nextDueDate.setDate(10); // Due on 10th of each month
    const dueDateStr = nextDueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    
    const pendingAmount = (receiptData?.total_fee || 0) - (receiptData?.total_paid || 0);
    
    const receiptHTML = `
      <div class="receipt-copy">
        <div class="copy-label">COPY_TYPE</div>
        
        <div class="header">
          <img src="${logoUrl}" alt="ETI Educom" class="logo" onerror="this.style.display='none'"/>
          <h1>ETI EDUCOM</h1>
          <p class="tagline">Professional Training & Skill Development</p>
          <p class="address">${receiptData?.branch_name || ''}</p>
          <p class="address">${receiptData?.branch_location || ''}</p>
          <p class="address">Phone: ${receiptData?.branch_phone || ''} | Email: ${receiptData?.branch_email || ''}</p>
        </div>
        
        <div class="receipt-title">
          <h2>FEE RECEIPT</h2>
          <div class="receipt-meta">
            <span>Receipt No: <strong>${receiptData?.receipt_number || 'N/A'}</strong></span>
            <span>Date: ${receiptData?.payment_date ? new Date(receiptData.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span>
          </div>
        </div>
        
        <div class="student-details">
          <table>
            <tr>
              <td class="label">Student Name</td>
              <td class="value" colspan="3">${receiptData?.student_name || ''}</td>
            </tr>
            <tr>
              <td class="label">Enrollment No</td>
              <td class="value">${receiptData?.enrollment_id || ''}</td>
              <td class="label">Phone</td>
              <td class="value">${receiptData?.phone || ''}</td>
            </tr>
            <tr>
              <td class="label">Course Name</td>
              <td class="value" colspan="3">${receiptData?.program_name || ''}</td>
            </tr>
          </table>
        </div>
        
        <div class="fee-breakdown">
          <h3>Fee Details</h3>
          <table>
            <tr>
              <td class="label">Total Course Fee</td>
              <td class="value amount-cell">Rs. ${receiptData?.total_fee?.toLocaleString('en-IN') || '0'}/-</td>
            </tr>
            <tr>
              <td class="label">Amount Paid (This Receipt)</td>
              <td class="value amount-cell highlight">Rs. ${receiptData?.amount?.toLocaleString('en-IN') || '0'}/-</td>
            </tr>
            <tr>
              <td class="label">Total Paid (Till Date)</td>
              <td class="value amount-cell">Rs. ${receiptData?.total_paid?.toLocaleString('en-IN') || '0'}/-</td>
            </tr>
            <tr class="${pendingAmount > 0 ? 'pending-row' : 'paid-row'}">
              <td class="label">Pending Fee</td>
              <td class="value amount-cell">Rs. ${pendingAmount.toLocaleString('en-IN')}/-</td>
            </tr>
            ${pendingAmount > 0 ? `
            <tr>
              <td class="label">Next Due Date</td>
              <td class="value">${dueDateStr}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <div class="payment-info">
          <table>
            <tr>
              <td class="label">Payment Mode</td>
              <td class="value">${receiptData?.payment_mode || ''}</td>
              <td class="label">Transaction Ref</td>
              <td class="value">${receiptData?.transaction_reference || 'N/A'}</td>
            </tr>
          </table>
        </div>
        
        <div class="amount-words">
          <strong>Amount in Words:</strong> ${numberToWords(receiptData?.amount || 0)} Only
        </div>
        
        <div class="signatures">
          <div class="signature">
            <p>Student Signature</p>
          </div>
          <div class="signature authorized">
            <p>Authorized Signatory</p>
            <small>ETI Educom</small>
          </div>
        </div>
      </div>
    `;
    
    const termsHTML = `
      <div class="terms">
        <h4>Terms & Conditions</h4>
        <ol>
          <li>Fees once paid are non-refundable and non-transferable under any circumstances.</li>
          <li>Certificate will be issued only after full fee payment, required attendance, and successful course completion.</li>
          <li>ETI Educom provides placement assistance only. Job placement is not guaranteed.</li>
          <li>Students must follow institute rules and code of conduct. Violation may lead to termination without refund.</li>
          <li>All disputes are subject to Pathankot jurisdiction only.</li>
        </ol>
      </div>
    `;
    
    const cssStyles = `
      @page { size: A4; margin: 8mm; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; line-height: 1.4; }
      
      .receipt-copy {
        border: 2px solid #1a365d;
        padding: 15px;
        margin-bottom: 8px;
        page-break-inside: avoid;
        position: relative;
        background: white;
      }
      
      .copy-label {
        position: absolute;
        top: -1px;
        right: 15px;
        background: #1a365d;
        color: white;
        padding: 4px 15px;
        font-size: 10px;
        font-weight: bold;
        border-radius: 0 0 5px 5px;
      }
      
      .header {
        text-align: center;
        border-bottom: 2px solid #1a365d;
        padding-bottom: 10px;
        margin-bottom: 10px;
      }
      .header .logo { height: 45px; margin-bottom: 5px; }
      .header h1 { font-size: 22px; color: #1a365d; letter-spacing: 3px; margin: 5px 0; }
      .header .tagline { font-size: 10px; color: #4a5568; font-style: italic; }
      .header .address { font-size: 9px; color: #718096; margin-top: 3px; }
      
      .receipt-title {
        text-align: center;
        background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
        color: white;
        padding: 10px;
        margin-bottom: 12px;
        border-radius: 5px;
      }
      .receipt-title h2 { font-size: 16px; letter-spacing: 2px; margin-bottom: 5px; }
      .receipt-meta { display: flex; justify-content: space-between; font-size: 11px; }
      
      .student-details, .payment-info {
        margin-bottom: 10px;
      }
      .student-details table, .payment-info table, .fee-breakdown table {
        width: 100%;
        border-collapse: collapse;
      }
      .student-details td, .payment-info td {
        padding: 6px 10px;
        border: 1px solid #e2e8f0;
      }
      .label { color: #4a5568; width: 25%; font-size: 10px; background: #f7fafc; }
      .value { font-weight: 600; color: #1a202c; }
      
      .fee-breakdown {
        margin: 12px 0;
        border: 2px solid #1a365d;
        border-radius: 5px;
        overflow: hidden;
      }
      .fee-breakdown h3 {
        background: #1a365d;
        color: white;
        padding: 6px 10px;
        font-size: 11px;
        text-align: center;
      }
      .fee-breakdown table { width: 100%; }
      .fee-breakdown td {
        padding: 8px 12px;
        border-bottom: 1px solid #e2e8f0;
      }
      .fee-breakdown .label { width: 60%; }
      .amount-cell { text-align: right; font-size: 12px; }
      .highlight { background: #c6f6d5; font-size: 14px; color: #22543d; }
      .pending-row { background: #fed7d7; }
      .pending-row td { color: #c53030; font-weight: bold; }
      .paid-row { background: #c6f6d5; }
      .paid-row td { color: #22543d; font-weight: bold; }
      
      .amount-words {
        background: #f7fafc;
        padding: 8px 12px;
        margin: 10px 0;
        border-left: 4px solid #1a365d;
        font-size: 10px;
      }
      
      .signatures {
        display: flex;
        justify-content: space-between;
        margin-top: 25px;
        padding-top: 35px;
      }
      .signature {
        text-align: center;
        width: 35%;
        border-top: 1px solid #2d3748;
        padding-top: 5px;
      }
      .signature p { font-size: 10px; color: #4a5568; }
      .signature small { font-size: 8px; color: #718096; }
      
      .terms {
        margin-top: 8px;
        padding: 10px;
        background: #fffbeb;
        border: 1px solid #f59e0b;
        border-radius: 5px;
        font-size: 8px;
      }
      .terms h4 { font-size: 9px; margin-bottom: 5px; color: #92400e; }
      .terms ol { padding-left: 15px; color: #78350f; }
      .terms li { margin-bottom: 2px; }
      
      .divider {
        border-top: 2px dashed #a0aec0;
        margin: 10px 0;
        position: relative;
      }
      .divider::before {
        content: 'Cut Here';
        position: absolute;
        top: -8px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        padding: 0 10px;
        font-size: 8px;
        color: #a0aec0;
      }
    `;
    
    // Helper function to convert number to words
    function numberToWords(num) {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      
      if (num === 0) return 'Zero Rupees';
      
      let words = '';
      if (num >= 100000) {
        words += ones[Math.floor(num / 100000)] + ' Lakh ';
        num %= 100000;
      }
      if (num >= 1000) {
        words += ones[Math.floor(num / 1000)] + ' Thousand ';
        num %= 1000;
      }
      if (num >= 100) {
        words += ones[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }
      if (num >= 20) {
        words += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      }
      if (num > 0) {
        words += ones[num] + ' ';
      }
      
      return words.trim() + ' Rupees';
    }
    
    printWindow.document.write('<html><head><title>Fee Receipt - ETI Educom</title>');
    printWindow.document.write('<style>' + cssStyles + '</style>');
    printWindow.document.write('</head><body>');
    
    // Student Copy
    printWindow.document.write(receiptHTML.replace('COPY_TYPE', 'STUDENT COPY'));
    printWindow.document.write(termsHTML);
    
    // Divider
    printWindow.document.write('<div class="divider"></div>');
    
    // Center Copy
    printWindow.document.write(receiptHTML.replace('COPY_TYPE', 'CENTER COPY'));
    
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    // Wait for images to load before printing
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const viewReceipt = async (paymentId) => {
    try {
      const receiptRes = await paymentAPI.generateReceipt(paymentId);
      setReceiptData(receiptRes.data);
      setReceiptDialog(true);
    } catch (error) {
      toast.error('Failed to load receipt');
    }
  };

  const openRecordPaymentDialog = async (enrollment) => {
    setSelectedEnrollment(enrollment);
    try {
      const planRes = await enrollmentAPI.getPaymentPlan(enrollment.id);
      if (!planRes.data) {
        toast.error('Please create a payment plan first');
        return;
      }
      setExistingPaymentPlan(planRes.data);
      setRecordPaymentDialog(true);
    } catch (error) {
      toast.error('Failed to fetch payment plan');
    }
  };

  const openViewPaymentsDialog = async (enrollment) => {
    setSelectedEnrollment(enrollment);
    try {
      const [paymentsRes, planRes] = await Promise.all([
        enrollmentAPI.getEnrollmentPayments(enrollment.id),
        enrollmentAPI.getPaymentPlan(enrollment.id)
      ]);
      setEnrollmentPayments(paymentsRes.data);
      setExistingPaymentPlan(planRes.data);
      setViewPaymentsDialog(true);
    } catch (error) {
      toast.error('Failed to fetch payments');
    }
  };

  const openPaymentPlanDialog = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setPaymentPlanType('One-time');
    setInstallmentsCount(3);
    setInstallments([]);
    setPaymentPlanDialog(true);
  };

  const generateInstallments = () => {
    const amount = selectedEnrollment.final_fee / installmentsCount;
    const newInstallments = [];
    const today = new Date();
    for (let i = 0; i < installmentsCount; i++) {
      const dueDate = new Date(today);
      dueDate.setMonth(dueDate.getMonth() + i);
      newInstallments.push({
        installment_number: i + 1,
        amount: Math.round(amount),
        due_date: dueDate.toISOString().split('T')[0]
      });
    }
    setInstallments(newInstallments);
  };

  useEffect(() => {
    if (paymentPlanType === 'Installments' && selectedEnrollment) {
      generateInstallments();
    }
  }, [installmentsCount, paymentPlanType, selectedEnrollment]);

  const calculateFinalFee = () => {
    const fee = parseFloat(enrollForm.fee_quoted) || 0;
    const discountAmount = parseFloat(enrollForm.discount_amount) || 0;
    const discountPercent = parseFloat(enrollForm.discount_percent) || 0;
    
    // Use discount amount if provided, otherwise use percentage
    if (discountAmount > 0) {
      return fee - discountAmount;
    }
    return fee - (fee * discountPercent / 100);
  };

  const totalPaid = (enrollment) => {
    return enrollmentPayments.reduce((sum, p) => sum + p.amount, 0);
  };

  return (
    <div className="space-y-6" data-testid="enrollments-page">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Enrollments</h1>
        <p className="text-slate-600">Manage student enrollments and payments</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="converted" data-testid="converted-tab">
            Ready to Enroll ({convertedLeads.length})
          </TabsTrigger>
          <TabsTrigger value="enrolled" data-testid="enrolled-tab">
            Enrolled ({enrollments.length})
          </TabsTrigger>
        </TabsList>

        {/* Converted Leads - Ready for Enrollment */}
        <TabsContent value="converted" className="space-y-4">
          <Card className="border-slate-200 shadow-soft">
            <CardHeader>
              <CardTitle>Converted Leads</CardTitle>
              <CardDescription>These leads are ready to be enrolled as students</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Program</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Fee Quoted</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {convertedLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50" data-testid={`converted-lead-${lead.id}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-xs text-slate-500">{lead.city || 'N/A'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm">{lead.number}</p>
                          <p className="text-xs text-slate-500">{lead.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{lead.program_name}</Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {lead.fee_quoted ? `₹${lead.fee_quoted.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleStartEnrollment(lead)}
                              data-testid={`enroll-btn-${lead.id}`}
                            >
                              <UserPlus className="w-4 h-4 mr-1" /> Enroll
                            </Button>
                            {/* Delete button - Only for Branch Admin */}
                            {isBranchAdmin && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                onClick={() => {
                                  setDeletingLead(lead);
                                  setDeleteLeadDialog(true);
                                }}
                                data-testid={`delete-lead-btn-${lead.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {convertedLeads.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    {loading ? 'Loading...' : 'No converted leads pending enrollment'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enrolled Students */}
        <TabsContent value="enrolled" className="space-y-4">
          <Card className="border-slate-200 shadow-soft">
            <CardHeader>
              <CardTitle>Enrolled Students</CardTitle>
              <CardDescription>Manage payments for enrolled students</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Program</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Final Fee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Payment Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Enrollment Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {enrollments.map((enrollment) => {
                      const status = enrollmentPaymentStatus[enrollment.id] || {};
                      return (
                        <tr key={enrollment.id} className="hover:bg-slate-50" data-testid={`enrollment-${enrollment.id}`}>
                          <td className="px-4 py-3">
                            <p className="font-medium">{enrollment.student_name}</p>
                            <p className="text-xs text-slate-500">{enrollment.city || 'N/A'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm">{enrollment.phone}</p>
                            <p className="text-xs text-slate-500">{enrollment.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline">{enrollment.program_name}</Badge>
                          </td>
                          <td className="px-4 py-3 font-semibold text-green-700">
                            ₹{enrollment.final_fee?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            {status.isPaidFull ? (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle className="w-3 h-3 mr-1" /> Paid
                              </Badge>
                            ) : status.totalPaid > 0 ? (
                              <div>
                                <Badge className="bg-yellow-100 text-yellow-700">
                                  <Clock className="w-3 h-3 mr-1" /> Partial
                                </Badge>
                                <p className="text-xs text-slate-500 mt-1">
                                  ₹{status.totalPaid?.toLocaleString()} / ₹{status.totalFee?.toLocaleString()}
                                </p>
                              </div>
                            ) : (
                              <Badge className="bg-red-100 text-red-700">
                                <Clock className="w-3 h-3 mr-1" /> Pending
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {format(new Date(enrollment.enrollment_date), 'dd MMM yyyy')}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {!status.hasPlan && (
                                <Badge variant="outline" className="text-orange-600 border-orange-300">No Plan</Badge>
                              )}
                              {status.hasPlan && (
                                <>
                                  <Badge className="bg-green-100 text-green-700">Plan Created</Badge>
                                  {isBranchAdmin && (
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => openEditPlanDialog(enrollment)}
                                      title="Edit Plan"
                                    >
                                      <Edit className="w-4 h-4 text-orange-500" />
                                    </Button>
                                  )}
                                </>
                              )}
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => openViewPaymentsDialog(enrollment)}
                                data-testid={`view-payments-btn-${enrollment.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {enrollments.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    {loading ? 'Loading...' : 'No enrollments yet'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Multi-step Enrollment Dialog */}
      <Dialog open={enrollDialog} onOpenChange={setEnrollDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Enroll Student - Step {enrollStep} of 4
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full ${
                  step <= enrollStep ? 'bg-green-500' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Personal Details */}
          {enrollStep === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">Personal Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={enrollForm.student_name}
                    onChange={(e) => setEnrollForm({ ...enrollForm, student_name: e.target.value })}
                    data-testid="enroll-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={enrollForm.email}
                    onChange={(e) => setEnrollForm({ ...enrollForm, email: e.target.value })}
                    data-testid="enroll-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input
                    value={enrollForm.phone}
                    onChange={(e) => setEnrollForm({ ...enrollForm, phone: e.target.value })}
                    data-testid="enroll-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={enrollForm.date_of_birth}
                    onChange={(e) => setEnrollForm({ ...enrollForm, date_of_birth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={enrollForm.gender} onValueChange={(v) => setEnrollForm({ ...enrollForm, gender: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pincode</Label>
                  <Input
                    value={enrollForm.pincode}
                    onChange={(e) => setEnrollForm({ ...enrollForm, pincode: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={enrollForm.address}
                  onChange={(e) => setEnrollForm({ ...enrollForm, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={enrollForm.city}
                    onChange={(e) => setEnrollForm({ ...enrollForm, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={enrollForm.state}
                    onChange={(e) => setEnrollForm({ ...enrollForm, state: e.target.value })}
                  />
                </div>
              </div>
              
              {/* Photo Uploads */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Image className="w-4 h-4" /> Student Photo
                  </Label>
                  {enrollForm.student_photo_url ? (
                    <div className="relative">
                      <img 
                        src={enrollForm.student_photo_url} 
                        alt="Student" 
                        className="w-24 h-24 object-cover rounded-lg border"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => setEnrollForm({ ...enrollForm, student_photo_url: '' })}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                      <Upload className="w-6 h-6 text-slate-400" />
                      <span className="text-sm text-slate-500 mt-1">
                        {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(e, 'student')}
                        disabled={uploadingPhoto}
                      />
                    </label>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Aadhar Card Documents
                  </Label>
                  <p className="text-xs text-slate-500 mb-2">Upload images or PDF (multiple files allowed)</p>
                  
                  {/* Existing single photo (legacy support) */}
                  {enrollForm.aadhar_photo_url && (
                    <div className="relative inline-block mr-2 mb-2">
                      <img 
                        src={enrollForm.aadhar_photo_url} 
                        alt="Aadhar" 
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                        onClick={() => setEnrollForm({ ...enrollForm, aadhar_photo_url: '' })}
                      >
                        ×
                      </Button>
                    </div>
                  )}
                  
                  {/* Multiple documents display */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {enrollForm.aadhar_documents?.map((doc, idx) => (
                      <div key={idx} className="relative">
                        {doc.includes('application/pdf') || doc.endsWith('.pdf') ? (
                          <div className="w-20 h-20 bg-red-50 border rounded-lg flex items-center justify-center">
                            <FileText className="w-8 h-8 text-red-500" />
                            <span className="absolute bottom-1 text-xs text-slate-600">PDF</span>
                          </div>
                        ) : (
                          <img 
                            src={doc} 
                            alt={`Aadhar ${idx + 1}`} 
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                          onClick={() => removeAadharDocument(idx)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Upload button */}
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-500 mt-1">
                      {uploadingAadhar ? 'Uploading...' : 'Add Aadhar Documents'}
                    </span>
                    <span className="text-xs text-slate-400">Images or PDF</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      multiple
                      className="hidden"
                      onChange={handleMultipleAadharUpload}
                      disabled={uploadingAadhar}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Academic Details */}
          {enrollStep === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">Academic Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Highest Qualification</Label>
                  <Select 
                    value={enrollForm.highest_qualification} 
                    onValueChange={(v) => setEnrollForm({ ...enrollForm, highest_qualification: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select qualification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10th">10th</SelectItem>
                      <SelectItem value="12th">12th</SelectItem>
                      <SelectItem value="Graduate">Graduate</SelectItem>
                      <SelectItem value="Post Graduate">Post Graduate</SelectItem>
                      <SelectItem value="Diploma">Diploma</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Passing Year</Label>
                  <Input
                    value={enrollForm.passing_year}
                    onChange={(e) => setEnrollForm({ ...enrollForm, passing_year: e.target.value })}
                    placeholder="2023"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Institution Name</Label>
                  <Input
                    value={enrollForm.institution_name}
                    onChange={(e) => setEnrollForm({ ...enrollForm, institution_name: e.target.value })}
                    placeholder="University/College/School name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Percentage/CGPA</Label>
                  <Input
                    type="number"
                    value={enrollForm.percentage}
                    onChange={(e) => setEnrollForm({ ...enrollForm, percentage: e.target.value })}
                    placeholder="85"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Program Details */}
          {enrollStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">Program & Fee Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Program *</Label>
                  <Select 
                    value={enrollForm.program_id} 
                    onValueChange={(v) => {
                      const program = programs.find(p => p.id === v);
                      setEnrollForm({ 
                        ...enrollForm, 
                        program_id: v,
                        fee_quoted: program?.fee?.toString() || enrollForm.fee_quoted
                      });
                    }}
                  >
                    <SelectTrigger data-testid="enroll-program">
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name} - ₹{program.fee.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Enrollment Date *</Label>
                  <Input
                    type="date"
                    value={enrollForm.enrollment_date}
                    onChange={(e) => setEnrollForm({ ...enrollForm, enrollment_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fee Quoted (₹) *</Label>
                  <Input
                    type="number"
                    value={enrollForm.fee_quoted}
                    onChange={(e) => setEnrollForm({ ...enrollForm, fee_quoted: e.target.value })}
                    data-testid="enroll-fee"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Discount (%)</Label>
                  <Input
                    type="number"
                    value={enrollForm.discount_percent}
                    onChange={(e) => setEnrollForm({ ...enrollForm, discount_percent: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Or Discount Amount (₹)</Label>
                  <Input
                    type="number"
                    value={enrollForm.discount_amount}
                    onChange={(e) => setEnrollForm({ ...enrollForm, discount_amount: e.target.value })}
                    placeholder="Direct discount in rupees"
                  />
                </div>
              </div>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-green-700">Final Fee (after discount):</span>
                    <span className="text-2xl font-bold text-green-700">
                      ₹{calculateFinalFee().toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {enrollStep === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700">Confirm Enrollment</h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Student Name:</span>
                    <p className="font-medium">{enrollForm.student_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Email:</span>
                    <p className="font-medium">{enrollForm.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Phone:</span>
                    <p className="font-medium">{enrollForm.phone}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Program:</span>
                    <p className="font-medium">{programs.find(p => p.id === enrollForm.program_id)?.name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Fee Quoted:</span>
                    <p className="font-medium">₹{parseFloat(enrollForm.fee_quoted || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Discount:</span>
                    <p className="font-medium">
                      {enrollForm.discount_amount 
                        ? `₹${parseFloat(enrollForm.discount_amount).toLocaleString()}`
                        : `${enrollForm.discount_percent || 0}%`
                      }
                    </p>
                  </div>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Final Amount to Pay:</span>
                    <span className="text-xl font-bold text-green-600">
                      ₹{calculateFinalFee().toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => enrollStep > 1 ? setEnrollStep(enrollStep - 1) : setEnrollDialog(false)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> {enrollStep > 1 ? 'Previous' : 'Cancel'}
            </Button>
            {enrollStep < 4 ? (
              <Button 
                onClick={() => setEnrollStep(enrollStep + 1)}
                className="bg-slate-900 hover:bg-slate-800"
                data-testid="enroll-next"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button 
                onClick={handleEnrollmentSubmit}
                className="bg-green-600 hover:bg-green-700"
                data-testid="enroll-submit"
              >
                Complete Enrollment
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Plan Dialog */}
      <Dialog open={paymentPlanDialog} onOpenChange={setPaymentPlanDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Payment Plan</DialogTitle>
          </DialogHeader>
          {selectedEnrollment && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-600">Student: <span className="font-medium">{selectedEnrollment.student_name}</span></p>
                <p className="text-sm text-slate-600">Total Fee: <span className="font-bold text-green-600">₹{selectedEnrollment.final_fee?.toLocaleString()}</span></p>
              </div>

              <div className="space-y-2">
                <Label>Payment Plan Type</Label>
                <Select value={paymentPlanType} onValueChange={setPaymentPlanType}>
                  <SelectTrigger data-testid="payment-plan-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="One-time">One-time Payment</SelectItem>
                    <SelectItem value="Installments">Installments</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentPlanType === 'Installments' && (
                <>
                  <div className="space-y-2">
                    <Label>Number of Installments</Label>
                    <Input
                      type="number"
                      min="2"
                      max="24"
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(parseInt(e.target.value) || 2)}
                      placeholder="Enter number of installments"
                      data-testid="installments-count-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Installment Schedule</Label>
                    <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                      {installments.map((inst, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span>Installment {inst.installment_number}</span>
                          <div className="flex items-center gap-3">
                            <Input
                              type="number"
                              value={inst.amount}
                              onChange={(e) => {
                                const newInst = [...installments];
                                newInst[idx].amount = parseInt(e.target.value);
                                setInstallments(newInst);
                              }}
                              className="w-28 h-8"
                            />
                            <Input
                              type="date"
                              value={inst.due_date}
                              onChange={(e) => {
                                const newInst = [...installments];
                                newInst[idx].due_date = e.target.value;
                                setInstallments(newInst);
                              }}
                              className="w-36 h-8"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setPaymentPlanDialog(false)}>Cancel</Button>
                <Button onClick={handleCreatePaymentPlan} className="bg-slate-900 hover:bg-slate-800" data-testid="create-plan-btn">
                  Create Plan
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={recordPaymentDialog} onOpenChange={setRecordPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedEnrollment && existingPaymentPlan && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-600">Student: <span className="font-medium">{selectedEnrollment.student_name}</span></p>
                <p className="text-sm text-slate-600">Plan Type: <span className="font-medium">{existingPaymentPlan.plan_type}</span></p>
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">Total Fee</p>
                    <p className="font-bold text-slate-800">₹{(selectedEnrollment.total_fee || existingPaymentPlan.total_amount)?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Paid</p>
                    <p className="font-bold text-green-600">₹{(existingPaymentPlan.total_paid || 0)?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Pending</p>
                    <p className="font-bold text-amber-600">₹{((selectedEnrollment.total_fee || existingPaymentPlan.total_amount || 0) - (existingPaymentPlan.total_paid || 0))?.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (₹) *</Label>
                  <Input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    max={(selectedEnrollment.total_fee || existingPaymentPlan.total_amount || 0) - (existingPaymentPlan.total_paid || 0)}
                    data-testid="payment-amount"
                  />
                  <p className="text-xs text-slate-500">
                    Max: ₹{((selectedEnrollment.total_fee || existingPaymentPlan.total_amount || 0) - (existingPaymentPlan.total_paid || 0))?.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Payment Mode *</Label>
                  <Select value={paymentForm.payment_mode} onValueChange={(v) => setPaymentForm({ ...paymentForm, payment_mode: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map((mode) => (
                        <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Date *</Label>
                  <Input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  />
                </div>
                {existingPaymentPlan.plan_type === 'Installments' && (
                  <div className="space-y-2">
                    <Label>Installment Number</Label>
                    <Select value={paymentForm.installment_number} onValueChange={(v) => setPaymentForm({ ...paymentForm, installment_number: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: existingPaymentPlan.installments_count || 3 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>Installment {i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Remarks</Label>
                <Input
                  value={paymentForm.remarks}
                  onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setRecordPaymentDialog(false)}>Cancel</Button>
                <Button onClick={handleRecordPayment} className="bg-green-600 hover:bg-green-700" data-testid="record-payment-submit">
                  Record Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Payments Dialog */}
      <Dialog open={viewPaymentsDialog} onOpenChange={setViewPaymentsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
          </DialogHeader>
          {selectedEnrollment && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-medium">{selectedEnrollment.student_name}</p>
                  <p className="text-sm text-slate-500">{selectedEnrollment.program_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Total Fee: ₹{selectedEnrollment.final_fee?.toLocaleString()}</p>
                  {existingPaymentPlan && (
                    <p className="text-sm text-green-600 font-medium">
                      Paid: ₹{enrollmentPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Mode</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Inst #</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {enrollmentPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-2 text-sm">{format(new Date(payment.payment_date), 'dd MMM yyyy')}</td>
                        <td className="px-4 py-2 text-sm font-semibold text-green-600">₹{payment.amount.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm">{payment.payment_mode}</td>
                        <td className="px-4 py-2 text-sm">{payment.installment_number || '-'}</td>
                        <td className="px-4 py-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewReceipt(payment.id)}
                            data-testid={`view-receipt-${payment.id}`}
                          >
                            <Printer className="w-3 h-3 mr-1" /> Receipt
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {enrollmentPayments.length === 0 && (
                  <div className="text-center py-8 text-slate-500">No payments recorded yet</div>
                )}
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setViewPaymentsDialog(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={receiptDialog} onOpenChange={setReceiptDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Payment Receipt</span>
              <Button onClick={handlePrintReceipt} className="bg-slate-900 hover:bg-slate-800" data-testid="print-receipt-btn">
                <Printer className="w-4 h-4 mr-2" /> Print Receipt
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {receiptData && (
            <div ref={receiptRef} className="receipt">
              {/* Header */}
              <div className="text-center border-b-2 border-slate-800 pb-4 mb-4">
                <h1 className="text-2xl font-bold text-slate-800">{receiptData.institute_name}</h1>
                <p className="text-sm text-slate-600">{receiptData.institute_tagline}</p>
                {receiptData.branch_name && (
                  <p className="text-sm text-slate-500 mt-1">
                    {receiptData.branch_name} | {receiptData.branch_city}
                  </p>
                )}
                {receiptData.branch_phone && (
                  <p className="text-xs text-slate-500">Phone: {receiptData.branch_phone}</p>
                )}
              </div>

              {/* Receipt Number */}
              <div className="bg-slate-100 p-3 rounded-lg text-center mb-4">
                <span className="text-sm text-slate-600">Receipt Number</span>
                <p className="text-lg font-bold text-slate-800">{receiptData.receipt_number}</p>
              </div>

              {/* Student Details */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-slate-200 py-2">
                    <span className="text-slate-600">Student Name:</span>
                    <span className="font-semibold">{receiptData.student_name}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 py-2">
                    <span className="text-slate-600">Program:</span>
                    <span className="font-semibold">{receiptData.program}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 py-2">
                    <span className="text-slate-600">Email:</span>
                    <span className="font-semibold">{receiptData.student_email}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-slate-200 py-2">
                    <span className="text-slate-600">Payment Date:</span>
                    <span className="font-semibold">{receiptData.payment_date}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 py-2">
                    <span className="text-slate-600">Payment Mode:</span>
                    <span className="font-semibold">{receiptData.payment_mode}</span>
                  </div>
                  {receiptData.installment_number && (
                    <div className="flex justify-between border-b border-slate-200 py-2">
                      <span className="text-slate-600">Installment #:</span>
                      <span className="font-semibold">{receiptData.installment_number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount Section */}
              <div className="bg-green-50 p-4 rounded-lg text-center mt-4">
                <span className="text-sm text-green-700">Amount Received</span>
                <p className="text-3xl font-bold text-green-700">₹{receiptData.amount?.toLocaleString()}</p>
                {receiptData.total_fee > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    Total Course Fee: ₹{receiptData.total_fee?.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="text-center mt-6 pt-4 border-t border-slate-200 text-slate-500 text-xs">
                <p>This is a computer-generated receipt. No signature required.</p>
                <p className="mt-1">Thank you for choosing {receiptData.institute_name}!</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Payment Plan Dialog (Branch Admin only) */}
      <Dialog open={editPlanDialog} onOpenChange={setEditPlanDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-orange-600" />
              Edit Payment Plan
            </DialogTitle>
          </DialogHeader>
          {editingPlan && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm">Student: <strong>{editingPlan.enrollment?.student_name}</strong></p>
                <p className="text-sm">Total Fee: <strong>₹{editingPlan.enrollment?.final_fee?.toLocaleString()}</strong></p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Installments</Label>
                  <Button size="sm" variant="outline" onClick={addEditInstallment}>
                    <Plus className="w-4 h-4 mr-1" /> Add Installment
                  </Button>
                </div>

                {editInstallments.map((inst, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg">
                    <span className="text-sm font-medium w-8">#{idx + 1}</span>
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={inst.amount}
                        onChange={(e) => {
                          const updated = [...editInstallments];
                          updated[idx].amount = e.target.value;
                          setEditInstallments(updated);
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="date"
                        value={inst.due_date}
                        onChange={(e) => {
                          const updated = [...editInstallments];
                          updated[idx].due_date = e.target.value;
                          setEditInstallments(updated);
                        }}
                      />
                    </div>
                    <Badge className={inst.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                      {inst.status}
                    </Badge>
                    {editInstallments.length > 1 && inst.status !== 'Paid' && (
                      <Button variant="ghost" size="sm" onClick={() => removeEditInstallment(idx)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}

                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Total: ₹{editInstallments.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="destructive" onClick={handleDeletePlan}>
                  <Trash2 className="w-4 h-4 mr-1" /> Delete Plan
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditPlanDialog(false)}>Cancel</Button>
                  <Button onClick={handleSaveEditedPlan}>Save Changes</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Lead Confirmation Dialog */}
      <AlertDialog open={deleteLeadDialog} onOpenChange={setDeleteLeadDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Ready to Enroll?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{deletingLead?.name}</strong> from the Ready to Enroll list? 
              This will soft-delete the lead and they will no longer appear in this list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteLead} 
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EnrollmentsPage;
