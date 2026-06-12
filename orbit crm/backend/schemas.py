from typing import Optional, List, Any, Dict
from datetime import datetime
from pydantic import BaseModel, EmailStr


# ─── Customer Schemas ────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    city: Optional[str] = None
    tags: Optional[List[str]] = []


class CustomerOut(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str]
    city: Optional[str]
    tags: List[str]
    total_spend: float
    order_count: int
    last_order_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Order Schemas ───────────────────────────────────────────────────────────

class OrderItem(BaseModel):
    name: str
    qty: int
    price: float


class OrderCreate(BaseModel):
    customer_id: str
    amount: float
    items: List[OrderItem] = []
    channel: str = "online"
    ordered_at: Optional[datetime] = None


class OrderOut(BaseModel):
    id: str
    customer_id: str
    amount: float
    items: List[Any]
    channel: str
    ordered_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Segment Schemas ─────────────────────────────────────────────────────────

class FilterRule(BaseModel):
    field: str          # e.g. "total_spend", "order_count", "last_order_days", "city", "tags"
    operator: str       # e.g. "gt", "lt", "gte", "lte", "eq", "contains", "in"
    value: Any


class SegmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    filter_rules: List[FilterRule]
    nl_query: Optional[str] = None
    filter_type: str = "manual"


class SegmentPreview(BaseModel):
    count: int
    sample_customers: List[CustomerOut]


class SegmentOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    filter_rules: List[Any]
    nl_query: Optional[str]
    filter_type: str
    customer_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Campaign Schemas ────────────────────────────────────────────────────────

class CampaignCreate(BaseModel):
    name: str
    segment_id: str
    channel: str  # whatsapp / sms / email / rcs
    message_template: str
    ai_generated_message: bool = False
    scheduled_at: Optional[datetime] = None


class CampaignOut(BaseModel):
    id: str
    name: str
    segment_id: str
    channel: str
    message_template: str
    ai_generated_message: bool
    status: str
    scheduled_at: Optional[datetime]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    total_sent: int
    total_delivered: int
    total_failed: int
    total_opened: int
    total_clicked: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Communication Schemas ───────────────────────────────────────────────────

class CommunicationOut(BaseModel):
    id: str
    campaign_id: str
    customer_id: str
    channel: str
    message: str
    status: str
    sent_at: Optional[datetime]
    delivered_at: Optional[datetime]
    opened_at: Optional[datetime]
    clicked_at: Optional[datetime]
    failed_at: Optional[datetime]
    failed_reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Receipt Callback Schema ─────────────────────────────────────────────────

class ReceiptCallback(BaseModel):
    communication_id: str
    event: str  # delivered / failed / opened / clicked
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = {}


# ─── AI Schemas ──────────────────────────────────────────────────────────────

class NLSegmentRequest(BaseModel):
    query: str


class NLSegmentResponse(BaseModel):
    filter_rules: List[FilterRule]
    segment_name: str
    explanation: str


class MessageDraftRequest(BaseModel):
    segment_id: str
    channel: str
    campaign_goal: Optional[str] = None
    brand_name: Optional[str] = "our brand"


class MessageDraftResponse(BaseModel):
    variants: List[str]
    reasoning: str


class CampaignInsightRequest(BaseModel):
    campaign_id: str


class CampaignInsightResponse(BaseModel):
    summary: str
    highlights: List[str]
    suggestions: List[str]


# ─── Analytics Schemas ───────────────────────────────────────────────────────

class CampaignStats(BaseModel):
    campaign_id: str
    campaign_name: str
    status: str
    channel: str
    total_sent: int
    total_delivered: int
    total_failed: int
    total_opened: int
    total_clicked: int
    delivery_rate: float
    open_rate: float
    click_rate: float
    ai_insight: Optional[str] = None


class DashboardStats(BaseModel):
    total_customers: int
    total_orders: int
    total_revenue: float
    total_campaigns: int
    active_campaigns: int
    avg_delivery_rate: float
    avg_open_rate: float
    recent_campaigns: List[CampaignOut]
