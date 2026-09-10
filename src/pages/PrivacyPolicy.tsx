import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock, FileText, CheckCircle, Database, Eye, RefreshCw, Mail, ExternalLink } from "lucide-react";

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Zeta Logo */}
            <svg
              width="111"
              height="34"
              viewBox="0 0 111 34"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 sm:h-8 w-auto"
            >
              <g clipPath="url(#clip0_zeta_privacy)">
                <path
                  d="M39.3468 10.5153H50.0685L39.2203 23.7249V27.1114L54.2662 27.0874L55.6569 23.7009L44.7329 23.7249L55.6569 10.4673V7.12885L40.7376 7.15286L39.3468 10.5153ZM73.2315 10.5153L74.6476 7.12885H58.565V24.5415C58.565 25.6943 58.8178 26.0066 59.3236 26.4869C59.9558 26.9673 60.3351 27.0874 61.5741 27.0633H73.2062L74.5464 23.7249H62.7626V18.6092H67.8706L69.2867 15.1987H62.7879V10.5153H73.2315ZM103.02 8.83409C102.514 7.7533 101.629 7.15286 100.365 7.15286H98.468L90.2497 27.1114H94.5485L96.445 22.428H104.309L106.206 27.1114H110.505L103.02 8.83409ZM97.5577 19.0415L100.466 11.8363L103.247 19.0415H97.5577ZM95.1554 7.12885H77.505L76.1142 10.4673H83.1693V27.0633H87.19V10.4673H93.7393L95.1554 7.12885Z"
                  fill="#0E1626"
                />
                <path
                  d="M15.3998 25.9585L14.4642 21.8996L8.14242 17.0721H0.531006L12.2895 26.0306L13.9837 33.5721L33.5307 17.0721H25.9192L15.3998 25.9585Z"
                  fill="url(#paint1_linear_zeta_p)"
                />
                <path
                  d="M18.6619 8.18562L19.5722 12.2446L25.9192 17.0721H33.5307L21.7722 8.11357L20.0526 0.572083L0.531006 17.0721H8.14242L18.6619 8.18562Z"
                  fill="url(#paint2_linear_zeta_p)"
                />
              </g>
              <defs>
                <linearGradient id="paint1_linear_zeta_p" x1="33.5348" y1="25.3221" x2="0.535129" y2="25.3221" gradientUnits="userSpaceOnUse">
                  <stop offset="0.3987" stopColor="#3b82f6" />
                  <stop offset="1" stopColor="#60a5fa" />
                </linearGradient>
                <linearGradient id="paint2_linear_zeta_p" x1="0.535153" y1="8.82208" x2="33.5348" y2="8.82208" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#00C2FF" />
                  <stop offset="0.5398" stopColor="#BC2676" />
                  <stop offset="0.8568" stopColor="#FFFB6A" />
                </linearGradient>
                <clipPath id="clip0_zeta_privacy">
                  <rect width="110.833" height="33" fill="white" transform="translate(0 0.5)" />
                </clipPath>
              </defs>
            </svg>
            <div className="h-5 w-[1.5px] bg-slate-300 mx-0.5" />
            <div className="flex flex-col justify-center text-left">
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-900 leading-none">
                Campaign
              </span>
              <span className="text-[9px] font-medium text-slate-500 tracking-wide leading-tight">
                QA Operations
              </span>
            </div>
          </div>

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:text-[#306de4] hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Title Header */}
        <div className="mb-10 text-left border-b border-slate-200 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#306de4] text-xs font-semibold mb-3 border border-blue-100">
            <Shield className="w-3.5 h-3.5" />
            <span>HP APJ &amp; Zeta Global Security &amp; Compliance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Last Updated: January 2026 &bull; Effective Date: January 1, 2026
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-8 text-sm leading-relaxed text-slate-600">
          {/* Section 1 */}
          <section className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3 mb-4 text-slate-900">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#306de4] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">1. Overview and Scope</h2>
            </div>
            <p className="mb-3">
              This Privacy Policy explains how Zeta Global (&quot;Zeta&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and safeguards information processed through the <strong>HP APJ Email Quality Assurance (QA) Operations Platform</strong> (the &quot;Platform&quot;).
            </p>
            <p>
              The Platform is an enterprise-grade automated testing, validation, and sign-off system operated specifically for Hewlett Packard (HP) Asia-Pacific &amp; Japan marketing teams and accredited Zeta Global QA engineers.
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3 mb-4 text-slate-900">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">2. Information We Collect and Process</h2>
            </div>
            <p className="mb-3">
              In providing automated campaign validation and workflow management services, the Platform handles the following categories of information:
            </p>
            <ul className="list-disc pl-5 space-y-2 mb-3">
              <li>
                <strong>User Authentication &amp; Profile Data:</strong> Name, enterprise email address, department/team designation, assigned user role (e.g., Administrator, Reviewer, QA Engineer), and authentication session tokens.
              </li>
              <li>
                <strong>Campaign &amp; Asset Content:</strong> Marketing email HTML templates, subject lines, preheaders, creative assets, tracking parameters, UTM codes, and landing page URLs submitted for verification.
              </li>
              <li>
                <strong>Quality Assurance Audit Telemetry:</strong> Checkpoint results across the 22 automated validations (such as link health, image rendering dimensions, legal disclaimers, and SFMC tag compliance), execution timestamps, sign-off logs, and approval notes.
              </li>
              <li>
                <strong>System Logs:</strong> Device and browser metadata, IP addresses, access timestamps, and error diagnostic logs necessary for security auditing and uptime maintenance.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3 mb-4 text-slate-900">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">3. How We Use Information</h2>
            </div>
            <p className="mb-3">
              All processed data is utilized strictly for executing and improving quality assurance operations:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-1">Automated Validation</h3>
                <p className="text-xs text-slate-500">
                  Executing rigorous link checking, syntax parsing, and visual rendering analysis to prevent broken campaigns.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-1">Workflow Approvals</h3>
                <p className="text-xs text-slate-500">
                  Tracking reviewer sign-offs, issue resolution status, and sign-off accountability across HP APJ stakeholders.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-1">Enterprise Security</h3>
                <p className="text-xs text-slate-500">
                  Enforcing role-based access control (RBAC), verifying active sessions, and preventing unauthorized campaign disclosures.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <h3 className="font-semibold text-slate-900 mb-1">Compliance Reporting</h3>
                <p className="text-xs text-slate-500">
                  Generating auditable test reports and proof logs documenting HP brand and legal compliance prior to deployment.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3 mb-4 text-slate-900">
              <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">4. Data Protection and Security Controls</h2>
            </div>
            <p className="mb-3">
              We employ enterprise-grade administrative, technical, and physical safeguards designed to protect campaign content and user credentials against unauthorized access, loss, or alteration:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Encryption in Transit &amp; At Rest:</strong> All web traffic is encrypted using TLS 1.3. Database storage utilizes AES-256 encryption.
              </li>
              <li>
                <strong>Strict Role-Based Access:</strong> Access to campaign data is restricted based on authenticated identity, enterprise domain, and approved operational permissions.
              </li>
              <li>
                <strong>Automated Session Inactivity Protection:</strong> Active sessions are automatically protected by timed inactivity locks and prompt re-authentication timeouts.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3 mb-4 text-slate-900">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">5. Cookies and Local Storage</h2>
            </div>
            <p className="mb-3">
              The Platform uses essential browser storage mechanisms (sessionStorage, localStorage, and secure HTTP cookies) solely to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Maintain active login authentication state and prevent repetitive sign-ins.</li>
              <li>Store user interface preferences (such as collapsed navigation and dark/light theme).</li>
              <li>Cache offline draft validations during intermittent network connectivity.</li>
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              We do not use third-party advertising tracking or behavioral cross-site trackers on this Platform.
            </p>
          </section>

          {/* Section 6 */}
          <section className="bg-white rounded-xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3 mb-4 text-slate-900">
              <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">6. Contact and Data Subject Inquiries</h2>
            </div>
            <p className="mb-4">
              If you have any questions about this Privacy Policy, your account permissions, or wish to request data access or correction, please reach out to the dedicated operations administration team:
            </p>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">Zeta Global &bull; HP APJ QA Operations</p>
                <p className="text-xs text-slate-500">Global Privacy &amp; Data Protection Office</p>
                <a
                  href="mailto:privacy@zetaglobal.com"
                  className="text-xs text-[#306de4] hover:underline font-medium mt-1 inline-block"
                >
                  privacy@zetaglobal.com
                </a>
              </div>
              <a
                href="https://zetaglobal.com/privacy-policy/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 underline"
              >
                <span>Full Zeta Corporate Privacy Policy</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; 2001 &ndash; 2026 ZETA. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-slate-800 transition-colors">
              Sign In
            </Link>
            <span>&bull;</span>
            <a
              href="https://zetaglobal.com/terms-of-use/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-800 transition-colors"
            >
              Terms of Use
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PrivacyPolicy;
