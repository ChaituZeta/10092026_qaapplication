import fs from 'fs';
let content = fs.readFileSync('src/pages/CampaignSetup.tsx', 'utf8');

// 1. Add Checklist imports
const importChecklist = `import { StageChecklist } from "@/src/components/QAWorkspace/StageChecklist";
import { FinalChecklist } from "@/src/components/QAWorkspace/FinalChecklist";`;
content = content.replace(`import { BrowserQAWorkspace }`, `${importChecklist}\nimport { BrowserQAWorkspace }`);

// 2. Add Checklist state to the component
const stateHook = `  const [checklists, setChecklists] = useState<any[]>([]);
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, any>>({});
  const [showChecklistError, setShowChecklistError] = useState(false);`;

content = content.replace(
  `const [isSubmitting, setIsSubmitting] = useState(false);`,
  `const [isSubmitting, setIsSubmitting] = useState(false);\n${stateHook}`
);

// 3. Add useEffect to load checklists for active team
const effectSearch = `useEffect(() => {
    // If not creating a new one (editId != null), fetch existing campaign`;

const newEffect = `useEffect(() => {
    const saved = localStorage.getItem("platform_checklists");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const teamChecklists = parsed.find((c: any) => c.team === userTeam) || { items: [] };
        setChecklists(teamChecklists.items || []);
        
        // initialize answers if not present
        if (Object.keys(checklistAnswers).length === 0) {
          const initial = {};
          (teamChecklists.items || []).forEach((item: any) => {
            initial[item.id] = { status: null, text: "" };
          });
          setChecklistAnswers(initial);
        }
      } catch (e) {}
    }
  }, [userTeam]);

  useEffect(() => {
    // If not creating a new one (editId != null), fetch existing campaign`;

content = content.replace(effectSearch, newEffect);

// 4. Update STEPS
content = content.replace(
  `  { id: "review", title: "Review & Decision" }
];`,
  `  { id: "review", title: "Review & Decision" },
  { id: "checklist", title: "Final Checklist" }
];`
);

// 5. Update nextStep logic
const nextStepStart = `const nextStep = async () => {`;
const nextStepReplaced = `const nextStep = async () => {
    const currentStageChecklists = checklists.filter(c => c.stage === currentStep || c.stage === 0);
    let isChecklistValid = true;
    currentStageChecklists.forEach(c => {
      const ans = checklistAnswers[c.id];
      if (!ans || !ans.status) {
        isChecklistValid = false;
      }
      if (c.requiresInput && ans?.status === "Checked" && !ans?.text?.trim()) {
        isChecklistValid = false;
      }
    });
    
    if (!isChecklistValid && currentStep < 7) {
      setShowChecklistError(true);
      return;
    }
    setShowChecklistError(false);`;

content = content.replace(nextStepStart, nextStepReplaced);

// 6. Update step logic
content = content.replace(
  `if (currentStep === 6) fieldsToValidate = [];`,
  `if (currentStep === 6) fieldsToValidate = [];
    if (currentStep === 7) fieldsToValidate = [];`
);

// 7. Inject StageChecklist at the top of each stage (Except 7)
const renderCurrentStepSearch = `<div className="flex-1 min-w-0 h-full overflow-y-auto pr-1 pb-1">`;
const renderCurrentStepReplace = `<div className="flex-1 min-w-0 h-full overflow-y-auto pr-1 pb-1">
              {currentStep < 7 && checklists.filter(c => c.stage === currentStep || c.stage === 0).length > 0 && (
                <div className="p-4 bg-white border-b border-slate-200">
                  <StageChecklist 
                    currentStep={currentStep} 
                    checklists={checklists} 
                    answers={checklistAnswers} 
                    setAnswers={setChecklistAnswers} 
                    showError={showChecklistError}
                  />
                </div>
              )}`;

content = content.replace(renderCurrentStepSearch, renderCurrentStepReplace);

// 8. Add Stage 7 Checklist summary
const stage6End = `)}
            </div>`;
const stage7 = `              {currentStep === 7 && (
                <div className="bg-white h-full overflow-y-auto w-full">
                  <FinalChecklist checklists={checklists} answers={checklistAnswers} />
                </div>
              )}`;

// Need a precise replace. Let's find where currentStep === 6 ends.
// Since it's large, we can replace the last `</div>` before the `<BrowserQAWorkspace`
const rightPanelSearch = `{/* Right Panel - Browser Workspace */}`;
const rightPanelReplace = `
              {currentStep === 7 && (
                <div className="bg-white h-full overflow-y-auto w-full">
                  <FinalChecklist checklists={checklists} answers={checklistAnswers} />
                </div>
              )}
            </div>
            {/* Right Panel - Browser Workspace */}`;
content = content.replace(`</div>\n            {/* Right Panel - Browser Workspace */}`, rightPanelReplace);

fs.writeFileSync('src/pages/CampaignSetup.tsx', content);
console.log("Patched CampaignSetup.tsx successfully");
