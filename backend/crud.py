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

def count_purchases_by_category(db: Session, category_id: int):
    return (
        db.query(models.Purchase)
        .join(models.Purchase.categories)
        .filter(models.Category.id == category_id)
        .distinct()
        .count()
    )

def create_purchase(
    db: Session,
    purchase: schemas.PurchaseCreate,
    image_path: str = None,
    image_location_lat: float = None,
    image_location_lon: float = None,
    image_place: str = None,
    image_store_guess: str = None,
    image_taken_at = None,
    category_ids = None
):
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
        image_location_lat=image_location_lat,
        image_location_lon=image_location_lon,
        image_place=image_place,
        image_store_guess=image_store_guess,
        image_taken_at=image_taken_at,
        category_id=purchase.category_id,
        normalized_quantity=norm_qty,
        standard_unit=std_unit,
        unit_price=unit_price
    )
    if category_ids:
        categories = db.query(models.Category).filter(models.Category.id.in_(category_ids)).all()
        db_purchase.categories = categories
    db.add(db_purchase)
    db.commit()
    db.refresh(db_purchase)
    return db_purchase

def get_purchases(db: Session, skip: int = 0, limit: int = 100, category_id: int = None):
    query = db.query(models.Purchase)
    if category_id:
        query = query.join(models.Purchase.categories).filter(models.Category.id == category_id).distinct()
    return query.order_by(models.Purchase.date.desc()).offset(skip).limit(limit).all()

def delete_purchase(db: Session, purchase_id: int):
    db_purchase = db.query(models.Purchase).filter(models.Purchase.id == purchase_id).first()
    if db_purchase:
        db.delete(db_purchase)
        db.commit()
        return True
    return False

def delete_category(db: Session, category_id: int):
    db_category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if db_category:
        db.delete(db_category)
        db.commit()
        return True
    return False

def update_purchase(db: Session, purchase_id: int, purchase: schemas.PurchaseCreate):
    db_purchase = db.query(models.Purchase).filter(models.Purchase.id == purchase_id).first()
    if not db_purchase:
        return None

    unit_price, std_unit, norm_qty = calculate_unit_price(
        purchase.price, purchase.quantity, purchase.unit
    )

    db_purchase.name = purchase.name
    db_purchase.store = purchase.store
    db_purchase.date = purchase.date
    db_purchase.price = purchase.price
    db_purchase.quantity = purchase.quantity
    db_purchase.unit = purchase.unit
    db_purchase.category_id = purchase.category_id
    db_purchase.normalized_quantity = norm_qty
    db_purchase.standard_unit = std_unit
    db_purchase.unit_price = unit_price
    if purchase.category_id:
        category = db.query(models.Category).filter(models.Category.id == purchase.category_id).first()
        if category:
            db_purchase.categories = [category]

    db.commit()
    db.refresh(db_purchase)
    return db_purchase
