import os
from datetime import datetime
from typing import Optional

from database import admins_collection, notifications_collection
from email_utils import send_event_notification_email

# Twilio configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")


def get_twilio_client():
    """Initialize Twilio client if credentials are configured."""
    if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        try:
            from twilio.rest import Client
            return Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        except ImportError:
            print("Twilio library not installed. Run: pip install twilio")
            return None
    print("Twilio credentials not configured")
    return None


async def send_sms_notification(phone: str, message: str) -> bool:
    """
    Send SMS notification using Twilio.

    Args:
        phone: Phone number with country code (e.g., +40712345678)
        message: SMS message content

    Returns:
        True if sent successfully, False otherwise
    """
    client = get_twilio_client()
    if not client:
        return False

    if not TWILIO_PHONE_NUMBER:
        print("Twilio phone number not configured")
        return False

    # Ensure phone has country code
    if not phone.startswith("+"):
        if phone.startswith("0"):
            phone = "+4" + phone  # Romania: 0xxx -> +40xxx
        else:
            phone = "+" + phone

    try:
        message_response = client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=phone
        )
        print(f"SMS sent to {phone}. SID: {message_response.sid}")
        return True
    except Exception as e:
        print(f"Failed to send SMS to {phone}: {e}")
        return False


async def create_notification_record(
    event_id: str,
    admin_id: str,
    notification_type: str,
    status: str
) -> str:
    """Create a record of the notification attempt."""
    notification = {
        "event_id": event_id,
        "admin_id": admin_id,
        "notification_type": notification_type,
        "status": status,
        "sent_at": datetime.utcnow() if status == "sent" else None,
        "created_at": datetime.utcnow()
    }
    result = await notifications_collection.insert_one(notification)
    return str(result.inserted_id)


async def notify_admins_new_event(event_id: str, event_data: dict):
    """
    Notify all admins about a new event via email and SMS.
    """
    admins = []
    async for admin in admins_collection.find():
        admins.append(admin)

    if not admins:
        print("No admins configured, skipping notifications")
        return

    alert_code = event_data.get("alert_code", "GREEN")
    location = event_data.get("location", {})
    description = event_data.get("description", "No description")
    coords = location.get("coordinates", [0, 0])

    # Build SMS message (keep it short)
    sms_message = (
        f"[EventReport - {alert_code}]\n"
        f"{description[:100]}\n"
        f"Location: {coords[1]:.4f}, {coords[0]:.4f}"
    )

    for admin in admins:
        admin_id = str(admin["_id"])
        admin_name = f"{admin['first_name']} {admin['last_name']}"

        # Send email notification
        email_success = send_event_notification_email(
            admin["email"],
            admin_name,
            event_data
        )
        await create_notification_record(
            event_id,
            admin_id,
            "email",
            "sent" if email_success else "failed"
        )
        print(f"Email to {admin['email']}: {'sent' if email_success else 'failed'}")

        # Send SMS notification
        sms_success = await send_sms_notification(admin["phone"], sms_message)
        await create_notification_record(
            event_id,
            admin_id,
            "sms",
            "sent" if sms_success else "failed"
        )
        print(f"SMS to {admin['phone']}: {'sent' if sms_success else 'failed'}")

    print(f"Notifications completed for event {event_id} to {len(admins)} admins")
