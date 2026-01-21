"""
Script to import FEMA disaster data into MongoDB.
Transforms FEMA disasters into events with real US locations.

Usage:
    python import_fema_data.py --clear --yes
    python import_fema_data.py --clear --yes --today 100
    python import_fema_data.py --clear --yes --limit 500

Requires: pip install requests pymongo
"""

import requests
import random
from datetime import datetime
from pymongo import MongoClient
import os

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/eventreport_db")
client = MongoClient(MONGO_URL)
db = client.eventreport_db
events_collection = db.events

# FEMA API URL
FEMA_API_URL = "https://www.fema.gov/api/open/v1/FemaWebDisasterDeclarations"

# US States coordinates (approximate center of each state)
US_STATES_COORDS = {
    "AL": {"name": "Alabama", "lat": 32.806671, "lon": -86.791130},
    "AK": {"name": "Alaska", "lat": 61.370716, "lon": -152.404419},
    "AZ": {"name": "Arizona", "lat": 33.729759, "lon": -111.431221},
    "AR": {"name": "Arkansas", "lat": 34.969704, "lon": -92.373123},
    "CA": {"name": "California", "lat": 36.116203, "lon": -119.681564},
    "CO": {"name": "Colorado", "lat": 39.059811, "lon": -105.311104},
    "CT": {"name": "Connecticut", "lat": 41.597782, "lon": -72.755371},
    "DE": {"name": "Delaware", "lat": 39.318523, "lon": -75.507141},
    "FL": {"name": "Florida", "lat": 27.766279, "lon": -81.686783},
    "GA": {"name": "Georgia", "lat": 33.040619, "lon": -83.643074},
    "HI": {"name": "Hawaii", "lat": 21.094318, "lon": -157.498337},
    "ID": {"name": "Idaho", "lat": 44.240459, "lon": -114.478828},
    "IL": {"name": "Illinois", "lat": 40.349457, "lon": -88.986137},
    "IN": {"name": "Indiana", "lat": 39.849426, "lon": -86.258278},
    "IA": {"name": "Iowa", "lat": 42.011539, "lon": -93.210526},
    "KS": {"name": "Kansas", "lat": 38.526600, "lon": -96.726486},
    "KY": {"name": "Kentucky", "lat": 37.668140, "lon": -84.670067},
    "LA": {"name": "Louisiana", "lat": 31.169546, "lon": -91.867805},
    "ME": {"name": "Maine", "lat": 44.693947, "lon": -69.381927},
    "MD": {"name": "Maryland", "lat": 39.063946, "lon": -76.802101},
    "MA": {"name": "Massachusetts", "lat": 42.230171, "lon": -71.530106},
    "MI": {"name": "Michigan", "lat": 43.326618, "lon": -84.536095},
    "MN": {"name": "Minnesota", "lat": 45.694454, "lon": -93.900192},
    "MS": {"name": "Mississippi", "lat": 32.741646, "lon": -89.678696},
    "MO": {"name": "Missouri", "lat": 38.456085, "lon": -92.288368},
    "MT": {"name": "Montana", "lat": 46.921925, "lon": -110.454353},
    "NE": {"name": "Nebraska", "lat": 41.125370, "lon": -98.268082},
    "NV": {"name": "Nevada", "lat": 38.313515, "lon": -117.055374},
    "NH": {"name": "New Hampshire", "lat": 43.452492, "lon": -71.563896},
    "NJ": {"name": "New Jersey", "lat": 40.298904, "lon": -74.521011},
    "NM": {"name": "New Mexico", "lat": 34.840515, "lon": -106.248482},
    "NY": {"name": "New York", "lat": 42.165726, "lon": -74.948051},
    "NC": {"name": "North Carolina", "lat": 35.630066, "lon": -79.806419},
    "ND": {"name": "North Dakota", "lat": 47.528912, "lon": -99.784012},
    "OH": {"name": "Ohio", "lat": 40.388783, "lon": -82.764915},
    "OK": {"name": "Oklahoma", "lat": 35.565342, "lon": -96.928917},
    "OR": {"name": "Oregon", "lat": 44.572021, "lon": -122.070938},
    "PA": {"name": "Pennsylvania", "lat": 40.590752, "lon": -77.209755},
    "RI": {"name": "Rhode Island", "lat": 41.680893, "lon": -71.511780},
    "SC": {"name": "South Carolina", "lat": 33.856892, "lon": -80.945007},
    "SD": {"name": "South Dakota", "lat": 44.299782, "lon": -99.438828},
    "TN": {"name": "Tennessee", "lat": 35.747845, "lon": -86.692345},
    "TX": {"name": "Texas", "lat": 31.054487, "lon": -97.563461},
    "UT": {"name": "Utah", "lat": 40.150032, "lon": -111.862434},
    "VT": {"name": "Vermont", "lat": 44.045876, "lon": -72.710686},
    "VA": {"name": "Virginia", "lat": 37.769337, "lon": -78.169968},
    "WA": {"name": "Washington", "lat": 47.400902, "lon": -121.490494},
    "WV": {"name": "West Virginia", "lat": 38.491226, "lon": -80.954453},
    "WI": {"name": "Wisconsin", "lat": 44.268543, "lon": -89.616508},
    "WY": {"name": "Wyoming", "lat": 42.755966, "lon": -107.302490},
    "DC": {"name": "District of Columbia", "lat": 38.897438, "lon": -77.026817},
    "PR": {"name": "Puerto Rico", "lat": 18.220833, "lon": -66.590149},
    "VI": {"name": "Virgin Islands", "lat": 18.335765, "lon": -64.896335},
    "GU": {"name": "Guam", "lat": 13.444304, "lon": 144.793731},
    "AS": {"name": "American Samoa", "lat": -14.270972, "lon": -170.132217},
    "MP": {"name": "Northern Mariana Islands", "lat": 15.0979, "lon": 145.6739},
    "FM": {"name": "Federated States of Micronesia", "lat": 7.4256, "lon": 150.5508},
    "MH": {"name": "Marshall Islands", "lat": 7.1315, "lon": 171.1845},
    "PW": {"name": "Palau", "lat": 7.5150, "lon": 134.5825},
}

# Incident type to tags mapping (English)
INCIDENT_TYPE_TAGS = {
    "Fire": ["fire", "wildfire", "emergency"],
    "Flood": ["flood", "water", "disaster"],
    "Tornado": ["tornado", "storm", "wind"],
    "Severe Storm": ["storm", "severe-weather", "danger"],
    "Hurricane": ["hurricane", "storm", "evacuation"],
    "Earthquake": ["earthquake", "seismic", "emergency"],
    "Snow": ["snow", "winter", "blizzard"],
    "Coastal Storm": ["coastal-storm", "waves", "danger"],
    "Mud/Landslide": ["landslide", "mudslide", "danger"],
    "Severe Ice Storm": ["ice-storm", "winter", "danger"],
    "Typhoon": ["typhoon", "storm", "evacuation"],
    "Volcano": ["volcano", "eruption", "evacuation"],
    "Freezing": ["freeze", "cold", "winter"],
    "Drought": ["drought", "water", "agriculture"],
    "Terrorist": ["attack", "security", "emergency"],
    "Toxic Substances": ["toxic", "chemical", "hazmat"],
    "Dam/Levee Break": ["dam-break", "flood", "evacuation"],
    "Biological": ["biological", "health", "emergency"],
    "Human Cause": ["accident", "human-caused", "incident"],
    "Other": ["other", "incident", "general"],
}

# Alert codes with weights (RED less frequent, GREEN more frequent)
ALERT_CODES = ["GREEN", "YELLOW", "ORANGE", "RED"]
ALERT_WEIGHTS = [0.3, 0.35, 0.25, 0.1]


def get_location_for_state(state_code):
    """Generate a location based on US state code with some randomness."""
    state_code = state_code.strip().upper() if state_code else None

    if state_code and state_code in US_STATES_COORDS:
        state = US_STATES_COORDS[state_code]
        # Add some randomness to coordinates (within ~50km radius)
        lat = state["lat"] + random.uniform(-0.5, 0.5)
        lon = state["lon"] + random.uniform(-0.5, 0.5)
        address = f"{state['name']}, USA"
    else:
        # Default to center of USA if state not found
        lat = 39.8283 + random.uniform(-5, 5)
        lon = -98.5795 + random.uniform(-5, 5)
        address = "United States"

    return {
        "type": "Point",
        "coordinates": [lon, lat],  # GeoJSON: [longitude, latitude]
        "address": address
    }


def get_random_alert_code():
    """Return a random alert code with weights."""
    return random.choices(ALERT_CODES, weights=ALERT_WEIGHTS, k=1)[0]


def get_tags_for_incident(incident_type):
    """Return tags for an incident type."""
    incident_type = incident_type.strip() if incident_type else "Other"
    base_tags = INCIDENT_TYPE_TAGS.get(incident_type, ["incident", "general"])
    # Add the original incident type as tag
    tags = [incident_type.lower().replace(" ", "-").replace("/", "-")] + base_tags
    # Return unique tags
    return list(set(tags))


def transform_fema_to_event(fema_disaster, reporter_id="system-fema-import"):
    """Transform a FEMA disaster into event format."""
    incident_type = fema_disaster.get("incidentType", "Other")
    declaration_type = fema_disaster.get("declarationType", "Unknown")
    disaster_name = fema_disaster.get("disasterName", "Unknown Disaster")
    state_code = fema_disaster.get("stateCode", "")
    state_name = fema_disaster.get("stateName", "").strip()
    declaration_date = fema_disaster.get("declarationDate")

    # Parse date
    if declaration_date:
        try:
            reported_at = datetime.fromisoformat(declaration_date.replace("Z", "+00:00"))
        except:
            reported_at = datetime.utcnow()
    else:
        reported_at = datetime.utcnow()

    # Build description
    description = f"{declaration_type}: {disaster_name}"
    if state_name:
        description += f" - {state_name}"

    # Add program info
    programs = []
    if fema_disaster.get("ihProgramDeclared"):
        programs.append("Individual Assistance")
    if fema_disaster.get("paProgramDeclared"):
        programs.append("Public Assistance")
    if fema_disaster.get("hmProgramDeclared"):
        programs.append("Hazard Mitigation")

    if programs:
        description += f". Programs: {', '.join(programs)}"

    event = {
        "location": get_location_for_state(state_code),
        "alert_code": get_random_alert_code(),
        "description": description,
        "tags": get_tags_for_incident(incident_type),
        "reporter_id": reporter_id,
        "reported_at": reported_at,
        "created_at": datetime.utcnow(),
        "image_id": None,
        # FEMA metadata for reference
        "fema_disaster_number": fema_disaster.get("disasterNumber"),
        "fema_id": fema_disaster.get("id"),
    }

    return event


def fetch_fema_data(limit=None):
    """Fetch data from FEMA API."""
    print(f"[FEMA] Fetching data from {FEMA_API_URL}...")

    all_disasters = []
    skip = 0
    top = 1000  # Max per request

    while True:
        url = f"{FEMA_API_URL}?$skip={skip}&$top={top}"
        print(f"[FEMA] Fetching: skip={skip}, top={top}")

        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()

            disasters = data.get("FemaWebDisasterDeclarations", [])
            if not disasters:
                break

            all_disasters.extend(disasters)
            print(f"[FEMA] Fetched {len(disasters)} disasters (total: {len(all_disasters)})")

            if len(disasters) < top:
                break

            skip += top

            if limit and len(all_disasters) >= limit:
                all_disasters = all_disasters[:limit]
                break

        except requests.RequestException as e:
            print(f"[FEMA] Error fetching data: {e}")
            break

    return all_disasters


def import_to_mongodb(events, clear_existing=False):
    """Import events to MongoDB."""
    if clear_existing:
        print("[MongoDB] Clearing existing events...")
        result = events_collection.delete_many({})
        print(f"[MongoDB] Deleted {result.deleted_count} existing events")

    if not events:
        print("[MongoDB] No events to import")
        return 0

    print(f"[MongoDB] Inserting {len(events)} events...")
    result = events_collection.insert_many(events)
    print(f"[MongoDB] Inserted {len(result.inserted_ids)} events")

    return len(result.inserted_ids)


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Import FEMA disaster data to MongoDB')
    parser.add_argument('--clear', '-c', action='store_true',
                        help='Clear existing events before import')
    parser.add_argument('--limit', '-l', type=int, default=None,
                        help='Limit number of events to import (default: all)')
    parser.add_argument('--yes', '-y', action='store_true',
                        help='Skip confirmation prompts')
    parser.add_argument('--today', '-t', type=int, default=50,
                        help='Number of events to set with today\'s date (default: 50)')
    parser.add_argument('--tomorrow', type=int, default=50,
                        help='Number of events to set with tomorrow\'s date (default: 50)')
    args = parser.parse_args()

    print("=" * 60)
    print("FEMA Disaster Data Import Script")
    print("=" * 60)

    # Fetch FEMA data
    fema_disasters = fetch_fema_data(limit=args.limit)
    print(f"\n[INFO] Total FEMA disasters fetched: {len(fema_disasters)}")

    if not fema_disasters:
        print("[ERROR] No data fetched from FEMA API")
        return

    # Transform to events
    print("\n[INFO] Transforming FEMA disasters to events...")
    events = []
    for disaster in fema_disasters:
        event = transform_fema_to_event(disaster)
        events.append(event)

    print(f"[INFO] Transformed {len(events)} events")

    # Set some events to today's date so they appear on the map
    from datetime import timedelta
    today = datetime.utcnow()
    tomorrow = today + timedelta(days=1)

    used_indices = set()

    if args.today > 0:
        today_count = min(args.today, len(events))
        print(f"\n[INFO] Setting {today_count} random events to today's date...")

        indices = random.sample(range(len(events)), today_count)
        used_indices.update(indices)
        for idx in indices:
            events[idx]['reported_at'] = today.replace(
                hour=random.randint(0, 23),
                minute=random.randint(0, 59),
                second=random.randint(0, 59)
            )

    if args.tomorrow > 0:
        # Get available indices (not used for today)
        available = [i for i in range(len(events)) if i not in used_indices]
        tomorrow_count = min(args.tomorrow, len(available))
        print(f"[INFO] Setting {tomorrow_count} random events to tomorrow's date...")

        indices = random.sample(available, tomorrow_count)
        for idx in indices:
            events[idx]['reported_at'] = tomorrow.replace(
                hour=random.randint(0, 23),
                minute=random.randint(0, 59),
                second=random.randint(0, 59)
            )

    # Show sample
    print("\n[SAMPLE] First event:")
    sample = events[0]
    print(f"  - Description: {sample['description'][:80]}...")
    print(f"  - Alert Code: {sample['alert_code']}")
    print(f"  - Tags: {sample['tags']}")
    print(f"  - Location: {sample['location']['address']}")
    print(f"  - Coordinates: {sample['location']['coordinates']}")
    print(f"  - Reported At: {sample['reported_at']}")

    # Import to MongoDB
    print("\n" + "=" * 60)

    if args.clear:
        clear = True
    elif args.yes:
        clear = False
    else:
        clear = input("Clear existing events before import? (y/N): ").lower() == 'y'

    imported_count = import_to_mongodb(events, clear_existing=clear)

    print("\n" + "=" * 60)
    print(f"[SUCCESS] Imported {imported_count} events to MongoDB!")
    print("=" * 60)

    # Statistics
    alert_counts = {}
    for event in events:
        code = event['alert_code']
        alert_counts[code] = alert_counts.get(code, 0) + 1

    print("\n[STATISTICS] Events by alert code:")
    for code, count in sorted(alert_counts.items()):
        print(f"  - {code}: {count} ({count/len(events)*100:.1f}%)")

    # Show today's and tomorrow's events count
    from datetime import timedelta
    today_date = datetime.utcnow().date()
    tomorrow_date = today_date + timedelta(days=1)
    today_count = sum(1 for e in events if e['reported_at'].date() == today_date)
    tomorrow_count = sum(1 for e in events if e['reported_at'].date() == tomorrow_date)
    print(f"\n[INFO] Events with today's date: {today_count}")
    print(f"[INFO] Events with tomorrow's date: {tomorrow_count}")


if __name__ == "__main__":
    main()
