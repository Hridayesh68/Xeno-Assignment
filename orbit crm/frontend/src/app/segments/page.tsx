"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Filter, Sparkles, Users, ChevronRight, Lightbulb } from "lucide-react";
import { getSegments, Segment, aiSuggestSegments, AISegmentSuggestion } from "@/lib/api";
import { formatDate } from "@/lib/utils";

function SegmentCard({ segment }: { segment: Segment }) {
  const isAI = segment.filter_type === "ai";
  return (
    <Link href={`/segments/${segment.id}`}
      className="glass-card p-5 hover:border-primary/40 transition-all duration-200 hover:-translate-y-0.5 group block border border-base-content/10">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
          {isAI ? <Sparkles size={18} className="text-primary" /> : <Filter size={18} className="text-secondary" />}
        </div>
        <span className={`badge ${isAI ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary/10 text-secondary border-secondary/20"} border`}>
          {isAI ? "AI" : "Manual"}
        </span>
      </div>
      <h3 className="font-semibold text-base-content mb-1 group-hover:text-primary transition-colors">
        {segment.name}
      </h3>
      {segment.description && (
        <p className="text-xs text-base-content/60 mb-3 line-clamp-2">{segment.description}</p>
      )}
      {segment.nl_query && (
        <p className="text-xs text-base-content/40 mb-3 italic line-clamp-1">"{segment.nl_query}"</p>
      )}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-base-content/10">
        <div className="flex items-center gap-1 text-sm font-semibold text-base-content">
          <Users size={14} className="text-base-content/50" />
          {segment.customer_count.toLocaleString()} customers
        </div>
        <span className="text-xs text-base-content/40">{formatDate(segment.created_at)}</span>
      </div>
    </Link>
  );
}

function SuggestionCard({ suggestion, onUse }: { suggestion: AISegmentSuggestion; onUse: (s: AISegmentSuggestion) => void }) {
  return (
    <div className="p-4 rounded-xl flex items-center gap-4 hover:bg-base-content/5 border border-base-content/5 transition-colors cursor-pointer group"
      onClick={() => onUse(suggestion)}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/10">
        <Sparkles size={14} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-base-content group-hover:text-primary transition-colors">{suggestion.name}</p>
        <p className="text-xs text-base-content/60 truncate">{suggestion.description}</p>
      </div>
      <ChevronRight size={14} className="text-base-content/40 group-hover:text-primary transition-colors shrink-0" />
    </div>
  );
}

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [suggestions, setSuggestions] = useState<AISegmentSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getSegments(),
      aiSuggestSegments(),
    ]).then(([segs, suggs]) => {
      setSegments(segs);
      setSuggestions(suggs);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-base-content">Segments</h1>
          <p className="text-base-content/60 mt-1">Define your audiences with AI or manual filters</p>
        </div>
        <Link href="/segments/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-primary-content bg-primary hover:opacity-90">
          <Plus size={16} />
          New Segment
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Segments Grid */}
        <div className="col-span-2">
          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array(4).fill(0).map((_, i) => <div key={i} className="h-48 shimmer rounded-2xl" />)}
            </div>
          ) : segments.length === 0 ? (
            <div className="glass-card p-16 text-center border border-base-content/10">
              <Filter size={48} className="text-base-content/30 mx-auto mb-4" />
              <h3 className="font-semibold text-base-content mb-2">No segments yet</h3>
              <p className="text-sm text-base-content/60 mb-4">Create your first audience segment to start targeting shoppers.</p>
              <Link href="/segments/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-primary-content bg-primary hover:opacity-90">
                <Plus size={14} />
                Create Segment
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {segments.map(s => <SegmentCard key={s.id} segment={s} />)}
            </div>
          )}
        </div>

        {/* AI Suggestions */}
        <div className="glass-card p-5 border border-base-content/10">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={16} className="text-primary" />
            <h3 className="font-semibold text-base-content text-sm">AI Suggestions</h3>
          </div>
          <p className="text-xs text-base-content/60 mb-4">
            Click any suggestion to pre-fill a new segment with these filters.
          </p>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <SuggestionCard
                key={i}
                suggestion={s}
                onUse={(sugg) => {
                  const params = new URLSearchParams({
                    name: sugg.name,
                    rules: JSON.stringify(sugg.filter_rules),
                  });
                  window.location.href = `/segments/new?${params}`;
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
