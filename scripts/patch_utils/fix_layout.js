import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/TagInspection.tsx', 'utf8');

// Change overflow-y-auto to overflow-hidden on the left pane so iframe scrolls internally
content = content.replace(
  'className={cn("bg-slate-100 relative overflow-y-auto flex justify-center p-4 transition-all duration-300", showSidebar ? "w-2/3 border-r border-slate-200" : "w-full")}',
  'className={cn("bg-slate-100 relative overflow-hidden flex justify-center p-4 transition-all duration-300", showSidebar ? "w-2/3 border-r border-slate-200" : "w-full")}'
);

// Remove absolute from iframe to allow it to fill normally if the parent is flex-1
content = content.replace(
  '<iframe \n               ref={iframeRef}\n               srcDoc={processedHtml}\n               className="w-full h-full border-0 bg-white absolute inset-0"\n               title="HTML Tags Inspection"\n             />',
  '<iframe \n               ref={iframeRef}\n               srcDoc={processedHtml}\n               className="w-full flex-1 border-0 bg-white"\n               title="HTML Tags Inspection"\n             />'
);

content = content.replace(
  'className="bg-white shadow-xl transition-all duration-300 border border-slate-300 rounded overflow-hidden flex flex-col h-full w-full max-w-[800px] mx-auto relative"',
  'className="bg-white shadow-xl transition-all duration-300 border border-slate-300 rounded overflow-hidden flex flex-col flex-1 w-full max-w-[800px] mx-auto relative"'
);

fs.writeFileSync('src/components/QAWorkspace/TagInspection.tsx', content);
console.log("Fixed iframe scroll layout");
