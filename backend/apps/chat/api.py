from typing import List, Optional
from ninja import Router, Schema
from ninja.security import django_auth
from django.shortcuts import get_object_or_404
from django.db.models import Q, Max, Count, Subquery, OuterRef
from django.db import transaction
from .models import ChatRoom, Message
from apps.users.models import User

router = Router(tags=["Chat"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class UserBrief(Schema):
    id: str
    username: str
    email: str
    avatar: Optional[str] = None
    role: str


class MessageOut(Schema):
    id: str
    content: str
    sender_id: str
    sender_name: str
    sender_avatar: Optional[str]
    timestamp: str
    client_generated_id: Optional[str] = None

    @staticmethod
    def from_message(m: Message) -> "MessageOut":
        return MessageOut(
            id=str(m.id),
            content=m.content,
            sender_id=str(m.sender_id),
            sender_name=m.sender.get_full_name() or m.sender.username,
            sender_avatar=m.sender.avatar,
            timestamp=m.created_at.isoformat(),
            client_generated_id=m.client_generated_id,
        )


class RoomOut(Schema):
    id: str
    name: str
    is_direct_message: bool
    participants: List[UserBrief]
    last_message: Optional[str] = None
    last_message_time: Optional[str] = None
    unread_count: int = 0


class CreateDirectRoomIn(Schema):
    user_id: str  # the other user's id


class CreateGroupRoomIn(Schema):
    name: str
    participant_ids: List[str]


class SendMessageIn(Schema):
    content: str
    client_generated_id: Optional[str] = None


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _room_out(room: ChatRoom, me: User) -> RoomOut:
    participants = list(room.participants.select_related())
    last_msg = room.messages.order_by("-created_at").first()
    unread = room.messages.filter(is_read=False).exclude(sender=me).count()

    # For DMs, use the other person's name as room name
    if room.is_direct_message and not room.name:
        others = [p for p in participants if p.id != me.id]
        display_name = others[0].get_full_name() or others[0].username if others else "DM"
    else:
        display_name = room.name or f"Room {room.id}"

    return RoomOut(
        id=str(room.id),
        name=display_name,
        is_direct_message=room.is_direct_message,
        participants=[
            UserBrief(
                id=str(p.id),
                username=p.username,
                email=p.email,
                avatar=p.avatar,
                role=p.role,
            )
            for p in participants
        ],
        last_message=last_msg.content if last_msg else None,
        last_message_time=last_msg.created_at.isoformat() if last_msg else None,
        unread_count=unread,
    )


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/rooms", response=List[RoomOut], auth=django_auth)
def list_rooms(request):
    """Return all chat rooms the current user participates in."""
    rooms = (
        ChatRoom.objects
        .filter(participants=request.user)
        .prefetch_related("participants", "messages")
        .order_by("-updated_at")
    )
    return [_room_out(r, request.user) for r in rooms]


@router.post("/rooms/direct", response=RoomOut, auth=django_auth)
def get_or_create_direct(request, payload: CreateDirectRoomIn):
    """Get or create a 1-to-1 DM room between the current user and payload.user_id."""
    other = get_object_or_404(User, id=payload.user_id)
    me = request.user

    # Find existing DM room shared by exactly these two participants
    existing = (
        ChatRoom.objects
        .filter(is_direct_message=True, participants=me)
        .filter(participants=other)
    )
    for room in existing:
        if room.participants.count() == 2:
            return _room_out(room, me)

    # Create new
    with transaction.atomic():
        room = ChatRoom.objects.create(is_direct_message=True)
        room.participants.add(me, other)

    return _room_out(room, me)


@router.post("/rooms/group", response=RoomOut, auth=django_auth)
def create_group_room(request, payload: CreateGroupRoomIn):
    """Create a named group chat room."""
    me = request.user
    users = list(User.objects.filter(id__in=payload.participant_ids))

    with transaction.atomic():
        room = ChatRoom.objects.create(name=payload.name, is_direct_message=False)
        room.participants.add(me, *users)

    return _room_out(room, me)


@router.get("/rooms/{room_id}/messages", response=List[MessageOut], auth=django_auth)
def get_messages(request, room_id: str, before: Optional[str] = None, limit: int = 50):
    """Paginated message history for a room (newest last, cursor via `before` message id)."""
    room = get_object_or_404(ChatRoom, id=room_id, participants=request.user)
    qs = room.messages.select_related("sender").order_by("-created_at")
    if before:
        try:
            pivot = Message.objects.get(id=before)
            qs = qs.filter(created_at__lt=pivot.created_at)
        except Message.DoesNotExist:
            pass
    msgs = list(reversed(list(qs[:limit])))
    return [MessageOut.from_message(m) for m in msgs]


@router.post("/rooms/{room_id}/messages", response=MessageOut, auth=django_auth)
def send_message(request, room_id: str, payload: SendMessageIn):
    """HTTP fallback for sending a message (WebSocket is preferred)."""
    room = get_object_or_404(ChatRoom, id=room_id, participants=request.user)
    msg = Message.objects.create(
        room=room,
        sender=request.user,
        content=payload.content,
        client_generated_id=payload.client_generated_id,
    )
    return MessageOut.from_message(msg)


@router.post("/rooms/{room_id}/read", auth=django_auth)
def mark_read(request, room_id: str):
    """Mark all messages in a room (sent by others) as read."""
    room = get_object_or_404(ChatRoom, id=room_id, participants=request.user)
    updated = room.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
    return {"marked_read": updated}


@router.get("/users", response=List[UserBrief], auth=django_auth)
def search_users(request, q: str = ""):
    """Search users by username/email for starting a new DM."""
    qs = User.objects.exclude(id=request.user.id)
    if q:
        qs = qs.filter(Q(username__icontains=q) | Q(email__icontains=q) | Q(first_name__icontains=q))
    return [
        UserBrief(id=str(u.id), username=u.username, email=u.email, avatar=u.avatar, role=u.role)
        for u in qs[:20]
    ]
