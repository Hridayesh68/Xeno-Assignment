import re
from typing import List, Dict, Any
from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks
import models
import schemas
from segment_engine import evaluate_segment
from campaign_service import execute_campaign_send

def execute_database_query(query: str, db: Session) -> Dict[str, Any]:
    """
    Execute a read-only SQL query on the database.
    Only SELECT queries are allowed for safety.
    """
    clean_query = query.strip()
    
    # Simple regex to check for SELECT and block writing keywords
    if not re.match(r"^\s*select\b", clean_query, re.IGNORECASE):
        return {"error": "Only SELECT queries are allowed for security reasons."}
        
    forbidden_keywords = ["insert", "update", "delete", "drop", "truncate", "alter", "create", "grant", "revoke"]
    for word in forbidden_keywords:
        # Check for matching words with word boundaries
        pattern = r"\b" + re.escape(word) + r"\b"
        if re.search(pattern, clean_query, re.IGNORECASE):
            return {"error": f"Keyword '{word}' is forbidden in read-only queries."}
            
    try:
        result = db.execute(text(clean_query))
        
        # If it's a SELECT query, it should return rows
        if result.returns_rows:
            columns = list(result.keys())
            rows = []
            for row in result.all():
                row_dict = {}
                for col, val in zip(columns, row):
                    # Format datetime fields to string to avoid JSON serialization issues
                    if isinstance(val, (models.datetime, models.DateTime)):
                        row_dict[col] = val.isoformat()
                    else:
                        row_dict[col] = val
                rows.append(row_dict)
            return {"columns": columns, "rows": rows, "count": len(rows)}
        else:
            return {"message": "Query executed successfully, no rows returned."}
    except Exception as e:
        return {"error": str(e)}

def create_audience_segment(name: str, description: str, filter_rules: List[Dict[str, Any]], db: Session) -> Dict[str, Any]:
    """
    Programmatically create a new audience segment.
    """
    try:
        # Validate rules schema
        schemas_rules = [schemas.FilterRule(**r) for r in filter_rules]
        
        # Evaluate customer count matching the rules
        count, _ = evaluate_segment(db, schemas_rules)
        
        segment = models.Segment(
            name=name,
            description=description,
            filter_rules=filter_rules,
            nl_query="Created via Xeno Chat Agent",
            filter_type=models.SegmentFilterType.AI,
            customer_count=count,
        )
        db.add(segment)
        db.commit()
        db.refresh(segment)
        
        return {
            "success": True,
            "segment_id": segment.id,
            "name": segment.name,
            "customer_count": segment.customer_count,
            "message": f"Audience segment '{name}' successfully created with {count} matching customers."
        }
    except Exception as e:
        db.rollback()
        return {"error": str(e)}

def draft_and_send_campaign(
    name: str, 
    segment_id: str, 
    channel: str, 
    message_template: str, 
    db: Session, 
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """
    Draft a campaign and dispatch it asynchronously.
    """
    try:
        # Validate segment
        segment = db.query(models.Segment).filter(models.Segment.id == segment_id).first()
        if not segment:
            return {"error": f"Segment with ID '{segment_id}' not found."}
            
        # Validate channel enum
        try:
            channel_enum = models.ChannelType(channel.lower())
        except ValueError:
            return {"error": f"Invalid channel '{channel}'. Supported channels: whatsapp, sms, email, rcs"}
            
        campaign = models.Campaign(
            name=name,
            segment_id=segment_id,
            channel=channel_enum,
            message_template=message_template,
            ai_generated_message=True,
            status=models.CampaignStatus.DRAFT,
        )
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
        
        # Launch campaign send asynchronously using background tasks
        background_tasks.add_task(execute_campaign_send, campaign.id, db)
        
        return {
            "success": True,
            "campaign_id": campaign.id,
            "name": campaign.name,
            "status": "initiated",
            "message": f"Campaign '{name}' has been created and dispatch is running in background."
        }
    except Exception as e:
        db.rollback()
        return {"error": str(e)}

# Define tools schema for LLM tool calling (Groq / OpenAI compatible format)
AGENT_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "execute_database_query",
            "description": "Execute a read-only SQL query on the database. Use this tool to answer quantitative questions, check customer counts, retrieve lists of campaigns, segments, cities, order stats, and other data metrics.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "SQL SELECT query to run (read-only). Example: 'SELECT count(*), city FROM customers GROUP BY city ORDER BY count(*) DESC'"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_audience_segment",
            "description": "Create a new audience segment based on specific rules. Rules filter customer attributes: total_spend, order_count, last_order_days, city, tags, created_days.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Short descriptive name for the segment."
                    },
                    "description": {
                        "type": "string",
                        "description": "Brief explanation of who this segment targets."
                    },
                    "filter_rules": {
                        "type": "array",
                        "description": "List of rule objects.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "field": {
                                    "type": "string",
                                    "enum": ["total_spend", "order_count", "last_order_days", "city", "tags", "created_days"]
                                },
                                "operator": {
                                    "type": "string",
                                    "enum": ["gt", "lt", "gte", "lte", "eq", "neq", "contains", "in"]
                                },
                                "value": {
                                    "type": "string",
                                    "description": "Value to filter by. Numbers for spend/count/days, strings for city/tags."
                                }
                            },
                            "required": ["field", "operator", "value"]
                        }
                    }
                },
                "required": ["name", "description", "filter_rules"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "draft_and_send_campaign",
            "description": "Draft a campaign targeting a specific audience segment, write a template, and send it asynchronously.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name of the campaign."
                    },
                    "segment_id": {
                        "type": "string",
                        "description": "ID of the target audience segment (UUID string)."
                    },
                    "channel": {
                        "type": "string",
                        "enum": ["whatsapp", "sms", "email", "rcs"]
                    },
                    "message_template": {
                        "type": "string",
                        "description": "Personalized message copy. Use {{name}} as the personalization token for the customer's first name."
                    }
                },
                "required": ["name", "segment_id", "channel", "message_template"]
            }
        }
    }
]
