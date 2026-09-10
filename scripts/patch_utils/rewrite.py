import re

with open('src/pages/CampaignSetup.tsx', 'r') as f:
    content = f.read()

# Update steps array
old_steps = """const STEPS = [
  { id: "details", title: "Details & Source" },
  { id: "preview", title: "Link Extraction Preview & QA Validation QA Workspace" },
  { id: "grammar", title: "Grammar & Spell Check" },
  { id: "uploads", title: "Uploads & Links" },
  { id: "review", title: "Review & Decision" }
];"""

new_steps = """const STEPS = [
  { id: "details", title: "Details & Source" },
  { id: "compare", title: "Visual Comparison" },
  { id: "tags", title: "Alt & Alias Tags" },
  { id: "links", title: "Link Validation" },
  { id: "grammar", title: "Grammar & Spell Check" },
  { id: "review", title: "Review & Decision" }
];"""
content = content.replace(old_steps, new_steps)

# Replace fieldsToValidate logic
content = re.sub(
    r'if \(currentStep === 2\) fieldsToValidate = \[\];[\s\S]*?if \(currentStep === 4\) fieldsToValidate = \["litmusUrl"\];',
    'if (currentStep === 2) fieldsToValidate = [];\n    if (currentStep === 3) fieldsToValidate = [];\n    if (currentStep === 4) fieldsToValidate = [];\n    if (currentStep === 5) fieldsToValidate = [];\n    if (currentStep === 6) fieldsToValidate = [];',
    content
)

# Step 2 block replacement
step2_pattern = r'\{currentStep === 2 && \([\s\S]*?BrowserQAWorkspace[\s\S]*?</div>\s*\)\}'
step2_replacement = """{currentStep === 2 && (
              <div className={cn(
                "flex flex-col flex-1 min-h-[600px] border border-slate-200 rounded-xl shadow-xs bg-white overflow-hidden transition-all duration-300",
                fullScreenTarget === "step2" ? "fixed inset-0 z-[100] m-4 border-2 shadow-2xl" : ""
              )}>
                <VisualComparison webViewUrl={resolvedWebViewUrl || values.webViewUrl} figmaUrl={values.figmaUrl} />
              </div>
            )}
            
            {currentStep === 3 && (
              <div className={cn(
                "flex flex-col flex-1 min-h-[600px] border border-slate-200 rounded-xl shadow-xs bg-white overflow-hidden transition-all duration-300",
                fullScreenTarget === "step3" ? "fixed inset-0 z-[100] m-4 border-2 shadow-2xl" : ""
              )}>
                <TagInspection htmlSource={processedHtmlSource || values.htmlSource} />
              </div>
            )}
            
            {currentStep === 4 && (
              <div className={cn(
                "flex flex-col flex-1 min-h-[600px] border border-slate-200 rounded-xl shadow-xs bg-white overflow-hidden transition-all duration-300",
                fullScreenTarget === "step4" ? "fixed inset-0 z-[100] m-4 border-2 shadow-2xl" : ""
              )}>
                <BrowserQAWorkspace 
                  htmlSource={processedHtmlSource || values.htmlSource} 
                  webViewUrl={resolvedWebViewUrl || values.webViewUrl} 
                  country={values.country}
                  versionName={values.versionName}
                />
              </div>
            )}"""

content = re.sub(step2_pattern, step2_replacement, content)

# Grammar step -> 5
content = content.replace('{currentStep === 3 && (', '{currentStep === 5 && (')

# Uploads step -> remove (it was 4)
content = re.sub(r'\{currentStep === 4 && \([\s\S]*?Uploads & Links[\s\S]*?</div>\s*\)\}', '', content)

# Review step -> 6
# Let's find currentStep === 5 in Review context
content = re.sub(r'\{currentStep === 5 && \((\s*<div)', r'{currentStep === 6 && (\g<1>', content)
content = re.sub(r'\{currentStep === 5 && \((\s*<Card)', r'{currentStep === 6 && (\g<1>', content)

with open('src/pages/CampaignSetup.tsx', 'w') as f:
    f.write(content)
