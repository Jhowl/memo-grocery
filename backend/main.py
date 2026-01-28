from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os
import uuid
import models, schemas, crud
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Anti-Memo Grocery API")

# CORS
origins = [
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for images
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.delete("/purchases/{purchase_id}")
def delete_purchase(purchase_id: int, db: Session = Depends(get_db)):
    success = crud.delete_purchase(db, purchase_id=purchase_id)
    if not success:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return {"message": "Purchase deleted successfully"}

@app.post("/categories/", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db)):
    db_category = crud.get_category_by_name(db, name=category.name)
    if db_category:
        raise HTTPException(status_code=400, detail="Category already exists")
    return crud.create_category(db=db, category=category)

@app.get("/categories/", response_model=List[schemas.Category])
def read_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_categories(db, skip=skip, limit=limit)

@app.post("/purchases/", response_model=schemas.Purchase)
async def create_purchase(
    name: str = Form(...),
    store: str = Form(...),
    date: str = Form(...), # Frontend sends ISO string
    price: float = Form(...),
    quantity: float = Form(...),
    unit: str = Form(...),
    category_id: int = Form(...),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    image_path = None
    if file:
        file_extension = file.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{file_extension}"
        file_location = f"uploads/{filename}"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        image_path = filename # Store relative path or just filename
    
    # Parse date string to datetime
    from datetime import datetime
    try:
        date_obj = datetime.fromisoformat(date.replace('Z', '+00:00'))
    except ValueError:
        date_obj = datetime.now() # Fallback

    purchase_data = schemas.PurchaseCreate(
        name=name,
        store=store,
        date=date_obj,
        price=price,
        quantity=quantity,
        unit=unit,
        category_id=category_id
    )
    
    return crud.create_purchase(db=db, purchase=purchase_data, image_path=image_path)

@app.get("/purchases/", response_model=List[schemas.Purchase])
def read_purchases(skip: int = 0, limit: int = 100, category_id: int = None, db: Session = Depends(get_db)):
    return crud.get_purchases(db, skip=skip, limit=limit, category_id=category_id)

@app.get("/")
def read_root():
    return {"message": "Welcome to Anti-Memo Grocery API"}
