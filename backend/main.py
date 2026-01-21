import json
import random
from datetime import datetime, timedelta
from typing import Optional, List, Set
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Query, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from models import (
    UserRegister, UserLogin, ForgotPassword, ResetPassword, Token, UserResponse,
    EventCreate, EventUpdate, EventResponse, AlertCode, Location,
    AdminCreate, AdminResponse
)
from database import (
    users_collection, events_collection, admins_collection, fs_bucket, create_indexes
)
from auth import (
    get_password_hash, verify_password, create_access_token, get_current_user
)
from email_utils import send_reset_code_email
from notification_service import notify_admins_new_event

app = FastAPI(
    title="EventReport API",
    description="API for reporting and managing events/incidents",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()


@app.on_event("startup")
async def startup_event():
    await create_indexes()


@app.get("/")
def read_root():
    return {"message": "EventReport Backend is running!"}


@app.websocket("/ws/events")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.post("/auth/register", status_code=201, response_model=dict)
async def register(user: UserRegister):
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)
    user_dict = user.model_dump()
    user_dict["password"] = hashed_password
    user_dict["role"] = "user"
    user_dict["is_active"] = True
    user_dict["created_at"] = datetime.utcnow()

    new_user = await users_collection.insert_one(user_dict)
    return {"message": "User created successfully", "id": str(new_user.inserted_id)}


@app.post("/auth/login", response_model=Token)
async def login(user: UserLogin):
    db_user = await users_collection.find_one({"email": user.email})

    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": db_user["email"]})

    return Token(access_token=access_token)


@app.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["_id"],
        first_name=current_user["first_name"],
        last_name=current_user["last_name"],
        email=current_user["email"],
        phone=current_user["phone"],
        role=current_user.get("role", "user"),
        is_active=current_user.get("is_active", True)
    )


@app.post("/auth/forgot-password")
async def forgot_password(data: ForgotPassword):
    user = await users_collection.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    reset_code = str(random.randint(100000, 999999))
    expiration_time = datetime.utcnow() + timedelta(minutes=10)

    await users_collection.update_one(
        {"email": data.email},
        {"$set": {
            "reset_code": reset_code,
            "reset_code_expires": expiration_time
        }}
    )
    send_reset_code_email(data.email, reset_code)
    return {"message": "Reset code sent to email"}


@app.post("/auth/reset-password")
async def reset_password(data: ResetPassword):
    user = await users_collection.find_one({"email": data.email})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db_code = user.get("reset_code")
    db_expiration = user.get("reset_code_expires")
    if not db_code or db_code != data.code:
        raise HTTPException(status_code=400, detail="Invalid reset code")
    if datetime.utcnow() > db_expiration:
        raise HTTPException(status_code=400, detail="Reset code expired")
    new_hashed_password = get_password_hash(data.new_password)

    await users_collection.update_one(
        {"email": data.email},
        {
            "$set": {"password": new_hashed_password},
            "$unset": {"reset_code": "", "reset_code_expires": ""}
        }
    )
    return {"message": "Password updated successfully"}


@app.post("/admins", status_code=201, response_model=AdminResponse)
async def create_admin(admin: AdminCreate, current_user: dict = Depends(get_current_user)):
    existing_admin = await admins_collection.find_one({"email": admin.email})
    if existing_admin:
        raise HTTPException(status_code=400, detail="Admin with this email already exists")

    admin_dict = admin.model_dump()
    admin_dict["created_at"] = datetime.utcnow()

    result = await admins_collection.insert_one(admin_dict)

    return AdminResponse(
        id=str(result.inserted_id),
        first_name=admin.first_name,
        last_name=admin.last_name,
        email=admin.email,
        phone=admin.phone,
        created_at=admin_dict["created_at"]
    )


@app.get("/admins", response_model=List[AdminResponse])
async def get_admins(current_user: dict = Depends(get_current_user)):
    admins = []
    async for admin in admins_collection.find():
        admins.append(AdminResponse(
            id=str(admin["_id"]),
            first_name=admin["first_name"],
            last_name=admin["last_name"],
            email=admin["email"],
            phone=admin["phone"],
            created_at=admin["created_at"]
        ))
    return admins


@app.delete("/admins/{admin_id}", status_code=204)
async def delete_admin(admin_id: str, current_user: dict = Depends(get_current_user)):
    if not ObjectId.is_valid(admin_id):
        raise HTTPException(status_code=400, detail="Invalid admin ID")

    result = await admins_collection.delete_one({"_id": ObjectId(admin_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Admin not found")


@app.post("/events", status_code=201, response_model=EventResponse)
async def create_event(
    event: EventCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    now = datetime.utcnow()
    event_dict = event.model_dump()
    event_dict["reported_at"] = now
    event_dict["created_at"] = now
    event_dict["reporter_id"] = str(current_user["_id"])
    event_dict["image_id"] = None

    result = await events_collection.insert_one(event_dict)
    event_id = str(result.inserted_id)

    event_data_for_notification = {
        "alert_code": event.alert_code.value,
        "description": event.description,
        "location": event.location.model_dump(),
        "tags": event.tags,
        "reported_at": str(now),
        "reporter": {
            "first_name": current_user["first_name"],
            "last_name": current_user["last_name"],
            "email": current_user["email"],
            "phone": current_user["phone"]
        }
    }
    background_tasks.add_task(notify_admins_new_event, event_id, event_data_for_notification)

    ws_event_data = {
        "type": "new_event",
        "event": {
            "id": event_id,
            "reported_at": str(now),
            "location": event.location.model_dump(),
            "alert_code": event.alert_code.value,
            "description": event.description,
            "image_id": None,
            "tags": event.tags,
            "reporter_id": str(current_user["_id"]),
            "created_at": str(now)
        }
    }
    await manager.broadcast(ws_event_data)

    return EventResponse(
        id=event_id,
        reported_at=event_dict["reported_at"],
        location=Location(**event_dict["location"]),
        alert_code=event_dict["alert_code"],
        description=event_dict["description"],
        image_id=event_dict["image_id"],
        tags=event_dict["tags"],
        reporter_id=event_dict["reporter_id"],
        created_at=event_dict["created_at"]
    )


@app.get("/events", response_model=List[EventResponse])
async def get_events(
    alert_code: Optional[AlertCode] = None,
    tags: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100)
):
    query = {}
    if alert_code:
        query["alert_code"] = alert_code.value
    if tags:
        query["tags"] = {"$in": tags.split(",")}

    cursor = events_collection.find(query).sort("reported_at", -1).skip(skip).limit(limit)
    events = []
    async for event in cursor:
        events.append(EventResponse(
            id=str(event["_id"]),
            reported_at=event["reported_at"],
            location=Location(**event["location"]),
            alert_code=event["alert_code"],
            description=event["description"],
            image_id=str(event["image_id"]) if event.get("image_id") else None,
            tags=event["tags"],
            reporter_id=str(event["reporter_id"]),
            created_at=event["created_at"]
        ))
    return events


@app.get("/events/geojson")
async def get_events_geojson(
    alert_code: Optional[AlertCode] = None,
    tags: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500)
):
    query = {}
    if alert_code:
        query["alert_code"] = alert_code.value
    if tags:
        query["tags"] = {"$in": tags.split(",")}

    cursor = events_collection.find(query).sort("reported_at", -1).limit(limit)

    features = []
    async for event in cursor:
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": event["location"]["coordinates"]
            },
            "properties": {
                "id": str(event["_id"]),
                "alert_code": event["alert_code"],
                "description": event["description"],
                "tags": event["tags"],
                "reported_at": str(event["reported_at"]),
                "address": event["location"].get("address", ""),
                "image_id": str(event["image_id"]) if event.get("image_id") else None
            }
        }
        features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features
    }


@app.get("/events/nearby", response_model=List[EventResponse])
async def get_nearby_events(
    longitude: float = Query(..., ge=-180, le=180),
    latitude: float = Query(..., ge=-90, le=90),
    max_distance: int = Query(5000, ge=100, le=50000),
    limit: int = Query(20, ge=1, le=100)
):
    query = {
        "location": {
            "$near": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": [longitude, latitude]
                },
                "$maxDistance": max_distance
            }
        }
    }

    cursor = events_collection.find(query).limit(limit)
    events = []
    async for event in cursor:
        events.append(EventResponse(
            id=str(event["_id"]),
            reported_at=event["reported_at"],
            location=Location(**event["location"]),
            alert_code=event["alert_code"],
            description=event["description"],
            image_id=str(event["image_id"]) if event.get("image_id") else None,
            tags=event["tags"],
            reporter_id=str(event["reporter_id"]),
            created_at=event["created_at"]
        ))
    return events


@app.get("/events/{event_id}", response_model=EventResponse)
async def get_event(event_id: str):
    if not ObjectId.is_valid(event_id):
        raise HTTPException(status_code=400, detail="Invalid event ID")

    event = await events_collection.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    return EventResponse(
        id=str(event["_id"]),
        reported_at=event["reported_at"],
        location=Location(**event["location"]),
        alert_code=event["alert_code"],
        description=event["description"],
        image_id=str(event["image_id"]) if event.get("image_id") else None,
        tags=event["tags"],
        reporter_id=str(event["reporter_id"]),
        created_at=event["created_at"]
    )


@app.put("/events/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    event_update: EventUpdate,
    current_user: dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(event_id):
        raise HTTPException(status_code=400, detail="Invalid event ID")

    existing_event = await events_collection.find_one({"_id": ObjectId(event_id)})
    if not existing_event:
        raise HTTPException(status_code=404, detail="Event not found")

    update_data = {k: v for k, v in event_update.model_dump().items() if v is not None}
    if "alert_code" in update_data:
        update_data["alert_code"] = update_data["alert_code"].value if hasattr(update_data["alert_code"], 'value') else update_data["alert_code"]

    if update_data:
        await events_collection.update_one(
            {"_id": ObjectId(event_id)},
            {"$set": update_data}
        )

    updated_event = await events_collection.find_one({"_id": ObjectId(event_id)})

    return EventResponse(
        id=str(updated_event["_id"]),
        reported_at=updated_event["reported_at"],
        location=Location(**updated_event["location"]),
        alert_code=updated_event["alert_code"],
        description=updated_event["description"],
        image_id=str(updated_event["image_id"]) if updated_event.get("image_id") else None,
        tags=updated_event["tags"],
        reporter_id=str(updated_event["reporter_id"]),
        created_at=updated_event["created_at"]
    )


@app.delete("/events/{event_id}", status_code=204)
async def delete_event(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(event_id):
        raise HTTPException(status_code=400, detail="Invalid event ID")

    event = await events_collection.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.get("image_id"):
        try:
            await fs_bucket.delete(ObjectId(event["image_id"]))
        except Exception:
            pass

    await events_collection.delete_one({"_id": ObjectId(event_id)})


@app.post("/events/{event_id}/image", status_code=201)
async def upload_event_image(
    event_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if not ObjectId.is_valid(event_id):
        raise HTTPException(status_code=400, detail="Invalid event ID")

    event = await events_collection.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPEG, PNG, GIF, WEBP")

    if event.get("image_id"):
        try:
            await fs_bucket.delete(ObjectId(event["image_id"]))
        except Exception:
            pass

    contents = await file.read()
    file_id = await fs_bucket.upload_from_stream(
        file.filename,
        contents,
        metadata={
            "content_type": file.content_type,
            "event_id": event_id,
            "uploaded_by": current_user["_id"]
        }
    )

    await events_collection.update_one(
        {"_id": ObjectId(event_id)},
        {"$set": {"image_id": file_id}}
    )

    return {"message": "Image uploaded successfully", "image_id": str(file_id)}


@app.get("/events/{event_id}/image")
async def get_event_image(event_id: str):
    if not ObjectId.is_valid(event_id):
        raise HTTPException(status_code=400, detail="Invalid event ID")

    event = await events_collection.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if not event.get("image_id"):
        raise HTTPException(status_code=404, detail="No image associated with this event")

    try:
        grid_out = await fs_bucket.open_download_stream(ObjectId(event["image_id"]))
        content_type = grid_out.metadata.get("content_type", "image/jpeg") if grid_out.metadata else "image/jpeg"

        async def stream_file():
            while True:
                chunk = await grid_out.read(8192)
                if not chunk:
                    break
                yield chunk

        return StreamingResponse(stream_file(), media_type=content_type)
    except Exception:
        raise HTTPException(status_code=404, detail="Image not found")


@app.get("/images/{image_id}")
async def get_image_by_id(image_id: str):
    if not ObjectId.is_valid(image_id):
        raise HTTPException(status_code=400, detail="Invalid image ID")

    try:
        grid_out = await fs_bucket.open_download_stream(ObjectId(image_id))
        content_type = grid_out.metadata.get("content_type", "image/jpeg") if grid_out.metadata else "image/jpeg"

        async def stream_file():
            while True:
                chunk = await grid_out.read(8192)
                if not chunk:
                    break
                yield chunk

        return StreamingResponse(stream_file(), media_type=content_type)
    except Exception:
        raise HTTPException(status_code=404, detail="Image not found")


# SMS endpoint for testing
from notification_service import send_sms_notification


@app.post("/sms/test")
async def test_sms(
    phone: str,
    message: str = "Test SMS from EventReport",
    current_user: dict = Depends(get_current_user)
):
    """
    Send a test SMS via Twilio.
    Phone should include country code, e.g., +17349771053
    """
    success = await send_sms_notification(phone, message)
    if success:
        return {"success": True, "message": f"SMS sent to {phone}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send SMS")
