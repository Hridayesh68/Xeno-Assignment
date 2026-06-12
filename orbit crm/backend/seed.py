"""
Seed script — generates 500 realistic D2C brand customers + orders.
Run once: python seed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import random
from datetime import datetime, timedelta
from faker import Faker
from database import SessionLocal, engine
import models

fake = Faker("en_IN")  # Indian locale
models.Base.metadata.create_all(bind=engine)

CITIES = [
    "Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad",
    "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Surat",
    "Lucknow", "Chandigarh", "Kochi", "Indore", "Nagpur"
]

TAGS_POOL = [
    "vip", "new", "coffee-lover", "skincare-fan", "fashion",
    "repeat-buyer", "discount-seeker", "organic", "premium",
    "gifter", "seasonal", "loyal"
]

PRODUCT_CATALOG = {
    "Coffee Brand": [
        ("Cold Brew 500ml", 299), ("Espresso Blend 250g", 599),
        ("Subscription Box", 999), ("Filter Coffee Kit", 449),
        ("Mushroom Coffee", 799), ("Decaf Pack", 399),
    ],
    "Fashion Label": [
        ("Cotton Kurta", 1299), ("Linen Shirt", 1799),
        ("Denim Jacket", 2499), ("Ethnic Set", 3499),
        ("Handloom Saree", 5999), ("Sneakers", 2999),
    ],
    "Beauty Brand": [
        ("SPF 50 Sunscreen", 699), ("Vitamin C Serum", 1299),
        ("Hydrating Moisturizer", 899), ("Face Wash", 399),
        ("Retinol Eye Cream", 1499), ("Hair Mask", 599),
    ],
}

BRAND = "Coffee Brand"
PRODUCTS = PRODUCT_CATALOG[BRAND]


def random_date(start_days_ago: int, end_days_ago: int = 0) -> datetime:
    lo, hi = min(start_days_ago, end_days_ago), max(start_days_ago, end_days_ago)
    delta = random.randint(lo, hi)
    return datetime.utcnow() - timedelta(days=delta)


def seed():
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(models.Customer).count() > 10:
            print("Database already seeded. Skipping.")
            return

        print("Seeding 500 customers + orders...")
        customers = []

        for i in range(500):
            customer_type = random.choices(
                ["new", "active", "vip", "dormant", "at_risk"],
                weights=[0.15, 0.30, 0.15, 0.25, 0.15]
            )[0]

            tags = random.sample(TAGS_POOL, k=random.randint(0, 3))
            if customer_type == "vip":
                tags.append("vip")
            if customer_type == "new":
                tags.append("new")

            joined_days_ago = {
                "new": random.randint(1, 25),
                "active": random.randint(60, 400),
                "vip": random.randint(180, 600),
                "dormant": random.randint(90, 500),
                "at_risk": random.randint(60, 300),
            }[customer_type]

            c = models.Customer(
                name=fake.name(),
                email=fake.unique.email(),
                phone=f"+91{random.randint(7000000000, 9999999999)}",
                city=random.choice(CITIES),
                tags=list(set(tags)),
                created_at=datetime.utcnow() - timedelta(days=joined_days_ago),
            )
            db.add(c)
            db.flush()  # get ID

            # Generate orders based on customer type
            order_counts = {
                "new": (0, 1),
                "active": (2, 6),
                "vip": (5, 15),
                "dormant": (1, 4),
                "at_risk": (3, 7),
            }
            min_orders, max_orders = order_counts[customer_type]
            num_orders = random.randint(min_orders, max_orders)

            last_order_date = None
            total_spend = 0

            for j in range(num_orders):
                if customer_type == "dormant":
                    order_date = random_date(90, 200)
                elif customer_type == "at_risk":
                    order_date = random_date(35, 65)
                elif customer_type == "new":
                    order_date = random_date(joined_days_ago, 0)
                else:
                    order_date = random_date(min(joined_days_ago, 365), 0)

                num_items = random.randint(1, 3)
                items = []
                order_amount = 0
                for _ in range(num_items):
                    product_name, product_price = random.choice(PRODUCTS)
                    qty = random.randint(1, 2)
                    price = product_price * (1 + random.uniform(-0.05, 0.15))
                    price = round(price)
                    items.append({"name": product_name, "qty": qty, "price": price})
                    order_amount += price * qty

                order = models.Order(
                    customer_id=c.id,
                    amount=order_amount,
                    items=items,
                    channel=random.choice(["online", "in-store"]),
                    ordered_at=order_date,
                )
                db.add(order)
                total_spend += order_amount

                if last_order_date is None or order_date > last_order_date:
                    last_order_date = order_date

            # Update customer stats
            c.total_spend = round(total_spend, 2)
            c.order_count = num_orders
            c.last_order_at = last_order_date

            customers.append(c)

            if (i + 1) % 100 == 0:
                print(f"  {i + 1}/500 customers created...")

        db.commit()
        print(f"OK: Seeded {len(customers)} customers successfully!")
        
        # Print summary
        total_orders = db.query(models.Order).count()
        print(f"OK: Total orders: {total_orders}")

    except Exception as e:
        db.rollback()
        print(f"FAILED: Seed error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
