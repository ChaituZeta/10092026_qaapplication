import React, { useState, useEffect, useMemo } from 'react';
import { 
  Mail, 
  Send, 
  Search, 
  Users, 
  Check, 
  Copy, 
  X, 
  ExternalLink, 
  CheckCircle2, 
  MessageSquare, 
  UserCheck, 
  Plus, 
  Building2, 
  ShieldCheck, 
  Sparkles,
  Info,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { logAction } from "@/lib/logger";

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role?: string;
  team?: string;
  status?: string;
}

interface SendApprovalEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignMeta: {
    campaignName?: string;
    team?: string;
    country?: string;
    versionName?: string;
    userEmail?: string;
    createdBy?: string;
    campaignStatus?: string;
    campaignId?: string;
  };
  onSentSuccess?: () => void;
}

export function SendApprovalEmailModal({
  isOpen,
  onClose,
  campaignMeta,
  onSentSuccess
}: SendApprovalEmailModalProps) {
  // Team selection & users state
  const campaignTeam = campaignMeta?.team || "HP-APJ";
  const [selectedTeam, setSelectedTeam] = useState<string>(campaignTeam);
  const [allUsers, setAllUsers] = useState<TeamUser[]>([]);
  const [availableTeams, setAvailableTeams] = useState<string[]>(["HP-APJ", "Zeta QA"]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<TeamUser | null>(null);

  // Email Fields
  const campaignName = campaignMeta?.campaignName || "Campaign Verification";
  const [subject, setSubject] = useState(`QA | ${campaignName}`);
  const [feedback, setFeedback] = useState("");
  
  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [customCcInput, setCustomCcInput] = useState("");
  const [showCcSelector, setShowCcSelector] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSubjectCopied, setIsSubjectCopied] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Determine Login User First Name
  const loginUserFirstName = useMemo(() => {
    const email = campaignMeta?.userEmail || "";
    if (campaignMeta?.createdBy && campaignMeta.createdBy.trim()) {
      return campaignMeta.createdBy.trim().split(/\s+/)[0];
    }
    if (email) {
      const uname = email.split("@")[0].toLowerCase();
      const clean = uname.replace(/[._-]/g, " ").trim();
      if (clean) return clean.charAt(0).toUpperCase() + clean.slice(1).split(/\s+/)[0];
    }
    return "QA Lead";
  }, [campaignMeta?.userEmail, campaignMeta?.createdBy]);

  const [senderFirstName, setSenderFirstName] = useState(loginUserFirstName);

  useEffect(() => {
    setSenderFirstName(loginUserFirstName);
  }, [loginUserFirstName]);

  // Update subject if campaign name changes
  useEffect(() => {
    setSubject(`QA | ${campaignName}`);
  }, [campaignName]);

  // Fetch Users & Teams
  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      let usersList: TeamUser[] = [];
      // 1. Try Supabase
      try {
        const { data, error } = await supabase.from('app_users').select('*').neq('status', 'banned');
        if (!error && data && data.length > 0) {
          usersList = data;
        }
      } catch (err) {}

      // 2. Try Server API
      if (usersList.length === 0) {
        try {
          const apiRes = await fetch('/api/app-users');
          if (apiRes.ok) {
            const json = await apiRes.json();
            if (json.users && Array.isArray(json.users) && json.users.length > 0) {
              usersList = json.users;
            }
          }
        } catch (e) {}
      }
      // Fetch complete
      if (isMounted) {
        setAllUsers(usersList);
        
        // Extract teams
        const teamsSet = new Set<string>(["HP-APJ", "Zeta QA"]);
        usersList.forEach(u => {
          if (u.team && u.team.trim()) teamsSet.add(u.team.trim());
        });
        setAvailableTeams(Array.from(teamsSet));

        // Auto-select first user of current team if none selected
        const teamUsers = usersList.filter(u => !selectedTeam || (u.team || "HP-APJ").toLowerCase() === selectedTeam.toLowerCase());
        if (teamUsers.length > 0 && !selectedUser) {
          // Prefer a user different from logged in user if possible, otherwise first user
          const otherUser = teamUsers.find(u => (u.email || "").toLowerCase() !== (campaignMeta?.userEmail || "").toLowerCase());
          setSelectedUser(otherUser || teamUsers[0]);
        }
      }
    };

    fetchUsers();
    return () => { isMounted = false; };
  }, [selectedTeam, campaignMeta?.userEmail]);

  // Filtered Users of selected team matching search query
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const matchTeam = !selectedTeam || selectedTeam === "ALL" || (u.team || "HP-APJ").toLowerCase() === selectedTeam.toLowerCase();
      if (!matchTeam) return false;

      if (!userSearchQuery.trim()) return true;
      const q = userSearchQuery.toLowerCase().trim();
      const matchName = (u.name || "").toLowerCase().includes(q);
      const matchEmail = (u.email || "").toLowerCase().includes(q);
      return matchName || matchEmail;
    });
  }, [allUsers, selectedTeam, userSearchQuery]);

  // Generate Email Body text
  const emailBodyText = useMemo(() => {
    const recipientName = selectedUser?.name || "<User Name>";
    const feedbackBlock = feedback.trim() 
      ? `\nFeedback / Notes:\n${feedback.trim()}\n` 
      : "";

    return `Hi ${recipientName},

CQA Approved!
Check list uploaded to OneDrive
${feedbackBlock}
Thanks!
${senderFirstName || "QA Lead"}`;
  }, [selectedUser, feedback, senderFirstName]);

  // Generate mailto and webmail URLs
  const mailtoLink = useMemo(() => {
    const to = selectedUser?.email || "";
    const cc = ccEmails.join(",");
    const encSub = encodeURIComponent(subject);
    const encBody = encodeURIComponent(emailBodyText);
    
    let url = `mailto:${to}?subject=${encSub}&body=${encBody}`;
    if (cc) {
      url += `&cc=${encodeURIComponent(cc)}`;
    }
    return url;
  }, [selectedUser, ccEmails, subject, emailBodyText]);

  const outlookWebLink = useMemo(() => {
    const to = selectedUser?.email || "";
    const cc = ccEmails.join(";");
    const encSub = encodeURIComponent(subject);
    const encBody = encodeURIComponent(emailBodyText);
    return `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&cc=${encodeURIComponent(cc)}&subject=${encSub}&body=${encBody}`;
  }, [selectedUser, ccEmails, subject, emailBodyText]);

  const gmailWebLink = useMemo(() => {
    const to = selectedUser?.email || "";
    const cc = ccEmails.join(",");
    const encSub = encodeURIComponent(subject);
    const encBody = encodeURIComponent(emailBodyText);
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&cc=${encodeURIComponent(cc)}&su=${encSub}&body=${encBody}`;
  }, [selectedUser, ccEmails, subject, emailBodyText]);

  const handleCopyBody = () => {
    navigator.clipboard.writeText(emailBodyText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopySubject = () => {
    navigator.clipboard.writeText(subject);
    setIsSubjectCopied(true);
    setTimeout(() => setIsSubjectCopied(false), 2000);
  };

  const handleAddCustomCc = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    const clean = customCcInput.trim().replace(/,/g, '');
    if (clean && clean.includes('@') && !ccEmails.includes(clean)) {
      setCcEmails([...ccEmails, clean]);
      setCustomCcInput("");
    }
  };

  const toggleCcUser = (email: string) => {
    if (ccEmails.includes(email)) {
      setCcEmails(ccEmails.filter(e => e !== email));
    } else {
      setCcEmails([...ccEmails, email]);
    }
  };

  const removeCc = (email: string) => {
    setCcEmails(ccEmails.filter(e => e !== email));
  };

  const handleLogAndSend = async () => {
    if (!selectedUser) return;
    setIsSending(true);
    setDispatchStatus(null);
    try {
      const response = await fetch('/api/send-approval-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedUser.email,
          cc: ccEmails.join(","),
          subject: subject,
          body: emailBodyText,
          senderEmail: campaignMeta?.userEmail
        })
      });

      if (!response.ok) {
        throw new Error("Failed to send email.");
      }

      logAction(
        campaignMeta?.userEmail || "qa@hp.com",
        "Approval Email Dispatched",
        `Sent CQA approval email for "${campaignName}" to ${selectedUser.name} <${selectedUser.email}>${ccEmails.length > 0 ? ` (CC: ${ccEmails.join(", ")})` : ""}${feedback ? `. Note: ${feedback}` : ""}`,
        campaignMeta?.campaignId
      ).catch(() => {});

      if (onSentSuccess) onSentSuccess();
      setDispatchStatus("Email sent successfully!");
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e) {
      setDispatchStatus("Error sending email. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs border border-white/20 flex items-center justify-center shadow-inner">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-blue-100">
                  Stage 7 • Final Approval
                </span>
                <span className="text-[11px] font-medium text-blue-200">
                  {campaignMeta?.team || "HP-APJ"}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Send QA Approval Email
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          
          {/* Main Grid: User Selection on Left, Email Draft on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Team & Recipient Selection (5 Cols) */}
            <div className="lg:col-span-5 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-200 pb-6 lg:pb-0 lg:pr-6">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    Select Team
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">Filter by workspace</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {availableTeams.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTeam(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        selectedTeam.toLowerCase() === t.toLowerCase()
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedTeam("ALL")}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedTeam === "ALL"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All Teams
                  </button>
                </div>
              </div>

              {/* User Search Input */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    Select Recipient <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
                  </span>
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by user name or email..."
                    className="w-full pl-8.5 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Users List Box */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 p-1">
                  {filteredUsers.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      <Users className="w-6 h-6 mx-auto mb-1 opacity-40" />
                      <p className="text-xs">No team users found matching "{userSearchQuery}"</p>
                    </div>
                  ) : (
                    filteredUsers.map(user => {
                      const isSelected = selectedUser?.email.toLowerCase() === user.email.toLowerCase();
                      const isCCed = ccEmails.includes(user.email);
                      return (
                        <div
                          key={user.id || user.email}
                          onClick={() => setSelectedUser(user)}
                          className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? "bg-blue-50 border border-blue-200 text-blue-900 shadow-xs"
                              : "hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-indigo-100 text-indigo-700 border border-indigo-200"
                            }`}>
                              {(user.name || user.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                                <span>{user.name || "Team Member"}</span>
                                {user.role === "admin" && (
                                  <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded">Admin</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono truncate">
                                {user.email}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            {isSelected && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                                <Check className="w-3 h-3" /> Selected
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* CC Quick Teammates Adder */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>CC Other Team Members</span>
                    {ccEmails.length > 0 && (
                      <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px]">
                        {ccEmails.length}
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCcSelector(!showCcSelector)}
                    className="text-[11px] text-blue-600 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    {showCcSelector ? "Hide quick CC" : "+ Pick from team"}
                  </button>
                </div>

                {showCcSelector && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 mb-2 max-h-32 overflow-y-auto space-y-1">
                    {allUsers.filter(u => u.email !== selectedUser?.email).map(u => {
                      const isCC = ccEmails.includes(u.email);
                      return (
                        <button
                          key={u.email}
                          type="button"
                          onClick={() => toggleCcUser(u.email)}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between transition-colors ${
                            isCC ? "bg-indigo-50 text-indigo-800 font-semibold" : "hover:bg-slate-200 text-slate-600"
                          }`}
                        >
                          <span className="truncate">{u.name} ({u.email})</span>
                          {isCC ? <Check className="w-3 h-3 text-indigo-600" /> : <Plus className="w-3 h-3 text-slate-400" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* CC Tags */}
                <div className="flex flex-wrap gap-1.5 min-h-[32px] p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                  {ccEmails.map(email => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 bg-white border border-slate-300 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-mono shadow-2xs"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeCc(email)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="email"
                    value={customCcInput}
                    onChange={(e) => setCustomCcInput(e.target.value)}
                    onKeyDown={handleAddCustomCc}
                    placeholder={ccEmails.length === 0 ? "Type email and press Enter to add CC..." : "Add another CC..."}
                    className="flex-1 min-w-[140px] bg-transparent text-xs focus:outline-none text-slate-800 placeholder-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Email Preview & Feedback Controls (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Subject line */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>Email Subject Line <span className="text-rose-500">*</span></span>
                  <button
                    type="button"
                    onClick={handleCopySubject}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {isSubjectCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    {isSubjectCopied ? "Subject Copied!" : "Copy Subject"}
                  </button>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              {/* Optional Feedback */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    Additional Feedback / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Will be appended inside the email</span>
                </label>
                <textarea
                  rows={2}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="e.g., Links validated against 2026 APJ matrix. Mobile responsive view verified."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white resize-none"
                />
              </div>

              {/* Sender Name config */}
              <div className="flex items-center justify-between text-[11px] bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                <span className="text-slate-600 font-medium">Signing off as (First Name):</span>
                <input
                  type="text"
                  value={senderFirstName}
                  onChange={(e) => setSenderFirstName(e.target.value)}
                  className="w-32 px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Formatted Email Live Preview Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Live Email Message Preview
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyBody}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {isCopied ? "Copied Email Text!" : "Copy Full Text"}
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl p-4 font-mono text-xs shadow-inner space-y-3 leading-relaxed">
                  <div className="text-slate-400 border-b border-slate-800 pb-2 text-[11px] space-y-1">
                    <div><span className="text-slate-500">To:</span> <span className="text-blue-400 font-semibold">{selectedUser ? `${selectedUser.name} <${selectedUser.email}>` : "[No user selected]"}</span></div>
                    {ccEmails.length > 0 && (
                      <div><span className="text-slate-500">CC:</span> <span className="text-indigo-300">{ccEmails.join(", ")}</span></div>
                    )}
                    <div><span className="text-slate-500">Subject:</span> <span className="text-amber-300 font-bold">{subject}</span></div>
                  </div>

                  {/* Body Rendering */}
                  <div className="whitespace-pre-wrap text-slate-200 font-sans text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                    {emailBodyText}
                  </div>
                </div>
              </div>

              {/* Status Message */}
              {dispatchStatus && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{dispatchStatus}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-slate-500 text-[11px] flex items-center gap-1.5 self-start sm:self-auto">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Opens your default desktop mail app (Outlook, Apple Mail) or webmail pre-filled.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-slate-700 border-slate-300 text-xs font-semibold px-4 cursor-pointer"
              disabled={isSending}
            >
              Cancel
            </Button>

            {/* Primary Action: Send Email via Platform API */}
            <Button
              type="button"
              onClick={handleLogAndSend}
              disabled={isSending || !selectedUser}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow-md"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Email Now</span>
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
