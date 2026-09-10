import React, { useState, useMemo } from 'react';
import { 
  BarChart2, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  User, 
  Folder, 
  ChevronDown, 
  ChevronRight, 
  ExternalLink, 
  FileText, 
  TrendingUp, 
  ShieldCheck, 
  Eye, 
  CheckSquare, 
  XSquare,
  Sparkles,
  Printer,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAllCampaigns, CampaignRecord } from '@/lib/campaign-storage';
import { getCampaignCheckpointProgress, DEFAULT_CHECKLISTS } from '@/lib/checklist-utils';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Reports() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [progressFilter, setProgressFilter] = useState<string>('all');
  const [selectedCampaignForDetail, setSelectedCampaignForDetail] = useState<CampaignRecord | null>(null);

  React.useEffect(() => {
    async function fetchAll() {
      const data = await getAllCampaigns();
      setCampaigns(data);
    }
    fetchAll();
  }, []);

  // Compute aggregated report statistics
  const reportStats = useMemo(() => {
    let totalCampaigns = campaigns.length;
    let totalCheckpoints = 0;
    let completedCheckpoints = 0;
    let checkedCount = 0;
    let naCount = 0;
    let pendingCount = 0;
    let fullyVerifiedCount = 0;

    const qaPersonMap: Record<string, { count: number; completed: number; total: number }> = {};

    campaigns.forEach(campaign => {
      const prog = getCampaignCheckpointProgress(campaign);
      totalCheckpoints += prog.total;
      completedCheckpoints += prog.completed;
      checkedCount += prog.checked;
      naCount += prog.na;
      pendingCount += prog.pending;

      if (prog.isFullyCompleted) {
        fullyVerifiedCount++;
      }

      const qaPerson = campaign.lastEditedBy || campaign.createdBy || campaign.userEmail || "QA Specialist";
      if (!qaPersonMap[qaPerson]) {
        qaPersonMap[qaPerson] = { count: 0, completed: 0, total: 0 };
      }
      qaPersonMap[qaPerson].count += 1;
      qaPersonMap[qaPerson].completed += prog.completed;
      qaPersonMap[qaPerson].total += prog.total;
    });

    const overallPercentage = totalCheckpoints > 0 ? Math.round((completedCheckpoints / totalCheckpoints) * 100) : 0;

    return {
      totalCampaigns,
      totalCheckpoints,
      completedCheckpoints,
      checkedCount,
      naCount,
      pendingCount,
      fullyVerifiedCount,
      overallPercentage,
      qaPersonMap
    };
  }, [campaigns]);

  // Filtered campaigns for table
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      if (c.is_deleted) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesCountry = c.country.toLowerCase().includes(q);
        const matchesUser = (c.createdBy || '').toLowerCase().includes(q) || (c.lastEditedBy || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCountry && !matchesUser) return false;
      }

      if (statusFilter !== 'all' && c.status !== statusFilter) return false;

      const prog = getCampaignCheckpointProgress(c);
      if (progressFilter === 'completed' && !prog.isFullyCompleted) return false;
      if (progressFilter === 'in_progress' && (prog.completed === 0 || prog.isFullyCompleted)) return false;
      if (progressFilter === 'unstarted' && prog.completed > 0) return false;

      return true;
    });
  }, [campaigns, searchQuery, statusFilter, progressFilter]);

  // Handle Export CSV
  const handleExportCSV = () => {
    const headers = ["Campaign Name", "Country", "Version", "Status", "Total Checkpoints", "Completed", "Checked", "N/A", "Pending", "QA Person", "Last Activity"];
    const rows = filteredCampaigns.map(c => {
      const prog = getCampaignCheckpointProgress(c);
      const qaPerson = c.lastEditedBy || c.createdBy || "QA Specialist";
      return [
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.country}"`,
        `"${c.versionName || "Standard"}"`,
        `"${c.status}"`,
        prog.total,
        prog.completed,
        prog.checked,
        prog.na,
        prog.pending,
        `"${qaPerson}"`,
        `"${c.updated_at}"`
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `QA_Campaigns_Checkpoints_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#2b61d6] uppercase tracking-wider mb-1">
            <BarChart2 className="w-4 h-4" />
            <span>Admin Quality Assurance Reports</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            QA Checkpoint Audit Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Comprehensive audit report tracking QA inspector progress, checkpoint status, and compliance across all active campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className="h-9 text-xs font-bold gap-1.5 border-slate-200 hover:bg-slate-50 text-slate-700"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </Button>

          <Button
            type="button"
            onClick={handleExportCSV}
            className="h-9 text-xs font-bold gap-1.5 bg-[#2b61d6] hover:bg-blue-700 text-white shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV Report</span>
          </Button>
        </div>
      </div>

      {/* KPI STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stat 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Campaigns</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{reportStats.totalCampaigns}</span>
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <ShieldCheck className="w-3 h-3" /> {reportStats.fullyVerifiedCount} 100% QA Verified
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#2b61d6] flex items-center justify-center border border-blue-100">
            <Folder className="w-6 h-6" />
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Overall Compliance Rate</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{reportStats.overallPercentage}%</span>
            <span className="text-[10px] text-slate-500 font-medium mt-1 block">
              {reportStats.completedCheckpoints} of {reportStats.totalCheckpoints} Checkpoints
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Verified Checkpoints</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-700">{reportStats.checkedCount}</span>
              <span className="text-xs text-slate-500">Checked</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-1 block">
              + {reportStats.naCount} N/A Marked
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pending QA Items</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{reportStats.pendingCount}</span>
            <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" /> Awaiting Inspector Check
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search report by campaign name, country, or QA auditor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-slate-50 border-slate-200"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs">
            <span className="text-[11px] font-bold text-slate-500 px-2">Status:</span>
            {["all", "Draft", "In QA Review", "QA Approved", "Live"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer",
                  statusFilter === st ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                {st === "all" ? "All Statuses" : st}
              </button>
            ))}
          </div>

          {/* QA Completion Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs">
            <span className="text-[11px] font-bold text-slate-500 px-2">QA Progress:</span>
            {[
              { id: "all", label: "All" },
              { id: "completed", label: "100% Verified" },
              { id: "in_progress", label: "In Progress" },
              { id: "unstarted", label: "Unstarted" },
            ].map((pf) => (
              <button
                key={pf.id}
                type="button"
                onClick={() => setProgressFilter(pf.id)}
                className={cn(
                  "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer",
                  progressFilter === pf.id ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                {pf.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* DETAILED CAMPAIGN QA AUDIT TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#2b61d6]" />
            <h3 className="font-bold text-sm text-slate-800">
              Campaign Checkpoint Audit Breakdown ({filteredCampaigns.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Click "View Audit Details" on any row for item-by-item breakdown
          </span>
        </div>

        {filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No campaign QA records match the selected filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                  <th className="px-5 py-3">Campaign & Country</th>
                  <th className="px-5 py-3">QA Checkpoint Progress</th>
                  <th className="px-5 py-3">Checked / NA / Pending</th>
                  <th className="px-5 py-3">QA Auditor Person</th>
                  <th className="px-5 py-3">Last QA Activity</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100">
                {filteredCampaigns.map((campaign) => {
                  const prog = getCampaignCheckpointProgress(campaign);
                  const qaPerson = campaign.lastEditedBy || campaign.createdBy || "QA Specialist";

                  return (
                    <tr key={campaign.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm">{campaign.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-semibold text-slate-600">{campaign.country}</span>
                            <span className="text-[10px] text-slate-400">({campaign.versionName || "Standard"})</span>
                            <span className="inline-flex items-center px-2 py-0.2 rounded text-[9px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                              {campaign.status}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="w-48 space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className={prog.isFullyCompleted ? "text-emerald-700" : prog.completed > 0 ? "text-[#2b61d6]" : "text-slate-500"}>
                              {prog.completed}/{prog.total} Done
                            </span>
                            <span className="text-slate-500 text-[11px]">{prog.percent}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                            <div
                              className={cn(
                                "h-full transition-all duration-500",
                                prog.isFullyCompleted ? "bg-emerald-500" : prog.completed > 0 ? "bg-[#2b61d6]" : "bg-slate-300"
                              )}
                              style={{ width: `${prog.percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 rounded border border-emerald-200 inline-flex items-center gap-1">
                            <CheckSquare className="w-3 h-3 text-emerald-600" /> {prog.checked} Checked
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded border border-slate-200">
                            {prog.na} N/A
                          </span>
                          {prog.pending > 0 && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 rounded border border-amber-200 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" /> {prog.pending} Left
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        <div className="flex items-center gap-1.5 font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{qaPerson}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        <span className="font-mono text-[11px]">{campaign.updated_at}</span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCampaignForDetail(campaign)}
                          className="h-8 text-xs font-semibold text-[#2b61d6] border-blue-200 bg-blue-50/50 hover:bg-blue-100 text-right gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Audit Detail</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ITEM-BY-ITEM AUDIT DETAIL MODAL */}
      {selectedCampaignForDetail && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-[#2b61d6] uppercase tracking-wider block">
                  Detailed QA Inspection Checklist Report
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  {selectedCampaignForDetail.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span>Country: <strong>{selectedCampaignForDetail.country}</strong></span>
                  <span>•</span>
                  <span>Auditor: <strong>{selectedCampaignForDetail.lastEditedBy || selectedCampaignForDetail.createdBy || "QA Specialist"}</strong></span>
                </div>
              </div>

              <button
                onClick={() => setSelectedCampaignForDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Checklist items list */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {Object.keys(DEFAULT_CHECKLISTS).map((stageKey) => {
                const stageName = DEFAULT_CHECKLISTS[stageKey].name;
                const items = DEFAULT_CHECKLISTS[stageKey].items || [];
                const answers = selectedCampaignForDetail.checklistAnswers || {};

                return (
                  <div key={stageKey} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider text-[#2b61d6]">
                      {stageName}
                    </h4>
                    <div className="divide-y divide-slate-200/60 text-xs">
                      {items.map((item) => {
                        const val = answers[item.id]; // 'checked' | 'na' | 'uncheck' | string answer
                        let statusPill = (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-600 rounded">
                            Pending / Not Done
                          </span>
                        );

                        if (val === 'checked' || val === true) {
                          statusPill = (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Passed / Verified
                            </span>
                          );
                        } else if (val === 'na') {
                          statusPill = (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 rounded border border-slate-300">
                              N/A Marked
                            </span>
                          );
                        }

                        return (
                          <div key={item.id} className="py-2.5 flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-800 block">{item.text}</span>
                              {item.description && (
                                <p className="text-[11px] text-slate-500">{item.description}</p>
                              )}
                              {typeof val === 'string' && val !== 'checked' && val !== 'na' && val !== 'uncheck' && (
                                <div className="text-[11px] font-mono bg-white p-1.5 rounded border border-slate-200 text-slate-800 mt-1">
                                  QA Note: {val}
                                </div>
                              )}
                            </div>
                            <div className="shrink-0">{statusPill}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const id = selectedCampaignForDetail.id;
                  setSelectedCampaignForDetail(null);
                  navigate(`/campaigns/new?id=${id}`);
                }}
                className="text-xs font-bold text-[#2b61d6] border-blue-200 bg-blue-50/50"
              >
                Open Full QA Workspace
              </Button>

              <Button
                type="button"
                onClick={() => setSelectedCampaignForDetail(null)}
                className="text-xs font-bold bg-slate-900 text-white"
              >
                Close Report Detail
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
