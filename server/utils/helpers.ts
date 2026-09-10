export const escapeHtml = (str: string = "") => {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

export const isPrivateOrInternalUrl = (urlStr: string): boolean => {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return true;
    }
    const hostname = parsed.hostname.toLowerCase();
    
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname === "169.254.169.254" ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".local")
    ) {
      return true;
    }

    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const [, p1, p2] = match.map(Number);
      if (
        p1 === 10 ||
        (p1 === 172 && p2 >= 16 && p2 <= 31) ||
        (p1 === 192 && p2 === 168) ||
        (p1 === 169 && p2 === 254) ||
        p1 === 127 ||
        p1 === 0
      ) {
        return true;
      }
    }

    return false;
  } catch {
    return true; 
  }
};

export const emailTemplate = (title: string, content: string, ctaLink?: string, ctaText?: string) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0; }
  .header { padding: 32px; text-align: center; border-bottom: 1px solid #f1f5f9; }
  .logo { max-height: 36px; margin-bottom: 24px; }
  .title { color: #0f172a; font-size: 24px; font-weight: 600; margin: 0; letter-spacing: -0.025em; }
  .content { padding: 32px; color: #334155; font-size: 16px; line-height: 1.6; }
  .content p { margin-top: 0; margin-bottom: 16px; }
  .content strong { color: #0f172a; font-weight: 600; }
  .details-box { background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0; border: 1px solid #e2e8f0; }
  .button-container { text-align: center; margin: 32px 0 16px; }
  .button { display: inline-block; padding: 12px 28px; background-color: #2b61d6; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; transition: background-color 0.2s; }
  .footer { background-color: #f8fafc; padding: 24px 32px; text-align: center; color: #64748b; font-size: 13px; line-height: 1.5; border-top: 1px solid #e2e8f0; }
  .footer p { margin: 0; margin-bottom: 8px; }
  .footer p:last-child { margin-bottom: 0; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://zetaglobal.com/wp-content/uploads/2023/02/zeta_logoPrimary.svg" alt="Zeta Global" class="logo" />
      <h1 class="title">\${escapeHtml(title)}</h1>
    </div>
    <div class="content">
      \${content}
      \${ctaLink && ctaText ? \`
      <div class="button-container">
        <a href="\${escapeHtml(ctaLink)}" class="button">\${escapeHtml(ctaText)}</a>
      </div>
      \` : ''}
    </div>
    <div class="footer">
      <p>&copy; \${new Date().getFullYear()} Zeta Global. All rights reserved.</p>
      <p>HP-QA Platform Automation System</p>
    </div>
  </div>
</body>
</html>
`;
