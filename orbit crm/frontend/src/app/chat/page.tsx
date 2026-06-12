"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Send, Bot, User, Loader2, Sparkles, Database, Users, Megaphone, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Shield, Trash2
} from "lucide-react";
import { aiChat, ChatMessage } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

interface ExtendedMessage extends ChatMessage {
  agent_logs?: any[];
}

const SUGGESTIONS = [
  "How many customers are in Bangalore?",
  "List our top 5 highest spending customers.",
  "Create a segment for customers who spent over ₹5000",
  "Show our recent campaigns and their delivery rates."
];

export default function ChatPage() {
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<ExtendedMessage[]>([
    {
      role: "assistant",
      content: "Hello! I am Xeno AI, your marketing copilot. I can query customer data, help you build targeted segments, and draft campaigns. What would you like to do today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentLogs, setCurrentLogs] = useState<any[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, currentLogs]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;
    
    const userMsg: ExtendedMessage = { role: "user", content: textToSend };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setCurrentLogs([]);

    try {
      // Keep only user/assistant messages for context limit
      const contextMessages = updatedMessages.map(m => ({
        role: m.role,
        content: m.content,
        tool_calls: m.tool_calls,
        tool_call_id: m.tool_call_id
      }));

      const res = await aiChat(contextMessages);
      
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: res.content,
          agent_logs: res.agent_logs
        }
      ]);
    } catch (e: any) {
      console.error(e);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Error communicating with Xeno Agent: ${e.message || "Unknown error"}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleLogs = (idx: number) => {
    setExpandedLogs(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getChartConfig = (result: any) => {
    if (!result || !result.columns || !result.rows || result.rows.length === 0) return null;
    
    // Find category key (first string column)
    let categoryKey = "";
    const numericKeys: string[] = [];
    
    const sample = result.rows[0];
    result.columns.forEach((col: string) => {
      const val = sample[col];
      if (typeof val === "number") {
        numericKeys.push(col);
      } else if (typeof val === "string" && !categoryKey) {
        categoryKey = col;
      }
    });
    
    if (!categoryKey && result.columns.length > 0) {
      categoryKey = result.columns[0];
    }
    
    if (numericKeys.length > 0) {
      return { categoryKey, numericKeys };
    }
    return null;
  };

  const renderToolResultChart = (result: any) => {
    const config = getChartConfig(result);
    if (!config) return null;
    
    const { categoryKey, numericKeys } = config;
    const colors = ["#7c3aed", "#10b981", "#3b82f6", "#f59e0b", "#ec4899"];
    
    return (
      <div className="mt-4 p-4 rounded-xl border border-zinc-800 bg-zinc-950/40" style={{ height: "240px" }}>
        <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-2">Visual Insight Chart</p>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={result.rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey={categoryKey} tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#1a1a26", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8 }}
              labelStyle={{ color: "#e2e2e8", fontSize: 11 }}
              itemStyle={{ fontSize: 11 }}
            />
            {numericKeys.map((key, index) => (
              <Bar key={key} dataKey={key} fill={colors[index % colors.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Render database tables from the tool results
  const renderToolResultTable = (result: any) => {
    if (!result || result.error) {
      return (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 mt-2 flex items-center gap-2">
          <AlertCircle size={14} />
          <span>{result?.error || "Query failed"}</span>
        </div>
      );
    }

    if (result.columns && result.rows && result.rows.length > 0) {
      return (
        <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950/60 max-h-72">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400 font-semibold">
                {result.columns.map((col: string) => (
                  <th key={col} className="px-4 py-2.5 capitalize">{col.replace(/_/g, " ")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row: any, rIdx: number) => (
                <tr key={rIdx} className="border-b border-zinc-900 hover:bg-white/5 transition-colors text-zinc-300">
                  {result.columns.map((col: string) => (
                    <td key={col} className="px-4 py-2.5">
                      {typeof row[col] === "object" ? JSON.stringify(row[col]) : String(row[col] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (result.message) {
      return (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 mt-2 flex items-center gap-2">
          <CheckCircle2 size={14} />
          <span>{result.message}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto p-4 md:p-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-zinc-800/40 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-violet-400" size={24} />
            Xeno Chat Copilot
          </h1>
          <p className="text-xs md:text-sm text-zinc-500 mt-1">Ask questions, manage segments, and launch campaigns in plain English.</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="badge flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Bot size={14} />
            <span>Llama & Gemini Fallback</span>
          </div>
          {currentUser && (
            <p className="text-[10px] text-zinc-500">
              Logged in as: <span className="text-violet-400 font-medium">{currentUser.name || currentUser.email}</span>
            </p>
          )}
        </div>
      </div>

      {/* Message Pane */}
      <div className="flex-1 overflow-y-auto mb-4 p-4 rounded-2xl glass-card space-y-4 max-h-[calc(100vh-270px)]">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white ${
              msg.role === "user" ? "bg-violet-600" : "bg-zinc-800"
            }`}>
              {msg.role === "user" ? <User size={14} /> : <Bot size={14} className="text-violet-400" />}
            </div>

            {/* Message Body */}
            <div className="flex flex-col gap-1.5">
              <div className={`p-4 rounded-2xl text-sm leading-relaxed border ${
                msg.role === "user" 
                  ? "bg-violet-600/10 border-violet-500/20 text-white" 
                  : "bg-zinc-900/40 border-zinc-800/80 text-zinc-300"
              }`}>
                {msg.content}
                
                {/* Embedded execution results */}
                {msg.agent_logs && msg.agent_logs.map((log: any, logIdx: number) => (
                  <div key={logIdx}>
                    {log.tool_calls.map((tc: any, tcIdx: number) => (
                      <div key={tcIdx}>
                        {tc.name === "execute_database_query" && tc.result && (
                          <>
                            {renderToolResultTable(tc.result)}
                            {renderToolResultChart(tc.result)}
                          </>
                        )}
                        {tc.name !== "execute_database_query" && tc.result && (
                          <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs text-zinc-300 mt-2 flex items-center gap-2">
                            {tc.result.error ? <AlertCircle size={14} className="text-red-400" /> : <CheckCircle2 size={14} className="text-emerald-400" />}
                            <span>{tc.result.error || tc.result.message || "Action executed successfully"}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Agent execution trace details */}
              {msg.agent_logs && msg.agent_logs.length > 0 && (
                <div className="ml-2">
                  <button onClick={() => toggleLogs(idx)} 
                    className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500 hover:text-violet-400 transition-colors">
                    {expandedLogs[idx] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    <span>Agent Execution Logs ({msg.agent_logs.length} step{msg.agent_logs.length > 1 ? "s" : ""})</span>
                  </button>
                  {expandedLogs[idx] && (
                    <div className="mt-2 pl-3 border-l-2 border-zinc-800 space-y-2 py-1">
                      {msg.agent_logs.map((log: any, lIdx: number) => (
                        <div key={lIdx} className="text-[11px] text-zinc-500">
                          <p className="font-semibold text-zinc-400">Step {log.step}</p>
                          {log.tool_calls.map((tc: any, tcIdx: number) => (
                            <div key={tcIdx} className="mt-1 flex flex-col gap-0.5">
                              <span className="flex items-center gap-1.5 font-medium text-violet-400 text-xs">
                                {tc.name === "execute_database_query" && <Database size={12} />}
                                {tc.name === "create_audience_segment" && <Users size={12} />}
                                {tc.name === "draft_and_send_campaign" && <Megaphone size={12} />}
                                {tc.name === "create_customer" && <User size={12} />}
                                {tc.name === "delete_customer" && <Trash2 size={12} />}
                                {tc.name === "create_user" && <Shield size={12} />}
                                {tc.name === "delete_user" && <Trash2 size={12} />}
                                {tc.name === "delete_campaign" && <Trash2 size={12} />}
                                Executed: {tc.name}
                              </span>
                              <pre className="p-2 bg-black/40 border border-zinc-900 rounded-lg text-[10px] text-zinc-600 font-mono mt-0.5 overflow-x-auto max-w-full">
                                {JSON.stringify(tc.arguments, null, 2)}
                              </pre>
                              {tc.result && tc.result.success && (
                                <span className="text-emerald-400 flex items-center gap-1 mt-0.5 font-medium text-[10px]">
                                  <CheckCircle2 size={10} />
                                  Success: {tc.result.message || "Executed"}
                                </span>
                              )}
                              {tc.result && tc.result.error && (
                                <span className="text-red-400 flex items-center gap-1 mt-0.5 font-medium text-[10px]">
                                  <AlertCircle size={10} />
                                  Error: {tc.result.error}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading log trace */}
        {loading && (
          <div className="flex gap-3 max-w-[85%]">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
              <Loader2 className="animate-spin text-violet-400" size={14} />
            </div>
            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-zinc-900/20 border border-zinc-800/40 text-sm text-zinc-500 animate-pulse">
              <span>Xeno is thinking and running tools...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {messages.length === 1 && !loading && (
        <div className="grid grid-cols-2 gap-2 mb-4 animate-in">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => handleSend(s)}
              className="p-3 text-left rounded-xl text-xs text-zinc-400 hover:text-white transition-all border border-zinc-800/80 hover:border-violet-500/20"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input Form */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend(input))}
          placeholder="Ask Xeno Agent..."
          rows={1}
          className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 focus:ring-violet-500 resize-none max-h-24 min-h-12 overflow-y-auto"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        />
        <button 
          onClick={() => handleSend(input)}
          disabled={loading || !input.trim()}
          className="px-4 py-3 rounded-xl flex items-center justify-center text-white disabled:opacity-50 transition-all hover:opacity-95 shrink-0"
          style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
