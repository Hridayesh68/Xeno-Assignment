"""
Campaign send service — handles the async send loop and receipt processing.
"""
import httpx
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
import models
from schemas import FilterRule
from segment_engine import get_segment_customers
from config import get_settings

settings = get_settings()


def personalize_message(template: str, customer: models.Customer) -> str:
    """Replace {{name}} and other tokens in message template."""
    msg = template.replace("{{name}}", customer.name.split()[0])
    msg = msg.replace("{{city}}", customer.city or "")
    msg = msg.replace("{{spend}}", f"₹{customer.total_spend:,.0f}")
    return msg


async def send_to_channel_stub(
    communication_id: str,
    recipient_phone: str,
    recipient_email: str,
    message: str,
    channel: str,
    campaign_id: str,
) -> bool:
    """Send a single communication to the channel stub service."""
    payload = {
        "communication_id": communication_id,
        "recipient": {
            "phone": recipient_phone,
            "email": recipient_email,
        },
        "message": message,
        "channel": channel,
        "campaign_id": campaign_id,
        "callback_url": f"{settings.crm_base_url}/api/receipt",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{settings.channel_stub_url}/channel/send",
                json=payload
            )
            return response.status_code == 202
    except Exception as e:
        print(f"Channel stub error for comm {communication_id}: {e}")
        return False


async def execute_campaign_send(campaign_id: str, db: Session) -> None:
    """
    Main send loop:
    1. Load campaign + segment
    2. Get all customers in segment
    3. Create communications
    4. Send to channel stub async
    5. Update campaign status
    """
    campaign = db.query(models.Campaign).filter(
        models.Campaign.id == campaign_id
    ).first()

    if not campaign:
        print(f"Campaign {campaign_id} not found")
        return

    segment = db.query(models.Segment).filter(
        models.Segment.id == campaign.segment_id
    ).first()

    if not segment:
        print(f"Segment {campaign.segment_id} not found")
        return

    # Update campaign status
    campaign.status = models.CampaignStatus.RUNNING
    campaign.started_at = datetime.utcnow()
    db.commit()

    # Get customers
    filter_rules = [FilterRule(**r) for r in segment.filter_rules]
    customers = get_segment_customers(db, filter_rules)

    if not customers:
        campaign.status = models.CampaignStatus.COMPLETED
        campaign.completed_at = datetime.utcnow()
        db.commit()
        return

    # Create communication records
    communications = []
    for customer in customers:
        personalized_msg = personalize_message(campaign.message_template, customer)
        comm = models.Communication(
            campaign_id=campaign.id,
            customer_id=customer.id,
            channel=campaign.channel,
            message=personalized_msg,
            status=models.CommunicationStatus.SENT,
            sent_at=datetime.utcnow(),
        )
        db.add(comm)
        communications.append((comm, customer))

    campaign.total_sent = len(communications)
    db.commit()
    db.refresh(campaign)

    # Re-fetch after commit to get IDs
    comm_records = db.query(models.Communication).filter(
        models.Communication.campaign_id == campaign_id
    ).all()

    # Async send to channel stub (batch of 10 at a time)
    async def send_batch(batch):
        tasks = []
        for comm, customer in batch:
            tasks.append(send_to_channel_stub(
                communication_id=comm.id,
                recipient_phone=customer.phone or "",
                recipient_email=customer.email,
                message=comm.message,
                channel=campaign.channel.value,
                campaign_id=campaign_id,
            ))
        return await asyncio.gather(*tasks)

    # Map comm_id to customer
    comm_customer_map = {comm.id: cust for comm, cust in communications}

    batch_size = 20
    for i in range(0, len(comm_records), batch_size):
        batch = [
            (comm, comm_customer_map.get(comm.id, customers[0]))
            for comm in comm_records[i:i + batch_size]
        ]
        await send_batch(batch)
        await asyncio.sleep(0.1)  # slight delay between batches

    print(f"Campaign {campaign_id}: sent {len(comm_records)} communications")


def process_receipt_callback(
    communication_id: str,
    event: str,
    timestamp: datetime,
    db: Session,
) -> bool:
    """
    Process a receipt callback from the channel stub.
    Updates communication status and campaign aggregate stats.
    """
    comm = db.query(models.Communication).filter(
        models.Communication.id == communication_id
    ).first()

    if not comm:
        return False

    event = event.lower()

    # Update communication record
    if event == "delivered":
        comm.status = models.CommunicationStatus.DELIVERED
        comm.delivered_at = timestamp
    elif event == "failed":
        comm.status = models.CommunicationStatus.FAILED
        comm.failed_at = timestamp
        comm.failed_reason = "Simulated delivery failure"
    elif event == "opened":
        if comm.status not in [models.CommunicationStatus.CLICKED]:
            comm.status = models.CommunicationStatus.OPENED
        comm.opened_at = timestamp
    elif event == "clicked":
        comm.status = models.CommunicationStatus.CLICKED
        comm.clicked_at = timestamp
    else:
        return False

    db.commit()

    # Update campaign aggregate stats
    update_campaign_stats(comm.campaign_id, db)
    return True


def update_campaign_stats(campaign_id: str, db: Session) -> None:
    """Recompute campaign aggregate stats from communications."""
    from sqlalchemy import func as sqlfunc

    campaign = db.query(models.Campaign).filter(
        models.Campaign.id == campaign_id
    ).first()
    if not campaign:
        return

    comms = db.query(models.Communication).filter(
        models.Communication.campaign_id == campaign_id
    ).all()

    campaign.total_sent = len(comms)
    campaign.total_delivered = sum(
        1 for c in comms if c.delivered_at is not None
    )
    campaign.total_failed = sum(
        1 for c in comms if c.status == models.CommunicationStatus.FAILED
    )
    campaign.total_opened = sum(
        1 for c in comms if c.opened_at is not None
    )
    campaign.total_clicked = sum(
        1 for c in comms if c.clicked_at is not None
    )

    # Mark completed if all comms have final status
    pending_count = sum(
        1 for c in comms
        if c.status in [models.CommunicationStatus.PENDING, models.CommunicationStatus.SENT]
    )
    if pending_count == 0 and campaign.status == models.CampaignStatus.RUNNING:
        campaign.status = models.CampaignStatus.COMPLETED
        campaign.completed_at = datetime.utcnow()

    db.commit()
