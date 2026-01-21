import smtplib
import os
from email.message import EmailMessage


def get_mail_config():
    return {
        "user": os.getenv("MAIL_USERNAME"),
        "password": os.getenv("MAIL_PASSWORD"),
        "server": os.getenv("MAIL_SERVER"),
        "port": int(os.getenv("MAIL_PORT", 2525)),
        "from_addr": os.getenv("MAIL_FROM", "noreply@eventreport.com")
    }


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    config = get_mail_config()
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = config["from_addr"]
    msg['To'] = to_email
    msg.set_content(html_content, subtype='html')

    try:
        with smtplib.SMTP(config["server"], config["port"]) as server:
            server.starttls()
            server.login(config["user"], config["password"])
            server.send_message(msg)
            print(f"Email sent successfully to {to_email}")
            return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False


def send_reset_code_email(to_email: str, code: str) -> bool:
    html_content = f"""
    <!DOCTYPE html>
    <html>
        <body>
            <p>Hello,</p>
            <p>You have requested a password reset for the EventReport application.</p>
            <p>Your verification code is: <strong>{code}</strong></p>
            <p>This code expires in 10 minutes.</p>
            <p>If you did not request this, please ignore this email.</p>
        </body>
    </html>
    """
    return send_email(to_email, "EventReport - Password Reset Code", html_content)


def send_event_notification_email(to_email: str, admin_name: str, event_data: dict) -> bool:
    alert_colors = {
        "GREEN": "#28a745",
        "YELLOW": "#ffc107",
        "ORANGE": "#fd7e14",
        "RED": "#dc3545"
    }
    alert_code = event_data.get("alert_code", "GREEN")
    color = alert_colors.get(alert_code, "#6c757d")

    location = event_data.get("location", {})
    address = location.get("address", "Unknown location")
    coords = location.get("coordinates", [0, 0])
    reporter = event_data.get("reporter", {})

    html_content = f"""
    <!DOCTYPE html>
    <html>
        <head>
            <style>
                .alert-badge {{
                    background-color: {color};
                    color: white;
                    padding: 5px 15px;
                    border-radius: 4px;
                    font-weight: bold;
                }}
                .event-box {{
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 10px 0;
                    background-color: #f9f9f9;
                }}
                .reporter-box {{
                    border: 1px solid #007bff;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 10px 0;
                    background-color: #e7f3ff;
                }}
            </style>
        </head>
        <body>
            <h2>New Event Reported - EventReport</h2>
            <p>Hello {admin_name},</p>
            <p>A new event has been reported in the system that requires your attention.</p>

            <div class="event-box">
                <p><strong>Alert Level:</strong> <span class="alert-badge">{alert_code}</span></p>
                <p><strong>Description:</strong> {event_data.get("description", "No description")}</p>
                <p><strong>Location:</strong> {address}</p>
                <p><strong>Coordinates:</strong> {coords[0]}, {coords[1]}</p>
                <p><strong>Tags:</strong> {", ".join(event_data.get("tags", []))}</p>
                <p><strong>Reported at:</strong> {event_data.get("reported_at", "Unknown")}</p>
            </div>

            <div class="reporter-box">
                <h3>Reporter Information</h3>
                <p><strong>Name:</strong> {reporter.get("first_name", "N/A")} {reporter.get("last_name", "N/A")}</p>
                <p><strong>Email:</strong> {reporter.get("email", "N/A")}</p>
                <p><strong>Phone:</strong> {reporter.get("phone", "N/A")}</p>
            </div>

            <p>Please review this event and take appropriate action.</p>
            <p>Best regards,<br>EventReport System</p>
        </body>
    </html>
    """
    return send_email(to_email, f"[{alert_code}] New Event Reported - EventReport", html_content)
