import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { FileText, Download, CheckCircle, XCircle, Eye, Edit, Clock, Award, QrCode, Trash2, Printer, Search, Loader2 } from 'lucide-react';
import { certificateAPI, adminAPI } from '@/api/api';

// Coerce any error.response.data.detail shape (string | array of Pydantic errors
// | object) to a safe string so react-hot-toast never receives a raw object.
const humanizeError = (err, fallback = 'Something went wrong') => {
  const d = err?.response?.data?.detail;
  if (!d) return err?.message || fallback;
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) {
    return d.map((e) => e?.msg || e?.detail || JSON.stringify(e)).join(', ');
  }
  if (typeof d === 'object') return d.msg || d.detail || JSON.stringify(d);
  return fallback;
};
import QRCode from 'qrcode';
import Layout from '@/components/Layout';

// Use local assets to avoid CORS issues
const CERTIFICATE_BG_URL = '/assets/etibackground.png';
const ETI_LOGO_URL = '/assets/eti-logo.png';

const CertificateManagementPage = () => {
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canApproveReject = ['Admin', 'Certificate Manager'].includes(user.role);
  const canEdit = canApproveReject;
  // All allowed roles (Admin, CM, Branch Admin, Counsellor, FDE) can download
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [editFormData, setEditFormData] = useState({});
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [manualDialog, setManualDialog] = useState(false);
  const [manualLookupLoading, setManualLookupLoading] = useState(false);
  const [manualFormData, setManualFormData] = useState({
    student_name: '',
    program_name: '',
    program_duration: '',
    branch_name: '',
    branch_id: '',
    email: '',
    phone: '',
    program_start_date: '',
    program_end_date: '',
    training_mode: 'Offline',
    training_hours: '',
    enrollment_number: '',
    certificate_id: '',
    initial_status: 'Approved',
  });
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [programs, setPrograms] = useState([]);
  const canvasRef = useRef(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await certificateAPI.getAll(params);
      setRequests(response.data);
    } catch (error) {
      toast.error('Failed to fetch certificate requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  // Fetch programs once on mount so the course dropdown is populated.
  useEffect(() => {
    (async () => {
      try {
        const res = await adminAPI.getPrograms();
        const rows = Array.isArray(res.data) ? res.data : [];
        // Sort alphabetically and de-duplicate by (name + duration)
        const seen = new Set();
        const unique = rows
          .filter((p) => {
            const key = `${p.name}|${p.duration || ''}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setPrograms(unique);
      } catch (e) {
        // Non-fatal — user can still type program manually via the "Custom" option.
      }
    })();
  }, []);

  // Helper: when a program is picked, auto-fill duration.
  const applyProgramPick = (value, formSetter, currentForm) => {
    if (value === '__custom__') {
      formSetter({ ...currentForm, program_name: '', program_duration: currentForm.program_duration || '' });
      return;
    }
    const prog = programs.find((p) => p.name === value);
    formSetter({
      ...currentForm,
      program_name: value,
      program_duration: prog?.duration || currentForm.program_duration || '',
    });
  };

  const handleApprove = async (id) => {
    try {
      await certificateAPI.approve(id);
      toast.success('Certificate request approved');
      fetchRequests();
    } catch (error) {
      toast.error(humanizeError(error, 'Failed to approve'));
    }
  };

  const handleReject = async () => {
    try {
      await certificateAPI.reject(selectedRequest.id, rejectReason);
      toast.success('Certificate request rejected');
      setRejectDialog(false);
      setRejectReason('');
      fetchRequests();
    } catch (error) {
      toast.error(humanizeError(error, 'Failed to reject'));
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await certificateAPI.update(selectedRequest.id, editFormData);
      // Re-fetch the single record to ensure UI reflects the persisted state
      try {
        const fresh = await certificateAPI.getOne(selectedRequest.id);
        setSelectedRequest(fresh.data);
      } catch (_) {}
      toast.success('Saved. Changes will appear on the certificate.');
      setEditDialog(false);
      await fetchRequests();
    } catch (error) {
      toast.error(humanizeError(error, 'Failed to update'));
    }
  };

  const handleDelete = async () => {
    try {
      await certificateAPI.delete(selectedRequest.id);
      toast.success('Certificate request deleted. Student can re-request anytime.');
      setDeleteDialog(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      toast.error(humanizeError(error, 'Failed to delete certificate request'));
    }
  };

  const resetManualForm = () => {
    setManualFormData({
      student_name: '',
      program_name: '',
      program_duration: '',
      branch_name: '',
      branch_id: '',
      email: '',
      phone: '',
      program_start_date: '',
      program_end_date: '',
      training_mode: 'Offline',
      training_hours: '',
      enrollment_number: '',
      certificate_id: '',
      initial_status: 'Approved',
    });
  };

  // When Cert Manager enters an enrollment number in the manual dialog,
  // pull the student + branch + course details from the same public endpoint
  // the student portal uses, so most fields fill themselves and only the
  // course (if the student has multiple) needs to be picked.
  const handleManualEnrollmentLookup = async () => {
    const enr = (manualFormData.enrollment_number || '').trim();
    if (!enr) {
      toast.error('Please enter an enrollment number to fetch details');
      return;
    }
    setManualLookupLoading(true);
    try {
      const res = await certificateAPI.getEnrollmentInfo(enr);
      const data = res.data || {};
      // Prefer the exact enrollment the user typed, else the first course.
      const course =
        (data.courses || []).find((c) => c.enrollment_id === enr) ||
        (data.courses || [])[0] ||
        {};
      const enrollmentDateIso = (course.enrollment_date || '').substring(0, 10);
      setManualFormData((prev) => ({
        ...prev,
        student_name: data.student_name || prev.student_name,
        email: data.email || prev.email,
        phone: data.phone || prev.phone,
        branch_name: data.branch_name || prev.branch_name,
        branch_id: data.branch_id || prev.branch_id,
        program_name: course.program_name || prev.program_name,
        program_duration: course.program_duration || prev.program_duration,
        program_start_date: enrollmentDateIso || prev.program_start_date,
      }));
      toast.success('Student details fetched. Please review course & dates.');
    } catch (error) {
      toast.error(humanizeError(error, 'Enrollment not found'));
    } finally {
      setManualLookupLoading(false);
    }
  };

  const handleManualCreate = async () => {
    // Basic validation
    if (!manualFormData.student_name.trim()) return toast.error('Student name is required');
    if (!manualFormData.program_name.trim()) return toast.error('Course / Program name is required');
    if (!manualFormData.program_start_date) return toast.error('Start date is required');
    if (!manualFormData.program_end_date) return toast.error('End date is required');

    setManualSubmitting(true);
    try {
      const payload = { ...manualFormData };
      // Coerce empty strings to undefined; parse training_hours to int
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '' || payload[k] === null) delete payload[k];
      });
      if (payload.training_hours) payload.training_hours = parseInt(payload.training_hours, 10);

      const res = await certificateAPI.createManual(payload);
      toast.success(
        `Certificate created: ${res.data.certificate_id} (${res.data.status}). You can now download or print it.`
      );
      setManualDialog(false);
      resetManualForm();
      fetchRequests();
    } catch (error) {
      toast.error(humanizeError(error, 'Failed to create certificate'));
    } finally {
      setManualSubmitting(false);
    }
  };

  const handleDownload = async (request) => {
    try {
      const response = await certificateAPI.download(request.id);
      const certData = response.data;
      
      // Generate certificate PDF
      await generateCertificatePDF(certData);
      
      toast.success('Certificate downloaded and WhatsApp notification sent!');
      fetchRequests();
    } catch (error) {
      console.error('Download error:', error);
      toast.error(humanizeError(error, 'Failed to download certificate'));
    }
  };

  const handleMarkPrinted = async (request) => {
    const ok = window.confirm(
      `Mark this certificate as Printed?\n\nStudent: ${request.student_name}\nCertificate ID: ${request.certificate_id}\n\nOnce marked, it will move to the "Printed" tab. You can still re-download it later if needed.`
    );
    if (!ok) return;
    try {
      const res = await certificateAPI.markPrinted(request.id);
      if (res?.data?.already_printed) {
        toast.info('This certificate was already marked as printed.');
      } else {
        toast.success(`${request.student_name}'s certificate marked as Printed`);
      }
      fetchRequests();
    } catch (error) {
      console.error('Mark-printed error:', error);
      toast.error(humanizeError(error, 'Failed to mark certificate as printed'));
    }
  };

  // Certificate title mapping - normalize legacy course names to official certification titles
  const getCertificateTitle = (programName) => {
    // Use the exact program name entered/selected on the certificate.
    // No hidden mapping — whatever the Cert Manager picks is what prints.
    return programName || '';
  };

  const generateCertificatePDF = async (certData) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error('Canvas not available');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // A4 Landscape at 300 DPI - Full size for proper printing
    canvas.width = 3508;
    canvas.height = 2480;
    
    // Maximum quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if ('textRendering' in ctx) ctx.textRendering = 'geometricPrecision';
    ctx.textBaseline = 'alphabetic';
    
    // ========== BACKGROUND ==========
    const bgImage = new Image();
    bgImage.crossOrigin = 'anonymous';
    
    await new Promise((resolve) => {
      bgImage.onload = resolve;
      bgImage.onerror = () => resolve();
      bgImage.src = window.location.origin + CERTIFICATE_BG_URL;
    });
    
    if (bgImage.complete && bgImage.naturalWidth > 0) {
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else {
      // White background with geometric pattern
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Subtle blue triangles
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = '#2563eb';
      
      // Left triangles
      ctx.beginPath();
      ctx.moveTo(0, 400);
      ctx.lineTo(400, 900);
      ctx.lineTo(0, 1400);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(0, 1200);
      ctx.lineTo(500, 1700);
      ctx.lineTo(0, 2200);
      ctx.fill();
      
      // Right triangles
      ctx.beginPath();
      ctx.moveTo(canvas.width, 400);
      ctx.lineTo(canvas.width - 400, 900);
      ctx.lineTo(canvas.width, 1400);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(canvas.width, 1200);
      ctx.lineTo(canvas.width - 500, 1700);
      ctx.lineTo(canvas.width, 2200);
      ctx.fill();
      
      ctx.globalAlpha = 1.0;
      
      // Decorative border
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 8;
      ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.strokeRect(80, 80, canvas.width - 160, canvas.height - 160);
    }
    
    // ========== LOGO - TOP CENTER (Larger) ==========
    const logoImage = new Image();
    logoImage.crossOrigin = 'anonymous';
    let logoLoaded = false;
    
    await new Promise((resolve) => {
      logoImage.onload = () => {
        logoLoaded = true;
        resolve();
      };
      logoImage.onerror = () => resolve();
      logoImage.src = window.location.origin + ETI_LOGO_URL;
      setTimeout(resolve, 3000);
    });
    
    const logoY = 100;
    if (logoLoaded && logoImage.complete && logoImage.naturalWidth > 0) {
      const logoWidth = 320;
      const logoHeight = (logoImage.naturalHeight / logoImage.naturalWidth) * logoWidth;
      ctx.drawImage(logoImage, (canvas.width - logoWidth) / 2, logoY, logoWidth, logoHeight);
    } else {
      // Text fallback
      ctx.textAlign = 'center';
      ctx.font = 'bold 100px Arial, sans-serif';
      ctx.fillStyle = '#1e40af';
      ctx.fillText('ETI EDUCOM', canvas.width / 2, logoY + 120);
    }
    
    // ========== CERTIFICATE OF COMPLETION (Larger) ==========
    ctx.textAlign = 'center';
    ctx.font = 'italic bold 120px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#1e3a5f';
    ctx.fillText('CERTIFICATE OF COMPLETION', canvas.width / 2, 520);
    
    // Gold decorative line
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 600, 570);
    ctx.lineTo(canvas.width / 2 + 600, 570);
    ctx.stroke();
    
    // ========== "This is to certify that" (Larger) ==========
    ctx.font = 'italic 52px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#333333';
    ctx.fillText('This is to certify that', canvas.width / 2, 700);
    
    // ========== STUDENT NAME (Much Larger) ==========
    ctx.font = 'bold 100px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#1e40af';
    const studentNameSafe = certData.student_name || '';
    ctx.fillText(studentNameSafe.toUpperCase(), canvas.width / 2, 860);
    
    // Name underline
    const nameWidth = ctx.measureText(studentNameSafe.toUpperCase()).width;
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo((canvas.width - nameWidth) / 2 - 40, 900);
    ctx.lineTo((canvas.width + nameWidth) / 2 + 40, 900);
    ctx.stroke();
    
    // ========== "has successfully completed..." (Larger) ==========
    ctx.font = 'italic 44px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#333333';
    ctx.fillText('has successfully completed the professional training program', canvas.width / 2, 1010);
    
    // ========== PROGRAM NAME (Larger) ==========
    ctx.font = 'bold 76px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#1e40af';
    ctx.fillText(getCertificateTitle(certData.program_name).toUpperCase(), canvas.width / 2, 1140);
    
    // ========== DURATION DETAILS (Larger) ==========
    ctx.font = '38px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#333333';
    const branchNameSafe = certData.branch_name || '';
    const branchCity = branchNameSafe.includes('-')
      ? branchNameSafe.split('-')[1].trim()
      : branchNameSafe;
    ctx.fillText(`conducted by ETI Educom, ${branchCity}, Punjab, India`, canvas.width / 2, 1250);

    // Show training hours whenever they are present — not restricted to any
    // specific program anymore, so edits made by Cert Manager are honoured.
    const durationLine = certData.training_hours
      ? `for a duration of ${certData.program_duration} (${certData.training_hours} Hours) in ${certData.training_mode} Mode.`
      : `for a duration of ${certData.program_duration} in ${certData.training_mode} Mode.`;
    ctx.fillText(durationLine, canvas.width / 2, 1310);

    // Show training period (start → end) so date edits reflect on the certificate.
    const fmtCertDate = (iso) => {
      if (!iso) return '';
      const d = new Date(iso.length > 10 ? iso : iso + 'T00:00:00');
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    const startTxt = fmtCertDate(certData.program_start_date);
    const endTxt = fmtCertDate(certData.program_end_date);
    if (startTxt && endTxt) {
      ctx.font = '34px "Times New Roman", Georgia, serif';
      ctx.fillStyle = '#333333';
      ctx.fillText(`Training period: ${startTxt} to ${endTxt}`, canvas.width / 2, 1365);
    }

    // ========== PARTICIPATION TEXT (Larger) ==========
    ctx.font = 'italic 34px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#444444';
    ctx.fillText('During the training period, the candidate demonstrated satisfactory participation,', canvas.width / 2, 1420);
    ctx.fillText('discipline, and practical understanding. This certificate is awarded in recognition', canvas.width / 2, 1475);
    ctx.fillText('of the successful completion of the above training program.', canvas.width / 2, 1530);
    
    // ========== BOTTOM SECTION ==========
    const bottomY = 1700;
    const leftMargin = 200;
    const rightMargin = canvas.width - 200;
    
    // LEFT - Certificate / Enrollment identifiers (Registration Number has been removed)
    ctx.textAlign = 'left';
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillStyle = '#1e3a5f';
    ctx.fillText(`Certificate ID: ${certData.certificate_id}`, leftMargin, bottomY);
    if (certData.enrollment_number) {
      ctx.fillText(`Enrollment No.: ${certData.enrollment_number}`, leftMargin, bottomY + 55);
    }
    ctx.fillText(`Date of Issue: ${certData.issued_date}`, leftMargin, bottomY + 110);
    ctx.font = '28px Arial, sans-serif';
    ctx.fillStyle = '#555555';
    ctx.fillText(`Verification: ${(certData.verification_id || '').substring(0, 16)}`, leftMargin, bottomY + 165);
    
    // CENTER - Decorative diamond ornament (replaces the crosshair)
    const centerX = canvas.width / 2;
    const ornY = bottomY + 80;
    ctx.strokeStyle = '#b8860b';
    ctx.fillStyle = '#b8860b';
    ctx.lineWidth = 2;
    // Left flourish
    ctx.beginPath();
    ctx.moveTo(centerX - 260, ornY);
    ctx.lineTo(centerX - 40, ornY);
    ctx.stroke();
    // Right flourish
    ctx.beginPath();
    ctx.moveTo(centerX + 40, ornY);
    ctx.lineTo(centerX + 260, ornY);
    ctx.stroke();
    // Center diamond
    ctx.beginPath();
    ctx.moveTo(centerX, ornY - 22);
    ctx.lineTo(centerX + 22, ornY);
    ctx.lineTo(centerX, ornY + 22);
    ctx.lineTo(centerX - 22, ornY);
    ctx.closePath();
    ctx.fill();
    // Small centered gold dot beneath diamond
    ctx.beginPath();
    ctx.arc(centerX, ornY + 60, 5, 0, 2 * Math.PI);
    ctx.fill();

    // RIGHT - Signature (Larger)
    ctx.textAlign = 'right';
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rightMargin - 350, bottomY + 80);
    ctx.lineTo(rightMargin, bottomY + 80);
    ctx.stroke();

    // Soft circular seal behind signatory (very light gold)
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(rightMargin - 100, bottomY + 60, 110, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rightMargin - 100, bottomY + 60, 90, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
    
    ctx.font = 'bold 34px Arial, sans-serif';
    ctx.fillStyle = '#1e3a5f';
    ctx.fillText('Authorized Signatory', rightMargin, bottomY + 130);
    ctx.font = '30px Arial, sans-serif';
    ctx.fillStyle = '#333333';
    ctx.fillText('Academic Head, ETI Educom', rightMargin, bottomY + 175);
    
    // QR Code (Larger)
    try {
      const verifyUrl = `${window.location.origin}/verify/${certData.verification_id}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { 
        width: 280, 
        margin: 1, 
        color: { dark: '#1e3a5f' } 
      });
      
      const qrImage = new Image();
      await new Promise((resolve) => {
        qrImage.onload = resolve;
        qrImage.onerror = resolve;
        qrImage.src = qrDataUrl;
      });
      
      if (qrImage.complete && qrImage.naturalWidth > 0) {
        ctx.drawImage(qrImage, rightMargin - 200, bottomY + 200, 200, 200);
        ctx.font = '22px Arial, sans-serif';
        ctx.fillStyle = '#666666';
        ctx.textAlign = 'center';
        ctx.fillText('Scan to Verify', rightMargin - 100, bottomY + 420);
      }
    } catch (qrError) {
      console.warn('QR code generation failed:', qrError);
    }
    
    // ========== FOOTER (positioned safely above inner border) ==========
    // Inner border sits at y = canvas.height - 80 (=2400). Keep all footer content above y=2340.
    // Decorative gold divider above the footer
    const footerDividerY = canvas.height - 260;
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 480, footerDividerY);
    ctx.lineTo(canvas.width / 2 - 30, footerDividerY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 + 30, footerDividerY);
    ctx.lineTo(canvas.width / 2 + 480, footerDividerY);
    ctx.stroke();
    // Tiny centered diamond on divider
    ctx.fillStyle = '#b8860b';
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, footerDividerY - 10);
    ctx.lineTo(canvas.width / 2 + 10, footerDividerY);
    ctx.lineTo(canvas.width / 2, footerDividerY + 10);
    ctx.lineTo(canvas.width / 2 - 10, footerDividerY);
    ctx.closePath();
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.font = 'italic 26px "Times New Roman", Georgia, serif';
    ctx.fillStyle = '#4a5568';
    ctx.fillText(
      "Issued in accordance with ETI Educom's documented Quality Management System (QMS) compliant with ISO 9001:2015.",
      canvas.width / 2,
      canvas.height - 200
    );

    ctx.font = '22px Arial, sans-serif';
    ctx.fillStyle = '#718096';
    ctx.fillText(
      'This certificate is issued by ETI Educom as a training completion credential and does not claim',
      canvas.width / 2,
      canvas.height - 160
    );
    ctx.fillText(
      'equivalence to any government degree or university qualification.',
      canvas.width / 2,
      canvas.height - 128
    );
    
    // ========== DOWNLOAD (max quality PNG via Blob) ==========
    await new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          // Fallback to dataURL
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          const link = document.createElement('a');
          link.download = `Certificate_${(certData.student_name || '').replace(/\s+/g, '_')}_${certData.certificate_id}.png`;
          link.href = dataUrl;
          link.click();
          resolve();
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `Certificate_${(certData.student_name || '').replace(/\s+/g, '_')}_${certData.certificate_id}.png`;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve();
      }, 'image/png', 1.0);
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      Pending: { color: 'bg-amber-100 text-amber-700', icon: Clock },
      Approved: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
      Rejected: { color: 'bg-red-100 text-red-700', icon: XCircle },
      Ready: { color: 'bg-green-100 text-green-700', icon: Award },
      Printed: { color: 'bg-emerald-100 text-emerald-800 border border-emerald-300', icon: Printer },
    };
    const config = statusConfig[status] || statusConfig.Pending;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status}
      </Badge>
    );
  };

  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const approvedCount = requests.filter(r => r.status === 'Approved').length;
  const readyCount = requests.filter(r => r.status === 'Ready').length;
  const printedCount = requests.filter(r => r.status === 'Printed').length;

  // Client-side search across student name, enrollment number and phone.
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visibleRequests = normalizedQuery
    ? requests.filter((r) => {
        const bag = [
          r.student_name,
          r.enrollment_number,
          r.phone,
          r.email,
          r.certificate_id,
          r.program_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return bag.includes(normalizedQuery);
      })
    : requests;

  return (
    <Layout>
      <div className="space-y-6" data-testid="certificate-management-page">
        {/* Hidden canvas for certificate generation */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Certificate Management</h1>
            <p className="text-slate-600">Review and manage student certificate requests</p>
          </div>
          {canApproveReject && (
            <Button
              onClick={() => {
                resetManualForm();
                setManualDialog(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="cert-manual-create-btn"
            >
              <FileText className="w-4 h-4 mr-2" />
              + Create Certificate
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-600 text-sm font-medium">Pending</p>
                  <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Approved</p>
                  <p className="text-2xl font-bold text-blue-700">{approvedCount}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Issued</p>
                  <p className="text-2xl font-bold text-green-700">{readyCount}</p>
                </div>
                <Award className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm font-medium">Total</p>
                  <p className="text-2xl font-bold text-slate-700">{requests.length}</p>
                </div>
                <FileText className="w-8 h-8 text-slate-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs + Search */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All Requests</TabsTrigger>
              <TabsTrigger value="Pending">Pending</TabsTrigger>
              <TabsTrigger value="Approved">Approved</TabsTrigger>
              <TabsTrigger value="Ready">Issued</TabsTrigger>
              <TabsTrigger value="Printed">Printed{printedCount ? ` (${printedCount})` : ''}</TabsTrigger>
              <TabsTrigger value="Rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, enrollment no. or phone…"
              className="pl-9"
              data-testid="cert-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
                data-testid="cert-search-clear"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Requests Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium text-slate-600">Certificate ID</th>
                    <th className="text-left p-4 font-medium text-slate-600">Enrollment No.</th>
                    <th className="text-left p-4 font-medium text-slate-600">Student Name</th>
                    <th className="text-left p-4 font-medium text-slate-600">Phone</th>
                    <th className="text-left p-4 font-medium text-slate-600">Program</th>
                    <th className="text-left p-4 font-medium text-slate-600">Branch</th>
                    <th className="text-left p-4 font-medium text-slate-600">Status</th>
                    <th className="text-left p-4 font-medium text-slate-600">Requested On</th>
                    <th className="text-left p-4 font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="text-center p-8 text-slate-500">
                        Loading...
                      </td>
                    </tr>
                  ) : visibleRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center p-8 text-slate-500">
                        {normalizedQuery
                          ? `No certificate requests match "${searchQuery}"`
                          : 'No certificate requests found'}
                      </td>
                    </tr>
                  ) : (
                    visibleRequests.map((request) => (
                      <tr key={request.id} className="border-b hover:bg-slate-50">
                        <td className="p-4 font-mono text-sm">{request.certificate_id}</td>
                        <td className="p-4 font-mono text-sm text-slate-700">{request.enrollment_number || '—'}</td>
                        <td className="p-4 font-medium">{request.student_name}</td>
                        <td className="p-4 text-sm text-slate-700">{request.phone || '—'}</td>
                        <td className="p-4 text-sm">{request.program_name}</td>
                        <td className="p-4 text-sm">{request.branch_name}</td>
                        <td className="p-4">{getStatusBadge(request.status)}</td>
                        <td className="p-4 text-sm text-slate-500">
                          {new Date(request.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setViewDialog(true);
                              }}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            
                            {request.status === 'Pending' && canApproveReject && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleApprove(request.id)}
                                  title="Approve"
                                  data-testid={`cert-approve-${request.id}`}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setRejectDialog(true);
                                  }}
                                  title="Reject"
                                  data-testid={`cert-reject-${request.id}`}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setEditFormData({
                                    student_name: request.student_name || '',
                                    program_name: request.program_name || '',
                                    program_duration: request.program_duration || '',
                                    branch_name: request.branch_name || '',
                                    email: request.email || '',
                                    phone: request.phone || '',
                                    program_start_date: request.program_start_date || '',
                                    program_end_date: request.program_end_date || '',
                                    training_mode: request.training_mode || 'Offline',
                                    training_hours: request.training_hours ?? null,
                                    certificate_id: request.certificate_id || '',
                                  });
                                  setEditDialog(true);
                                }}
                                title="Edit student/course details"
                                data-testid={`cert-edit-${request.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            
                            {request.status === 'Pending' && !canApproveReject && (
                              <span className="text-xs text-slate-400 italic">Awaiting Cert Manager</span>
                            )}
                            
                            {(request.status === 'Approved' || request.status === 'Ready' || request.status === 'Printed') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => handleDownload(request)}
                                title="Download Certificate"
                                data-testid={`cert-download-${request.id}`}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}

                            {(request.status === 'Ready' || request.status === 'Approved') && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleMarkPrinted(request)}
                                title="Mark as Printed (after physical printout is issued). WhatsApp notification will be sent to the student."
                                data-testid={`cert-mark-printed-${request.id}`}
                              >
                                <Printer className="w-4 h-4 mr-1" /> Mark Printed
                              </Button>
                            )}
                            {request.status === 'Printed' && (
                              <span
                                className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium"
                                title={request.printed_by_name ? `Printed by ${request.printed_by_name}` : 'Printed'}
                              >
                                <Printer className="w-3.5 h-3.5" /> Printed
                              </span>
                            )}
                            
                            {canApproveReject && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setDeleteDialog(true);
                                }}
                                title="Delete request (student can re-apply)"
                                data-testid={`cert-delete-${request.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* View Dialog */}
        <Dialog open={viewDialog} onOpenChange={setViewDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Certificate Request Details</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500 text-sm">Certificate ID</Label>
                    <p className="font-mono">{selectedRequest.certificate_id}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-sm">Status</Label>
                    <p>{getStatusBadge(selectedRequest.status)}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-sm">Student Name</Label>
                    <p className="font-medium">{selectedRequest.student_name}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-sm">Enrollment</Label>
                    <p>{selectedRequest.enrollment_number}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-sm">Program</Label>
                    <p>{selectedRequest.program_name}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-sm">Duration</Label>
                    <p>{selectedRequest.program_duration}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-sm">Branch</Label>
                    <p>{selectedRequest.branch_name}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-sm">Training Mode</Label>
                    <p>{selectedRequest.training_mode}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-sm">Email</Label>
                    <p>{selectedRequest.email}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-sm">Phone</Label>
                    <p>{selectedRequest.phone}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-sm">Start Date</Label>
                    <p>{selectedRequest.program_start_date}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-sm">End Date</Label>
                    <p>{selectedRequest.program_end_date}</p>
                  </div>
                </div>
                {selectedRequest.rejection_reason && (
                  <div className="bg-red-50 p-3 rounded">
                    <Label className="text-red-600 text-sm">Rejection Reason</Label>
                    <p className="text-red-700">{selectedRequest.rejection_reason}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Certificate Details</DialogTitle>
              <p className="text-sm text-slate-500">
                Every field is editable. Once saved, these values are locked in and will
                not be auto-overwritten from the enrollment/program records.
              </p>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Student Name</Label>
                  <Input
                    value={editFormData.student_name || ''}
                    onChange={(e) => setEditFormData({...editFormData, student_name: e.target.value})}
                    data-testid="cert-edit-student-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Course / Program Name</Label>
                  <Select
                    value={
                      editFormData.program_name && programs.some((p) => p.name === editFormData.program_name)
                        ? editFormData.program_name
                        : (editFormData.program_name ? '__custom__' : '')
                    }
                    onValueChange={(val) => applyProgramPick(val, setEditFormData, editFormData)}
                  >
                    <SelectTrigger data-testid="cert-edit-program-select">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.name}{p.duration ? ` — ${p.duration}` : ''}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">✏️ Custom course (type manually)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={editFormData.program_name || ''}
                    onChange={(e) => setEditFormData({...editFormData, program_name: e.target.value})}
                    placeholder="Course name as printed on the certificate"
                    data-testid="cert-edit-program-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Program Duration</Label>
                  <Input
                    value={editFormData.program_duration || ''}
                    onChange={(e) => setEditFormData({...editFormData, program_duration: e.target.value})}
                    placeholder="e.g., 3 Months"
                    data-testid="cert-edit-program-duration"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Branch Name</Label>
                  <Input
                    value={editFormData.branch_name || ''}
                    onChange={(e) => setEditFormData({...editFormData, branch_name: e.target.value})}
                    placeholder="e.g., ETI Educom Patiala"
                    data-testid="cert-edit-branch-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                    data-testid="cert-edit-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                    data-testid="cert-edit-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Certificate ID</Label>
                  <Input
                    value={editFormData.certificate_id || ''}
                    onChange={(e) => setEditFormData({...editFormData, certificate_id: e.target.value})}
                    placeholder="ETI-YYYY-XXXXX"
                    data-testid="cert-edit-certificate-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={editFormData.program_start_date || ''}
                    onChange={(e) => setEditFormData({...editFormData, program_start_date: e.target.value})}
                    data-testid="cert-edit-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={editFormData.program_end_date || ''}
                    onChange={(e) => setEditFormData({...editFormData, program_end_date: e.target.value})}
                    data-testid="cert-edit-end-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Training Mode</Label>
                  <Select
                    value={editFormData.training_mode}
                    onValueChange={(value) => setEditFormData({...editFormData, training_mode: value})}
                  >
                    <SelectTrigger data-testid="cert-edit-training-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Offline">Offline</SelectItem>
                      <SelectItem value="Online">Online</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Training Hours</Label>
                  <Input
                    type="number"
                    value={editFormData.training_hours || ''}
                    onChange={(e) => setEditFormData({...editFormData, training_hours: e.target.value === '' ? null : parseInt(e.target.value, 10)})}
                    placeholder="e.g., 120"
                    data-testid="cert-edit-training-hours"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
              <Button onClick={handleUpdate} data-testid="cert-edit-save">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Certificate Request?</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm text-slate-600">
              <p>This will permanently remove the certificate request from the system.</p>
              <p>The student can submit a fresh request afterwards.</p>
              {selectedRequest && (
                <div className="bg-slate-50 rounded-md p-3 mt-2">
                  <p><span className="text-slate-500">Student:</span> <span className="font-medium">{selectedRequest.student_name}</span></p>
                  <p><span className="text-slate-500">Program:</span> {selectedRequest.program_name}</p>
                  <p><span className="text-slate-500">Certificate ID:</span> <span className="font-mono">{selectedRequest.certificate_id}</span></p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} data-testid="cert-confirm-delete">Delete Permanently</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Certificate Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reason for Rejection</Label>
                <Input
                  placeholder="Enter reason for rejection"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject}>Reject Request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manual Create Certificate Dialog */}
        <Dialog open={manualDialog} onOpenChange={setManualDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Certificate Manually</DialogTitle>
              <p className="text-sm text-slate-500">
                Issue a new certificate directly. All eligibility checks (fees paid, course
                completion, exam pass) are bypassed. You can create multiple certificates
                for the same student even against a single enrollment.
              </p>
            </DialogHeader>
            <div className="space-y-4">
              {/* Enrollment lookup (fills everything else) */}
              <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 space-y-2">
                <Label className="text-sm font-medium text-blue-900">
                  Enrollment Number <span className="text-xs text-slate-500 font-normal">(enter to auto-fetch student details)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={manualFormData.enrollment_number}
                    onChange={(e) => setManualFormData({ ...manualFormData, enrollment_number: e.target.value.toUpperCase() })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleManualEnrollmentLookup(); } }}
                    placeholder="e.g., PBPTKE0001"
                    data-testid="cert-manual-enrollment-number"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleManualEnrollmentLookup}
                    disabled={manualLookupLoading || !manualFormData.enrollment_number.trim()}
                    data-testid="cert-manual-fetch-btn"
                  >
                    {manualLookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span className="ml-1">Fetch</span>
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Student name, phone, email, branch and course details will be pre-filled. You can still edit the course name or type a custom one.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Student Name <span className="text-red-500">*</span></Label>
                  <Input
                    value={manualFormData.student_name}
                    onChange={(e) => setManualFormData({ ...manualFormData, student_name: e.target.value })}
                    placeholder="Full name as it should appear"
                    data-testid="cert-manual-student-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Course / Program Name <span className="text-red-500">*</span></Label>
                  <Select
                    value={
                      manualFormData.program_name && programs.some((p) => p.name === manualFormData.program_name)
                        ? manualFormData.program_name
                        : (manualFormData.program_name ? '__custom__' : '')
                    }
                    onValueChange={(val) => applyProgramPick(val, setManualFormData, manualFormData)}
                  >
                    <SelectTrigger data-testid="cert-manual-program-select">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.name}{p.duration ? ` — ${p.duration}` : ''}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">✏️ Custom course (type manually)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={manualFormData.program_name}
                    onChange={(e) => setManualFormData({ ...manualFormData, program_name: e.target.value })}
                    placeholder="Course name as printed on the certificate"
                    data-testid="cert-manual-program-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Program Duration</Label>
                  <Input
                    value={manualFormData.program_duration}
                    onChange={(e) => setManualFormData({ ...manualFormData, program_duration: e.target.value })}
                    placeholder="e.g., 3 Months"
                    data-testid="cert-manual-program-duration"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Branch Name</Label>
                  <Input
                    value={manualFormData.branch_name}
                    onChange={(e) => setManualFormData({ ...manualFormData, branch_name: e.target.value })}
                    placeholder="e.g., ETI Educom Patiala"
                    data-testid="cert-manual-branch-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={manualFormData.email}
                    onChange={(e) => setManualFormData({ ...manualFormData, email: e.target.value })}
                    data-testid="cert-manual-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={manualFormData.phone}
                    onChange={(e) => setManualFormData({ ...manualFormData, phone: e.target.value })}
                    data-testid="cert-manual-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Date <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    value={manualFormData.program_start_date}
                    onChange={(e) => setManualFormData({ ...manualFormData, program_start_date: e.target.value })}
                    data-testid="cert-manual-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    value={manualFormData.program_end_date}
                    onChange={(e) => setManualFormData({ ...manualFormData, program_end_date: e.target.value })}
                    data-testid="cert-manual-end-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Training Mode</Label>
                  <Select
                    value={manualFormData.training_mode}
                    onValueChange={(value) => setManualFormData({ ...manualFormData, training_mode: value })}
                  >
                    <SelectTrigger data-testid="cert-manual-training-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Offline">Offline</SelectItem>
                      <SelectItem value="Online">Online</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Training Hours</Label>
                  <Input
                    type="number"
                    value={manualFormData.training_hours}
                    onChange={(e) => setManualFormData({ ...manualFormData, training_hours: e.target.value })}
                    placeholder="e.g., 120"
                    data-testid="cert-manual-training-hours"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Certificate ID <span className="text-xs text-slate-400">(auto-generated if blank)</span></Label>
                  <Input
                    value={manualFormData.certificate_id}
                    onChange={(e) => setManualFormData({ ...manualFormData, certificate_id: e.target.value })}
                    placeholder="ETI-YYYY-XXXXX"
                    data-testid="cert-manual-certificate-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Initial Status</Label>
                  <Select
                    value={manualFormData.initial_status}
                    onValueChange={(value) => setManualFormData({ ...manualFormData, initial_status: value })}
                  >
                    <SelectTrigger data-testid="cert-manual-initial-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Approved">Approved (ready to download)</SelectItem>
                      <SelectItem value="Pending">Pending (needs review)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setManualDialog(false)} disabled={manualSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleManualCreate}
                disabled={manualSubmitting}
                data-testid="cert-manual-submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {manualSubmitting ? 'Creating...' : 'Create Certificate'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default CertificateManagementPage;
