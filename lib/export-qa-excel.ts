export interface ExportQAExcelParams {
  campaignName: string;
  team: string;
  country: string;
  versionName: string;
  userEmail?: string;
  campaignStatus?: string;
  checklists: Array<{
    id: string;
    stage: number;
    text: string;
    requiresInput?: boolean;
  }>;
  answers: Record<string, { status?: string | null; text?: string }>;
}

export function exportQAChecklistToExcel(params: ExportQAExcelParams) {
  const {
    campaignName,
    team,
    country,
    versionName,
    userEmail = 'qa@hp.com',
    campaignStatus = 'In Progress',
    checklists = [],
    answers = {}
  } = params;

  const stageNames: Record<number, string> = {
    0: "Global Checkpoints",
    1: "Details & Source",
    2: "Visual Comparison",
    3: "Alt & Alias Tags",
    4: "Link Validation",
    5: "Grammar & Spell Check",
    6: "Review & Approval"
  };

  // Helper to escape values for CSV / Excel
  const escapeCsv = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows: string[] = [];

  // Header Metadata Section
  rows.push(`${escapeCsv("HP EMAIL QUALITY ASSURANCE VERIFICATION REPORT")}`);
  rows.push(`${escapeCsv("Generated Date")},${escapeCsv(new Date().toLocaleString())}`);
  rows.push(`${escapeCsv("Campaign Name")},${escapeCsv(campaignName || "Untitled Campaign")}`);
  rows.push(`${escapeCsv("Team")},${escapeCsv(team || "HP-APJ")}`);
  rows.push(`${escapeCsv("Country / Region")},${escapeCsv(country || "US")}`);
  rows.push(`${escapeCsv("Version Name")},${escapeCsv(versionName || "v1")}`);
  rows.push(`${escapeCsv("Verified By")},${escapeCsv(userEmail)}`);
  rows.push(`${escapeCsv("Campaign Status")},${escapeCsv(campaignStatus)}`);
  rows.push(""); // Blank row separator

  // Calculate stats
  let totalPoints = 0;
  let passedCount = 0;
  let naCount = 0;
  let missedCount = 0;

  checklists.forEach((item) => {
    totalPoints++;
    const status = answers[item.id]?.status;
    if (status === "Checked") passedCount++;
    else if (status === "N/A") naCount++;
    else missedCount++;
  });

  const passRate = totalPoints > 0 ? Math.round(((passedCount + naCount) / totalPoints) * 100) : 100;

  // Stats Summary Table
  rows.push(`${escapeCsv("STATISTICS SUMMARY")}`);
  rows.push(`${escapeCsv("Total Checkpoints")},${escapeCsv(totalPoints)}`);
  rows.push(`${escapeCsv("Passed")},${escapeCsv(passedCount)}`);
  rows.push(`${escapeCsv("N/A")},${escapeCsv(naCount)}`);
  rows.push(`${escapeCsv("Missed / Pending")},${escapeCsv(missedCount)}`);
  rows.push(`${escapeCsv("Compliance Score")},${escapeCsv(`${passRate}%`)}`);
  rows.push(""); // Blank row separator

  // Main Detailed Table Header
  rows.push([
    escapeCsv("Stage #"),
    escapeCsv("Stage Name"),
    escapeCsv("Checkpoint ID"),
    escapeCsv("Checkpoint Description"),
    escapeCsv("Verification Status"),
    escapeCsv("Input Notes / Value")
  ].join(","));

  // Main Detailed Table Rows
  checklists.forEach((item) => {
    const stageNum = item.stage;
    const stageLabel = stageNames[stageNum] || `Stage ${stageNum}`;
    const ans = answers[item.id] || { status: null, text: "" };
    
    let statusLabel = "MISSED";
    if (ans.status === "Checked") statusLabel = "CHECKED";
    else if (ans.status === "N/A") statusLabel = "N/A";

    rows.push([
      escapeCsv(stageNum === 0 ? "Global" : stageNum),
      escapeCsv(stageLabel),
      escapeCsv(item.id),
      escapeCsv(item.text),
      escapeCsv(statusLabel),
      escapeCsv(ans.text || "")
    ].join(","));
  });

  // UTF-8 BOM for Excel character encoding compatibility
  const csvContent = "\uFEFF" + rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  const filename = `QA_Verification_${(campaignName || "Campaign").replace(/[^a-zA-Z0-9_-]/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
