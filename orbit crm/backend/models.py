import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, DateTime, Enum, 
    ForeignKey, Text, JSON, Boolean
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid


def gen_uuid():
    return str(uuid.uuid4())


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(20))
    city = Column(String(100))
    tags = Column(JSON, default=list)  # e.g. ["vip", "coffee-lover"]
    total_spend = Column(Float, default=0.0)
    order_count = Column(Integer, default=0)
    last_order_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")
    communications = relationship("Communication", back_populates="customer", cascade="all, delete-orphan")


class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=gen_uuid)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    items = Column(JSON, default=list)  # [{"name": "...", "qty": 1, "price": 100}]
    channel = Column(String(50), default="online")  # online / in-store
    ordered_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    customer = relationship("Customer", back_populates="orders")


class SegmentFilterType(str, enum.Enum):
    MANUAL = "manual"
    AI = "ai"


class Segment(Base):
    __tablename__ = "segments"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    filter_rules = Column(JSON, nullable=False)  # structured filter object
    nl_query = Column(Text, nullable=True)  # original natural language query if AI
    filter_type = Column(Enum(SegmentFilterType), default=SegmentFilterType.MANUAL)
    customer_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    campaigns = relationship("Campaign", back_populates="segment", cascade="all, delete-orphan")


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"


class ChannelType(str, enum.Enum):
    WHATSAPP = "whatsapp"
    SMS = "sms"
    EMAIL = "email"
    RCS = "rcs"


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String(255), nullable=False)
    segment_id = Column(String, ForeignKey("segments.id"), nullable=False)
    channel = Column(Enum(ChannelType), nullable=False)
    message_template = Column(Text, nullable=False)
    ai_generated_message = Column(Boolean, default=False)
    status = Column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)
    scheduled_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Stats (denormalized for fast reads)
    total_sent = Column(Integer, default=0)
    total_delivered = Column(Integer, default=0)
    total_failed = Column(Integer, default=0)
    total_opened = Column(Integer, default=0)
    total_clicked = Column(Integer, default=0)

    segment = relationship("Segment", back_populates="campaigns")
    communications = relationship("Communication", back_populates="campaign", cascade="all, delete-orphan")


class CommunicationStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    OPENED = "opened"
    CLICKED = "clicked"


class Communication(Base):
    __tablename__ = "communications"

    id = Column(String, primary_key=True, default=gen_uuid)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False)
    channel = Column(Enum(ChannelType), nullable=False)
    message = Column(Text, nullable=False)  # personalized message
    status = Column(Enum(CommunicationStatus), default=CommunicationStatus.PENDING)
    failed_reason = Column(Text, nullable=True)

    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    opened_at = Column(DateTime, nullable=True)
    clicked_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    campaign = relationship("Campaign", back_populates="communications")
    customer = relationship("Customer", back_populates="communications")


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
