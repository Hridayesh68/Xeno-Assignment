"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2, Sparkles, Wand2, Check } from "lucide-react";
import { getSegments, createCampaign, aiDraftMessage, Segment, MessageDraftResponse } from "@/lib/api";
import { CHANNEL_ICONS } from "@/lib/utils";

const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp", icon: "💬" },
  { value: "sms", label: "SMS", icon: "📱" },
  { value: "email", label: "Email", icon: "📧" },
  { value: "rcs", label: "RCS", icon: "🔷" },
];

function NewCampaignForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);

  // Form state
  const [name, setName] = useState("");
  const [segmentId, setSegmentId] = useState(searchParams.get("segment_id") || "");
  const [channel, setChannel] = useState("whatsapp");
  const [message, setMessage] = useState("");
  const [aiGoal, setAiGoal] = useState("");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [aiDrafts, setAiDrafts] = useState<MessageDraftResponse | null>(null);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSegments().then(setSegments).catch(console.error);
  }, []);

  const runAIDraft = async () => {
    if (!segmentId || !channel) return;
    setAiLoading(true);
    try {
      const res = await aiDraftMessage({ segment_id: segmentId, channel, campaign_goal: aiGoal });
      setAiDrafts(res);
      setMessage(res.variants[0]);
      setSelectedVariant(0);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const save = async () => {
    if (!name || !segmentId || !channel || !message) return;
    setSaving(true);
    try {
      const campaign = await createCampaign({
        name,
        segment_id: segmentId,
        channel,
        message_template: message,
        ai_generated_message: !!aiDrafts,
      });
      router.push(`/campaigns/${campaign.id}`);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const selectedSegment = segments.find(s => s.id === segmentId);

  return (
    <div className="p-8 animate-in max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">New Campaign</h1>
          <p className="text-zinc-500 mt-1">Set up your personalised marketing campaign</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {["Audience", "Channel", "Message", "Review"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i + 1 < step ? "bg-emerald-500 text-white" :
              i + 1 === step ? "bg-violet-600 text-white" : "text-zinc-600"
            }`}
              style={i + 1 >= step ? { border: "1px solid rgba(255,255,255,0.1)" } : {}}>
              {i + 1 < step ? <Check size={12} /> : i + 1}
            </div>
            <span className={`text-xs font-medium ${i + 1 === step ? "text-white" : "text-zinc-600"}`}>{s}</span>
            {i < 3 && <div className="w-8 h-px bg-zinc-800 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Segment */}
      {step === 1 && (
        <div className="animate-in">
          <div className="glass-card p-5 mb-6">
            <h2 className="font-semibold text-white mb-1">Campaign Name</h2>
            <p className="text-xs text-zinc-500 mb-4">Give your campaign a clear name</p>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder='e.g. "Re-engage Dormant VIPs — June 2026"'
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 focus:ring-violet-500"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
          </div>
          <div className="glass-card p-5">
            <h2 className="font-semibold text-white mb-1">Target Audience</h2>
            <p className="text-xs text-zinc-500 mb-4">Choose which segment to reach</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {segments.length === 0 ? (
                <p className="text-sm text-zinc-600 py-4 text-center">
                  No segments yet.{" "}
                  <a href="/segments/new" className="text-violet-400 hover:underline">Create one first →</a>
                </p>
              ) : segments.map(s => (
                <button key={s.id}
                  onClick={() => setSegmentId(s.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                    segmentId === s.id ? "border-violet-500/50" : ""
                  }`}
                  style={{
                    background: segmentId === s.id ? "rgba(139,92,246,0.1)" : "rgba(255,255,255,0.03)",
                    border: segmentId === s.id ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(255,255,255,0.05)",
                  }}>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-zinc-500">{s.customer_count.toLocaleString()} customers</p>
                  </div>
                  {segmentId === s.id && <Check size={16} className="text-violet-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button onClick={() => setStep(2)} disabled={!name || !segmentId}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Choose Channel */}
      {step === 2 && (
        <div className="animate-in">
          <div className="glass-card p-5">
            <h2 className="font-semibold text-white mb-1">Messaging Channel</h2>
            <p className="text-xs text-zinc-500 mb-4">Where will your message be delivered?</p>
            <div className="grid grid-cols-2 gap-3">
              {CHANNELS.map(ch => (
                <button key={ch.value} onClick={() => setChannel(ch.value)}
                  className={`p-4 rounded-xl flex items-center gap-3 transition-all`}
                  style={{
                    background: channel === ch.value ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.03)",
                    border: channel === ch.value ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(255,255,255,0.07)",
                  }}>
                  <span className="text-2xl">{ch.icon}</span>
                  <span className={`font-medium text-sm ${channel === ch.value ? "text-white" : "text-zinc-400"}`}>
                    {ch.label}
                  </span>
                  {channel === ch.value && <Check size={14} className="text-violet-400 ml-auto" />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              ← Back
            </button>
            <button onClick={() => setStep(3)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Write Message */}
      {step === 3 && (
        <div className="animate-in">
          {/* AI Message Drafter */}
          <div className="glass-card p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-violet-400" />
              <h2 className="font-semibold text-white text-sm">AI Message Drafter</h2>
              <span className="badge ml-1" style={{ background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.2)" }}>
                GPT-4o
              </span>
            </div>
            <input type="text" value={aiGoal} onChange={e => setAiGoal(e.target.value)}
              placeholder='Campaign goal (e.g. "Offer 15% discount to win them back")'
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 focus:ring-violet-500 mb-3"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
            <button onClick={runAIDraft} disabled={aiLoading || !segmentId}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              Draft 3 Variants with AI
            </button>

            {aiDrafts && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-zinc-500 mb-2">Select a variant to use:</p>
                {aiDrafts.variants.map((v, i) => (
                  <button key={i} onClick={() => { setSelectedVariant(i); setMessage(v); }}
                    className="w-full text-left p-3 rounded-xl text-sm transition-all"
                    style={{
                      background: selectedVariant === i ? "rgba(139,92,246,0.1)" : "rgba(255,255,255,0.03)",
                      border: selectedVariant === i ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(255,255,255,0.05)",
                      color: selectedVariant === i ? "#e2e2e8" : "#71717a",
                    }}>
                    <span className="text-xs text-zinc-600 font-medium">Variant {i + 1}</span>
                    <p className="mt-1">{v}</p>
                  </button>
                ))}
                {aiDrafts.reasoning && (
                  <p className="text-xs text-zinc-600 italic mt-2">💡 {aiDrafts.reasoning}</p>
                )}
              </div>
            )}
          </div>

          {/* Message Editor */}
          <div className="glass-card p-5">
            <h2 className="font-semibold text-white mb-1 text-sm">Message Template</h2>
            <p className="text-xs text-zinc-500 mb-3">Use {"{{name}}"} to personalise with customer first name.</p>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder='e.g. "Hi {{name}}, we miss you! Here\'s 20% off just for you 🎁"'
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 focus:ring-violet-500 resize-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
            <p className="text-xs text-zinc-600 mt-2">{message.length} characters</p>
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              ← Back
            </button>
            <button onClick={() => setStep(4)} disabled={!message}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="animate-in">
          <div className="glass-card p-6 mb-5">
            <h2 className="font-semibold text-white mb-4">Campaign Summary</h2>
            <div className="space-y-4">
              {[
                { label: "Name", value: name },
                { label: "Segment", value: `${selectedSegment?.name} (${selectedSegment?.customer_count.toLocaleString()} customers)` },
                { label: "Channel", value: `${CHANNEL_ICONS[channel]} ${channel.toUpperCase()}` },
                { label: "Message", value: message },
              ].map(({ label, value }) => (
                <div key={label} className="pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-xs text-zinc-500 mb-1">{label}</p>
                  <p className="text-sm text-white">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-xl"
              style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
              <p className="text-xs text-amber-300">
                ⚡ After saving, click "Send" on the campaign page to launch it. The campaign will run asynchronously.
              </p>
            </div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(3)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              ← Back
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Save Campaign
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500">Loading...</div>}>
      <NewCampaignForm />
    </Suspense>
  );
}
