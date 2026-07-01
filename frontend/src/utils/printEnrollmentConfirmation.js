/**
 * printEnrollmentConfirmation — printable Enrollment Confirmation letter for ETI Educom™.
 *
 * Fits precisely on a single A4 sheet (210mm × 297mm).
 *
 * Data shape:
 *   Enrollment: {
 *     enrollment_id, student_name, email, phone, date_of_birth, gender,
 *     address, city, state, pincode, student_photo_url,
 *     highest_qualification, institution_name, passing_year, percentage,
 *     program_name, fee_quoted, discount_percent, discount_amount, final_fee,
 *     enrollment_date, session, batch_name, program_duration,
 *   }
 *   PaymentPlan (optional): {
 *     plan_type: "One-time" | "Installments",
 *     total_amount,
 *     installments_count,
 *     installments: [{ installment_number, amount, due_date, status }]
 *   }
 *   Branch (optional): { name, address, city, branch_phone, email, website, gstin }
 *   Lead (optional): { parent_name, parent_phone }
 *   User (currentUser fallback): { name }
 */

const LOGO_URL =
  'https://customer-assets.emergentagent.com/job_4e0bdddc-c844-4374-a91a-dfbddecb14b1/artifacts/4ane8ulw_eti%20.png';

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}/-`;

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(iso);
  }
};

const fmtDateTime = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
};

const ENROLLMENT_TERMS = [
  'Enrollment is strictly for the program mentioned above. Course transfer, switching to a different program, or trainer/batch change on demand is NOT permitted after admission.',
  'A minimum of 70% attendance is MANDATORY to be eligible for the completion certificate, internal/external examination, and placement assistance.',
  'Fees once paid are strictly non-refundable, non-transferable, and non-adjustable against any other course, student, or branch under any circumstances.',
  'If installments have been chosen, each installment must be paid on or before the due date. Late payment charge: ₹100/day per installment (max ₹2,000).',
  'Enrollment stands cancelled automatically if two consecutive installments remain unpaid for 15 days or more. Cancellation forfeits access to classes, LMS, exams, and placement.',
  'Students must abide by the institute\'s Code of Conduct. Misconduct, ragging, plagiarism, or unauthorized recording will lead to immediate termination without refund.',
  'The institute reserves the right to modify the schedule, trainer, syllabus, or delivery mode (online/offline/hybrid) as needed; students will be notified in advance.',
  'ID card and enrollment confirmation must be produced on demand to attend classes and to access institute premises, LMS, and library resources.',
  'Placement assistance and interview support are provided to students who complete the course, clear the internal exam, and maintain 70% attendance; final employment is not guaranteed.',
  'Certificates and marksheets will be issued only after successful course completion, clearance of all dues, and passing the prescribed examination.',
  'Any dispute arising out of this enrollment shall be subject to the exclusive jurisdiction of the courts at the branch city mentioned above.',
  'By signing below, the student and parent/guardian confirm that they have read, understood, and agreed to all the above terms and conditions.',
];

export function printEnrollmentConfirmation({
  enrollment = {},
  paymentPlan = null,
  branch = {},
  lead = {},
  currentUser = {},
} = {}) {
  const printWindow = window.open('', '', 'height=1000,width=900');
  if (!printWindow) return;

  const e = enrollment || {};
  const b = branch || {};
  const l = lead || {};
  const p = paymentPlan || null;

  const totalFee = Number(e.final_fee ?? e.fee_quoted ?? 0);
  const feeQuoted = Number(e.fee_quoted ?? totalFee);
  const discountAmt = Number(
    e.discount_amount ??
      (e.discount_percent ? (feeQuoted * Number(e.discount_percent)) / 100 : 0)
  );
  const isInstallments =
    p && String(p.plan_type || '').toLowerCase().startsWith('install');
  const generatedTs = fmtDateTime(new Date().toISOString());

  const installmentRows =
    isInstallments && Array.isArray(p.installments) && p.installments.length
      ? p.installments
          .slice()
          .sort(
            (a, x) =>
              Number(a.installment_number || 0) -
              Number(x.installment_number || 0)
          )
          .map(
            (i, idx) => `
        <tr>
          <td class="c">${i.installment_number || idx + 1}</td>
          <td class="c">${fmtDate(i.due_date)}</td>
          <td class="r">${fmtINR(i.amount)}</td>
          <td class="c">${i.status || 'Pending'}</td>
        </tr>`
          )
          .join('')
      : '';

  const css = `
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; }
    body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 10px; line-height: 1.35; color: #1a202c; }
    .sheet { width: 210mm; min-height: 297mm; padding: 10mm 10mm 8mm 10mm; border: 2px solid #0f2c5b; position: relative; display: flex; flex-direction: column; }
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
    .meta .row b { color: #2d3748; min-width: 96px; }
    .meta .row span { color: #1a202c; font-weight: 600; }

    .section { margin-bottom: 6px; }
    .section h3 { font-size: 9.5px; color: #0f2c5b; border-bottom: 1px solid #0f2c5b; padding-bottom: 3px; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; }

    .row-flex { display: flex; gap: 8px; align-items: flex-start; }
    .row-flex .col-photo { width: 82px; flex-shrink: 0; text-align: center; }
    .row-flex .col-photo img { width: 82px; height: 100px; object-fit: cover; border: 1.5px solid #0f2c5b; border-radius: 3px; }
    .row-flex .col-photo .ph-fallback { width: 82px; height: 100px; border: 1.5px dashed #94a3b8; border-radius: 3px; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 9px; letter-spacing: 1px; font-weight: 600; background: #f8fafc; }
    .row-flex .col-fields { flex: 1; }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 14px; }
    .field { display: flex; gap: 5px; font-size: 9.5px; padding: 2px 0; border-bottom: 1px dashed #e2e8f0; }
    .field b { color: #4a5568; min-width: 96px; font-weight: 500; }
    .field span { color: #1a202c; font-weight: 600; flex: 1; }

    .fee-box { border: 1.5px solid #0f2c5b; border-radius: 4px; overflow: hidden; margin-bottom: 6px; }
    .fee-box-header { background: #0f2c5b; color: #fff; padding: 4px 10px; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center; }
    .fee-box-header .badge { background: rgba(255,255,255,0.18); font-size: 9px; padding: 1px 8px; border-radius: 999px; letter-spacing: 0.5px; }
    .fee-table { width: 100%; border-collapse: collapse; }
    .fee-table td { padding: 4px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
    .fee-table .label { color: #4a5568; width: 60%; }
    .fee-table .amount { text-align: right; font-weight: 700; font-family: 'Courier New', monospace; }
    .fee-table .final-row { background: #c6f6d5; }
    .fee-table .final-row td { color: #22543d; font-weight: 800; font-size: 11px; }

    .schedule { width: 100%; border-collapse: collapse; margin: 4px 0 6px 0; border: 1px solid #cbd5e0; }
    .schedule th { background: #0f2c5b; color: #fff; font-size: 9px; padding: 4px 8px; text-align: left; letter-spacing: 1px; }
    .schedule td { font-size: 9.5px; padding: 3px 8px; border-bottom: 1px solid #e2e8f0; }
    .schedule .c { text-align: center; }
    .schedule .r { text-align: right; font-family: 'Courier New', monospace; font-weight: 700; }
    .schedule tr:nth-child(even) td { background: #f7fafc; }

    .one-time-note { background: #ebf8ff; border: 1px solid #90cdf4; border-left: 3px solid #3182ce; padding: 5px 10px; border-radius: 3px; font-size: 9px; color: #2c5282; margin-bottom: 6px; }
    .one-time-note b { color: #1a365d; }

    .terms { background: #fffaf0; border: 1px solid #f6ad55; border-radius: 4px; padding: 6px 10px; margin-bottom: 6px; }
    .terms h4 { font-size: 9px; color: #744210; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; border-bottom: 1px solid #fbd38d; padding-bottom: 2px; font-weight: 700; }
    .terms ol { padding-left: 14px; columns: 2; column-gap: 14px; }
    .terms li { font-size: 8.5px; color: #744210; line-height: 1.3; margin-bottom: 2px; break-inside: avoid; }
    .terms li b { color: #7c2d12; }

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
      .sheet { border-color: #000; }
    }
  `;

  const photoHtml = e.student_photo_url
    ? `<img src="${e.student_photo_url}" alt="Student" onerror="this.outerHTML='<div class=\\'ph-fallback\\'>PHOTO</div>'"/>`
    : `<div class="ph-fallback">PHOTO</div>`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Enrollment Confirmation — ${e.enrollment_id || ''} — ${e.student_name || ''}</title>
        <style>${css}</style>
      </head>
      <body>
        <div class="sheet">
          <div class="watermark">ETI EDUCOM</div>

          <div class="header">
            <img src="${LOGO_URL}" alt="ETI Educom" class="logo" onerror="this.style.display='none'"/>
            <div class="institute">
              <h1>ETI EDUCOM™</h1>
              <p class="legal">A Brand of ETI Learning Systems Private Limited — Operating Under the Brand Name: ETI Educom™</p>
              <p class="tagline">Professional Training &amp; Skill Development</p>
              <p class="contact">
                <span><b>Branch:</b> ${b.name || '—'}</span>
                ${b.address ? `<span><b>Address:</b> ${b.address}${b.city ? ', ' + b.city : ''}</span>` : ''}
              </p>
              <p class="contact">
                ${b.branch_phone ? `<span><b>Phone:</b> ${b.branch_phone}</span>` : ''}
                ${b.email ? `<span><b>Email:</b> ${b.email}</span>` : ''}
                ${b.website ? `<span><b>Web:</b> ${b.website}</span>` : ''}
                ${b.gstin ? `<span><b>GSTIN:</b> ${b.gstin}</span>` : ''}
              </p>
            </div>
          </div>

          <div class="title-bar">
            <h2>ENROLLMENT CONFIRMATION</h2>
            <span class="copy-label">STUDENT COPY</span>
          </div>

          <div class="meta">
            <div class="row"><b>Enrollment ID:</b><span>${e.enrollment_id || '—'}</span></div>
            <div class="row"><b>Enrollment Date:</b><span>${fmtDate(e.enrollment_date)}</span></div>
            <div class="row"><b>Session:</b><span>${e.session || '—'}</span></div>
            <div class="row"><b>Program Duration:</b><span>${e.program_duration || '—'}</span></div>
          </div>

          <div class="section">
            <h3>Student &amp; Guardian Details</h3>
            <div class="row-flex">
              <div class="col-photo">${photoHtml}</div>
              <div class="col-fields">
                <div class="grid-2">
                  <div class="field"><b>Student Name</b><span>${e.student_name || '—'}</span></div>
                  <div class="field"><b>Father/Guardian</b><span>${l.parent_name || e.parent_name || '—'}</span></div>
                  <div class="field"><b>DOB</b><span>${fmtDate(e.date_of_birth)}</span></div>
                  <div class="field"><b>Gender</b><span>${e.gender || '—'}</span></div>
                  <div class="field"><b>Mobile</b><span>${e.phone || '—'}</span></div>
                  <div class="field"><b>Parent Mobile</b><span>${l.parent_phone || '—'}</span></div>
                  <div class="field"><b>Email</b><span>${e.email || '—'}</span></div>
                  <div class="field"><b>Address</b><span>${[e.address, e.city, e.state, e.pincode].filter(Boolean).join(', ') || '—'}</span></div>
                  <div class="field"><b>Qualification</b><span>${e.highest_qualification || '—'}${e.percentage ? ` (${e.percentage}%)` : ''}</span></div>
                  <div class="field"><b>Institution</b><span>${e.institution_name || '—'}${e.passing_year ? ` — ${e.passing_year}` : ''}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Program Details</h3>
            <div class="grid-2">
              <div class="field"><b>Program</b><span>${e.program_name || '—'}</span></div>
              <div class="field"><b>Duration</b><span>${e.program_duration || '—'}</span></div>
              <div class="field"><b>Batch</b><span>${e.batch_name || 'To be assigned'}</span></div>
              <div class="field"><b>Trainer</b><span>${e.trainer_name || 'To be assigned'}</span></div>
              <div class="field"><b>Mode</b><span>${e.training_mode || 'Offline'}</span></div>
              <div class="field"><b>Start Date</b><span>${fmtDate(e.enrollment_date)}</span></div>
            </div>
          </div>

          <div class="fee-box">
            <div class="fee-box-header">
              <span>Fee Structure</span>
              <span class="badge">${isInstallments ? `INSTALLMENTS · ${p.installments_count || (p.installments && p.installments.length) || 0}` : 'ONE-TIME PAYMENT'}</span>
            </div>
            <table class="fee-table">
              <tr><td class="label">Total Course Fee (Quoted)</td><td class="amount">${fmtINR(feeQuoted)}</td></tr>
              ${discountAmt > 0 ? `<tr><td class="label">Discount ${e.discount_percent ? `(${e.discount_percent}%)` : ''}</td><td class="amount" style="color:#c53030;">- ${fmtINR(discountAmt)}</td></tr>` : ''}
              <tr class="final-row"><td class="label">Net Payable Fee</td><td class="amount">${fmtINR(totalFee)}</td></tr>
            </table>
          </div>

          ${
            isInstallments
              ? `<div class="section" style="margin-bottom:6px;">
                  <h3>Installment Plan</h3>
                  <table class="schedule">
                    <thead>
                      <tr>
                        <th style="text-align:center;">Installment #</th>
                        <th style="text-align:center;">Due Date</th>
                        <th style="text-align:right;">Amount</th>
                        <th style="text-align:center;">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${installmentRows || `<tr><td colspan="4" class="c" style="color:#94a3b8;padding:8px;">Installment schedule will be shared shortly.</td></tr>`}
                    </tbody>
                  </table>
                </div>`
              : `<div class="one-time-note">
                  <b>Payment Mode:</b> One-Time Payment — the full course fee of <b>${fmtINR(totalFee)}</b> is payable in a single installment on or before the enrollment date.
                </div>`
          }

          <div class="terms">
            <h4>Enrollment Terms &amp; Conditions</h4>
            <ol>
              ${ENROLLMENT_TERMS.map((t) => `<li>${t}</li>`).join('')}
            </ol>
          </div>

          <div class="signatures">
            <div class="sig">
              <div class="line"></div>
              <p>Student Signature</p>
              <small>${e.student_name || ''}</small>
            </div>
            <div class="sig">
              <div class="line"></div>
              <p>Parent / Guardian Signature</p>
              <small>${l.parent_name || ''}</small>
            </div>
            <div class="sig">
              <div class="line" style="border-style:dashed;"></div>
              <p>Authorized Signatory &amp; Seal</p>
              <small>ETI Educom™ — ${b.name || ''}</small>
            </div>
          </div>

          <div class="footer">
            <p class="cg">★ COMPUTER GENERATED ENROLLMENT CONFIRMATION ★</p>
            <p class="ts">Issued by ${currentUser.name || 'ETI Educom ERP'} on ${generatedTs}</p>
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

export default printEnrollmentConfirmation;
