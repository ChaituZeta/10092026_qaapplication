import fs from 'fs';
let content = fs.readFileSync('src/pages/CampaignSetup.tsx', 'utf8');

const search = `                </Card>
              </>
            )}
            </div>
            {/* Checklist Sidebar */}`;

const replace = `                </Card>
              </>
            )}
              {currentStep === 7 && (
                <div className="bg-slate-50 min-h-full w-full">
                  <FinalChecklist checklists={checklists} answers={checklistAnswers} />
                </div>
              )}
            </div>
            {/* Checklist Sidebar */}`;

content = content.replace(search, replace);
fs.writeFileSync('src/pages/CampaignSetup.tsx', content);
console.log("Patched stage 7");
