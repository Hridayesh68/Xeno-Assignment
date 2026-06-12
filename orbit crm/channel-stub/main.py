"""
Channel Stub Service — Xeno CRM Assignment
==========================================
Simulates a real messaging channel (WhatsApp, SMS, Email, RCS).

Flow:
1. CRM POSTs to /channel/send with communication details
2. Stub immediately returns 202 Accepted
3. Background task simulates delivery timing (1-8 seconds)
4. Fires one or more callback events to CRM /api/receipt:
   - delivered (70% chance)
   - failed (10% chance)  
   - opened (50% of delivered)
   - clicked (25% of opened)
5. Each event is a separate callback to model real async delivery

This models real messaging providers like Twilio, Gupshup, MSG91.
"""
import asyncio
import random
import logging
from datetime import datetime
from typing import Optional, Dict, Any

import httpx
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic_settings import BaseSettings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("channel-stub")


class Settings(BaseSettings):
    crm_receipt_url: str = "http://localhost:8000/api/receipt"
    port: int = 8001

    class Config:
        env_file = ".env"


settings = Settings()

app = FastAPI(
    title="Xeno Channel Stub",
    description="Simulates messaging channel delivery with async callbacks",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Delivery probability config per channel ──────────────────────────────────
CHANNEL_PROFILES = {
    "whatsapp": {
        "delivery_rate": 0.92,
        "open_rate": 0.68,      # of delivered
        "click_rate": 0.22,     # of opened
        "delivery_delay": (2, 8),
        "open_delay": (5, 120),
        "click_delay": (10, 300),
    },
    "sms": {
        "delivery_rate": 0.88,
        "open_rate": 0.45,
        "click_rate": 0.12,
        "delivery_delay": (1, 5),
        "open_delay": (5, 60),
        "click_delay": (10, 200),
    },
    "email": {
        "delivery_rate": 0.96,
        "open_rate": 0.28,
        "click_rate": 0.08,
        "delivery_delay": (3, 15),
        "open_delay": (30, 600),
        "click_delay": (60, 1200),
    },
    "rcs": {
        "delivery_rate": 0.85,
        "open_rate": 0.55,
        "click_rate": 0.18,
        "delivery_delay": (2, 10),
        "open_delay": (5, 180),
        "click_delay": (15, 400),
    },
}

DEFAULT_PROFILE = CHANNEL_PROFILES["sms"]

# Track stats
stats = {
    "total_received": 0,
    "callbacks_sent": 0,
    "callback_failures": 0,
}


# ─── Schemas ─────────────────────────────────────────────────────────────────

class SendRequest(BaseModel):
    communication_id: str
    recipient: Dict[str, str]
    message: str
    channel: str
    campaign_id: str
    callback_url: Optional[str] = None


# ─── Callback sender ─────────────────────────────────────────────────────────

async def fire_callback(
    communication_id: str,
    event: str,
    callback_url: str,
    metadata: Optional[Dict] = None,
    max_retries: int = 3,
):
    """Fire a single callback to the CRM receipt endpoint with retry logic."""
    payload = {
        "communication_id": communication_id,
        "event": event,
        "timestamp": datetime.utcnow().isoformat(),
        "metadata": metadata or {},
    }

    for attempt in range(1, max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(callback_url, json=payload)
                if response.status_code in (200, 201):
                    stats["callbacks_sent"] += 1
                    logger.info(f"✅ Callback sent: {event} for {communication_id[:8]}...")
                    return True
                else:
                    logger.warning(
                        f"Callback attempt {attempt} failed ({response.status_code}): "
                        f"{event} for {communication_id[:8]}"
                    )
        except Exception as e:
            logger.warning(f"Callback attempt {attempt} error: {e}")

        if attempt < max_retries:
            await asyncio.sleep(2 ** attempt)  # exponential backoff: 2s, 4s

    stats["callback_failures"] += 1
    logger.error(f"❌ All {max_retries} callback attempts failed for {communication_id[:8]}")
    return False


async def simulate_delivery(request: SendRequest):
    """
    Simulate the full lifecycle of a communication:
    pending → delivered/failed → opened → clicked
    
    Uses per-channel probability profiles and realistic delays.
    Compresses time (1 real second ≈ 1 simulated minute) for demo purposes.
    """
    channel = request.channel.lower()
    profile = CHANNEL_PROFILES.get(channel, DEFAULT_PROFILE)
    comm_id = request.communication_id
    callback_url = request.callback_url or settings.crm_receipt_url

    # Time compression factor: 1 real second = ~30 simulated seconds
    # So real 3s delay = simulated 90s = 1.5 mins delivery time
    TIME_COMPRESSION = 0.3  # multiply all delays by this for demo

    # Step 1: Simulate delivery (or failure)
    delivery_delay = random.uniform(*profile["delivery_delay"]) * TIME_COMPRESSION
    await asyncio.sleep(delivery_delay)

    delivered = random.random() < profile["delivery_rate"]

    if not delivered:
        await fire_callback(comm_id, "failed", callback_url, {"reason": "Number unreachable"})
        return

    await fire_callback(comm_id, "delivered", callback_url)

    # Step 2: Simulate open
    opened = random.random() < profile["open_rate"]
    if not opened:
        return

    open_delay = random.uniform(*profile["open_delay"]) * TIME_COMPRESSION
    await asyncio.sleep(open_delay)
    await fire_callback(comm_id, "opened", callback_url)

    # Step 3: Simulate click
    clicked = random.random() < profile["click_rate"]
    if not clicked:
        return

    click_delay = random.uniform(*profile["click_delay"]) * TIME_COMPRESSION
    await asyncio.sleep(click_delay)
    await fire_callback(comm_id, "clicked", callback_url, {"url": "https://brand.com/offer"})


# ─── Routes ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "xeno-channel-stub",
        "stats": stats,
    }


@app.post("/channel/send", status_code=202)
async def receive_send_request(
    request: SendRequest,
    background_tasks: BackgroundTasks,
):
    """
    Accept a communication from the CRM.
    Returns 202 immediately, then fires callbacks asynchronously.
    """
    stats["total_received"] += 1
    logger.info(
        f"📨 Received send request: {request.communication_id[:8]}... "
        f"via {request.channel} to {request.recipient.get('phone') or request.recipient.get('email')}"
    )

    background_tasks.add_task(simulate_delivery, request)

    return {
        "status": "accepted",
        "communication_id": request.communication_id,
        "message": "Communication queued for delivery simulation",
    }


@app.get("/channel/stats")
def get_stats():
    """Return stub statistics."""
    return stats
