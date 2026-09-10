import { DEFAULT_PLATFORM_CHECKLISTS } from "@/lib/checklist-storage";

export interface ChecklistItem {
  id: string;
  text: string;
  stage?: number;
  description?: string;
  requiresInput?: boolean;
  inputPlaceholder?: string;
}

export interface CampaignCheckpointProgress {
  total: number;
  checked: number;
  na: number;
  completed: number;
  pending: number;
  percent: number;
  isFullyCompleted: boolean;
  items: Array<{
    item: ChecklistItem;
    status: "Checked" | "N/A" | "Pending";
    notes?: string;
  }>;
}

export function getCampaignCheckpointProgress(campaign: any): CampaignCheckpointProgress {
  if (!campaign) {
    return {
      total: 0,
      checked: 0,
      na: 0,
      completed: 0,
      pending: 0,
      percent: 0,
      isFullyCompleted: false,
      items: []
    };
  }

  // 1. Resolve checklists list
  let checklists: ChecklistItem[] = [];
  if (Array.isArray(campaign.checklists) && campaign.checklists.length > 0) {
    checklists = campaign.checklists;
  } else {
    // Fallback to default platform master checklists for team
    const teamData = DEFAULT_PLATFORM_CHECKLISTS.find((c: any) => c.team === campaign.team);
    if (teamData && Array.isArray(teamData.items)) {
      checklists = teamData.items;
    }
  }

  const answers = campaign.checklistAnswers || {};
  let checked = 0;
  let na = 0;

  const itemDetails = checklists.map((item) => {
    const ans = answers[item.id] || {};
    let status: "Checked" | "N/A" | "Pending" = "Pending";
    if (ans.status === "Checked") {
      status = "Checked";
      checked++;
    } else if (ans.status === "N/A") {
      status = "N/A";
      na++;
    }

    return {
      item,
      status,
      notes: ans.text || ""
    };
  });

  const total = checklists.length;
  const completed = checked + na;
  const pending = Math.max(0, total - completed);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isFullyCompleted = total > 0 && completed === total;

  return {
    total,
    checked,
    na,
    completed,
    pending,
    percent,
    isFullyCompleted,
    items: itemDetails
  };
}

export const DEFAULT_CHECKLISTS: Record<string, { name: string; items: ChecklistItem[] }> = {
  stage0: {
    name: "Stage 1: Pre-QA Setup & Compliance",
    items: [
      { id: "1", text: "Verify legal disclaimer compliance", stage: 0 },
      { id: "2", text: "Check regional translation accuracy", stage: 0 }
    ]
  },
  stage1: {
    name: "Stage 2: Alt & Alias Tags Inspection",
    items: [
      { id: "3", text: "Verify image alt attribute completeness", stage: 1 },
      { id: "4", text: "Validate link alias tags across version images", stage: 1 }
    ]
  },
  stage2: {
    name: "Stage 3: Link & Tracking Validation",
    items: [
      { id: "5", text: "Validate tracking parameters and UTM codes", stage: 2 },
      { id: "6", text: "Test link destinations and redirect paths", stage: 2 }
    ]
  }
};
