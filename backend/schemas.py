from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    
    class Config:
        orm_mode = True

class PurchaseBase(BaseModel):
    name: str
    store: str
    date: datetime
    price: float
    quantity: float
    unit: str
    category_id: int

class PurchaseCreate(PurchaseBase):
    pass

class Purchase(PurchaseBase):
    id: int
    image_path: Optional[str] = None
    normalized_quantity: float
    standard_unit: str
    unit_price: float
    category: Optional[Category] = None

    class Config:
        orm_mode = True
