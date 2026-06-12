"use client";

import { useEffect, useState } from "react";
import { getUsers, createUser, deleteUser, User } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { Trash2, UserPlus, Mail, Shield, ShieldAlert, Loader2, Search } from "lucide-react";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch users list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setSubmitError("Please fill in all fields.");
      return;
    }
    setSubmitError(null);
    setSubmitLoading(true);
    try {
      await createUser({ name, email, password });
      setName("");
      setEmail("");
      setPassword("");
      await loadUsers();
    } catch (e: any) {
      console.error(e);
      setSubmitError(e.message || "Failed to create user. Email may be already registered.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser?.id) {
      alert("You cannot delete your own logged-in account!");
      return;
    }
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      await deleteUser(id);
      await loadUsers();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to delete user.");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield size={28} className="text-violet-400" />
            User Management
          </h1>
          <p className="text-zinc-500 mt-1">Manage admin and marketer login credentials</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl text-amber-300 text-sm"
          style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Side: Create User Card */}
        <div className="xl:col-span-1">
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <UserPlus size={18} className="text-violet-400" />
              Add New User
            </h2>

            {submitError && (
              <div className="mb-4 p-3 rounded-xl text-red-400 text-xs"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {submitError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-2">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 focus:ring-violet-500"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@brand.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 focus:ring-violet-500"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-2">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 focus:ring-violet-500"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                />
              </div>

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
              >
                {submitLoading ? <Loader2 size={16} className="animate-spin" /> : "Register Marketer"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Users List */}
        <div className="xl:col-span-2">
          <div className="glass-card p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-lg font-bold text-white">Registered Accounts</h2>
              
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs text-white placeholder-zinc-600 outline-none focus:ring-1 focus:ring-violet-500"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-500 tracking-wider">
                    <th className="py-3 px-4">User Details</th>
                    <th className="py-3 px-4">Role / Status</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-zinc-500">
                        <Loader2 size={24} className="animate-spin mx-auto mb-2 text-violet-400" />
                        Fetching users...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-zinc-500">
                        No users found matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-semibold text-white">{u.name || "Unnamed User"}</p>
                            <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                              <Mail size={12} />
                              {u.email}
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`badge text-xs px-2 py-0.5 border ${
                            u.email === "admin@xeno.com"
                              ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                          }`}>
                            {u.email === "admin@xeno.com" ? "Super Admin" : "Marketer"}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs text-zinc-500">
                          {new Date(u.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={u.id === currentUser?.id}
                            className={`p-2 rounded-xl border text-zinc-500 hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/20 transition-all ${
                              u.id === currentUser?.id ? "opacity-35 cursor-not-allowed" : ""
                            }`}
                            style={{ borderColor: "rgba(255,255,255,0.04)" }}
                            title={u.id === currentUser?.id ? "Cannot delete yourself" : "Delete user account"}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
