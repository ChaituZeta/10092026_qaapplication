export interface ExportQAPdfParams {
  campaignName: string;
  team: string;
  country: string;
  versionName: string;
  webViewUrl?: string;
  userEmail?: string;
  campaignStatus?: string;
  checklists: Array<{
    id: string;
    stage: number;
    text: string;
    requiresInput?: boolean;
  }>;
  answers: Record<string, { status?: string | null; text?: string }>;
  qaResults?: Array<{
    rule: string;
    status: 'pass' | 'fail' | 'warn';
    details: string;
  }>;
}

export function exportQAVerificationReceiptPDF(params: ExportQAPdfParams) {
  const {
    campaignName,
    team,
    country,
    versionName,
    webViewUrl = '',
    userEmail = 'qa.team@hp.com',
    campaignStatus = 'In Progress',
    checklists = [],
    answers = {},
    qaResults = []
  } = params;

  const dateStr = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'medium'
  });

  const receiptId = `HP-QA-${Math.floor(100000 + Math.random() * 900000)}`;

  const stages = [
    { num: 1, name: "Details & Source" },
    { num: 2, name: "Visual Comparison" },
    { num: 3, name: "Alt & Alias Tags" },
    { num: 4, name: "Link Validation" },
    { num: 5, name: "Grammar & Spell Check" },
    { num: 6, name: "Review & Approval" },
    { num: 0, name: "Global Checkpoints" }
  ];

  // Calculate statistics
  let totalCheckpoints = 0;
  let checkedCount = 0;
  let naCount = 0;
  let missedCount = 0;

  checklists.forEach((item) => {
    totalCheckpoints++;
    const ans = answers[item.id]?.status;
    if (ans === "Checked") checkedCount++;
    else if (ans === "N/A") naCount++;
    else missedCount++;
  });

  const passRate = totalCheckpoints > 0 
    ? Math.round(((checkedCount + naCount) / totalCheckpoints) * 100) 
    : 100;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>QA Verification Receipt - ${campaignName || 'Campaign'}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1e293b;
          background: #ffffff;
          line-height: 1.5;
          font-size: 12px;
          margin: 0;
          padding: 0;
        }
        .header-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0096d6;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .logo-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .hp-badge {
          background: #0096d6;
          color: white;
          font-weight: 800;
          font-size: 18px;
          padding: 4px 12px;
          border-radius: 4px;
          letter-spacing: -0.5px;
        }
        .title-text h1 {
          margin: 0;
          font-size: 18px;
          color: #0f172a;
        }
        .title-text p {
          margin: 2px 0 0 0;
          color: #64748b;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .receipt-meta {
          text-align: right;
          font-size: 11px;
          color: #475569;
        }
        .receipt-id {
          font-weight: bold;
          color: #0f172a;
          font-size: 12px;
        }

        .meta-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        .meta-item label {
          display: block;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 2px;
        }
        .meta-item span {
          font-weight: 600;
          color: #0f172a;
          font-size: 12px;
        }

        .summary-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f1f5f9;
          border-left: 4px solid #0096d6;
          padding: 12px 16px;
          border-radius: 4px;
          margin-bottom: 24px;
        }
        .stat-group {
          display: flex;
          gap: 20px;
        }
        .stat-box {
          text-align: center;
        }
        .stat-box .number {
          font-size: 18px;
          font-weight: 800;
          line-height: 1;
        }
        .stat-box .label {
          font-size: 9px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 700;
          margin-top: 3px;
        }
        .pass-badge {
          padding: 6px 14px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 13px;
          background: ${passRate === 100 ? '#dcfce7' : '#fef3c7'};
          color: ${passRate === 100 ? '#15803d' : '#b45309'};
          border: 1px solid ${passRate === 100 ? '#86efac' : '#fde68a'};
        }

        .stage-section {
          margin-bottom: 16px;
          page-break-inside: avoid;
        }
        .stage-header {
          font-weight: bold;
          font-size: 13px;
          color: #0f172a;
          background: #e2e8f0;
          padding: 6px 10px;
          border-radius: 4px 4px 0 0;
          border: 1px solid #cbd5e1;
          display: flex;
          justify-content: space-between;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #cbd5e1;
          border-top: none;
        }
        .table th, .table td {
          padding: 8px 10px;
          text-align: left;
          border-bottom: 1px solid #f1f5f9;
        }
        .table th {
          background: #f8fafc;
          font-size: 10px;
          text-transform: uppercase;
          color: #475569;
        }
        .status-tag {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: bold;
        }
        .status-checked { background: #dcfce7; color: #166534; }
        .status-na { background: #f1f5f9; color: #475569; }
        .status-missed { background: #ffe4e6; color: #991b1b; }

        .signature-box {
          margin-top: 30px;
          padding-top: 16px;
          border-top: 2px dashed #cbd5e1;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          page-break-inside: avoid;
        }
        .sign-field {
          width: 220px;
          border-bottom: 1px solid #0f172a;
          margin-top: 20px;
        }
        .watermark {
          font-size: 9px;
          color: #94a3b8;
          text-align: center;
          margin-top: 20px;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>

      <div class="header-bar">
        <div class="logo-title">
          <div class="hp-badge">hp</div>
          <div class="title-text">
            <h1>QA Verification Receipt</h1>
            <p>Email Campaign Quality Assurance Audit Log</p>
          </div>
        </div>
        <div class="receipt-meta">
          <div class="receipt-id">${receiptId}</div>
          <div>Issued: ${dateStr}</div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <label>Campaign Name</label>
          <span>${campaignName || 'Untitled Campaign'}</span>
        </div>
        <div class="meta-item">
          <label>Team</label>
          <span>${team || 'N/A'}</span>
        </div>
        <div class="meta-item">
          <label>Country / Version</label>
          <span>${country || 'US'} - ${versionName || 'Default'}</span>
        </div>
        <div class="meta-item">
          <label>Audit Status</label>
          <span>${campaignStatus}</span>
        </div>
      </div>

      <div class="summary-card">
        <div class="stat-group">
          <div class="stat-box">
            <div class="number" style="color: #0f172a;">${totalCheckpoints}</div>
            <div class="label">Total Points</div>
          </div>
          <div class="stat-box">
            <div class="number" style="color: #166534;">${checkedCount}</div>
            <div class="label">Passed</div>
          </div>
          <div class="stat-box">
            <div class="number" style="color: #475569;">${naCount}</div>
            <div class="label">N/A</div>
          </div>
          <div class="stat-box">
            <div class="number" style="color: #991b1b;">${missedCount}</div>
            <div class="label">Missed</div>
          </div>
        </div>

        <div class="pass-badge">
          QA Score: ${passRate}% Compliance
        </div>
      </div>

      <h3 style="font-size: 14px; margin-bottom: 10px; color: #0f172a;">Stage Checkpoints Verification Breakdown</h3>

      ${stages.map(st => {
        const stageItems = checklists.filter(c => c.stage === st.num);
        if (stageItems.length === 0) return '';

        return `
          <div class="stage-section">
            <div class="stage-header">
              <span>Stage ${st.num === 0 ? 'Global' : st.num}: ${st.name}</span>
              <span>${stageItems.filter(i => answers[i.id]?.status === 'Checked' || answers[i.id]?.status === 'N/A').length}/${stageItems.length} Verified</span>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th style="width: 60%;">Checkpoint Description</th>
                  <th style="width: 20%;">Result Input / Notes</th>
                  <th style="width: 20%;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${stageItems.map(item => {
                  const ans = answers[item.id] || { status: null, text: '' };
                  const isChecked = ans.status === 'Checked';
                  const isNA = ans.status === 'N/A';
                  
                  return `
                    <tr>
                      <td>${item.text}</td>
                      <td style="font-size: 10px; color: #475569;">${ans.text || '-'}</td>
                      <td>
                        ${isChecked ? '<span class="status-tag status-checked">CHECKED</span>' :
                          isNA ? '<span class="status-tag status-na">N/A</span>' :
                          '<span class="status-tag status-missed">MISSED</span>'}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }).join('')}

      <div class="signature-box">
        <div>
          <div style="font-weight: bold; font-size: 11px; color: #0f172a;">Verified By:</div>
          <div style="font-size: 11px; color: #475569;">${userEmail}</div>
          <div class="sign-field"></div>
          <div style="font-size: 9px; color: #64748b; margin-top: 4px;">Authorized Digital Sign-off</div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: bold; font-size: 11px; color: #0f172a;">Verification Hash:</div>
          <div style="font-size: 10px; font-family: monospace; color: #475569;">${receiptId}-${Date.now().toString(36).toUpperCase()}</div>
        </div>
      </div>

      <div class="watermark">
        HP Email Quality Assurance System • Official Stage Verification Document
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    alert("Please allow popups to generate and download your QA Verification PDF Receipt.");
  }
}
