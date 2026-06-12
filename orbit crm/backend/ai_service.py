"""
AI service — wraps OpenAI GPT-4o for:
1. Natural language → segment filter rules
2. Campaign message drafting
3. Campaign performance insights
4. Smart segment suggestions
"""
import json
from typing import List
from openai import OpenAI
from config import get_settings
from schemas import FilterRule, NLSegmentResponse, MessageDraftResponse, CampaignInsightResponse

settings = get_settings()

if settings.groq_api_key:
    client = OpenAI(
        api_key=settings.groq_api_key,
        base_url="https://api.groq.com/openai/v1"
    )
    model_name = settings.groq_model or "llama-3.3-70b-versatile"
else:
    client = OpenAI(api_key=settings.openai_api_key) if settings.openai_api_key else None
    model_name = "gpt-4o"

SYSTEM_SEGMENT_PROMPT = """
You are an AI assistant for a D2C brand CRM system. 
You convert natural language audience descriptions into structured filter rules.

Supported fields:
- total_spend: total amount spent by customer (numeric, in INR)
- order_count: number of orders placed
- last_order_days: days since last order (higher = more dormant)
- city: customer's city (string)
- tags: customer tags like "vip", "new", "coffee-lover" (string)
- created_days: days since account was created

Supported operators: gt, lt, gte, lte, eq, neq, contains, in

Always respond with valid JSON in this exact format:
{
  "filter_rules": [
    {"field": "...", "operator": "...", "value": ...}
  ],
  "segment_name": "Short descriptive name",
  "explanation": "What this segment captures and why"
}
"""

SYSTEM_MESSAGE_PROMPT = """
You are a creative marketing copywriter for D2C brands in India.
You write short, warm, personalised messages for WhatsApp, SMS, Email, and RCS.
Messages should feel human, not corporate. Use {{name}} as the personalization token.
Keep WhatsApp/SMS under 160 chars. Email can be longer.
Always respond with a JSON object:
{
  "variants": ["variant 1 text", "variant 2 text", "variant 3 text"],
  "reasoning": "Why these messages work for this segment"
}
"""

SYSTEM_INSIGHT_PROMPT = """
You are a campaign analytics expert. Given campaign performance stats, 
provide actionable insights in simple language for a marketer.
Respond with JSON:
{
  "summary": "One-sentence executive summary",
  "highlights": ["highlight 1", "highlight 2", "highlight 3"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}
"""


def _fallback_filter_rules(query: str) -> NLSegmentResponse:
    """Simple keyword-based fallback when OpenAI is unavailable."""
    rules = []
    name = "Custom Segment"
    explanation = "Filter based on query keywords"

    q = query.lower()
    if "dormant" in q or "inactive" in q or "haven't bought" in q or "not bought" in q:
        rules.append(FilterRule(field="last_order_days", operator="gt", value=60))
        name = "Dormant Customers"
    if "vip" in q or "high value" in q or "top" in q:
        rules.append(FilterRule(field="total_spend", operator="gt", value=5000))
        name = "High Value Customers"
    if "new" in q:
        rules.append(FilterRule(field="created_days", operator="lt", value=30))
        name = "New Customers"
    if "mumbai" in q:
        rules.append(FilterRule(field="city", operator="eq", value="Mumbai"))
    if "delhi" in q:
        rules.append(FilterRule(field="city", operator="eq", value="Delhi"))
    if "bangalore" in q or "bengaluru" in q:
        rules.append(FilterRule(field="city", operator="eq", value="Bangalore"))

    if not rules:
        rules.append(FilterRule(field="order_count", operator="gte", value=1))
        name = "All Customers"

    return NLSegmentResponse(filter_rules=rules, segment_name=name, explanation=explanation)


def nl_to_segment_filters(query: str) -> NLSegmentResponse:
    """Convert natural language to segment filter rules using GPT-4o."""
    if not client:
        return _fallback_filter_rules(query)

    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": SYSTEM_SEGMENT_PROMPT},
                {"role": "user", "content": f"Create a segment for: {query}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
        data = json.loads(response.choices[0].message.content)
        rules = [FilterRule(**r) for r in data["filter_rules"]]
        return NLSegmentResponse(
            filter_rules=rules,
            segment_name=data.get("segment_name", "AI Segment"),
            explanation=data.get("explanation", "")
        )
    except Exception as e:
        print(f"OpenAI error in nl_to_segment_filters: {e}")
        return _fallback_filter_rules(query)


def draft_campaign_messages(
    channel: str,
    segment_description: str,
    campaign_goal: str,
    brand_name: str = "our brand"
) -> MessageDraftResponse:
    """Draft 3 message variants for a campaign."""
    fallback_msgs = [
        f"Hi {{{{name}}}}, {brand_name} has something special for you! Check it out 🎁",
        f"Hello {{{{name}}}}! We've been thinking about you. Here's an exclusive offer from {brand_name} ✨",
        f"{{{{name}}}}, it's been a while! Come back and see what's new at {brand_name} 🛍️"
    ]

    if not client:
        return MessageDraftResponse(
            variants=fallback_msgs,
            reasoning="Default messages (AI unavailable)"
        )

    try:
        prompt = f"""
Channel: {channel}
Target Segment: {segment_description}
Campaign Goal: {campaign_goal or 'Drive engagement and purchases'}
Brand Name: {brand_name}

Write 3 distinct message variants for this campaign.
"""
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": SYSTEM_MESSAGE_PROMPT},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.8,
        )
        data = json.loads(response.choices[0].message.content)
        return MessageDraftResponse(
            variants=data.get("variants", fallback_msgs),
            reasoning=data.get("reasoning", "")
        )
    except Exception as e:
        print(f"OpenAI error in draft_campaign_messages: {e}")
        return MessageDraftResponse(variants=fallback_msgs, reasoning="Fallback messages")


def generate_campaign_insight(
    campaign_name: str,
    channel: str,
    stats: dict,
    avg_delivery_rate: float = 0.75,
    avg_open_rate: float = 0.25,
) -> CampaignInsightResponse:
    """Generate AI insights for a completed campaign."""
    fallback = CampaignInsightResponse(
        summary=f"Campaign '{campaign_name}' completed with {stats.get('total_sent', 0)} messages sent.",
        highlights=[
            f"Delivery rate: {stats.get('delivery_rate', 0):.1%}",
            f"Open rate: {stats.get('open_rate', 0):.1%}",
            f"Click rate: {stats.get('click_rate', 0):.1%}",
        ],
        suggestions=[
            "Try A/B testing message variants for better engagement.",
            "Consider re-targeting users who opened but didn't click."
        ]
    )

    if not client:
        return fallback

    try:
        prompt = f"""
Campaign: {campaign_name}
Channel: {channel}
Stats:
- Sent: {stats.get('total_sent', 0)}
- Delivered: {stats.get('total_delivered', 0)} ({stats.get('delivery_rate', 0):.1%})
- Opened: {stats.get('total_opened', 0)} ({stats.get('open_rate', 0):.1%})
- Clicked: {stats.get('total_clicked', 0)} ({stats.get('click_rate', 0):.1%})
- Failed: {stats.get('total_failed', 0)}

Benchmark averages: delivery={avg_delivery_rate:.1%}, open={avg_open_rate:.1%}

Provide insights for this marketing campaign.
"""
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": SYSTEM_INSIGHT_PROMPT},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.5,
        )
        data = json.loads(response.choices[0].message.content)
        return CampaignInsightResponse(
            summary=data.get("summary", ""),
            highlights=data.get("highlights", []),
            suggestions=data.get("suggestions", [])
        )
    except Exception as e:
        print(f"OpenAI error in generate_campaign_insight: {e}")
        return fallback


def suggest_segments(customer_stats: dict) -> list:
    """Suggest smart segments based on customer data distribution."""
    suggestions = [
        {
            "name": "Dormant High-Value",
            "description": "Customers who spent ₹5000+ but haven't ordered in 60+ days",
            "filter_rules": [
                {"field": "total_spend", "operator": "gte", "value": 5000},
                {"field": "last_order_days", "operator": "gt", "value": 60}
            ]
        },
        {
            "name": "First-Time Buyers",
            "description": "Customers with exactly 1 order — convert to repeat buyers",
            "filter_rules": [
                {"field": "order_count", "operator": "eq", "value": 1}
            ]
        },
        {
            "name": "Loyal Champions",
            "description": "Customers with 5+ orders and ₹10,000+ spend",
            "filter_rules": [
                {"field": "order_count", "operator": "gte", "value": 5},
                {"field": "total_spend", "operator": "gte", "value": 10000}
            ]
        },
        {
            "name": "Recent Joiners",
            "description": "New customers who joined in the last 30 days",
            "filter_rules": [
                {"field": "created_days", "operator": "lt", "value": 30}
            ]
        },
        {
            "name": "At-Risk Regulars",
            "description": "Previously active customers who haven't ordered in 30-60 days",
            "filter_rules": [
                {"field": "order_count", "operator": "gte", "value": 3},
                {"field": "last_order_days", "operator": "gt", "value": 30},
                {"field": "last_order_days", "operator": "lte", "value": 60}
            ]
        }
    ]
    return suggestions
