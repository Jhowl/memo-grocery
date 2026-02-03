from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
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
# Allow local dev + LAN access (so phones/tablets hitting http://192.168.x.x:8081 can call the API)
origins = [
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$", 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for images
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/health")
def health_check():
    return {"status": "ok"}

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
    category_ids: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    image_path = None
    image_location_lat = None
    image_location_lon = None
    image_place = None
    image_store_guess = None
    image_taken_at = None
    if file:
        file_extension = file.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{file_extension}"
        file_location = f"uploads/{filename}"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        image_path = filename # Store relative path or just filename
        try:
            with Image.open(file_location) as image:
                metadata = _extract_image_metadata_from_image(image)
            location = metadata.get("location") or {}
            image_location_lat = location.get("latitude")
            image_location_lon = location.get("longitude")
            place = metadata.get("place") or {}
            image_place = place.get("display_name")
            image_store_guess = place.get("store_guess")
            image_taken_at = metadata.get("taken_at")
        except Exception:
            pass
    
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
    
    parsed_category_ids = None
    if category_ids:
        try:
            parsed = json.loads(category_ids)
            if isinstance(parsed, list):
                parsed_category_ids = [int(v) for v in parsed if str(v).isdigit()]
        except Exception:
            parsed_category_ids = [int(v) for v in category_ids.split(",") if v.strip().isdigit()]

    if not parsed_category_ids:
        parsed_category_ids = [category_id]

    return crud.create_purchase(
        db=db,
        purchase=purchase_data,
        image_path=image_path,
        image_location_lat=image_location_lat,
        image_location_lon=image_location_lon,
        image_place=image_place,
        image_store_guess=image_store_guess,
        image_taken_at=image_taken_at,
        category_ids=parsed_category_ids
    )

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

def _parse_exif_datetime(value):
    if not value:
        return None
    if isinstance(value, str):
        try:
            # EXIF format: "YYYY:MM:DD HH:MM:SS"
            from datetime import datetime
            return datetime.strptime(value, "%Y:%m:%d %H:%M:%S")
        except Exception:
            return None
    return None


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

def _extract_image_metadata_from_image(image):
    exif_data = {}
    gps_data = {}
    location = None
    taken_at = None

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

    taken_at = (
        _parse_exif_datetime(exif_data.get("DateTimeOriginal"))
        or _parse_exif_datetime(exif_data.get("DateTimeDigitized"))
        or _parse_exif_datetime(exif_data.get("DateTime"))
    )

    place = None
    if location:
        place = _reverse_geocode(location["latitude"], location["longitude"])

    return {
        "exif": exif_data,
        "gps": gps_data,
        "location": location,
        "place": place,
        "taken_at": taken_at
    }

def _pick_store_guess(data, address):
    # Prefer explicit business/amenity tags over generic names (often roads).
    for key in ("shop", "amenity", "supermarket", "brand"):
        value = address.get(key)
        if value:
            return value

    name = data.get("name") or (data.get("namedetails") or {}).get("name")
    category = data.get("category")
    place_type = data.get("type")

    allowed_categories = {
        "shop",
        "amenity",
        "tourism",
        "leisure",
        "office",
        "building",
    }
    allowed_types = {
        "supermarket",
        "convenience",
        "grocery",
        "bakery",
        "butcher",
        "marketplace",
        "department_store",
        "discount_store",
        "wholesale",
        "pharmacy",
        "mall",
    }

    if name and (category in allowed_categories or place_type in allowed_types):
        return name
    return None

def _reverse_geocode(latitude, longitude):
    try:
        params = urllib.parse.urlencode({
            "format": "jsonv2",
            "lat": latitude,
            "lon": longitude,
            "zoom": 18,
            "addressdetails": 1,
            "namedetails": 1
        })
        url = f"https://nominatim.openstreetmap.org/reverse?{params}"
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "anti-memo-grocery/1.0"}
        )
        with urllib.request.urlopen(request, timeout=5) as response:
            data = json.loads(response.read().decode("utf-8"))
            address = data.get("address") or {}
            store_guess = _pick_store_guess(data, address)
            return {
                "display_name": data.get("display_name"),
                "address": address,
                "store_guess": store_guess
            }
    except Exception:
        return None

class AgentPriceUnit(BaseModel):
    amount: float
    currency: str | None = None
    per: str | None = None

class AgentPrice(BaseModel):
    amount: float
    currency: str | None = None
    unit_price: AgentPriceUnit | None = None

class AgentTrackPayload(BaseModel):
    product_name: str
    brand: str | None = None
    store: str | None = None
    category: list[str] | None = None
    variant: str | None = None
    quantity: float | None = None
    unit: str | None = None
    net_weight_text: str | None = None
    price: AgentPrice | None = None
    date: str | None = None

@app.post("/images/metadata")
async def read_image_metadata(file: UploadFile = File(...)):
    content = await file.read()
    image = Image.open(io.BytesIO(content))

    metadata = _extract_image_metadata_from_image(image)

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
        "exif": metadata.get("exif"),
        "gps": metadata.get("gps"),
        "location": metadata.get("location"),
        "place": metadata.get("place"),
        "taken_at": metadata.get("taken_at")
    }

@app.post("/agent/track", response_model=schemas.Purchase)
async def agent_create_track(
    payload: str = Form(...),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    try:
        data = json.loads(payload)
        agent_payload = AgentTrackPayload(**data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payload JSON")

    if not agent_payload.product_name or not agent_payload.price or agent_payload.price.amount is None:
        raise HTTPException(status_code=400, detail="product_name and price.amount are required")

    category_id = None
    categories = agent_payload.category or []
    if categories:
        created_ids = []
        for tag in categories:
            if not tag:
                continue
            existing = crud.get_category_by_name(db, name=tag)
            if existing:
                created_ids.append(existing.id)
                continue
            created = crud.create_category(db=db, category=schemas.CategoryCreate(name=tag))
            created_ids.append(created.id)
        if created_ids:
            category_id = created_ids[0]

    if category_id is None:
        raise HTTPException(status_code=400, detail="At least one category tag is required")

    image_path = None
    image_location_lat = None
    image_location_lon = None
    image_place = None
    image_store_guess = None
    image_taken_at = None

    if file:
        file_extension = file.filename.split(".")[-1] if file.filename else "jpg"
        filename = f"{uuid.uuid4()}.{file_extension}"
        file_location = f"uploads/{filename}"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        image_path = filename
        try:
            with Image.open(file_location) as image:
                metadata = _extract_image_metadata_from_image(image)
            location = metadata.get("location") or {}
            image_location_lat = location.get("latitude")
            image_location_lon = location.get("longitude")
            place = metadata.get("place") or {}
            image_place = place.get("display_name")
            image_store_guess = place.get("store_guess")
            image_taken_at = metadata.get("taken_at")
        except Exception:
            pass

    from datetime import datetime
    try:
        date_obj = datetime.fromisoformat(agent_payload.date.replace('Z', '+00:00')) if agent_payload.date else datetime.now()
    except Exception:
        date_obj = datetime.now()

    quantity = agent_payload.quantity if agent_payload.quantity is not None else 1
    unit = agent_payload.unit or "g"
    store_value = agent_payload.store or image_store_guess or agent_payload.brand or "Unknown"

    purchase_data = schemas.PurchaseCreate(
        name=agent_payload.product_name,
        store=store_value,
        date=date_obj,
        price=agent_payload.price.amount,
        quantity=quantity,
        unit=unit,
        category_id=category_id
    )

    return crud.create_purchase(
        db=db,
        purchase=purchase_data,
        image_path=image_path,
        image_location_lat=image_location_lat,
        image_location_lon=image_location_lon,
        image_place=image_place,
        image_store_guess=image_store_guess,
        image_taken_at=image_taken_at,
        category_ids=created_ids if categories else None
    )
