import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/TagInspection.tsx', 'utf8');

const oldCreateOverlay = `        function createOverlay(target, text, className, position, isError = false) {
           const rect = target.getBoundingClientRect();
           // Don't render if element is hidden or 0 size
           // if (rect.width === 0 || rect.height === 0) return;
           
           if (!target.classList.contains('qa-sup-missing-wrapper')) {
             target.classList.add('qa-target-highlight');
           }
           
           const div = document.createElement('div');
           div.className = 'qa-overlay ' + className;
           div.textContent = text;
           if (isError) {
             div.style.background = 'rgba(225, 29, 72, 0.9)';
           }
           
           document.body.appendChild(div);
           
           const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
           const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
           
           // Calculate positions immediately
           let top = rect.top + scrollTop;
           let left = rect.left + scrollLeft;
           
           if (position === 'bottom') {
              top = rect.bottom + scrollTop - 20; // estimate height
           } else {
              top = rect.top + scrollTop + 4;
           }
           
           div.style.top = top + 'px';
           div.style.left = (left + 4) + 'px';
        }`;

const newCreateOverlay = `        function createOverlay(target, text, className, position, isError = false) {
           const rect = target.getBoundingClientRect();
           
           if (!target.classList.contains('qa-sup-missing-wrapper')) {
             target.classList.add('qa-target-highlight');
           }
           
           const div = document.createElement('div');
           div.className = 'qa-overlay ' + className;
           div.textContent = text;
           if (isError) {
             div.style.background = 'rgba(225, 29, 72, 0.9)';
           }
           
           document.body.appendChild(div);
           
           const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
           const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
           
           let top = rect.top + scrollTop;
           let left = rect.left + scrollLeft + 4;
           
           if (position === 'bottom') {
              top = rect.bottom + scrollTop - 20;
           } else {
              top = rect.top + scrollTop + 4;
           }
           
           // Simple collision avoidance
           let attempts = 0;
           while(attempts < 10) {
             const collision = window.overlayPositions.find(p => Math.abs(p.top - top) < 16 && Math.abs(p.left - left) < 60);
             if (collision) {
               top += 18; // shift down
               attempts++;
             } else {
               break;
             }
           }
           window.overlayPositions.push({top, left});
           
           div.style.top = top + 'px';
           div.style.left = left + 'px';
        }`;

content = content.replace(oldCreateOverlay, newCreateOverlay);
fs.writeFileSync('src/components/QAWorkspace/TagInspection.tsx', content);
console.log("Added collision detection");
