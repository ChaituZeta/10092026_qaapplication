import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/linkParser.ts', 'utf8');

content = content.replace(
  `    const img = a.querySelector('img');
    const imageUrl = img ? (img.getAttribute('src') || '') : null;
    const alt = img ? (img.getAttribute('alt') || '') : '';`,
  `    const imgs = Array.from(a.querySelectorAll('img'));
    const imageUrl = imgs.length > 0 ? (imgs[0].getAttribute('src') || '') : null;
    const alts = imgs.map(img => img.getAttribute('alt')).filter(a => a !== null && a !== '');
    const alt = alts.length > 0 ? alts.join(' | ') : '';`
);

content = content.replace(
  `    const viewImg = viewA.querySelector('img');
    const codeImg = codeA ? codeA.querySelector('img') : null;
    
    const imageUrl = viewImg ? (viewImg.getAttribute('src') || '') : null;
    const alt = codeImg ? (codeImg.getAttribute('alt') || '') : (viewImg ? (viewImg.getAttribute('alt') || '') : '');`,
  `    const viewImgs = Array.from(viewA.querySelectorAll('img'));
    const codeImgs = codeA ? Array.from(codeA.querySelectorAll('img')) : [];
    
    const imageUrl = viewImgs.length > 0 ? (viewImgs[0].getAttribute('src') || '') : null;
    
    let alts = [];
    if (codeImgs.length > 0) {
      alts = codeImgs.map(img => img.getAttribute('alt')).filter(a => a !== null && a !== '');
    } else {
      alts = viewImgs.map(img => img.getAttribute('alt')).filter(a => a !== null && a !== '');
    }
    const alt = alts.length > 0 ? alts.join(' | ') : '';`
);

fs.writeFileSync('src/components/QAWorkspace/linkParser.ts', content);
console.log("Fixed link parser");
