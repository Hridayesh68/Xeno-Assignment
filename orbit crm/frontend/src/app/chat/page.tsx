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
    const colors = ["oklch(var(--p))", "oklch(var(--su))", "oklch(var(--in))", "oklch(var(--wa))", "oklch(var(--s))"];
    
    return (
      <div className="mt-4 p-4 rounded-xl border border-base-content/10 bg-base-200/50" style={{ height: "240px" }}>
        <p className="text-[10px] text-base-content/50 font-semibold uppercase tracking-wider mb-2">Visual Insight Chart</p>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={result.rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--bc) / 0.05)" />
            <XAxis dataKey={categoryKey} tick={{ fill: "oklch(var(--bc) / 0.5)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "oklch(var(--bc) / 0.5)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "oklch(var(--b2))", border: "1px solid oklch(var(--bc) / 0.1)", borderRadius: 8 }}
              labelStyle={{ color: "oklch(var(--bc))", fontSize: 11 }}
              itemStyle={{ fontSize: 11 }}
            />
            {numericKeys.map((key, index) => {
              const classNames = ["fill-primary", "fill-success", "fill-info", "fill-warning", "fill-secondary"];
              return (
                <Bar 
                  key={key} 
                  dataKey={key} 
                  className={classNames[index % classNames.length]} 
                  radius={[4, 4, 0, 0]} 
                />
              );
            })}
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
        <div className="mt-3 overflow-x-auto rounded-xl border border-base-content/10 bg-base-200/80 max-h-72">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-base-content/10 bg-base-300 text-base-content/70 font-semibold">
                {result.columns.map((col: string) => (
                  <th key={col} className="px-4 py-2.5 capitalize">{col.replace(/_/g, " ")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row: any, rIdx: number) => (
                <tr key={rIdx} className="border-b border-base-content/5 hover:bg-base-content/5 transition-colors text-base-content">
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
      <div className="flex items-center justify-between mb-6 border-b border-base-content/10 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-base-content flex items-center gap-2">
            <Bot className="text-primary animate-pulse" size={24} />
            Xeno Chat Copilot
          </h1>
          <p className="text-xs md:text-sm text-base-content/60 mt-1">Ask questions, manage segments, and launch campaigns in plain English.</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="badge flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/20">
            <Sparkles size={12} />
            <span>Llama & Gemini Fallback</span>
          </div>
          {currentUser && (
            <p className="text-[10px] text-base-content/60">
              Logged in as: <span className="text-primary font-semibold">{currentUser.name || currentUser.email}</span>
            </p>
          )}
        </div>
      </div>

      {/* Message Pane */}
      <div className="flex-1 overflow-y-auto mb-4 p-4 rounded-2xl glass-card space-y-4 max-h-[calc(100vh-270px)] border border-base-content/10">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white ${
              msg.role === "user" ? "bg-primary" : "bg-base-300 text-base-content border border-base-content/10"
            }`}>
              {msg.role === "user" ? <User size={14} className="text-primary-content" /> : <Bot size={14} className="text-primary" />}
            </div>

            {/* Message Body */}
            <div className="flex flex-col gap-1.5">
              <div className={`p-4 rounded-2xl text-sm leading-relaxed border ${
                msg.role === "user" 
                  ? "bg-primary/10 border-primary/20 text-base-content" 
                  : "bg-base-200/50 border-base-content/5 text-base-content"
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
                          <div className="p-3 bg-base-200 border border-base-content/10 rounded-xl text-xs text-base-content mt-2 flex items-center gap-2">
                            {tc.result.error ? <AlertCircle size={14} className="text-error" /> : <CheckCircle2 size={14} className="text-success" />}
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
                    className="flex items-center gap-1 text-[10px] font-semibold text-base-content/50 hover:text-primary transition-colors">
                    {expandedLogs[idx] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    <span>Agent Execution Logs ({msg.agent_logs.length} step{msg.agent_logs.length > 1 ? "s" : ""})</span>
                  </button>
                  {expandedLogs[idx] && (
                    <div className="mt-2 pl-3 border-l-2 border-base-content/15 space-y-2 py-1">
                      {msg.agent_logs.map((log: any, lIdx: number) => (
                        <div key={lIdx} className="text-[11px] text-base-content/50">
                          <p className="font-semibold text-base-content/70">Step {log.step}</p>
                          {log.tool_calls.map((tc: any, tcIdx: number) => (
                            <div key={tcIdx} className="mt-1 flex flex-col gap-0.5">
                              <span className="flex items-center gap-1.5 font-medium text-primary text-xs">
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
                              <pre className="p-2 bg-base-300 border border-base-content/5 rounded-lg text-[10px] text-base-content/40 font-mono mt-0.5 overflow-x-auto max-w-full">
                                {JSON.stringify(tc.arguments, null, 2)}
                              </pre>
                              {tc.result && tc.result.success && (
                                <span className="text-success flex items-center gap-1 mt-0.5 font-semibold text-[10px]">
                                  <CheckCircle2 size={10} />
                                  Success: {tc.result.message || "Executed"}
                                </span>
                              )}
                              {tc.result && tc.result.error && (
                                <span className="text-error flex items-center gap-1 mt-0.5 font-semibold text-[10px]">
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
          <div className="flex gap-3 max-w-[85%] animate-pulse">
            <div className="w-8 h-8 rounded-full bg-base-300 flex items-center justify-center shrink-0 border border-base-content/10">
              <Loader2 className="animate-spin text-primary" size={14} />
            </div>
            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-base-200/50 border border-base-content/5 text-sm text-base-content/50">
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
              className="p-3 text-left rounded-xl text-xs text-base-content/60 hover:text-primary transition-all border border-base-content/10 hover:border-primary/20 bg-base-200">
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
          className="flex-1 px-4 py-3 rounded-xl text-sm text-base-content placeholder-base-content/40 outline-none focus:ring-1 focus:ring-primary resize-none max-h-24 min-h-12 overflow-y-auto bg-base-200 border border-base-content/10"
        />
        <button 
          onClick={() => handleSend(input)}
          disabled={loading || !input.trim()}
          className="px-4 py-3 rounded-xl flex items-center justify-center text-primary-content bg-primary disabled:opacity-50 transition-all hover:opacity-95 shrink-0"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
