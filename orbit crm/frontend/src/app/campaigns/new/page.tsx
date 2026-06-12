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
    <div className="p-8 animate-in max-w-2xl text-base-content">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()}
          className="p-2 rounded-xl text-base-content/50 hover:text-base-content hover:bg-base-content/5 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-base-content">New Campaign</h1>
          <p className="text-base-content/60 mt-1">Set up your personalised marketing campaign</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {["Audience", "Channel", "Message", "Review"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all border ${
              i + 1 < step ? "bg-success text-success-content border-success" :
              i + 1 === step ? "bg-primary text-primary-content border-primary" : "text-base-content/40 border-base-content/15"
            }`}>
              {i + 1 < step ? <Check size={12} /> : i + 1}
            </div>
            <span className={`text-xs font-semibold ${i + 1 === step ? "text-base-content" : "text-base-content/40"}`}>{s}</span>
            {i < 3 && <div className="w-8 h-px bg-base-content/10 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Segment */}
      {step === 1 && (
        <div className="animate-in space-y-6">
          <div className="glass-card p-5 border border-base-content/10">
            <h2 className="font-semibold text-base-content mb-1">Campaign Name</h2>
            <p className="text-xs text-base-content/60 mb-4">Give your campaign a clear name</p>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder={"e.g. \"Re-engage Dormant VIPs — June 2026\""}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-base-content placeholder-base-content/40 outline-none focus:ring-1 focus:ring-primary bg-base-200 border border-base-content/10"
            />
          </div>
          <div className="glass-card p-5 border border-base-content/10">
            <h2 className="font-semibold text-base-content mb-1">Target Audience</h2>
            <p className="text-xs text-base-content/60 mb-4">Choose which segment to reach</p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {segments.length === 0 ? (
                <p className="text-sm text-base-content/40 py-4 text-center">
                  No segments yet.{" "}
                  <a href="/segments/new" className="text-primary hover:underline">Create one first →</a>
                </p>
              ) : segments.map(s => (
                <button key={s.id}
                  onClick={() => setSegmentId(s.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${
                    segmentId === s.id 
                      ? "bg-primary/10 border-primary/40 text-base-content font-medium" 
                      : "bg-base-200 border-base-content/5 hover:bg-base-300/80 text-base-content"
                  }`}>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{s.name}</p>
                    <p className="text-xs text-base-content/60">{s.customer_count.toLocaleString()} customers</p>
                  </div>
                  {segmentId === s.id && <Check size={16} className="text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button onClick={() => setStep(2)} disabled={!name || !segmentId}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-content bg-primary disabled:opacity-50 transition-all hover:opacity-90">
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Choose Channel */}
      {step === 2 && (
        <div className="animate-in">
          <div className="glass-card p-5 border border-base-content/10">
            <h2 className="font-semibold text-base-content mb-1">Messaging Channel</h2>
            <p className="text-xs text-base-content/60 mb-4">Where will your message be delivered?</p>
            <div className="grid grid-cols-2 gap-3">
              {CHANNELS.map(ch => (
                <button key={ch.value} onClick={() => setChannel(ch.value)}
                  className={`p-4 rounded-xl flex items-center gap-3 transition-all border ${
                    channel === ch.value
                      ? "bg-primary/10 border-primary/40 text-base-content"
                      : "bg-base-200 border-base-content/5 hover:bg-base-300 text-base-content"
                  }`}>
                  <span className="text-2xl">{ch.icon}</span>
                  <span className={`font-semibold text-sm ${channel === ch.value ? "text-primary" : "text-base-content/75"}`}>
                    {ch.label}
                  </span>
                  {channel === ch.value && <Check size={14} className="text-primary ml-auto" />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(1)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-base-content/70 hover:text-base-content bg-base-200 border border-base-content/10 hover:bg-base-300 transition-colors">
              ← Back
            </button>
            <button onClick={() => setStep(3)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-content bg-primary transition-all hover:opacity-90">
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Write Message */}
      {step === 3 && (
        <div className="animate-in">
          {/* AI Message Drafter */}
          <div className="glass-card p-5 mb-5 border border-base-content/10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-primary" />
              <h2 className="font-semibold text-base-content text-sm">AI Message Drafter</h2>
              <span className="badge bg-primary/10 text-primary border border-primary/25 ml-1">
                Llama 3.3
              </span>
            </div>
            <input type="text" value={aiGoal} onChange={e => setAiGoal(e.target.value)}
              placeholder={"Campaign goal (e.g. \"Offer 15% discount to win them back\")"}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-base-content placeholder-base-content/40 outline-none focus:ring-1 focus:ring-primary bg-base-200 border border-base-content/10 mb-3"
            />
            <button onClick={runAIDraft} disabled={aiLoading || !segmentId}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-primary-content bg-primary disabled:opacity-50 transition-all hover:opacity-90">
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              Draft 3 Variants with AI
            </button>

            {aiDrafts && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-base-content/50 mb-2">Select a variant to use:</p>
                {aiDrafts.variants.map((v, i) => (
                  <button key={i} onClick={() => { setSelectedVariant(i); setMessage(v); }}
                    className={`w-full text-left p-3 rounded-xl text-sm transition-all border ${
                      selectedVariant === i
                        ? "bg-primary/10 border-primary/40 text-base-content font-medium"
                        : "bg-base-200 border-base-content/5 hover:bg-base-300 text-base-content/60"
                    }`}>
                    <span className="text-xs text-base-content/40 font-semibold">Variant {i + 1}</span>
                    <p className="mt-1">{v}</p>
                  </button>
                ))}
                {aiDrafts.reasoning && (
                  <p className="text-xs text-primary/70 italic mt-2">💡 {aiDrafts.reasoning}</p>
                )}
              </div>
            )}
          </div>

          {/* Message Editor */}
          <div className="glass-card p-5 border border-base-content/10">
            <h2 className="font-semibold text-base-content mb-1 text-sm">Message Template</h2>
            <p className="text-xs text-base-content/50 mb-3">Use {"{{name}}"} to personalise with customer first name.</p>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder={"e.g. \"Hi {{name}}, we miss you! Here's 20% off just for you 🎁\""}
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-sm text-base-content placeholder-base-content/40 outline-none focus:ring-1 focus:ring-primary resize-none bg-base-200 border border-base-content/10"
            />
            <p className="text-xs text-base-content/40 mt-2">{message.length} characters</p>
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-base-content/70 hover:text-base-content bg-base-200 border border-base-content/10 hover:bg-base-300 transition-colors">
              ← Back
            </button>
            <button onClick={() => setStep(4)} disabled={!message}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-content bg-primary disabled:opacity-50 transition-all hover:opacity-90">
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="animate-in">
          <div className="glass-card p-6 mb-5 border border-base-content/10">
            <h2 className="font-semibold text-base-content mb-4">Campaign Summary</h2>
            <div className="space-y-4">
              {[
                { label: "Name", value: name },
                { label: "Segment", value: `${selectedSegment?.name} (${selectedSegment?.customer_count.toLocaleString()} customers)` },
                { label: "Channel", value: `${CHANNEL_ICONS[channel]} ${channel.toUpperCase()}` },
                { label: "Message", value: message },
              ].map(({ label, value }) => (
                <div key={label} className="pb-4 border-b border-base-content/5">
                  <p className="text-xs text-base-content/40 mb-1">{label}</p>
                  <p className="text-sm text-base-content font-medium">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-xl bg-warning/10 border border-warning/20">
              <p className="text-xs text-warning font-medium">
                ⚡ After saving, click "Send" on the campaign page to launch it. The campaign will run asynchronously.
              </p>
            </div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(3)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-base-content/70 hover:text-base-content bg-base-200 border border-base-content/10 hover:bg-base-300 transition-colors">
              ← Back
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-primary-content bg-primary disabled:opacity-50 transition-all hover:opacity-90">
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
