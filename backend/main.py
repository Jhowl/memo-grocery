from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil
import os
import uuid
import io
import json
import urllib.request
import urllib.parse
from PIL import Image, ExifTags
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

@app.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    db_category = crud.get_category(db, category_id=category_id)
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")

    purchase_count = crud.count_purchases_by_category(db, category_id=category_id)
    if purchase_count > 0:
        raise HTTPException(status_code=400, detail="Category has purchases; delete them first")

    crud.delete_category(db, category_id=category_id)
    return {"message": "Category deleted successfully"}

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

@app.put("/purchases/{purchase_id}", response_model=schemas.Purchase)
async def update_purchase(
    purchase_id: int,
    name: str = Form(...),
    store: str = Form(...),
    date: str = Form(...),
    price: float = Form(...),
    quantity: float = Form(...),
    unit: str = Form(...),
    category_id: int = Form(...),
    db: Session = Depends(get_db)
):
    from datetime import datetime
    try:
        date_obj = datetime.fromisoformat(date.replace('Z', '+00:00'))
    except ValueError:
        date_obj = datetime.now()

    purchase_data = schemas.PurchaseCreate(
        name=name,
        store=store,
        date=date_obj,
        price=price,
        quantity=quantity,
        unit=unit,
        category_id=category_id
    )

    db_purchase = crud.update_purchase(db=db, purchase_id=purchase_id, purchase=purchase_data)
    if not db_purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return db_purchase

@app.get("/")
def read_root():
    return {"message": "Welcome to Anti-Memo Grocery API"}

def _serialize_exif_value(value):
    if isinstance(value, (int, float, str, bool)):
        return value
    if isinstance(value, bytes):
        try:
            return value.decode('utf-8', errors='ignore')
        except Exception:
            return str(value)
    if isinstance(value, tuple):
        return [_serialize_exif_value(v) for v in value]
    return str(value)

def _rational_to_float(value):
    try:
        return float(value)
    except Exception:
        try:
            return value[0] / value[1]
        except Exception:
            return None

def _convert_gps_to_decimal(gps_data):
    def _get_coord(values):
        if not values or len(values) < 3:
            return None
        degrees = _rational_to_float(values[0])
        minutes = _rational_to_float(values[1])
        seconds = _rational_to_float(values[2])
        if degrees is None or minutes is None or seconds is None:
            return None
        return degrees + (minutes / 60.0) + (seconds / 3600.0)

    lat = _get_coord(gps_data.get('GPSLatitude'))
    lon = _get_coord(gps_data.get('GPSLongitude'))
    lat_ref = gps_data.get('GPSLatitudeRef')
    lon_ref = gps_data.get('GPSLongitudeRef')

    if lat is not None and lat_ref in ['S', 's']:
        lat = -lat
    if lon is not None and lon_ref in ['W', 'w']:
        lon = -lon

    if lat is None or lon is None:
        return None
    return {"latitude": lat, "longitude": lon}

def _reverse_geocode(latitude, longitude):
    try:
        params = urllib.parse.urlencode({
            "format": "jsonv2",
            "lat": latitude,
            "lon": longitude,
            "zoom": 18,
            "addressdetails": 1
        })
        url = f"https://nominatim.openstreetmap.org/reverse?{params}"
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "anti-memo-grocery/1.0"}
        )
        with urllib.request.urlopen(request, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
            address = data.get("address") or {}
            store_guess = (
                data.get("name")
                or address.get("shop")
                or address.get("amenity")
                or address.get("supermarket")
                or address.get("brand")
            )
            return {
                "display_name": data.get("display_name"),
                "address": address,
                "store_guess": store_guess
            }
    except Exception:
        return None

@app.post("/images/metadata")
async def read_image_metadata(file: UploadFile = File(...)):
    content = await file.read()
    image = Image.open(io.BytesIO(content))

    exif_data = {}
    gps_data = {}
    location = None

    raw_exif = image._getexif() if hasattr(image, "_getexif") else None
    if raw_exif:
        for tag, value in raw_exif.items():
            tag_name = ExifTags.TAGS.get(tag, tag)
            if tag_name == "GPSInfo":
                for gps_tag, gps_value in value.items():
                    gps_name = ExifTags.GPSTAGS.get(gps_tag, gps_tag)
                    gps_data[gps_name] = _serialize_exif_value(gps_value)
            else:
                exif_data[tag_name] = _serialize_exif_value(value)

    if gps_data:
        location = _convert_gps_to_decimal(gps_data)

    place = None
    if location:
        place = _reverse_geocode(location["latitude"], location["longitude"])

    return {
        "file": {
            "name": file.filename,
            "type": file.content_type,
            "size": len(content)
        },
        "image": {
            "format": image.format,
            "mode": image.mode,
            "width": image.width,
            "height": image.height
        },
        "exif": exif_data,
        "gps": gps_data,
        "location": location,
        "place": place
    }
