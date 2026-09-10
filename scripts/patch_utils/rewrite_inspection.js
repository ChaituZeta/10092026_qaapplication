import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/TagInspection.tsx', 'utf8');

// Remove sidebar and state
content = content.replace(/const \[showSidebar, setShowSidebar\] = useState\(true\);\s*const \[extractedTags, setExtractedTags\] = useState<{altTags: any\[\], aliasTags: any\[\]}>\({altTags: \[\], aliasTags: \[\]}\);/, '');

// Remove the extractedTags listener
content = content.replace(/if \(e\.data\.type === 'extractedTags'\) \{\s*setExtractedTags\(e\.data\.payload\);\s*\}\s*if \(e\.data\.type === 'iframeLoaded'/g, "if (e.data.type === 'iframeLoaded'");

// Update iframe script
const scriptRegex = /function updateOverlays\(showAlt, showAlias, showSup\) \{[\s\S]*?window\.overlayPositions \= window\.overlayPositions \|\| \[\];/;

const newScript = `function updateOverlays(showAlt, showAlias, showSup) {
          document.querySelectorAll('.qa-overlay').forEach(el => el.remove());
          document.querySelectorAll('.qa-target-highlight').forEach(el => el.classList.remove('qa-target-highlight'));
          document.querySelectorAll('.qa-img-highlight-red').forEach(el => el.classList.remove('qa-img-highlight-red'));
          document.querySelectorAll('.qa-img-highlight-green').forEach(el => el.classList.remove('qa-img-highlight-green'));
          window.overlayPositions = [];

          document.querySelectorAll('.qa-sup-missing-wrapper > .qa-sup-missing').forEach(el => {
             const p = el.parentNode;
             if (p) {
               p.parentNode.replaceChild(document.createTextNode(p.textContent), p);
             }
          });

          if (showAlt) {
            document.querySelectorAll('img').forEach(img => {
              const alt = img.getAttribute('alt');
              if (alt !== null && alt.trim() !== '') {
                img.classList.add('qa-img-highlight-green');
                createOverlay(img, 'Alt: ' + alt, 'alt-tag', 'bottom');
              } else {
                img.classList.add('qa-img-highlight-red');
                createOverlay(img, 'Missing Alt', 'alt-tag', 'bottom', true);
              }
            });
          }
          if (showAlias) {
            document.querySelectorAll('a').forEach(a => {
              const alias = a.getAttribute('alias') || a.getAttribute('name');
              const target = a.querySelector('img') || a;
              if (alias) {
                createOverlay(target, 'Alias: ' + alias, 'alias-tag', 'top');
              }
            });
          }
          if (showSup) {
             const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
             const nodesToWrap = [];
             let node;
             while (node = walker.nextNode()) {
               if (node.parentNode && node.parentNode.nodeName !== 'SUP' && node.parentNode.nodeName !== 'STYLE' && node.parentNode.nodeName !== 'SCRIPT') {
                 if (/[®™©℠]/.test(node.nodeValue)) {
                   nodesToWrap.push(node);
                 }
               }
             }
             
             nodesToWrap.forEach(textNode => {
                const parent = textNode.parentNode;
                if (parent.classList && parent.classList.contains('qa-sup-missing-wrapper')) {
                   parent.classList.add('qa-sup-missing');
                   return;
                }
                const span = document.createElement('span');
                span.className = 'qa-sup-missing-wrapper';
                span.innerHTML = textNode.nodeValue.replace(/([®™©℠])/g, '<span class="qa-sup-missing">$1</span>');
                parent.replaceChild(span, textNode);
             });
             
             document.querySelectorAll('.qa-sup-missing').forEach(el => {
                createOverlay(el, 'Missing <sup>', 'sup-tag', 'top');
             });
          }
        }
        
        window.overlayPositions = window.overlayPositions || [];`;

content = content.replace(scriptRegex, newScript);

const layoutRegex = /<div className="flex-1 flex overflow-hidden relative">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const newLayout = `<div className="flex-1 flex overflow-hidden relative">
        <div className="bg-slate-100 relative overflow-hidden flex flex-col p-2 sm:p-4 w-full transition-all duration-300">
         <div className="bg-white shadow-xl transition-all duration-300 border border-slate-300 rounded-lg overflow-hidden flex flex-col flex-1 w-full mx-auto relative h-full">
           {processedHtml ? (
             <iframe 
               ref={iframeRef}
               srcDoc={processedHtml}
               className="w-full flex-1 border-0 bg-white"
               title="HTML Tags Inspection"
             />
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm p-8 text-center h-full">
                <FileCode2 className="w-12 h-12 text-slate-300 mb-3" />
                <p>No HTML Source Provided</p>
                <p className="text-xs mt-1 max-w-sm">Please return to Step 1 and provide the HTML source code to inspect tags.</p>
             </div>
           )}
         </div>
        </div>
      </div>
    </div>`;

content = content.replace(layoutRegex, newLayout);

// Add styles for the red/green image highlights
const stylesRegex = /\.qa-sup-missing \{/;
const newStyles = `.qa-img-highlight-green {
          outline: 3px solid rgba(16, 185, 129, 0.8) !important;
          outline-offset: -3px;
        }
        .qa-img-highlight-red {
          outline: 3px solid rgba(225, 29, 72, 0.8) !important;
          outline-offset: -3px;
        }
        .qa-sup-missing {`;
content = content.replace(stylesRegex, newStyles);


// Increase time for setTimeouts and use MutationObserver if possible?
// Let's just trigger updates a few times.
const initRenderRegex = /window\.addEventListener\('load', \(\) => \{[\s\S]*?\}\);/;
const newInitRender = `window.addEventListener('load', () => {
           window.parent.postMessage({ type: 'iframeLoaded' }, '*');
           setTimeout(() => window.parent.postMessage({ type: 'iframeLoaded' }, '*'), 500);
           setTimeout(() => window.parent.postMessage({ type: 'iframeLoaded' }, '*'), 1500);
           setTimeout(() => window.parent.postMessage({ type: 'iframeLoaded' }, '*'), 3000);
        });
        
        // Also observe mutations in case images load later or content changes
        const observer = new MutationObserver((mutations) => {
           window.parent.postMessage({ type: 'iframeLoaded' }, '*');
        });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'alt'] });
        `;
content = content.replace(initRenderRegex, newInitRender);


fs.writeFileSync('src/components/QAWorkspace/TagInspection.tsx', content);
console.log("Updated TagInspection");
