import React, { useEffect, useState } from 'react';
import { placementAPI } from '@/api/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { Download, FileText, CalendarPlus, MessageSquarePlus, Award, Loader2 } from 'lucide-react';

const TabBtn = ({ active, onClick, icon: Icon, label, testid }) => (
  <button
    data-testid={testid}
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition ${
      active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
    }`}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

export default function StudentPlacementDrawer({ student, mode: initialMode, onClose, onChanged }) {
  const [mode, setMode] = useState(initialMode || 'resume');
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await placementAPI.studentDetail(student.id);
        setDetail(data);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [student.id]);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle data-testid="drawer-title">{student.name}</SheetTitle>
          <div className="text-sm text-slate-500">
            {student.program_name} · {student.email} · {student.phone}
          </div>
        </SheetHeader>

        <div className="flex flex-wrap gap-2 my-5">
          <TabBtn active={mode === 'resume'} onClick={() => setMode('resume')} icon={FileText} label="Generate Resume" testid="tab-resume" />
          <TabBtn active={mode === 'interview'} onClick={() => setMode('interview')} icon={CalendarPlus} label="Schedule Interview" testid="tab-interview" />
          <TabBtn active={mode === 'remark'} onClick={() => setMode('remark')} icon={MessageSquarePlus} label="Add Remark" testid="tab-remark" />
          <TabBtn active={mode === 'placed'} onClick={() => setMode('placed')} icon={Award} label="Mark Placed" testid="tab-placed" />
        </div>

        {mode === 'resume' && <ResumeTab student={student} />}
        {mode === 'interview' && <InterviewTab student={student} detail={detail} onChanged={onChanged} />}
        {mode === 'remark' && <RemarkTab student={student} detail={detail} onChanged={onChanged} />}
        {mode === 'placed' && <PlacedTab student={student} detail={detail} onChanged={onChanged} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function ResumeTab({ student }) {
  const [form, setForm] = useState({
    objective: '',
    skills: '',
    projects: '',
    experience: '',
    certifications: '',
    languages: 'English, Hindi',
  });
  const [busy, setBusy] = useState(false);

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const { data } = await placementAPI.generateResume({ student_id: student.id, ...form });
      // Convert base64 → blob → download
      const byteChars = atob(data.pdf_base64);
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = data.filename || 'resume.pdf';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('ATS resume generated & downloaded');
    } catch (e) {
      toast.error('Resume generation failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3" data-testid="resume-tab">
      <p className="text-sm text-slate-600">AI will fill blanks. Provide any extras to bias the output.</p>
      <div>
        <Label>Career Objective (optional)</Label>
        <Textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} placeholder="e.g. Aspiring data analyst seeking..." data-testid="resume-objective" />
      </div>
      <div>
        <Label>Skills (comma-separated)</Label>
        <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Python, SQL, Power BI, Excel" data-testid="resume-skills" />
      </div>
      <div>
        <Label>Projects</Label>
        <Textarea value={form.projects} onChange={(e) => setForm({ ...form, projects: e.target.value })} placeholder="Sales forecast model, attendance dashboard..." data-testid="resume-projects" />
      </div>
      <div>
        <Label>Experience (if any)</Label>
        <Textarea value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} placeholder="6-mo internship at XYZ as Data Intern" data-testid="resume-experience" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Certifications</Label>
          <Input value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} data-testid="resume-certs" />
        </div>
        <div>
          <Label>Languages</Label>
          <Input value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} data-testid="resume-langs" />
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={busy} className="w-full bg-blue-600 hover:bg-blue-700" data-testid="btn-generate-resume">
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
        {busy ? 'Generating ATS resume…' : 'Generate ATS Resume (PDF)'}
      </Button>
    </div>
  );
}

function InterviewTab({ student, detail, onChanged }) {
  const [form, setForm] = useState({
    company_name: '', role: '', interview_date: '', interview_time: '',
    mode: 'Online', location_or_link: '', notes: '',
  });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.company_name || !form.interview_date) {
      toast.error('Company and interview date are required');
      return;
    }
    setBusy(true);
    try {
      await placementAPI.createInterview({
        student_id: student.id,
        student_name: student.name,
        ...form,
      });
      toast.success('Interview scheduled');
      onChanged && onChanged();
      setForm({ company_name: '', role: '', interview_date: '', interview_time: '', mode: 'Online', location_or_link: '', notes: '' });
    } catch (e) {
      toast.error('Failed: ' + (e.response?.data?.detail || e.message));
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3" data-testid="interview-tab">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Company *</Label>
          <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} data-testid="iv-company" />
        </div>
        <div>
          <Label>Role</Label>
          <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} data-testid="iv-role" />
        </div>
        <div>
          <Label>Date *</Label>
          <DatePicker
            value={form.interview_date}
            onChange={(v) => setForm({ ...form, interview_date: v })}
            placeholder="Select interview date"
            testid="iv-date"
          />
        </div>
        <div>
          <Label>Time</Label>
          <Input type="time" value={form.interview_time} onChange={(e) => setForm({ ...form, interview_time: e.target.value })} data-testid="iv-time" />
        </div>
        <div>
          <Label>Mode</Label>
          <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
            <SelectTrigger data-testid="iv-mode"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Online">Online</SelectItem>
              <SelectItem value="Walk-in">Walk-in</SelectItem>
              <SelectItem value="Telephonic">Telephonic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Link / Location</Label>
          <Input value={form.location_or_link} onChange={(e) => setForm({ ...form, location_or_link: e.target.value })} data-testid="iv-loc" />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="iv-notes" />
      </div>
      <Button onClick={submit} disabled={busy} className="w-full" data-testid="btn-create-iv">
        {busy ? 'Scheduling…' : 'Schedule Interview'}
      </Button>

      {detail?.interviews?.length > 0 && (
        <div className="pt-4 border-t mt-4">
          <div className="text-sm font-medium text-slate-700 mb-2">Past Interviews ({detail.interviews.length})</div>
          <div className="divide-y">
            {detail.interviews.map((iv) => (
              <div key={iv.id} className="py-2 flex justify-between text-sm">
                <div>
                  <div className="font-medium">{iv.company_name}</div>
                  <div className="text-slate-500 text-xs">{iv.role} · {iv.interview_date} {iv.interview_time}</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">{iv.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RemarkTab({ student, detail, onChanged }) {
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!remark.trim()) return;
    setBusy(true);
    try {
      await placementAPI.addRemark({ student_id: student.id, remark });
      toast.success('Remark added');
      setRemark('');
      onChanged && onChanged();
    } catch (e) {
      toast.error('Failed');
    } finally { setBusy(false); }
  };
  return (
    <div className="space-y-3" data-testid="remark-tab">
      <Label>New remark</Label>
      <Textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={4} data-testid="remark-input" />
      <Button onClick={submit} disabled={busy} className="w-full" data-testid="btn-add-remark">
        {busy ? 'Saving…' : 'Add Remark'}
      </Button>
      {detail?.remarks?.length > 0 && (
        <div className="pt-4 border-t mt-4 space-y-2">
          <div className="text-sm font-medium text-slate-700 mb-1">Past remarks</div>
          {detail.remarks.map((r) => (
            <div key={r.id} className="p-3 bg-slate-50 rounded-lg text-sm">
              <div className="text-slate-800">{r.remark}</div>
              <div className="text-xs text-slate-500 mt-1">{r.created_by_name} · {new Date(r.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlacedTab({ student, detail, onChanged, onClose }) {
  const [form, setForm] = useState({
    company_name: '', designation: '', salary_lpa: '', city: '', joining_date: '', remarks: '',
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (detail?.placement) setForm({ ...detail.placement, salary_lpa: detail.placement.salary_lpa || '' });
  }, [detail]);

  const submit = async () => {
    if (!form.company_name) {
      toast.error('Company name is required');
      return;
    }
    setBusy(true);
    try {
      await placementAPI.markPlaced({
        student_id: student.id,
        student_name: student.name,
        ...form,
        salary_lpa: form.salary_lpa ? Number(form.salary_lpa) : null,
      });
      toast.success('🎉 Student marked as placed');
      onChanged && onChanged();
      onClose && onClose();
    } catch (e) {
      toast.error('Failed: ' + (e.response?.data?.detail || e.message));
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3" data-testid="placed-tab">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Company *</Label>
          <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} data-testid="pl-company" />
        </div>
        <div>
          <Label>Designation</Label>
          <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} data-testid="pl-designation" />
        </div>
        <div>
          <Label>Salary (LPA)</Label>
          <Input type="number" step="0.1" value={form.salary_lpa} onChange={(e) => setForm({ ...form, salary_lpa: e.target.value })} data-testid="pl-salary" />
        </div>
        <div>
          <Label>City</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} data-testid="pl-city" />
        </div>
        <div>
          <Label>Joining Date</Label>
          <DatePicker
            value={form.joining_date}
            onChange={(v) => setForm({ ...form, joining_date: v })}
            placeholder="Select joining date"
            testid="pl-joining"
          />
        </div>
      </div>
      <div>
        <Label>Remarks</Label>
        <Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} data-testid="pl-remarks" />
      </div>
      <Button onClick={submit} disabled={busy} className="w-full bg-emerald-600 hover:bg-emerald-700" data-testid="btn-confirm-placed">
        {busy ? 'Saving…' : (detail?.placement ? 'Update Placement' : 'Confirm Placement')}
      </Button>
    </div>
  );
}
