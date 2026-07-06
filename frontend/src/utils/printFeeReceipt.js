/**
 * printFeeReceipt — shared printable Fee Receipt for ETI Educom™.
 *
 * Per spec (Feb 2026):
 *   - Single student copy only
 *   - Professionally formatted with legal header, student details,
 *     payment table, declaration, terms & conditions, signatures
 *   - Computer Generated Receipt footer + ERP timestamp
 *
 * Receipt data shape (matches GET /api/payments/{id}/receipt):
 *   receipt_number, payment_date, student_name, student_id, student_email,
 *   phone, father_name, program_name, enrollment_id, batch_name, session,
 *   amount, amount_in_words, payment_mode, transaction_ref, fee_head, remarks,
 *   received_by, counsellor_name, total_fee, previous_payment, total_paid,
 *   balance_fee, next_installment_due_date, branch_name, branch_address,
 *   branch_city, branch_phone, branch_email, branch_gstin, branch_website,
 *   institute_name, legal_entity, legal_tagline, generated_at
 */

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}/-`;

const fmtDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
};

const fmtDateTime = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const TERMS = [
  'Fees once paid are strictly non-refundable, non-transferable, and non-adjustable against any other course, student, or branch under any circumstances.',
  'The full course fee (or the agreed installment amount) must be paid on or before the due date mentioned. A late payment charge of ₹100 per day (max ₹2,000) will be levied on delayed installments.',
  'In case of cheque / auto-debit / UPI mandate bounce or dishonor, a penalty of ₹500 per instance will be applicable and must be cleared before the next class.',
  'Enrollment stands cancelled automatically if two consecutive installments remain unpaid for 15+ days; the student loses access to classes, LMS, and placement services.',
  'This receipt is a system-generated computer receipt and does not require a physical signature, but is valid only when accompanied by a valid Enrollment ID / Student ID.',
  'Fee revisions announced by the management for future batches / sessions do not affect this receipt; already-paid amounts remain locked to the original quoted fee.',
  'Discounts, scholarships, and referral credits (if any) are already reflected in the "Total Course Fee" above and cannot be claimed retrospectively.',
  'Certificates and marksheets shall be issued only after successful course completion, clearance of all dues, minimum 75% attendance, and passing the internal / external examination.',
  'ETI Educom™ provides placement assistance and interview support; final employment, package, and location are subject to the recruiter\'s decision and are not guaranteed.',
  'Any dispute arising out of this transaction shall be subject to the exclusive jurisdiction of the courts at the branch city mentioned above.',
  'Please retain this receipt for your records — a duplicate copy may be issued only against a written request and a nominal administrative fee of ₹100.',
  'For refund/adjustment queries covered under exceptional circumstances (e.g. batch cancellation by the institute), raise a written request to helpdesk@etieducom.com within 7 days of payment.',
];

export function printFeeReceipt(r = {}) {
  const printWindow = window.open('', '', 'height=1000,width=900');
  if (!printWindow) return;

  const logoUrl = 'https://customer-assets.emergentagent.com/job_4e0bdddc-c844-4374-a91a-dfbddecb14b1/artifacts/4ane8ulw_eti%20.png';
  const balance = Number(r.balance_fee ?? ((r.total_fee || 0) - (r.total_paid || 0)));
  const nextDue = r.next_installment_due_date ? fmtDate(r.next_installment_due_date) : '—';
  const generatedTs = fmtDateTime(r.generated_at || new Date().toISOString());

  const css = `
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; }
    body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 10px; line-height: 1.35; color: #1a202c; }
    .receipt { width: 210mm; min-height: 297mm; padding: 10mm 10mm 8mm 10mm; border: 2px solid #0f2c5b; position: relative; display: flex; flex-direction: column; page-break-after: avoid; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-28deg); font-size: 82px; font-weight: 800; color: rgba(15, 44, 91, 0.04); letter-spacing: 8px; pointer-events: none; user-select: none; white-space: nowrap; }

    .header { display: flex; align-items: center; border-bottom: 2px solid #0f2c5b; padding-bottom: 6px; margin-bottom: 8px; gap: 10px; }
    .logo { width: 60px; height: auto; flex-shrink: 0; object-fit: contain; }
    .institute { flex: 1; }
    .institute h1 { font-size: 18px; color: #0f2c5b; letter-spacing: 2px; font-weight: 800; margin-bottom: 1px; }
    .institute .legal { font-size: 8.5px; color: #2d3748; font-weight: 600; margin-bottom: 2px; }
    .institute .tagline { font-size: 8.5px; color: #4a5568; font-style: italic; margin-bottom: 3px; }
    .institute .contact { font-size: 8.5px; color: #4a5568; line-height: 1.35; }
    .institute .contact span { margin-right: 8px; }
    .institute .contact b { color: #2d3748; }

    .title-bar { background: linear-gradient(135deg, #0f2c5b 0%, #1e4380 100%); color: #fff; padding: 5px 12px; border-radius: 4px; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; }
    .title-bar h2 { font-size: 13px; letter-spacing: 3px; font-weight: 700; }
    .title-bar .copy-label { font-size: 9px; padding: 2px 8px; background: rgba(255,255,255,0.18); border-radius: 999px; letter-spacing: 1px; }

    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 20px; padding: 6px 10px; background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 6px; font-size: 9.5px; }
    .meta .row { display: flex; gap: 5px; }
    .meta .row b { color: #2d3748; min-width: 82px; }
    .meta .row span { color: #1a202c; font-weight: 600; }

    .section { margin-bottom: 6px; }
    .section h3 { font-size: 9.5px; color: #0f2c5b; border-bottom: 1px solid #0f2c5b; padding-bottom: 3px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 14px; }
    .field { display: flex; gap: 5px; font-size: 9.5px; padding: 2px 0; border-bottom: 1px dashed #e2e8f0; }
    .field b { color: #4a5568; min-width: 96px; font-weight: 500; }
    .field span { color: #1a202c; font-weight: 600; flex: 1; }

    .fee-box { border: 1.5px solid #0f2c5b; border-radius: 4px; overflow: hidden; margin-bottom: 6px; }
    .fee-box-header { background: #0f2c5b; color: #fff; padding: 4px 10px; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
    .fee-table { width: 100%; border-collapse: collapse; }
    .fee-table td { padding: 4px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
    .fee-table .label { color: #4a5568; width: 60%; }
    .fee-table .amount { text-align: right; font-weight: 700; font-family: 'Courier New', monospace; }
    .fee-table .received-row { background: #c6f6d5; }
    .fee-table .received-row td { color: #22543d; font-weight: 800; font-size: 11px; }
    .fee-table .balance-row { background: #fed7d7; }
    .fee-table .balance-row td { color: #9b2c2c; font-weight: 800; }
    .fee-table .nil-row { background: #c6f6d5; }
    .fee-table .nil-row td { color: #22543d; font-weight: 800; }

    .words-box { background: #fffaf0; border: 1px solid #f6ad55; border-left: 3px solid #ed8936; padding: 4px 10px; border-radius: 3px; font-size: 9.5px; margin-bottom: 6px; }
    .words-box b { color: #744210; }
    .words-box span { font-style: italic; color: #2d3748; font-weight: 600; }

    .declaration { background: #ebf8ff; border: 1px solid #90cdf4; border-left: 3px solid #3182ce; padding: 5px 10px; border-radius: 3px; font-size: 9px; color: #2c5282; margin-bottom: 6px; line-height: 1.45; }
    .declaration b { color: #1a365d; }

    .terms { background: #fffaf0; border: 1px solid #f6ad55; border-radius: 4px; padding: 6px 10px; margin-bottom: 6px; }
    .terms h4 { font-size: 9px; color: #744210; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; border-bottom: 1px solid #fbd38d; padding-bottom: 2px; font-weight: 700; }
    .terms ol { padding-left: 14px; columns: 2; column-gap: 14px; }
    .terms li { font-size: 8.5px; color: #744210; line-height: 1.3; margin-bottom: 2px; break-inside: avoid; }

    .signatures { display: flex; justify-content: space-between; margin-top: auto; padding-top: 14px; gap: 20px; }
    .sig { flex: 1; text-align: center; }
    .sig .line { border-top: 1px solid #2d3748; margin-bottom: 3px; }
    .sig p { font-size: 9px; color: #2d3748; font-weight: 600; }
    .sig small { font-size: 8px; color: #718096; font-style: italic; display: block; margin-top: 1px; }

    .footer { text-align: center; margin-top: 6px; padding-top: 4px; border-top: 1px dashed #cbd5e0; font-size: 8.5px; color: #4a5568; }
    .footer .cg { font-weight: 700; color: #0f2c5b; letter-spacing: 1.5px; }
    .footer .ts { color: #718096; margin-top: 1px; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .receipt { border-color: #000; }
    }
  `;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Fee Receipt — ${r.receipt_number || ''} — ${r.student_name || ''}</title>
        <meta charset="UTF-8" />
        <style>${css}</style>
      </head>
      <body>
        <div class="receipt">
          <div class="watermark">ETI EDUCOM</div>

          <div class="header">
            <img src="${logoUrl}" alt="ETI Educom" class="logo" onerror="this.style.display='none'"/>
            <div class="institute">
              <h1>${r.institute_name || 'ETI EDUCOM™'}</h1>
              <p class="legal">${r.legal_entity ? `A Brand of ${r.legal_entity}` : ''}${r.legal_tagline ? ` — ${r.legal_tagline}` : ''}</p>
              <p class="tagline">${r.institute_tagline || 'Professional Training & Skill Development'}</p>
              <p class="contact">
                <span><b>Branch:</b> ${r.branch_name || '—'}</span>
                ${r.branch_address ? `<span><b>Address:</b> ${r.branch_address}${r.branch_city ? ', ' + r.branch_city : ''}</span>` : ''}
              </p>
              <p class="contact">
                ${r.branch_phone ? `<span><b>Phone:</b> ${r.branch_phone}</span>` : ''}
                ${r.branch_email ? `<span><b>Email:</b> ${r.branch_email}</span>` : ''}
                ${r.branch_website ? `<span><b>Web:</b> ${r.branch_website}</span>` : ''}
                ${r.branch_gstin ? `<span><b>GSTIN:</b> ${r.branch_gstin}</span>` : ''}
              </p>
            </div>
          </div>

          <div class="title-bar">
            <h2>FEE RECEIPT</h2>
            <span class="copy-label">STUDENT COPY</span>
          </div>

          <div class="meta">
            <div class="row"><b>Receipt No.:</b><span>${r.receipt_number || '—'}</span></div>
            <div class="row"><b>Date:</b><span>${fmtDate(r.payment_date)}</span></div>
            <div class="row"><b>Enrollment ID:</b><span>${r.enrollment_id || '—'}</span></div>
          </div>

          <div class="section">
            <h3>Student Details</h3>
            <div class="grid-2">
              <div class="field"><b>Student Name</b><span>${r.student_name || '—'}</span></div>
              <div class="field"><b>Mobile</b><span>${r.phone || '—'}</span></div>
              <div class="field"><b>Email</b><span>${r.student_email || '—'}</span></div>
              <div class="field"><b>Course/Program</b><span>${r.program_name || '—'}</span></div>
              <div class="field"><b>Batch</b><span>${r.batch_name || '—'}</span></div>
              <div class="field"><b>Session</b><span>${r.session || '—'}</span></div>
              <div class="field"><b>Counsellor</b><span>${r.counsellor_name || '—'}</span></div>
            </div>
          </div>

          <div class="fee-box">
            <div class="fee-box-header">Payment Details</div>
            <table class="fee-table">
              <tr>
                <td class="label">Total Course Fee</td>
                <td class="amount">${fmtINR(r.total_fee)}</td>
              </tr>
              <tr>
                <td class="label">Previous Payment</td>
                <td class="amount">${fmtINR(r.previous_payment)}</td>
              </tr>
              <tr class="received-row">
                <td class="label">Amount Received (This Receipt)</td>
                <td class="amount">${fmtINR(r.amount)}</td>
              </tr>
              <tr>
                <td class="label">Total Amount Paid (Till Date)</td>
                <td class="amount">${fmtINR(r.total_paid)}</td>
              </tr>
              <tr class="${balance > 0 ? 'balance-row' : 'nil-row'}">
                <td class="label">Balance Fee</td>
                <td class="amount">${balance > 0 ? fmtINR(balance) : 'NIL'}</td>
              </tr>
              <tr>
                <td class="label">Payment Towards (Fee Head)</td>
                <td class="amount" style="text-align:right;font-family:inherit;">${r.fee_head || 'Tuition'}</td>
              </tr>
              <tr>
                <td class="label">Payment Mode</td>
                <td class="amount" style="text-align:right;font-family:inherit;">${r.payment_mode || '—'}</td>
              </tr>
              ${r.transaction_ref ? `
              <tr>
                <td class="label">Transaction / UTR No.</td>
                <td class="amount" style="text-align:right;font-family:'Courier New', monospace;">${r.transaction_ref}</td>
              </tr>` : ''}
              <tr>
                <td class="label">Received By</td>
                <td class="amount" style="text-align:right;font-family:inherit;">${r.received_by || '—'}</td>
              </tr>
              ${balance > 0 ? `
              <tr>
                <td class="label">Next Installment Due Date</td>
                <td class="amount" style="text-align:right;font-family:inherit;">${nextDue}</td>
              </tr>` : ''}
            </table>
          </div>

          <div class="words-box">
            <b>Amount in Words:</b> <span>${r.amount_in_words || '—'}</span>
          </div>

          ${r.remarks ? `<div class="section"><h3>Remarks</h3><p style="font-size:11.5px;color:#2d3748;padding:4px 0;">${r.remarks}</p></div>` : ''}

          <div class="declaration">
            <b>Declaration:</b> This receipt acknowledges the payment received by ${r.institute_name || 'ETI Educom™'} towards the above-mentioned course/program. Students are advised to preserve this receipt for future reference.
          </div>

          <div class="terms">
            <h4>General Terms &amp; Conditions</h4>
            <ol>
              ${TERMS.map((t) => `<li>${t}</li>`).join('')}
            </ol>
          </div>

          <div class="signatures" style="justify-content:flex-end;">
            <div class="sig">
              <div class="line"></div>
              <p>Authorized Signatory &amp; Stamp</p>
              <small>${r.institute_name || 'ETI Educom™'}</small>
            </div>
          </div>

          <div class="footer">
            <p style="font-weight:700;color:#0f2c5b;">${r.branch_name || 'ETI Educom Branch'}</p>
            <p style="font-size:8.5px;color:#4a5568;">
              ${[r.branch_address, r.branch_city, r.branch_state, r.branch_pincode].filter(Boolean).join(', ') || '—'}
            </p>
            <p style="font-size:8.5px;color:#4a5568;">
              ${r.branch_phone ? `Phone: ${r.branch_phone}` : ''}
              ${r.branch_email ? ` &nbsp;|&nbsp; Email: ${r.branch_email}` : ''}
              ${r.branch_website ? ` &nbsp;|&nbsp; Web: ${r.branch_website}` : ''}
            </p>
            <p class="ts">Generated on ${generatedTs}</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

export default printFeeReceipt;
