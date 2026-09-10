import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const serverRoutes = path.join(rootDir, "server", "routes");
const apiRoutes = path.join(rootDir, "api", "routes");
const serverUtils = path.join(rootDir, "server", "utils");
const apiUtils = path.join(rootDir, "api", "utils");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Ensure server/routes and api/routes exist and are synchronized
if (fs.existsSync(serverRoutes)) {
  copyDir(serverRoutes, apiRoutes);
}
if (fs.existsSync(apiRoutes)) {
  copyDir(apiRoutes, serverRoutes);
}

// 2. Ensure server/utils and api/utils exist and are synchronized
if (fs.existsSync(serverUtils)) {
  copyDir(serverUtils, apiUtils);
}
if (fs.existsSync(apiUtils)) {
  copyDir(apiUtils, serverUtils);
}

// 3. Ensure index.ts exists in both routes directories
const routeIndexContent = `export { router as campaignsRouter, default as campaigns } from "./campaigns";
export { router as foldersRouter, default as folders } from "./folders";
export { router as miscRouter, default as misc } from "./misc";
export { router as usersRouter, default as users } from "./users";
export { router as emailsRouter, default as emails } from "./emails";
export { router as settingsRouter, default as settings } from "./settings";
export { router as aiRouter, default as ai } from "./ai";
`;

if (fs.existsSync(serverRoutes)) {
  fs.writeFileSync(path.join(serverRoutes, "index.ts"), routeIndexContent, "utf8");
}
if (fs.existsSync(apiRoutes)) {
  fs.writeFileSync(path.join(apiRoutes, "index.ts"), routeIndexContent, "utf8");
}

console.log("✓ Routes and utilities synchronized successfully for build.");
process.exit(0);
