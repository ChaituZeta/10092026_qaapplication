import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  `setUserRole(session.user?.user_metadata?.role || "user");`,
  `setUserRole(session.user?.email === "bchaithanyababu@gmail.com" ? "admin" : (session.user?.user_metadata?.role || "user"));`
);
content = content.replace(
  `setUserRole(session.user?.user_metadata?.role || "user");`,
  `setUserRole(session.user?.email === "bchaithanyababu@gmail.com" ? "admin" : (session.user?.user_metadata?.role || "user"));`
);

fs.writeFileSync('src/App.tsx', content);
console.log("Fixed admin role for specific user");
