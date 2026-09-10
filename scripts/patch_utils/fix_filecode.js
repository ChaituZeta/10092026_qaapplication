import fs from 'fs';
let content = fs.readFileSync('src/components/QAWorkspace/TagInspection.tsx', 'utf8');

content = content.replace(/import {.*?ChevronRight.*?} from "lucide-react";/, 'import { CheckCircle2, ChevronRight, Check, FileCode2, Code, Copy, LayoutTemplate, HelpCircle, X, Maximize2, Minimize2, CheckSquare } from "lucide-react";');
fs.writeFileSync('src/components/QAWorkspace/TagInspection.tsx', content);
