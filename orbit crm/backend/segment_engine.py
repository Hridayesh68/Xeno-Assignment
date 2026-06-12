"""
Segment filter evaluation engine.
Converts a list of FilterRules into a SQLAlchemy query filter.
"""
from datetime import datetime, timedelta
from typing import List, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, String
import models
from schemas import FilterRule


SUPPORTED_FIELDS = {
    "total_spend",
    "order_count",
    "last_order_days",  # days since last order
    "city",
    "tags",
    "created_days",  # days since account created
}

SUPPORTED_OPERATORS = {"gt", "lt", "gte", "lte", "eq", "neq", "contains", "in"}


def build_customer_query(db: Session, filter_rules: List[FilterRule]):
    """Build a SQLAlchemy query from a list of FilterRule objects."""
    query = db.query(models.Customer)
    conditions = []

    for rule in filter_rules:
        field = rule.field
        operator = rule.operator
        value = rule.value

        if field == "total_spend":
            col = models.Customer.total_spend
            conditions.append(_apply_numeric_op(col, operator, float(value)))

        elif field == "order_count":
            col = models.Customer.order_count
            conditions.append(_apply_numeric_op(col, operator, int(value)))

        elif field == "last_order_days":
            # last_order_days gt 30 means last order was more than 30 days ago
            cutoff = datetime.utcnow() - timedelta(days=float(value))
            if operator in ("gt", "gte"):
                conditions.append(models.Customer.last_order_at < cutoff)
            elif operator in ("lt", "lte"):
                conditions.append(models.Customer.last_order_at > cutoff)

        elif field == "city":
            col = models.Customer.city
            if operator == "eq":
                conditions.append(col == value)
            elif operator == "neq":
                conditions.append(col != value)
            elif operator == "in":
                conditions.append(col.in_(value if isinstance(value, list) else [value]))
            elif operator == "contains":
                conditions.append(col.ilike(f"%{value}%"))

        elif field == "tags":
            # JSON contains check
            if operator in ("contains", "eq"):
                tag = value if isinstance(value, str) else value[0]
                # PostgreSQL JSON array contains
                conditions.append(
                    models.Customer.tags.cast(models.String).contains(tag)
                )

        elif field == "created_days":
            cutoff = datetime.utcnow() - timedelta(days=float(value))
            conditions.append(_apply_numeric_op(models.Customer.created_at, operator, cutoff))

    if conditions:
        query = query.filter(and_(*conditions))

    return query


def _apply_numeric_op(column, operator: str, value: Any):
    if operator == "gt":
        return column > value
    elif operator == "gte":
        return column >= value
    elif operator == "lt":
        return column < value
    elif operator == "lte":
        return column <= value
    elif operator == "eq":
        return column == value
    elif operator == "neq":
        return column != value
    else:
        raise ValueError(f"Unsupported operator: {operator}")


def evaluate_segment(db: Session, filter_rules: List[FilterRule]) -> tuple[int, list]:
    """Return (count, sample_customers) for given filters."""
    q = build_customer_query(db, filter_rules)
    total = q.count()
    sample = q.limit(5).all()
    return total, sample


def get_segment_customers(db: Session, filter_rules: List[FilterRule]) -> list:
    """Return all customers matching segment filters."""
    q = build_customer_query(db, filter_rules)
    return q.all()
