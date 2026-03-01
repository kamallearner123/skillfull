import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.room_group_name = f"chat_{self.room_id}"
        self.user = user

        # Verify the user is a participant
        is_participant = await self._is_participant(user, self.room_id)
        if not is_participant:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except (json.JSONDecodeError, TypeError):
            return

        msg_type = data.get("type", "message")
        user = self.user

        if msg_type == "typing":
            # Broadcast typing indicator (don't save to DB)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_typing",
                    "sender_id": str(user.id),
                    "sender_name": user.get_full_name() or user.username,
                },
            )
            return

        # Regular message
        content = data.get("message", "").strip()
        client_id = data.get("client_id")
        if not content:
            return

        saved = await self._save_message(user, self.room_id, content, client_id)
        if saved:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "chat_message",
                    "id": str(saved["id"]),
                    "content": content,
                    "sender_id": str(user.id),
                    "sender_name": saved["sender_name"],
                    "sender_avatar": saved["sender_avatar"],
                    "timestamp": saved["timestamp"],
                    "client_id": client_id,
                },
            )

    # ── Group message handlers ────────────────────────────────────────────────

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "message",
            "id": event["id"],
            "content": event["content"],
            "sender_id": event["sender_id"],
            "sender_name": event["sender_name"],
            "sender_avatar": event.get("sender_avatar"),
            "timestamp": event["timestamp"],
            "client_id": event.get("client_id"),
        }))

    async def chat_typing(self, event):
        await self.send(text_data=json.dumps({
            "type": "typing",
            "sender_id": event["sender_id"],
            "sender_name": event["sender_name"],
        }))

    # ── DB helpers ────────────────────────────────────────────────────────────

    @database_sync_to_async
    def _is_participant(self, user, room_id) -> bool:
        from .models import ChatRoom
        return ChatRoom.objects.filter(id=room_id, participants=user).exists()

    @database_sync_to_async
    def _save_message(self, user, room_id, content, client_id):
        from .models import Message, ChatRoom
        try:
            room = ChatRoom.objects.get(id=room_id)
            msg = Message.objects.create(
                room=room,
                sender=user,
                content=content,
                client_generated_id=client_id,
            )
            return {
                "id": msg.id,
                "sender_name": user.get_full_name() or user.username,
                "sender_avatar": user.avatar,
                "timestamp": msg.created_at.isoformat(),
            }
        except Exception as e:
            print(f"Error saving message: {e}")
            return None
