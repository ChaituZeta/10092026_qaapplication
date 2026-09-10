import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing Supabase credentials.");
  process.exit(1);
}

async function seed() {
  console.log("Seeding checklists to Supabase via REST API (Relational)...");
  
  // Extract the raw object from TS file
  const code = fs.readFileSync('./lib/checklist-storage.ts', 'utf8');
  const match = code.match(/export const DEFAULT_PLATFORM_CHECKLISTS: TeamChecklist\[\] = (\[[\s\S]*?\]);\n/);
  if (!match) { console.error('not found'); process.exit(1); }

  // Use eval to parse the JS array exactly as JS engine would
  let DEFAULT_PLATFORM_CHECKLISTS;
  try {
    DEFAULT_PLATFORM_CHECKLISTS = eval(match[1]);
  } catch (e) {
    console.error("Failed to eval defaults:", e);
    process.exit(1);
  }
  
  for (const t of DEFAULT_PLATFORM_CHECKLISTS) {
    const templateId = t.id || `${t.team}-${t.name}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
    console.log(`Seeding template: ${templateId}...`);
    
    // Delete existing template
    const delUrl = `${url}/rest/v1/checklist_templates?id=eq.${encodeURIComponent(templateId)}`;
    await fetch(delUrl, {
      method: 'DELETE',
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    });
    
    // Insert template
    const templatePayload = { 
      id: templateId, 
      team: t.team, 
      name: t.name || 'Default Checklist'
    };
    
    const tRes = await fetch(`${url}/rest/v1/checklist_templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': 'Bearer ' + key, 'Prefer': 'return=minimal' },
      body: JSON.stringify(templatePayload)
    });
    
    if (tRes.ok) {
      console.log(`Successfully seeded template: ${t.name}`);
      
      if (t.items && t.items.length > 0) {
        const pointsPayload = t.items.map(p => ({
          id: p.id,
          template_id: templateId,
          text: p.text,
          stage: p.stage || 0,
          requires_input: p.requiresInput || false,
          input_placeholder: p.inputPlaceholder || null
        }));
        
        const pRes = await fetch(`${url}/rest/v1/checkpoints`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': 'Bearer ' + key, 'Prefer': 'return=minimal' },
          body: JSON.stringify(pointsPayload)
        });
        
        if (pRes.ok) {
          console.log(`  -> Seeded ${pointsPayload.length} checkpoints.`);
        } else {
          console.error(`  -> Failed to seed checkpoints:`, await pRes.text());
        }
      }
    } else {
      console.error(`Failed to seed template ${t.name}:`, await tRes.text());
    }
  }
}

seed().catch(console.error);
