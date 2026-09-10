import { Project, SyntaxKind } from "ts-morph";
import * as fs from "fs";
import * as path from "path";

const project = new Project();
const sourceFile = project.addSourceFileAtPath(path.join(process.cwd(), "server.ts"));

const apiDir = path.join(process.cwd(), "api");
const routesDir = path.join(apiDir, "routes");

if (!fs.existsSync(routesDir)) {
    fs.mkdirSync(routesDir, { recursive: true });
}

// Map endpoints to routers
const routeMappings = [
    { prefix: "/api/campaigns", routerName: "campaignsRouter", file: "campaigns.ts" },
    { prefix: "/api/folders", routerName: "foldersRouter", file: "folders.ts" },
    { prefix: "/api/activity-logs", routerName: "miscRouter", file: "misc.ts" },
    { prefix: "/api/checklists", routerName: "miscRouter", file: "misc.ts" },
    { prefix: "/api/countries", routerName: "miscRouter", file: "misc.ts" },
    { prefix: "/api/invite", routerName: "usersRouter", file: "users.ts" },
    { prefix: "/api/session", routerName: "usersRouter", file: "users.ts" },
    { prefix: "/api/app-users", routerName: "usersRouter", file: "users.ts" },
    { prefix: "/api/forgot-password", routerName: "emailsRouter", file: "emails.ts" },
    { prefix: "/api/send-password-setup", routerName: "emailsRouter", file: "emails.ts" },
    { prefix: "/api/send-approval-email", routerName: "emailsRouter", file: "emails.ts" },
    { prefix: "/api/supabase-config", routerName: "settingsRouter", file: "settings.ts" },
    { prefix: "/api/save-supabase-config", routerName: "settingsRouter", file: "settings.ts" },
    { prefix: "/api/test-db-connection", routerName: "settingsRouter", file: "settings.ts" },
    { prefix: "/api/export-migration-data", routerName: "settingsRouter", file: "settings.ts" },
    { prefix: "/api/import-migration-data", routerName: "settingsRouter", file: "settings.ts" },
    { prefix: "/api/app-settings", routerName: "settingsRouter", file: "settings.ts" },
    { prefix: "/api/ai-agents", routerName: "aiRouter", file: "ai.ts" },
    { prefix: "/api/run-ai-qa", routerName: "aiRouter", file: "ai.ts" },
    { prefix: "/api/models", routerName: "aiRouter", file: "ai.ts" },
    { prefix: "/api/agents/chat", routerName: "aiRouter", file: "ai.ts" },
    { prefix: "/api/grammar-check", routerName: "aiRouter", file: "ai.ts" },
    { prefix: "/api/proxy", routerName: "miscRouter", file: "misc.ts" },
    { prefix: "/api/check-url", routerName: "miscRouter", file: "misc.ts" }
];

const routers = new Map<string, string[]>();
routeMappings.forEach(r => routers.set(r.file, []));

const statements = sourceFile.getStatements();
const toRemove = [];

for (const stmt of statements) {
    if (stmt.getKind() === SyntaxKind.ExpressionStatement) {
        const text = stmt.getText();
        if (text.startsWith("app.get(") || text.startsWith("app.post(") || text.startsWith("app.put(") || text.startsWith("app.delete(")) {
            // Find the route mapping
            const match = routeMappings.find(r => text.includes(`"${r.prefix}`) || text.includes(`'${r.prefix}`));
            if (match) {
                // Change app.get to router.get
                let modifiedText = text.replace(/^app\./, "router.");
                routers.get(match.file)?.push(modifiedText);
                toRemove.push(stmt);
            } else if (!text.includes("*")) {
                console.log("Unmatched route: " + text.substring(0, 50));
            }
        }
    }
}

// Generate the route files
routers.forEach((routes, file) => {
    if (routes.length === 0) return;
    
    let imports = `import { Router } from "express";\nimport { getCurrentAppState, saveAppState } from "../utils/state";\nimport { getSupabaseServiceKey, getSupabaseUrl, getSupabaseAnonKey } from "../utils/db";\nimport nodemailer from "nodemailer";\nimport { emailTemplate, escapeHtml, isPrivateOrInternalUrl } from "../utils/helpers";\n\n`;
    
    let content = imports + `export const router = Router();\n\n` + routes.join("\n\n") + `\n`;
    fs.writeFileSync(path.join(routesDir, file), content);
});

// Remove extracted routes from server.ts
toRemove.forEach(stmt => stmt.remove());

// Add router imports and setup
let importStatements = `
import { router as campaignsRouter } from "./api/routes/campaigns";
import { router as foldersRouter } from "./api/routes/folders";
import { router as miscRouter } from "./api/routes/misc";
import { router as usersRouter } from "./api/routes/users";
import { router as emailsRouter } from "./api/routes/emails";
import { router as settingsRouter } from "./api/routes/settings";
import { router as aiRouter } from "./api/routes/ai";
`;

let useStatements = `
app.use(campaignsRouter);
app.use(foldersRouter);
app.use(miscRouter);
app.use(usersRouter);
app.use(emailsRouter);
app.use(settingsRouter);
app.use(aiRouter);
`;

// Insert the new imports after express import
sourceFile.insertStatements(1, importStatements);

// Insert app.use before app.get("*")
const catchAll = sourceFile.getStatements().find(s => s.getText().includes("app.get(\"*\""));
if (catchAll) {
    sourceFile.insertStatements(catchAll.getChildIndex(), useStatements);
} else {
    sourceFile.addStatements(useStatements);
}

// Save modified server.ts
sourceFile.saveSync();
console.log("Refactoring complete.");
