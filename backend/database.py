import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/eventreport_db")

client = AsyncIOMotorClient(MONGO_URL)
db = client.eventreport_db

users_collection = db.get_collection("users")
events_collection = db.get_collection("events")
admins_collection = db.get_collection("admins")
notifications_collection = db.get_collection("notifications")

fs_bucket = AsyncIOMotorGridFSBucket(db)


async def create_indexes():
    await users_collection.create_index("email", unique=True)
    await events_collection.create_index([("location", "2dsphere")])
    await events_collection.create_index([("reported_at", -1)])
    await events_collection.create_index("alert_code")
    await events_collection.create_index("tags")
    await events_collection.create_index("reporter_id")
    await admins_collection.create_index("email", unique=True)
    await notifications_collection.create_index("event_id")
    await notifications_collection.create_index("admin_id")
    await notifications_collection.create_index([("created_at", -1)])
