"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Users, MapPin, ShoppingBag, IndianRupee, Tag } from "lucide-react";
import { getCustomers, Customer } from "@/lib/api";
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

  const CITIES = ["Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune", "Kolkata"];

  return (
    <div className="p-8 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Customers</h1>
          <p className="text-zinc-500 mt-1">
            {total.toLocaleString()} shoppers in your database
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 mb-6 flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm text-white placeholder-zinc-500 outline-none focus:ring-1 focus:ring-violet-500"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
        </div>
        <select
          value={city}
          onChange={e => setCity(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-violet-500"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <option value="">All Cities</option>
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={minSpend}
          onChange={e => setMinSpend(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm text-white outline-none focus:ring-1 focus:ring-violet-500"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <option value="">All Spend Levels</option>
          <option value="1000">₹1,000+</option>
          <option value="5000">₹5,000+</option>
          <option value="10000">₹10,000+</option>
          <option value="25000">₹25,000+</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {["Customer", "City", "Orders", "Total Spend", "Last Order", "Tags"].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(8).fill(0).map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {Array(6).fill(0).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 shimmer rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-zinc-500">
                  <Users size={40} className="mx-auto mb-3 text-zinc-700" />
                  No customers found
                </td>
              </tr>
            ) : (
              customers.map(c => (
                <tr key={c.id}
                  className="hover:bg-white/[0.02] transition-colors"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: `hsl(${c.name.charCodeAt(0) * 7 % 360}, 60%, 35%)` }}>
                        {c.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{c.name}</p>
                        <p className="text-xs text-zinc-500">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1 text-sm text-zinc-400">
                      <MapPin size={12} className="text-zinc-600" />
                      {c.city || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1 text-sm text-zinc-400">
                      <ShoppingBag size={12} className="text-zinc-600" />
                      {c.order_count}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-medium text-white">
                      {formatCurrency(c.total_spend)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-zinc-400">{daysAgo(c.last_order_at)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.slice(0, 2).map(t => (
                        <span key={t} className="badge"
                          style={{ background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)", fontSize: 10 }}>
                          {t}
                        </span>
                      ))}
                    </div>
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
