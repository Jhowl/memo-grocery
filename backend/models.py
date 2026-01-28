from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    
    purchases = relationship("Purchase", back_populates="category")

class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True) # E.g., "Kikkoman Soy Sauce"
    store = Column(String, index=True)
    date = Column(DateTime, default=datetime.utcnow)
    price = Column(Float)
    quantity = Column(Float) # The numeric amount (e.g. 500)
    unit = Column(String) # The unit string (e.g. "ml")
    
    # Calculated/Normalized fields
    normalized_quantity = Column(Float) # In standard unit (kg or L)
    standard_unit = Column(String) # "kg" or "L"
    unit_price = Column(Float) # Price per standard_unit
    
    image_path = Column(String, nullable=True)
    
    category_id = Column(Integer, ForeignKey("categories.id"))
    category = relationship("Category", back_populates="purchases")
