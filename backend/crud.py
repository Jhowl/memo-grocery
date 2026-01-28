from sqlalchemy.orm import Session
import models, schemas
from utils import calculate_unit_price

def get_category(db: Session, category_id: int):
    return db.query(models.Category).filter(models.Category.id == category_id).first()

def get_category_by_name(db: Session, name: str):
    return db.query(models.Category).filter(models.Category.name == name).first()

def create_category(db: Session, category: schemas.CategoryCreate):
    db_category = models.Category(name=category.name)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def get_categories(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Category).offset(skip).limit(limit).all()

def create_purchase(db: Session, purchase: schemas.PurchaseCreate, image_path: str = None):
    # Calculate unit price logic
    unit_price, std_unit, norm_qty = calculate_unit_price(
        purchase.price, purchase.quantity, purchase.unit
    )
    
    db_purchase = models.Purchase(
        name=purchase.name,
        store=purchase.store,
        date=purchase.date,
        price=purchase.price,
        quantity=purchase.quantity,
        unit=purchase.unit,
        image_path=image_path,
        category_id=purchase.category_id,
        normalized_quantity=norm_qty,
        standard_unit=std_unit,
        unit_price=unit_price
    )
    db.add(db_purchase)
    db.commit()
    db.refresh(db_purchase)
    return db_purchase

def get_purchases(db: Session, skip: int = 0, limit: int = 100, category_id: int = None):
    query = db.query(models.Purchase)
    if category_id:
        query = query.filter(models.Purchase.category_id == category_id)
    return query.order_by(models.Purchase.date.desc()).offset(skip).limit(limit).all()

def delete_purchase(db: Session, purchase_id: int):
    db_purchase = db.query(models.Purchase).filter(models.Purchase.id == purchase_id).first()
    if db_purchase:
        db.delete(db_purchase)
        db.commit()
        return True
    return False
