import fs from 'fs';
let content = fs.readFileSync('src/pages/Checklists.tsx', 'utf8');

// Update ChecklistItem interface
content = content.replace(
  `export interface ChecklistItem {
  id: string;
  text: string;
  stage?: number;
}`,
  `export interface ChecklistItem {
  id: string;
  text: string;
  stage?: number;
  requiresInput?: boolean;
  inputPlaceholder?: string;
}`
);

// Update state hooks
content = content.replace(
  `const [newItemStage, setNewItemStage] = useState<number>(0);`,
  `const [newItemStage, setNewItemStage] = useState<number>(0);
  const [newItemRequiresInput, setNewItemRequiresInput] = useState(false);
  const [newItemPlaceholder, setNewItemPlaceholder] = useState("");`
);

// Update handleAddItem
content = content.replace(
  `const newItem = { id: Date.now().toString(), text: newItemText.trim(), stage: newItemStage };`,
  `const newItem = { id: Date.now().toString(), text: newItemText.trim(), stage: newItemStage, requiresInput: newItemRequiresInput, inputPlaceholder: newItemPlaceholder };`
);

content = content.replace(
  `setNewItemText("");`,
  `setNewItemText("");
    setNewItemRequiresInput(false);
    setNewItemPlaceholder("");`
);

// Add fields to form
const formOld = `<form onSubmit={handleAddItem} className="flex gap-3">
              <Input 
                placeholder="New checkpoint text..." 
                value={newItemText}
                onChange={e => setNewItemText(e.target.value)}
                className="flex-1"
              />
              <select
                className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={newItemStage}
                onChange={e => setNewItemStage(Number(e.target.value))}
              >
                <option value={0}>All Stages</option>
                <option value={1}>Step 1: Details</option>
                <option value={2}>Step 2: Comparison</option>
                <option value={3}>Step 3: Tags</option>
                <option value={4}>Step 4: Links</option>
                <option value={5}>Step 5: Grammar</option>
                <option value={6}>Step 6: Review</option>
              </select>
              <Button type="submit" className="gap-2">
                <Plus className="w-4 h-4" /> Add Point
              </Button>
            </form>`;

const formNew = `<form onSubmit={handleAddItem} className="flex flex-col gap-3 border p-4 rounded-md border-slate-200">
              <div className="flex gap-3">
                <Input 
                  placeholder="New checkpoint text..." 
                  value={newItemText}
                  onChange={e => setNewItemText(e.target.value)}
                  className="flex-1"
                />
                <select
                  className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newItemStage}
                  onChange={e => setNewItemStage(Number(e.target.value))}
                >
                  <option value={0}>All Stages</option>
                  <option value={1}>Step 1: Details</option>
                  <option value={2}>Step 2: Comparison</option>
                  <option value={3}>Step 3: Tags</option>
                  <option value={4}>Step 4: Links</option>
                  <option value={5}>Step 5: Grammar</option>
                  <option value={6}>Step 6: Review</option>
                  <option value={7}>Step 7: Checklist (Final)</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={newItemRequiresInput} onChange={e => setNewItemRequiresInput(e.target.checked)} className="rounded text-indigo-600" />
                  Requires Text Input
                </label>
                {newItemRequiresInput && (
                  <Input 
                    placeholder="Input placeholder (e.g., Enter Campaign Name)" 
                    value={newItemPlaceholder}
                    onChange={e => setNewItemPlaceholder(e.target.value)}
                    className="flex-1"
                  />
                )}
                <Button type="submit" className="gap-2 ml-auto">
                  <Plus className="w-4 h-4" /> Add Point
                </Button>
              </div>
            </form>`;

content = content.replace(formOld, formNew);

// Add stage 7
content = content.replace(
  `<option value={6}>Step 6: Review</option>
                        </select>`,
  `<option value={6}>Step 6: Review</option>
                          <option value={7}>Step 7: Checklist</option>
                        </select>`
);

fs.writeFileSync('src/pages/Checklists.tsx', content);
console.log("Patched Checklists.tsx");
