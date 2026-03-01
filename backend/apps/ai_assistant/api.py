import logging
import os
import requests
import json
from typing import List, Optional
import uuid
from ninja import Router, Schema
from ninja.security import django_auth
from django.conf import settings
from .models import SmartTip, SmartChallenge

logger = logging.getLogger(__name__)

router = Router(tags=["AI Assistant"])

# ─── Schemas ──────────────────────────────────────────────────────────────────

class QuerySchema(Schema):
    query: str

class TipOut(Schema):
    id: uuid.UUID
    text: str
    color: str

class ChallengeOut(Schema):
    id: uuid.UUID
    title: str
    description: str
    difficulty: str
    deadline_info: str
    failure_rate_label: str
    progress_percent: int


# ─── Config ──────────────────────────────────────────────────────────────────

SMARTGUIDE_URL = os.environ.get("SMARTGUIDE_URL", "http://localhost:8080")
TIMEOUT = 120


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/query", response={200: dict, 500: dict, 502: dict, 503: dict, 504: dict}, auth=django_auth)
def query_ai(request, data: QuerySchema):
    """
    Route AI Assistant queries to the SmartGuide chat system.
    """
    url = f"{SMARTGUIDE_URL}/chat"
    # Use user ID as session_id for continuity in the dashboard assistant
    session_id = str(request.user.id)
    
    payload = {
        "session_id": session_id,
        "message": data.query,
        "stream": True # Use streaming to work around the non-streaming response bug
    }
    
    print(f"\n[AI ASSISTANT REQUEST] URL: {url} | Payload: {json.dumps(payload)}")
    
    try:
        resp = requests.post(
            url,
            json=payload,
            timeout=TIMEOUT,
            stream=True
        )
        if resp.status_code >= 400:
            logger.error(f"SmartGuide error {resp.status_code}: {resp.text}")
            print(f"[AI ASSISTANT ERROR] Status: {resp.status_code} | Body: {resp.text}")
            return resp.status_code, {"error": f"SmartGuide service error: {resp.status_code}"}

        full_reply = ""
        for line in resp.iter_lines():
            if not line:
                continue
            line = line.decode("utf-8")
            if line.startswith("data: "):
                try:
                    data_obj = json.loads(line[6:])
                    if "token" in data_obj:
                        full_reply += data_obj["token"]
                    if data_obj.get("done"):
                        break
                except json.JSONDecodeError:
                    continue
        
        if not full_reply:
            print("[AI ASSISTANT RESPONSE] Empty reply received.")
            return 502, {"error": "Could not extract a reply from the AI service."}

        print(f"[AI ASSISTANT RESPONSE] Reply length: {len(full_reply)} chars | Preview: {full_reply[:100]}...")
        return {"response": full_reply}
        
    except requests.exceptions.ConnectionError:
        return 503, {"error": "AI service is currently offline. Please try again later."}
    except requests.exceptions.Timeout:
        return 504, {"error": "AI service timed out. Please try again."}
    except Exception as exc:
        logger.exception("AI Assistant error")
        return 500, {"error": str(exc)}


@router.get("/tips", response=List[TipOut], auth=django_auth)
def list_tips(request):
    """List active dashboard tips."""
    return SmartTip.objects.filter(is_active=True).order_by('-created_at')[:5]


@router.get("/challenges", response=List[ChallengeOut], auth=django_auth)
def list_challenges(request):
    """List active platform challenges."""
    return SmartChallenge.objects.filter(is_active=True).order_by('-created_at')[:3]
