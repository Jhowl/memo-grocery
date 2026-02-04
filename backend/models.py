from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Table, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    
    purchases = relationship(
        "Purchase",
        secondary="purchase_categories",
        back_populates="categories"
    )

purchase_categories = Table(
    "purchase_categories",
    Base.metadata,
    Column("purchase_id", Integer, ForeignKey("purchases.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", Integer, ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True)
)

class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True) # E.g., "Kikkoman Soy Sauce"
    store = Column(String, index=True)
    date = Column(DateTime, default=datetime.utcnow)

    # The price you actually paid.
    price = Column(Float)

    # Optional discount metadata (for "price at register" vs "regular price").
    regular_price = Column(Float, nullable=True)
    discount_amount = Column(Float, nullable=True)

    # "Reference" rows are hidden by default in the UI (e.g. a pre-discount comparison row).
    is_reference = Column(Boolean, default=False, nullable=False)

    quantity = Column(Float) # The numeric amount (e.g. 500)
    unit = Column(String) # The unit string (e.g. "ml")
    
    # Calculated/Normalized fields
    normalized_quantity = Column(Float) # In standard unit (kg or L)
    standard_unit = Column(String) # "kg" or "L"
    unit_price = Column(Float) # Price per standard_unit
    
    image_path = Column(String, nullable=True)
    image_location_lat = Column(Float, nullable=True)
    image_location_lon = Column(Float, nullable=True)
    image_place = Column(String, nullable=True)
    image_store_guess = Column(String, nullable=True)
    image_taken_at = Column(DateTime, nullable=True)

    category_id = Column(Integer, ForeignKey("categories.id"))
    category = relationship("Category", foreign_keys=[category_id])
    categories = relationship(
        "Category",
        secondary="purchase_categories",
        back_populates="purchases"
    )
