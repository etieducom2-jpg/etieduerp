import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Printer, ShieldCheck, Lock } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND = process.env.REACT_APP_BACKEND_URL;

const PublicAgreementView = () => {
  const { token } = useParams();
  const [a, setA] = useState(null);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    axios
      .get(`${BACKEND}/api/public/wizbang/agreement/${token}`)
      .then((r) => setA(r.data))
      .catch((e) => setError(e.response?.data?.detail || 'Agreement not found.'));
  };
  useEffect(load, [token]);

  const sign = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Please type your full name');
      return;
    }
    if (!agree) {
      toast.error('You must check the consent box');
      return;
    }
    try {
      setSubmitting(true);
      await axios.post(`${BACKEND}/api/public/wizbang/agreement/${token}/sign`, {
        full_name: fullName.trim(),
        email: email || null,
        agree: true,
      });
      toast.success('Thank you! Agreement signed and locked.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Sign failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 text-center">
        <h1 className="text-2xl font-bold text-rose-600">{error}</h1>
      </div>
    );
  if (!a)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-500">Loading…</p>
      </div>
    );

  const isSigned = a.status === 'Signed';

  return (
    <div className="min-h-screen bg-slate-200 py-6 print:bg-white print:py-0 print:px-0">
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .a4-sheet { box-shadow: none !important; border-radius: 0 !important; margin: 0 auto !important; }
        }
        .a4-sheet {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #fff;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          color-adjust: exact;
        }
        .a4-action-bar { width: 210mm; max-width: 100%; margin: 0 auto; }
        @media (max-width: 820px) {
          .a4-sheet, .a4-action-bar { width: 100%; min-height: 0; }
        }
      `}</style>

      <div className="overflow-x-auto print:overflow-visible">
        {/* Action bar — sits above the A4 sheet, not printed */}
        <div className="no-print a4-action-bar bg-slate-900 text-white px-6 py-3 flex items-center justify-between rounded-t-lg">
          <p className="text-sm">
            Agreement <span className="font-mono">{a.agreement_number}</span>
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.print()}
            data-testid="agreement-print-btn"
          >
            <Printer className="w-4 h-4 mr-1" /> Print / Save
          </Button>
        </div>

        <div className="a4-sheet shadow-lg print:shadow-none rounded-b-lg overflow-hidden">
        {/* Header */}
        <div className="px-[16mm] pt-[14mm] pb-[8mm] flex items-start justify-between border-b border-slate-200">
          <div>
            {a.logo_url ? (
              <img
                src={a.logo_url}
                alt="Wizbang"
                className="h-14 w-auto object-contain"
                style={{ filter: 'brightness(0)' }}
              />
            ) : (
              <h1 className="text-2xl font-bold tracking-tight text-black">WIZBANG</h1>
            )}
            <p className="text-xs text-slate-500 mt-2">Digital Marketing &amp; Growth Services</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{a.title}</p>
            <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">
              Service Agreement
            </p>
            <p className="mt-2 text-xs text-slate-600">Effective: {a.effective_date}</p>
            <p className="text-xs text-slate-600">Term: {a.term_months} months</p>
            {isSigned && (
              <p className="mt-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                <Lock className="w-3 h-3" /> Locked &amp; Signed
              </p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-[16mm] py-[6mm]">
          <pre
            className="whitespace-pre-wrap font-serif text-sm text-slate-800 leading-relaxed"
            data-testid="agreement-body"
          >
            {a.content}
          </pre>
        </div>

        {/* Signature block */}
        <div className="px-[16mm] py-[6mm] bg-slate-50 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs uppercase text-slate-500 mb-2 tracking-wide">For the Company</p>
              <div className="h-16 border-b border-slate-300 mb-1" />
              <p className="font-semibold text-slate-900">Wizbang</p>
              <p className="text-xs text-slate-600">Authorised Signatory</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500 mb-2 tracking-wide">For the Client</p>
              {isSigned ? (
                <>
                  <div className="h-16 border-b-2 border-emerald-500 mb-1 flex items-end pb-1">
                    <p className="font-serif italic text-2xl text-emerald-700">{a.signed_by_name}</p>
                  </div>
                  <p className="font-semibold text-slate-900">{a.signed_by_name}</p>
                  <p className="text-xs text-slate-600">
                    Signed on{' '}
                    {new Date(a.signed_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-xs text-slate-500">IP: {a.signed_ip}</p>
                  {a.signed_by_email && (
                    <p className="text-xs text-slate-500">Email: {a.signed_by_email}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500 italic">Awaiting signature…</p>
              )}
            </div>
          </div>
        </div>

        {/* Sign form */}
        {!isSigned && (
          <form
            onSubmit={sign}
            className="no-print px-[16mm] py-[6mm] border-t border-slate-200 bg-white space-y-3"
            data-testid="sign-form"
          >
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-violet-600" /> Sign this Agreement
            </h3>
            <p className="text-xs text-slate-600">
              By typing your full legal name and checking the consent box, you electronically sign
              this agreement under the Information Technology Act, 2000. Your IP address and
              timestamp will be recorded as evidence. Once signed, this document is permanently
              locked.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Full Legal Name *</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  data-testid="sign-name-input"
                  placeholder="As it appears on official ID"
                />
              </div>
              <div className="space-y-1">
                <Label>Email (optional)</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="sign-email-input"
                />
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm text-slate-800 cursor-pointer">
              <Checkbox
                checked={agree}
                onCheckedChange={(v) => setAgree(!!v)}
                data-testid="sign-agree-checkbox"
              />
              <span>
                I have read, understood and agree to the terms of this Service Agreement, and I
                electronically sign it.
              </span>
            </label>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-violet-600 hover:bg-violet-700"
              data-testid="sign-submit-btn"
            >
              {submitting ? 'Signing…' : 'Sign Agreement'}
            </Button>
          </form>
        )}

        {/* Footer */}
        <div className="px-[16mm] py-[4mm] text-center text-xs text-slate-500 border-t border-slate-200">
          This document is electronically signed and stored. Verify at{' '}
          {typeof window !== 'undefined' ? window.location.host : 'this domain'}.
        </div>
        </div>
      </div>
    </div>
  );
};

export default PublicAgreementView;
