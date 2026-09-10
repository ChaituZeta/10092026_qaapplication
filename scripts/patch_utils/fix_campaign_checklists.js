import fs from 'fs';
let content = fs.readFileSync('src/pages/CampaignSetup.tsx', 'utf8');

content = content.replace(
  'const [checklists, setChecklists] = useState<any[]>([]);',
  'const checklists = React.useMemo(() => teamChecklists.find((c: any) => c.team === values.team)?.items || [], [teamChecklists, values.team]);'
);
fs.writeFileSync('src/pages/CampaignSetup.tsx', content);
