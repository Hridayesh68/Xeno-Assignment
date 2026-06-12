"""
FastAPI main application — Xeno CRM Backend
"""
import asyncio
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

import models
import schemas
from database import engine, get_db
from segment_engine import evaluate_segment, get_segment_customers
from campaign_service import execute_campaign_send, process_receipt_callback, update_campaign_stats
from ai_service import (
    nl_to_segment_filters,
    draft_campaign_messages,
    generate_campaign_insight,
    suggest_segments,
)
from config import get_settings

# Create all tables on startup
models.Base.metadata.create_all(bind=engine)

settings = get_settings()

app = FastAPI(
    title="Xeno CRM API",
    description="AI-native Mini CRM for D2C brands",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "xeno-crm-backend"}


# ─── Dashboard ───────────────────────────────────────────────────────────────

@app.get("/api/dashboard", response_model=schemas.DashboardStats)
def get_dashboard(db: Session = Depends(get_db)):
    total_customers = db.query(models.Customer).count()
    total_orders = db.query(models.Order).count()
    total_revenue = db.query(func.sum(models.Order.amount)).scalar() or 0
    total_campaigns = db.query(models.Campaign).count()
    active_campaigns = db.query(models.Campaign).filter(
        models.Campaign.status == models.CampaignStatus.RUNNING
    ).count()

    # Avg rates across all completed campaigns
    completed = db.query(models.Campaign).filter(
        models.Campaign.status == models.CampaignStatus.COMPLETED,
        models.Campaign.total_sent > 0
    ).all()

    avg_delivery = 0.0
    avg_open = 0.0
    if completed:
        avg_delivery = sum(
            c.total_delivered / c.total_sent for c in completed
        ) / len(completed)
        avg_open = sum(
            c.total_opened / c.total_sent for c in completed
        ) / len(completed)

    recent = db.query(models.Campaign).order_by(
        desc(models.Campaign.created_at)
    ).limit(5).all()

    return schemas.DashboardStats(
        total_customers=total_customers,
        total_orders=total_orders,
        total_revenue=round(float(total_revenue), 2),
        total_campaigns=total_campaigns,
        active_campaigns=active_campaigns,
        avg_delivery_rate=round(avg_delivery, 4),
        avg_open_rate=round(avg_open, 4),
        recent_campaigns=recent,
    )


# ─── Customers ───────────────────────────────────────────────────────────────

@app.post("/api/customers", response_model=schemas.CustomerOut, status_code=201)
def create_customer(data: schemas.CustomerCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Customer).filter(
        models.Customer.email == data.email
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Customer with this email already exists")

    customer = models.Customer(**data.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@app.get("/api/customers", response_model=List[schemas.CustomerOut])
def list_customers(
    skip: int = 0,
    limit: int = 50,
    city: Optional[str] = None,
    min_spend: Optional[float] = None,
    max_spend: Optional[float] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(models.Customer)
    if city:
        q = q.filter(models.Customer.city == city)
    if min_spend is not None:
        q = q.filter(models.Customer.total_spend >= min_spend)
    if max_spend is not None:
        q = q.filter(models.Customer.total_spend <= max_spend)
    if search:
        q = q.filter(
            models.Customer.name.ilike(f"%{search}%") |
            models.Customer.email.ilike(f"%{search}%")
        )
    return q.order_by(desc(models.Customer.created_at)).offset(skip).limit(limit).all()


@app.get("/api/customers/count")
def count_customers(db: Session = Depends(get_db)):
    return {"count": db.query(models.Customer).count()}


@app.get("/api/customers/{customer_id}", response_model=schemas.CustomerOut)
def get_customer(customer_id: str, db: Session = Depends(get_db)):
    c = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return c


# ─── Orders ──────────────────────────────────────────────────────────────────

@app.post("/api/orders", response_model=schemas.OrderOut, status_code=201)
def create_order(data: schemas.OrderCreate, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(
        models.Customer.id == data.customer_id
    ).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    ordered_at = data.ordered_at or datetime.utcnow()
    order = models.Order(
        customer_id=data.customer_id,
        amount=data.amount,
        items=[item.model_dump() for item in data.items],
        channel=data.channel,
        ordered_at=ordered_at,
    )
    db.add(order)

    # Update customer stats
    customer.total_spend = (customer.total_spend or 0) + data.amount
    customer.order_count = (customer.order_count or 0) + 1
    if not customer.last_order_at or ordered_at > customer.last_order_at:
        customer.last_order_at = ordered_at

    db.commit()
    db.refresh(order)
    return order


@app.get("/api/orders", response_model=List[schemas.OrderOut])
def list_orders(
    customer_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    q = db.query(models.Order)
    if customer_id:
        q = q.filter(models.Order.customer_id == customer_id)
    return q.order_by(desc(models.Order.ordered_at)).offset(skip).limit(limit).all()


# ─── Segments ─────────────────────────────────────────────────────────────────

@app.post("/api/segments", response_model=schemas.SegmentOut, status_code=201)
def create_segment(data: schemas.SegmentCreate, db: Session = Depends(get_db)):
    count, _ = evaluate_segment(db, data.filter_rules)
    segment = models.Segment(
        name=data.name,
        description=data.description,
        filter_rules=[r.model_dump() for r in data.filter_rules],
        nl_query=data.nl_query,
        filter_type=data.filter_type,
        customer_count=count,
    )
    db.add(segment)
    db.commit()
    db.refresh(segment)
    return segment


@app.get("/api/segments", response_model=List[schemas.SegmentOut])
def list_segments(db: Session = Depends(get_db)):
    return db.query(models.Segment).order_by(desc(models.Segment.created_at)).all()


@app.get("/api/segments/{segment_id}", response_model=schemas.SegmentOut)
def get_segment(segment_id: str, db: Session = Depends(get_db)):
    s = db.query(models.Segment).filter(models.Segment.id == segment_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Segment not found")
    return s


@app.get("/api/segments/{segment_id}/preview", response_model=schemas.SegmentPreview)
def preview_segment(segment_id: str, db: Session = Depends(get_db)):
    s = db.query(models.Segment).filter(models.Segment.id == segment_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Segment not found")
    rules = [schemas.FilterRule(**r) for r in s.filter_rules]
    count, sample = evaluate_segment(db, rules)
    return schemas.SegmentPreview(count=count, sample_customers=sample)


@app.post("/api/segments/preview-rules", response_model=schemas.SegmentPreview)
def preview_rules(data: schemas.SegmentCreate, db: Session = Depends(get_db)):
    count, sample = evaluate_segment(db, data.filter_rules)
    return schemas.SegmentPreview(count=count, sample_customers=sample)


# ─── Campaigns ───────────────────────────────────────────────────────────────

@app.post("/api/campaigns", response_model=schemas.CampaignOut, status_code=201)
def create_campaign(data: schemas.CampaignCreate, db: Session = Depends(get_db)):
    segment = db.query(models.Segment).filter(
        models.Segment.id == data.segment_id
    ).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    campaign = models.Campaign(
        name=data.name,
        segment_id=data.segment_id,
        channel=data.channel,
        message_template=data.message_template,
        ai_generated_message=data.ai_generated_message,
        scheduled_at=data.scheduled_at,
        status=models.CampaignStatus.DRAFT,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@app.get("/api/campaigns", response_model=List[schemas.CampaignOut])
def list_campaigns(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    q = db.query(models.Campaign)
    if status:
        q = q.filter(models.Campaign.status == status)
    return q.order_by(desc(models.Campaign.created_at)).offset(skip).limit(limit).all()


@app.get("/api/campaigns/{campaign_id}", response_model=schemas.CampaignOut)
def get_campaign(campaign_id: str, db: Session = Depends(get_db)):
    c = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return c


@app.post("/api/campaigns/{campaign_id}/send")
async def send_campaign(
    campaign_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    campaign = db.query(models.Campaign).filter(
        models.Campaign.id == campaign_id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    if campaign.status == models.CampaignStatus.RUNNING:
        raise HTTPException(status_code=409, detail="Campaign is already running")
    if campaign.status == models.CampaignStatus.COMPLETED:
        raise HTTPException(status_code=409, detail="Campaign already completed")

    background_tasks.add_task(execute_campaign_send, campaign_id, db)
    return {"message": "Campaign send initiated", "campaign_id": campaign_id}


@app.get("/api/campaigns/{campaign_id}/stats", response_model=schemas.CampaignStats)
def get_campaign_stats(campaign_id: str, db: Session = Depends(get_db)):
    c = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")

    delivery_rate = c.total_delivered / c.total_sent if c.total_sent > 0 else 0
    open_rate = c.total_opened / c.total_sent if c.total_sent > 0 else 0
    click_rate = c.total_clicked / c.total_sent if c.total_sent > 0 else 0

    return schemas.CampaignStats(
        campaign_id=c.id,
        campaign_name=c.name,
        status=c.status.value,
        channel=c.channel.value,
        total_sent=c.total_sent,
        total_delivered=c.total_delivered,
        total_failed=c.total_failed,
        total_opened=c.total_opened,
        total_clicked=c.total_clicked,
        delivery_rate=round(delivery_rate, 4),
        open_rate=round(open_rate, 4),
        click_rate=round(click_rate, 4),
    )


@app.get("/api/campaigns/{campaign_id}/communications", response_model=List[schemas.CommunicationOut])
def get_campaign_communications(
    campaign_id: str,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    q = db.query(models.Communication).filter(
        models.Communication.campaign_id == campaign_id
    )
    if status:
        q = q.filter(models.Communication.status == status)
    return q.offset(skip).limit(limit).all()


# ─── Receipt Callback ─────────────────────────────────────────────────────────

@app.post("/api/receipt")
def handle_receipt(data: schemas.ReceiptCallback, db: Session = Depends(get_db)):
    success = process_receipt_callback(
        communication_id=data.communication_id,
        event=data.event,
        timestamp=data.timestamp,
        db=db,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Communication not found")
    return {"status": "ok", "communication_id": data.communication_id, "event": data.event}


# ─── AI Endpoints ─────────────────────────────────────────────────────────────

@app.post("/api/ai/segment", response_model=schemas.NLSegmentResponse)
def ai_parse_segment(data: schemas.NLSegmentRequest):
    """Convert natural language to segment filter rules."""
    return nl_to_segment_filters(data.query)


@app.post("/api/ai/draft-message", response_model=schemas.MessageDraftResponse)
def ai_draft_message(data: schemas.MessageDraftRequest, db: Session = Depends(get_db)):
    """Draft AI message variants for a campaign."""
    segment = db.query(models.Segment).filter(
        models.Segment.id == data.segment_id
    ).first()
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    segment_desc = segment.description or segment.name
    return draft_campaign_messages(
        channel=data.channel,
        segment_description=segment_desc,
        campaign_goal=data.campaign_goal,
        brand_name=data.brand_name,
    )


@app.post("/api/ai/campaign-insight", response_model=schemas.CampaignInsightResponse)
def ai_campaign_insight(data: schemas.CampaignInsightRequest, db: Session = Depends(get_db)):
    """Generate AI insights for a campaign."""
    c = db.query(models.Campaign).filter(models.Campaign.id == data.campaign_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")

    stats = {
        "total_sent": c.total_sent,
        "total_delivered": c.total_delivered,
        "total_opened": c.total_opened,
        "total_clicked": c.total_clicked,
        "total_failed": c.total_failed,
        "delivery_rate": c.total_delivered / c.total_sent if c.total_sent > 0 else 0,
        "open_rate": c.total_opened / c.total_sent if c.total_sent > 0 else 0,
        "click_rate": c.total_clicked / c.total_sent if c.total_sent > 0 else 0,
    }
    return generate_campaign_insight(
        campaign_name=c.name,
        channel=c.channel.value,
        stats=stats,
    )


@app.get("/api/ai/suggest-segments")
def ai_suggest_segments():
    """Return AI-suggested segment templates."""
    return suggest_segments({})
