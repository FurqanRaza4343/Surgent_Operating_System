from __future__ import annotations
from datetime import datetime

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from src.config import get_settings

settings = get_settings()


class CalendarService:
    def __init__(self, access_token: str | None = None):
        self.access_token = access_token

    async def list_events(self, calendar_id: str = "primary", max_results: int = 10) -> list[dict]:
        creds = Credentials(token=self.access_token)
        service = build("calendar", "v3", credentials=creds)

        events_result = service.events().list(
            calendarId=calendar_id,
            maxResults=max_results,
            singleEvents=True,
            orderBy="startTime",
        ).execute()

        return events_result.get("items", [])

    async def create_event(self, summary: str, start_time: datetime, end_time: datetime, calendar_id: str = "primary") -> dict:
        creds = Credentials(token=self.access_token)
        service = build("calendar", "v3", credentials=creds)

        event = {
            "summary": summary,
            "start": {"dateTime": start_time.isoformat(), "timeZone": "UTC"},
            "end": {"dateTime": end_time.isoformat(), "timeZone": "UTC"},
        }

        event_result = service.events().insert(calendarId=calendar_id, body=event).execute()
        return event_result
