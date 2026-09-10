import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/TagInspection.tsx', 'utf8');

content = content.replace(/import {.*?Tag.*?} from 'lucide-react';/, "import { Tag, Image, AlertTriangle, Type, Maximize2, Minimize2, CheckSquare, FileCode2, Code, Copy, LayoutTemplate, HelpCircle, X, CheckCircle2, ChevronRight, Check } from 'lucide-react';");
fs.writeFileSync('src/components/QAWorkspace/TagInspection.tsx', content);
