"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Users, MapPin, ShoppingBag, IndianRupee, Tag, Trash2 } from "lucide-react";
import { getCustomers, deleteCustomer, Customer } from "@/lib/api";
import { formatCurrency, formatDate, daysAgo, cn } from "@/lib/utils";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [minSpend, setMinSpend] = useState("");
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCustomers({
        limit: 100,
        search: search || undefined,
        city: city || undefined,
        min_spend: minSpend ? Number(minSpend) : undefined,
      });
      setCustomers(data);
      setTotal(data.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, city, minSpend]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete customer "${name}" and all associated orders/communications?`)) return;
    try {
      await deleteCustomer(id);
      await load();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to delete customer.");
    }
  };

  const CITIES = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune", "Kolkata"];

  return (
    <div className="p-8 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-base-content">Customers</h1>
          <p className="text-base-content/60 mt-1">
            {total.toLocaleString()} shoppers in your database
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6 flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm text-base-content placeholder-base-content/40 outline-none focus:ring-1 focus:ring-primary bg-base-200 border border-base-content/10"
          />
        </div>
        <select
          value={city}
          onChange={e => setCity(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-base-content bg-base-200 border border-base-content/10 outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="" className="bg-base-200 text-base-content">All Cities</option>
          {CITIES.map(c => <option key={c} value={c} className="bg-base-200 text-base-content">{c}</option>)}
        </select>
        <select
          value={minSpend}
          onChange={e => setMinSpend(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-base-content bg-base-200 border border-base-content/10 outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="" className="bg-base-200 text-base-content">All Spend Levels</option>
          <option value="1000" className="bg-base-200 text-base-content">₹1,000+</option>
          <option value="5000" className="bg-base-200 text-base-content">₹5,000+</option>
          <option value="10000" className="bg-base-200 text-base-content">₹10,000+</option>
          <option value="25000" className="bg-base-200 text-base-content">₹25,000+</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-base-content/10">
              {["Customer", "City", "Orders", "Total Spend", "Last Order", "Tags", "Actions"].map(h => (
                <th key={h} className={`px-5 py-3 text-xs font-bold text-base-content/60 uppercase tracking-wider ${h === "Actions" ? "text-right" : "text-left"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <tr key={i} className="border-b border-base-content/5">
                  {Array(7).fill(0).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 shimmer rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-base-content/50">
                  <Users size={40} className="mx-auto mb-3 text-base-content/30" />
                  No customers found
                </td>
              </tr>
            ) : (
              customers.map(c => (
                <tr key={c.id}
                  className="hover:bg-base-content/5 transition-colors border-b border-base-content/5">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                        style={{ background: `hsl(${c.name.charCodeAt(0) * 7 % 360}, 60%, 35%)` }}>
                        {c.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-base-content">{c.name}</p>
                        <p className="text-xs text-base-content/60">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1 text-sm text-base-content/70">
                      <MapPin size={12} className="text-base-content/40" />
                      {c.city || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1 text-sm text-base-content/70">
                      <ShoppingBag size={12} className="text-base-content/40" />
                      {c.order_count}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-semibold text-base-content">
                      {formatCurrency(c.total_spend)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-base-content/70">{daysAgo(c.last_order_at)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.slice(0, 2).map(t => (
                        <span key={t} className="badge bg-secondary/10 text-secondary border border-secondary/25 text-[10px]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="p-1.5 rounded-lg text-base-content/50 hover:text-error hover:bg-error/10 transition-colors"
                      title="Delete shopper profile"
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
  );
}
