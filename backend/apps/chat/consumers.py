import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'

        # TODO: Check permissions here (is user in this room?)

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_content = text_data_json['message']
        client_id = text_data_json.get('client_id')
        user_id = self.scope['user'].id

        if user_id:
            # Save to DB
            await self.save_message(user_id, self.room_id, message_content, client_id)

            # Broadcast to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message_content,
                    'sender_id': str(user_id),
                    'client_id': client_id 
                }
            )

    # Receive message from room group
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'sender_id': event['sender_id'],
            'client_id': event.get('client_id')
        }))

    @database_sync_to_async
    def save_message(self, user_id, room_id, content, client_id):
        from .models import Message, ChatRoom
        from apps.users.models import User
        
        try:
             room = ChatRoom.objects.get(id=room_id)
             user = User.objects.get(id=user_id)
             Message.objects.create(
                 room=room,
                 sender=user,
                 content=content,
                 client_generated_id=client_id
             )
        except Exception as e:
            print(f"Error saving message: {e}")
