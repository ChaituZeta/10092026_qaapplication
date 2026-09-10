import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/TagInspection.tsx', 'utf8');

const updateTagsOld = `      iframeRef.current.contentWindow.postMessage({
        type: 'updateTags',
        showAlt, showAlias, showSup
      }, '*');`;
const updateTagsNew = `      iframeRef.current.contentWindow.postMessage({
        type: 'updateTags',
        showAlt, showAlias, showSup, subjectLine
      }, '*');`;

content = content.replace(updateTagsOld, updateTagsNew);
content = content.replace(updateTagsOld, updateTagsNew); // Replace both instances

const scriptOld = `function updateOverlays(showAlt, showAlias, showSup) {`;
const scriptNew = `function updateOverlays(showAlt, showAlias, showSup, subjectLine) {`;
content = content.replace(scriptOld, scriptNew);

const listenOld = `        window.addEventListener('message', (e) => {
          if (e.data.type === 'updateTags') {
            updateOverlays(e.data.showAlt, e.data.showAlias, e.data.showSup);
          }
        });`;
const listenNew = `        window.addEventListener('message', (e) => {
          if (e.data.type === 'updateTags') {
            updateOverlays(e.data.showAlt, e.data.showAlias, e.data.showSup, e.data.subjectLine);
          }
        });`;
content = content.replace(listenOld, listenNew);

const showAltOld = `          if (showAlt) {
            document.querySelectorAll('img').forEach(img => {
              const alt = img.getAttribute('alt');
              if (alt !== null) {
                createOverlay(img, 'Alt: ' + (alt || '(empty)'), 'alt-tag', 'bottom');
              } else {
                createOverlay(img, 'Missing Alt', 'alt-tag', 'bottom', true);
              }
            });
          }`;

const showAltNew = `          if (showAlt) {
            document.querySelectorAll('img').forEach(img => {
              const alt = img.getAttribute('alt');
              if (alt !== null && alt.trim() !== '') {
                let text = 'Alt: ' + alt;
                if (subjectLine && alt.trim().toLowerCase() === subjectLine.trim().toLowerCase()) {
                  text = 'Subjectline: ' + alt;
                  img.classList.add('qa-img-highlight-green');
                }
                createOverlay(img, text, 'alt-tag', 'bottom');
              } else {
                img.classList.add('qa-img-highlight-red');
                createOverlay(img, 'Missing Alt', 'alt-tag', 'bottom', true);
              }
            });
          }`;

content = content.replace(showAltOld, showAltNew);

const showAliasOld = `          if (showAlias) {
            document.querySelectorAll('a').forEach(a => {
              const alias = a.getAttribute('alias') || a.getAttribute('name');
              const target = a.querySelector('img') || a;
              if (alias) {
                createOverlay(target, 'Alias: ' + alias, 'alias-tag', 'top');
              }
            });
          }`;

const showAliasNew = `          if (showAlias) {
            document.querySelectorAll('a').forEach(a => {
              const alias = a.getAttribute('alias') || a.getAttribute('name');
              const target = a.querySelector('img') || a;
              if (alias) {
                let text = 'Alias: ' + alias;
                if (subjectLine && alias.trim().toLowerCase() === subjectLine.trim().toLowerCase()) {
                  text = 'Subjectline: ' + alias;
                  target.classList.add('qa-img-highlight-green');
                }
                createOverlay(target, text, 'alias-tag', 'top');
              }
            });
          }`;
content = content.replace(showAliasOld, showAliasNew);

const addStylesOld = `        .qa-sup-missing {`;
const addStylesNew = `        .qa-img-highlight-green {
          outline: 3px solid rgba(16, 185, 129, 0.8) !important;
          outline-offset: -3px;
        }
        .qa-img-highlight-red {
          outline: 3px solid rgba(225, 29, 72, 0.8) !important;
          outline-offset: -3px;
        }
        .qa-sup-missing {`;

if (!content.includes('.qa-img-highlight-green')) {
  content = content.replace(addStylesOld, addStylesNew);
}

const clearStylesOld = `window.overlayPositions = [];`;
const clearStylesNew = `window.overlayPositions = [];
          document.querySelectorAll('.qa-img-highlight-red').forEach(el => el.classList.remove('qa-img-highlight-red'));
          document.querySelectorAll('.qa-img-highlight-green').forEach(el => el.classList.remove('qa-img-highlight-green'));`;
content = content.replace(clearStylesOld, clearStylesNew);

// And we must make sure useEffect has subjectLine in dependency array
const effect1Regex = /}, \[showAlt, showAlias, showSup, processedHtml\]\);/;
content = content.replace(effect1Regex, `}, [showAlt, showAlias, showSup, processedHtml, subjectLine]);`);

const effect2Regex = /}, \[showAlt, showAlias, showSup\]\);/;
content = content.replace(effect2Regex, `}, [showAlt, showAlias, showSup, subjectLine]);`);


fs.writeFileSync('src/components/QAWorkspace/TagInspection.tsx', content);
console.log("Applied TagInspection overlay fixes");
