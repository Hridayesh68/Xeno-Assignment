"use client";

import { useEffect, useState } from "react";
import { getUsers, createUser, deleteUser, User } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { Trash2, UserPlus, Mail, Shield, Loader2, Search, X } from "lucide-react";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form & Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      setIsModalOpen(false);
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
    <>
      <div className="p-8 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-base-content flex items-center gap-3">
            <Shield size={28} className="text-primary" />
            User Management
          </h1>
          <p className="text-base-content/60 mt-1">Manage admin and marketer login credentials</p>
        </div>
        <button
          onClick={() => {
            setSubmitError(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-primary-content bg-primary hover:opacity-90 transition-opacity"
        >
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl text-warning text-sm bg-warning/10 border border-warning/20">
          ⚠️ {error}
        </div>
      )}

      <div className="w-full">
        {/* Users List */}
        <div className="glass-card p-6 border border-base-content/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-base-content">Registered Accounts</h2>
            
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs text-base-content placeholder-base-content/40 outline-none focus:ring-1 focus:ring-primary bg-base-200 border border-base-content/10"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="table w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-base-content/10 text-xs uppercase text-base-content/50 tracking-wider">
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Role / Status</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-content/5 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-base-content/50">
                      <Loader2 size={24} className="animate-spin mx-auto mb-2 text-primary" />
                      Fetching users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-base-content/50">
                      No users found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-base-content/5 transition-colors">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-semibold text-base-content">{u.name || "Unnamed User"}</p>
                          <p className="text-xs text-base-content/60 flex items-center gap-1 mt-0.5">
                            <Mail size={12} />
                            {u.email}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`badge text-xs px-2 py-0.5 border ${
                          u.email === "admin@xeno.com"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-base-300 text-base-content border-base-content/20"
                        }`}>
                          {u.email === "admin@xeno.com" ? "Super Admin" : "Marketer"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-base-content/60">
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
                          className={`p-2 rounded-xl text-base-content/50 hover:text-error hover:bg-error/10 transition-colors ${
                            u.id === currentUser?.id ? "opacity-35 cursor-not-allowed" : ""
                          }`}
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

    {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-base-100 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-base-content/10 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-base-content/10">
              <h2 className="font-semibold text-lg text-base-content flex items-center gap-2">
                <UserPlus size={18} className="text-primary" />
                Add New User
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-base-content/50 hover:text-base-content hover:bg-base-content/10 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-4 space-y-4 overflow-y-auto">
              {submitError && (
                <div className="p-3 rounded-xl text-error text-xs bg-error/10 border border-error/20">
                  {submitError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-base-content/60 mb-2">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-base-content placeholder-base-content/40 outline-none focus:ring-1 focus:ring-primary bg-base-200 border border-base-content/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-base-content/60 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@brand.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-base-content placeholder-base-content/40 outline-none focus:ring-1 focus:ring-primary bg-base-200 border border-base-content/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-base-content/60 mb-2">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-base-content placeholder-base-content/40 outline-none focus:ring-1 focus:ring-primary bg-base-200 border border-base-content/10"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-base-content/70 hover:bg-base-content/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-primary-content bg-primary hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitLoading ? <Loader2 size={16} className="animate-spin" /> : "Register Marketer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

