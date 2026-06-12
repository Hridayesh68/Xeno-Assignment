const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_customers: number;
  total_orders: number;
  total_revenue: number;
  total_campaigns: number;
  active_campaigns: number;
  avg_delivery_rate: number;
  avg_open_rate: number;
  recent_campaigns: Campaign[];
}

export const getDashboard = () => apiFetch<DashboardStats>("/api/dashboard");

// ─── Customers ───────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  tags: string[];
  total_spend: number;
  order_count: number;
  last_order_at: string | null;
  created_at: string;
}

export interface CustomerCreate {
  name: string;
  email: string;
  phone?: string;
  city?: string;
  tags?: string[];
}

export const getCustomers = (params?: {
  skip?: number;
  limit?: number;
  city?: string;
  search?: string;
  min_spend?: number;
}) => {
  const q = new URLSearchParams();
  if (params?.skip) q.set("skip", String(params.skip));
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.city) q.set("city", params.city);
  if (params?.search) q.set("search", params.search);
  if (params?.min_spend) q.set("min_spend", String(params.min_spend));
  return apiFetch<Customer[]>(`/api/customers?${q}`);
};

export const createCustomer = (data: CustomerCreate) =>
  apiFetch<Customer>("/api/customers", { method: "POST", body: JSON.stringify(data) });

// ─── Segments ─────────────────────────────────────────────────────────────────

export interface FilterRule {
  field: string;
  operator: string;
  value: unknown;
}

export interface Segment {
  id: string;
  name: string;
  description: string | null;
  filter_rules: FilterRule[];
  nl_query: string | null;
  filter_type: string;
  customer_count: number;
  created_at: string;
}

export interface SegmentCreate {
  name: string;
  description?: string;
  filter_rules: FilterRule[];
  nl_query?: string;
  filter_type?: string;
}

export interface SegmentPreview {
  count: number;
  sample_customers: Customer[];
}

export const getSegments = () => apiFetch<Segment[]>("/api/segments");
export const getSegment = (id: string) => apiFetch<Segment>(`/api/segments/${id}`);
export const createSegment = (data: SegmentCreate) =>
  apiFetch<Segment>("/api/segments", { method: "POST", body: JSON.stringify(data) });
export const previewSegmentRules = (data: SegmentCreate) =>
  apiFetch<SegmentPreview>("/api/segments/preview-rules", { method: "POST", body: JSON.stringify(data) });
export const previewSegment = (id: string) =>
  apiFetch<SegmentPreview>(`/api/segments/${id}/preview`);

// ─── Campaigns ────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  segment_id: string;
  channel: string;
  message_template: string;
  ai_generated_message: boolean;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_opened: number;
  total_clicked: number;
  created_at: string;
}

export interface CampaignCreate {
  name: string;
  segment_id: string;
  channel: string;
  message_template: string;
  ai_generated_message?: boolean;
  scheduled_at?: string;
}

export interface CampaignStats {
  campaign_id: string;
  campaign_name: string;
  status: string;
  channel: string;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_opened: number;
  total_clicked: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
}

export interface Communication {
  id: string;
  campaign_id: string;
  customer_id: string;
  channel: string;
  message: string;
  status: string;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  failed_at: string | null;
  failed_reason: string | null;
  created_at: string;
}

export const getCampaigns = (status?: string) => {
  const q = status ? `?status=${status}` : "";
  return apiFetch<Campaign[]>(`/api/campaigns${q}`);
};
export const getCampaign = (id: string) => apiFetch<Campaign>(`/api/campaigns/${id}`);
export const createCampaign = (data: CampaignCreate) =>
  apiFetch<Campaign>("/api/campaigns", { method: "POST", body: JSON.stringify(data) });
export const sendCampaign = (id: string) =>
  apiFetch(`/api/campaigns/${id}/send`, { method: "POST" });
export const getCampaignStats = (id: string) =>
  apiFetch<CampaignStats>(`/api/campaigns/${id}/stats`);
export const getCampaignCommunications = (id: string) =>
  apiFetch<Communication[]>(`/api/campaigns/${id}/communications`);

// ─── AI ──────────────────────────────────────────────────────────────────────

export interface NLSegmentResponse {
  filter_rules: FilterRule[];
  segment_name: string;
  explanation: string;
}

export interface MessageDraftResponse {
  variants: string[];
  reasoning: string;
}

export interface CampaignInsightResponse {
  summary: string;
  highlights: string[];
  suggestions: string[];
}

export interface AISegmentSuggestion {
  name: string;
  description: string;
  filter_rules: FilterRule[];
}

export const aiParseSegment = (query: string) =>
  apiFetch<NLSegmentResponse>("/api/ai/segment", {
    method: "POST",
    body: JSON.stringify({ query }),
  });

export const aiDraftMessage = (data: {
  segment_id: string;
  channel: string;
  campaign_goal?: string;
  brand_name?: string;
}) => apiFetch<MessageDraftResponse>("/api/ai/draft-message", {
  method: "POST",
  body: JSON.stringify(data),
});

export const aiCampaignInsight = (campaign_id: string) =>
  apiFetch<CampaignInsightResponse>("/api/ai/campaign-insight", {
    method: "POST",
    body: JSON.stringify({ campaign_id }),
  });

export const aiSuggestSegments = () =>
  apiFetch<AISegmentSuggestion[]>("/api/ai/suggest-segments");

// ─── AI Chat Agent ──────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface ChatResponse {
  role: "assistant";
  content: string;
  agent_logs: {
    step: number;
    tool_calls: {
      id: string;
      name: string;
      arguments: any;
    }[];
  }[];
}

export const aiChat = (messages: ChatMessage[]) =>
  apiFetch<ChatResponse>("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
  });

