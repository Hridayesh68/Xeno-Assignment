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
    db.rollback()
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

def create_customer(name: str, email: str, phone: str = None, city: str = None, tags: List[str] = [], db: Session = None) -> Dict[str, Any]:
    """
    Create a new customer profile.
    """
    try:
        existing = db.query(models.Customer).filter(models.Customer.email == email).first()
        if existing:
            return {"error": f"Customer with email '{email}' already exists."}
            
        customer = models.Customer(
            name=name,
            email=email,
            phone=phone,
            city=city,
            tags=tags or []
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
        return {
            "success": True,
            "customer_id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "message": f"Customer '{name}' successfully created."
        }
    except Exception as e:
        db.rollback()
        return {"error": str(e)}

def delete_customer(customer_id: str, db: Session) -> Dict[str, Any]:
    """
    Delete a customer profile and all associated data.
    """
    try:
        customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
        if not customer:
            return {"error": f"Customer with ID '{customer_id}' not found."}
            
        db.delete(customer)
        db.commit()
        return {
            "success": True,
            "customer_id": customer_id,
            "message": f"Customer '{customer.name}' and all their orders/communications successfully deleted."
        }
    except Exception as e:
        db.rollback()
        return {"error": str(e)}

def create_user(name: str, email: str, password: str, db: Session) -> Dict[str, Any]:
    """
    Create/Register a new user (marketer).
    """
    try:
        from auth_utils import hash_password
        existing = db.query(models.User).filter(models.User.email == email).first()
        if existing:
            return {"error": f"User with email '{email}' already exists."}
            
        user = models.User(
            name=name,
            email=email,
            hashed_password=hash_password(password),
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return {
            "success": True,
            "user_id": user.id,
            "email": user.email,
            "message": f"User '{name}' ({email}) successfully created."
        }
    except Exception as e:
        db.rollback()
        return {"error": str(e)}

def delete_user(user_id: str, db: Session) -> Dict[str, Any]:
    """
    Delete a user profile.
    """
    try:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            return {"error": f"User with ID '{user_id}' not found."}
            
        db.delete(user)
        db.commit()
        return {
            "success": True,
            "user_id": user_id,
            "message": f"User '{user.name}' successfully deleted."
        }
    except Exception as e:
        db.rollback()
        return {"error": str(e)}

def delete_campaign(campaign_id: str, db: Session) -> Dict[str, Any]:
    """
    Delete a campaign and stop dispatch if running.
    """
    try:
        # 1. Try finding by exact ID first
        campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
        
        # 2. If not found, try to search by name/partial name case-insensitively
        if not campaign:
            # Clean up suffixes like _campaign_id, _id, etc.
            clean_name = campaign_id.replace("_campaign_id", "").replace("_id", "").replace("-", " ").replace("_", " ").strip()
            campaign = db.query(models.Campaign).filter(
                (models.Campaign.name.ilike(clean_name)) |
                (models.Campaign.name.ilike(f"%{clean_name}%"))
            ).first()
            
        if not campaign:
            return {"error": f"Campaign with ID or name resembling '{campaign_id}' not found."}
            
        campaign_id_actual = campaign.id
        campaign_name_actual = campaign.name

        # Stop dispatch if running (can just update status to STOPPED first, then delete)
        if campaign.status == models.CampaignStatus.RUNNING:
            campaign.status = models.CampaignStatus.STOPPED
            db.commit()
            
        db.delete(campaign)
        db.commit()
        return {
            "success": True,
            "campaign_id": campaign_id_actual,
            "message": f"Campaign '{campaign_name_actual}' successfully deleted."
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
    },
    {
        "type": "function",
        "function": {
            "name": "create_customer",
            "description": "Create a new D2C customer profile.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Customer full name."},
                    "email": {"type": "string", "description": "Customer unique email address."},
                    "phone": {"type": "string", "description": "Optional customer phone number."},
                    "city": {"type": "string", "description": "Optional city name."},
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional list of tags."
                    }
                },
                "required": ["name", "email"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_customer",
            "description": "Delete a customer profile and all their orders/communications.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {"type": "string", "description": "UUID string of the customer to delete."}
                },
                "required": ["customer_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_user",
            "description": "Create a new marketer/user account.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Full name of the user."},
                    "email": {"type": "string", "description": "User email address."},
                    "password": {"type": "string", "description": "User password."}
                },
                "required": ["name", "email", "password"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_user",
            "description": "Delete a marketer/user account.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string", "description": "UUID string of the user to delete."}
                },
                "required": ["user_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_campaign",
            "description": "Delete a campaign and stop its dispatch.",
            "parameters": {
                "type": "object",
                "properties": {
                    "campaign_id": {"type": "string", "description": "UUID string or name of the campaign to delete."}
                },
                "required": ["campaign_id"]
            }
        }
    }
]
