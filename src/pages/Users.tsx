import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Users, UserPlus, Search, Shield, User, Mail, Building2, 
  Trash2, Edit2, CheckCircle2, XCircle, RefreshCw, Send, AlertTriangle, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface AppUser {
  id?: string;
  name: string;
  email: string;
  role: "admin" | "user";
  team: string;
  status: "active" | "banned" | "pending";
  last_login?: string;
  created_at?: string;
}

export function UsersList({ role, userEmail }: { role: string; userEmail?: string }) {
  const isAdmin = role === "admin";
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "user">("user");
  const [inviteTeam, setInviteTeam] = useState("HP-APJ");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit User State
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Try fetching from Supabase
      const { data: dbUsers, error } = await supabase
        .from("app_users")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(dbUsers) && dbUsers.length > 0) {
        setUsers(dbUsers);
      } else {
        // Fallback to server API
        const response = await fetch("/api/app-users");
        if (response.ok) {
          const json = await response.json();
          setUsers(json.users || []);
        }
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setModalMessage({ type: "error", text: "Please provide both name and email." });
      return;
    }

    setIsSendingInvite(true);
    setModalMessage(null);

    const cleanEmail = inviteEmail.trim().toLowerCase();
    const newUser: AppUser = {
      name: inviteName.trim(),
      email: cleanEmail,
      role: inviteRole,
      team: inviteTeam,
      status: "active",
      last_login: "Never",
      created_at: new Date().toISOString()
    };

    try {
      // 1. Save to DB / Local State
      try {
        await supabase.from("app_users").upsert(newUser, { onConflict: "email" });
      } catch (err) {}

      // 2. Notify API
      await fetch("/api/app-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: newUser })
      });

      // 3. Send email invitation
      const inviteUrl = `${window.location.origin}/signup?email=${encodeURIComponent(cleanEmail)}`;
      try {
        await fetch("/api/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            team: newUser.team,
            inviteUrl
          })
        });
      } catch (emailErr) {
        console.warn("Email invite sending notice:", emailErr);
      }

      setModalMessage({ type: "success", text: "User invited successfully!" });
      setTimeout(() => {
        setShowInviteModal(false);
        setInviteName("");
        setInviteEmail("");
        setModalMessage(null);
        fetchUsers();
      }, 1000);
    } catch (err: any) {
      setModalMessage({ type: "error", text: err.message || "Failed to invite user." });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsUpdating(true);
    try {
      // 1. Update Supabase
      if (editingUser.id) {
        await supabase.from("app_users").update(editingUser).eq("id", editingUser.id);
      } else {
        await supabase.from("app_users").update(editingUser).eq("email", editingUser.email);
      }

      // 2. Update Server State
      await fetch("/api/app-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: editingUser })
      });

      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error("Failed to update user:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (userToDelete: AppUser) => {
    if (!window.confirm(`Are you sure you want to remove ${userToDelete.name || userToDelete.email}?`)) {
      return;
    }

    try {
      if (userToDelete.id) {
        await supabase.from("app_users").delete().eq("id", userToDelete.id);
      } else {
        await supabase.from("app_users").delete().eq("email", userToDelete.email);
      }

      await fetch("/api/app-users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userToDelete.id, email: userToDelete.email })
      });

      setUsers(prev => prev.filter(u => u.email !== userToDelete.email));
    } catch (err) {
      console.error("Failed to delete user:", err);
    }
  };

  const handleToggleBan = async (u: AppUser) => {
    const newStatus = u.status === "banned" ? "active" : "banned";
    const updated = { ...u, status: newStatus as any };

    try {
      if (u.id) {
        await supabase.from("app_users").update({ status: newStatus }).eq("id", u.id);
      } else {
        await supabase.from("app_users").update({ status: newStatus }).eq("email", u.email);
      }

      await fetch("/api/app-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: updated })
      });

      setUsers(prev => prev.map(item => item.email === u.email ? updated : item));
    } catch (e) {
      console.error("Failed to toggle status:", e);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeam = teamFilter === "all" || u.team === teamFilter;
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesTeam && matchesRole;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#2b61d6]" />
            User Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage team members, roles, permissions, and platform invitations
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              className="gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setShowInviteModal(true)}
              className="gap-1.5 bg-[#2b61d6] hover:bg-[#2250b8] text-white text-xs font-semibold shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Invite Member
            </Button>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <Card className="shadow-xs border-slate-200">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-300 text-xs text-slate-700 bg-white"
            >
              <option value="all">All Teams</option>
              <option value="HP-APJ">HP-APJ</option>
              <option value="HP-EMEA">HP-EMEA</option>
              <option value="HP-AMS">HP-AMS</option>
              <option value="Cheetah Digital">Cheetah Digital</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-300 text-xs text-slate-700 bg-white"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="user">QA Users</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="shadow-xs border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Team</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Last Active</th>
                {isAdmin && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No users found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, i) => (
                  <tr key={u.email || i} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 uppercase text-xs">
                          {u.name ? u.name.charAt(0) : u.email.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{u.name || "Unnamed User"}</p>
                          <p className="text-slate-500 text-[11px]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {u.team || "HP-APJ"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                          <User className="w-3 h-3" /> QA Analyst
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {u.status === "banned" ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px] font-semibold">
                          <XCircle className="w-3 h-3" /> Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {u.last_login ? (
                        u.last_login === "Never" ? "Never" : new Date(u.last_login).toLocaleDateString()
                      ) : "Never"}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => setEditingUser(u)}
                          className="p-1.5 text-slate-400 hover:text-[#2b61d6] hover:bg-slate-100 rounded transition-colors"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleBan(u)}
                          className={`p-1.5 rounded transition-colors ${
                            u.status === "banned"
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-amber-600 hover:bg-amber-50"
                          }`}
                          title={u.status === "banned" ? "Unban User" : "Suspend User"}
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#2b61d6]" />
              Invite Team Member
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Send an email invitation and grant QA platform access.
            </p>

            {modalMessage && (
              <div
                className={`mt-4 p-3 rounded-lg text-xs font-medium ${
                  modalMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {modalMessage.text}
              </div>
            )}

            <form onSubmit={handleSendInvite} className="mt-4 space-y-3.5">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Full Name</Label>
                <Input
                  required
                  placeholder="e.g. John Smith"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Email Address</Label>
                <Input
                  type="email"
                  required
                  placeholder="john.smith@hp.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Team / Region</Label>
                  <select
                    value={inviteTeam}
                    onChange={(e) => setInviteTeam(e.target.value)}
                    className="mt-1 flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-xs"
                  >
                    <option value="HP-APJ">HP-APJ</option>
                    <option value="HP-EMEA">HP-EMEA</option>
                    <option value="HP-AMS">HP-AMS</option>
                    <option value="Cheetah Digital">Cheetah Digital</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Account Role</Label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="mt-1 flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-xs"
                  >
                    <option value="user">QA User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteModal(false)}
                  disabled={isSendingInvite}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSendingInvite}
                  className="bg-[#2b61d6] hover:bg-[#2250b8] text-white"
                >
                  {isSendingInvite ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[#2b61d6]" />
              Edit User: {editingUser.email}
            </h3>

            <form onSubmit={handleSaveEditUser} className="mt-4 space-y-3.5">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Full Name</Label>
                <Input
                  required
                  value={editingUser.name || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Team / Region</Label>
                  <select
                    value={editingUser.team}
                    onChange={(e) => setEditingUser({ ...editingUser, team: e.target.value })}
                    className="mt-1 flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-xs"
                  >
                    <option value="HP-APJ">HP-APJ</option>
                    <option value="HP-EMEA">HP-EMEA</option>
                    <option value="HP-AMS">HP-AMS</option>
                    <option value="Cheetah Digital">Cheetah Digital</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Account Role</Label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    className="mt-1 flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-xs"
                  >
                    <option value="user">QA User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Account Status</Label>
                <select
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                  className="mt-1 flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs shadow-xs"
                >
                  <option value="active">Active</option>
                  <option value="banned">Suspended / Banned</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingUser(null)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isUpdating}
                  className="bg-[#2b61d6] hover:bg-[#2250b8] text-white"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default UsersList;
