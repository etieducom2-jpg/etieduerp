import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';

import { BACKEND_URL } from '@/api/api';
const BACKEND = BACKEND_URL;
const fmtINR = (n) =>
  '₹' +
  (Number(n) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const PublicInvoiceView = () => {
  const { token } = useParams();
  const [inv, setInv] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios
      .get(`${BACKEND}/api/public/wizbang/invoice/${token}`)
      .then((r) => setInv(r.data))
      .catch((e) =>
        setError(e.response?.data?.detail || 'Invoice not found or link is invalid.'),
      );
  }, [token]);

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-rose-600">{error}</h1>
        </div>
      </div>
    );
  if (!inv)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-500">Loading invoice…</p>
      </div>
    );

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
            Invoice <span className="font-mono">{inv.invoice_number}</span>
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.print()}
              data-testid="invoice-print-btn"
            >
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => window.print()}
              data-testid="invoice-pdf-btn"
            >
              <Download className="w-4 h-4 mr-1" /> Save as PDF
            </Button>
          </div>
        </div>

        <div className="a4-sheet shadow-lg print:shadow-none rounded-b-lg overflow-hidden">
        {/* Header with logo */}
        <div className="px-[16mm] pt-[14mm] pb-[8mm] flex items-start justify-between border-b border-slate-200">
          <div>
            {inv.logo_url ? (
              <img
                src={inv.logo_url}
                alt="Wizbang"
                className="h-16 w-auto object-contain"
                style={{ filter: 'brightness(0)' }}
              />
            ) : (
              <h1 className="text-3xl font-bold tracking-tight text-black">WIZBANG</h1>
            )}
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Digital Marketing &amp; Growth Services
              <br />
              India
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-900">INVOICE</p>
            <p className="text-xs uppercase tracking-widest text-slate-500 mt-1">e-Invoice</p>
            <p className="text-xs text-slate-500 mt-0.5">No signature required</p>
            <p className="mt-4 text-sm">
              <span className="font-mono font-semibold">{inv.invoice_number}</span>
            </p>
            <p className="text-xs text-slate-600">Issued: {inv.issue_date}</p>
            <p className="text-xs text-slate-600">
              <strong>Due: {inv.due_date}</strong>
            </p>
            <p
              className={`text-xs mt-2 inline-block px-2 py-0.5 rounded-full font-medium ${
                inv.status === 'Paid'
                  ? 'bg-emerald-100 text-emerald-700'
                  : inv.status === 'Overdue'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              {inv.status}
            </p>
            {inv.status === 'Paid' && (
              <p className="text-[10px] text-emerald-700 mt-1">
                Paid on {inv.paid_date}
                {inv.payment_mode ? ` via ${inv.payment_mode}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* PAID stamp overlay when paid */}
        {inv.status === 'Paid' && (
          <div className="relative">
            <div
              className="absolute right-[16mm] -top-2 rotate-[-12deg] border-4 border-emerald-600 text-emerald-700 px-4 py-1 rounded text-xl font-bold tracking-widest opacity-90 pointer-events-none select-none"
              style={{ fontFamily: 'serif' }}
              data-testid="invoice-paid-stamp"
            >
              PAID
            </div>
          </div>
        )}

        {/* Bill to */}
        <div className="px-[16mm] py-[6mm] grid grid-cols-2 gap-6 border-b border-slate-200 text-sm">
          <div>
            <p className="text-xs uppercase text-slate-500 mb-1 tracking-wide">Bill To</p>
            <p className="font-semibold text-slate-900">{inv.client_snapshot?.name}</p>
            {inv.client_snapshot?.address && (
              <p className="text-slate-700 whitespace-pre-line">{inv.client_snapshot.address}</p>
            )}
            {inv.client_snapshot?.email && (
              <p className="text-slate-700">{inv.client_snapshot.email}</p>
            )}
            {inv.client_snapshot?.phone && (
              <p className="text-slate-700">{inv.client_snapshot.phone}</p>
            )}
            {inv.client_snapshot?.gstin && (
              <p className="text-slate-700 font-mono text-xs mt-1">
                GSTIN: {inv.client_snapshot.gstin}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-slate-500 mb-1 tracking-wide">From</p>
            <p className="font-semibold text-slate-900">Wizbang</p>
            <p className="text-slate-700">India</p>
          </div>
        </div>

        {/* Items table */}
        <div className="px-[16mm] py-[6mm]">
          <table className="w-full text-sm" data-testid="invoice-items-table">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2 text-xs uppercase text-slate-600">Description</th>
                <th className="text-right px-3 py-2 text-xs uppercase text-slate-600 w-16">Qty</th>
                <th className="text-right px-3 py-2 text-xs uppercase text-slate-600 w-24">Rate</th>
                <th className="text-right px-3 py-2 text-xs uppercase text-slate-600 w-28">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-3 text-slate-800">{it.description}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{it.quantity}</td>
                  <td className="px-3 py-3 text-right text-slate-700">{fmtINR(it.rate)}</td>
                  <td className="px-3 py-3 text-right text-slate-900 font-medium">
                    {fmtINR(it.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <div className="w-72 text-sm space-y-1">
              <div className="flex justify-between text-slate-700">
                <span>Subtotal</span>
                <span>{fmtINR(inv.subtotal)}</span>
              </div>
              {inv.tax_enabled && (
                <div className="flex justify-between text-slate-700">
                  <span>GST ({inv.tax_rate}%)</span>
                  <span>{fmtINR(inv.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-slate-900 pt-2 border-t border-slate-300">
                <span>Total</span>
                <span>{fmtINR(inv.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {inv.notes && (
          <div className="px-[16mm] pb-[4mm] text-sm text-slate-700 whitespace-pre-line">
            <p className="text-xs uppercase text-slate-500 mb-1 tracking-wide">Notes</p>
            {inv.notes}
          </div>
        )}

        {/* Bank details */}
        <div className="px-[16mm] py-[6mm] bg-slate-50 border-t border-slate-200">
          <p className="text-xs uppercase text-slate-500 mb-2 tracking-wide">
            Bank Details — please remit total to:
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p>
                <span className="text-slate-500">Bank: </span>
                <strong>{inv.bank_details?.bank_name}</strong>
              </p>
              <p>
                <span className="text-slate-500">Branch: </span>
                <strong>{inv.bank_details?.branch}</strong>
              </p>
              <p>
                <span className="text-slate-500">Account Name: </span>
                <strong>{inv.bank_details?.account_name}</strong>
              </p>
            </div>
            <div>
              <p>
                <span className="text-slate-500">Account No: </span>
                <strong className="font-mono">{inv.bank_details?.account_number}</strong>
              </p>
              <p>
                <span className="text-slate-500">IFSC: </span>
                <strong className="font-mono">{inv.bank_details?.ifsc}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Terms */}
        <div className="px-[16mm] py-[6mm] border-t border-slate-200">
          <p className="text-xs uppercase text-slate-500 mb-2 tracking-wide">Terms &amp; Conditions</p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
            {(inv.terms || []).map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-[16mm] py-[4mm] text-center text-xs text-slate-500 border-t border-slate-200">
          This is a computer-generated e-invoice. No signature is required.
        </div>
        </div>
      </div>
    </div>
  );
};

export default PublicInvoiceView;
