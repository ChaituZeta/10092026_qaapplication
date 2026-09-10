import fs from 'fs';
let content = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

const navItemsStr = `const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Campaigns", href: "/campaigns", icon: FileText },
  { name: "Reports", href: "/reports", icon: BarChart2 },
  { name: "User Management", href: "/users", icon: Users, adminOnly: true },
  { name: "Settings", href: "/settings", icon: Settings, adminOnly: true },
];`;

const newNavItemsStr = `const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Campaigns", href: "/campaigns", icon: FileText },
  { name: "Reports", href: "/reports", icon: BarChart2 },
  { name: "Checklists", href: "/checklists", icon: CheckSquare, adminOnly: true },
  { name: "User Management", href: "/users", icon: Users, adminOnly: true },
  { name: "Settings", href: "/settings", icon: Settings, adminOnly: true },
];`;

content = content.replace(navItemsStr, newNavItemsStr);
fs.writeFileSync('src/components/layout/Sidebar.tsx', content);
console.log("Fixed sidebar nav items");
