import { useState } from 'react';
import { Send, Search, MoreVertical, Phone, Video, Paperclip, Smile } from 'lucide-react';
// import { useAuth } from '../../context/AuthContext';

export default function ChatPage() {
    // const { user } = useAuth();
    const [selectedChat, setSelectedChat] = useState<string | null>('1');
    const [message, setMessage] = useState('');

    // Mock data
    const chats = [
        { id: '1', name: 'Placement Team Alpha', lastMessage: 'See you at the meeting!', time: '10:30 AM', unread: 2, avatar: 'https://ui-avatars.com/api/?name=Team+Alpha&background=random' },
        { id: '2', name: 'Mentor David', lastMessage: 'Great progress on the project.', time: 'Yesterday', unread: 0, avatar: 'https://ui-avatars.com/api/?name=David+Mentor&background=random' },
        { id: '3', name: 'React Study Group', lastMessage: 'Did anyone solve the bug?', time: 'Yesterday', unread: 5, avatar: 'https://ui-avatars.com/api/?name=React+Group&background=random' },
    ];

    const messages = [
        { id: '1', sender: 'other', text: 'Hi team, are we ready for the review?', time: '10:00 AM' },
        { id: '2', sender: 'me', text: 'Yes, just finishing up the slides.', time: '10:05 AM' },
        { id: '3', sender: 'other', text: 'Perfect. See you at the meeting!', time: '10:30 AM' },
    ];

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        // Logic to send message
        setMessage('');
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] bg-white overflow-hidden">
            {/* Sidebar / Chat list */}
            <div className="w-80 border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
                <div className="p-4 border-b border-slate-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {chats.map((chat) => (
                        <div
                            key={chat.id}
                            onClick={() => setSelectedChat(chat.id)}
                            className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-100 transition-colors ${selectedChat === chat.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''}`}
                        >
                            <img src={chat.avatar} alt={chat.name} className="h-10 w-10 rounded-full" />
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h3 className="font-semibold text-slate-800 truncate">{chat.name}</h3>
                                    <span className="text-xs text-slate-500 whitespace-nowrap">{chat.time}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-slate-500 truncate">{chat.lastMessage}</p>
                                    {chat.unread > 0 && (
                                        <span className="h-5 w-5 flex items-center justify-center bg-blue-600 text-white text-xs font-bold rounded-full">
                                            {chat.unread}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full bg-white">
                {/* Chat Header */}
                <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-slate-50/30">
                    <div className="flex items-center gap-3">
                        <img src={chats.find(c => c.id === selectedChat)?.avatar} alt="Chat Avatar" className="h-10 w-10 rounded-full" />
                        <div>
                            <h2 className="font-semibold text-slate-800">{chats.find(c => c.id === selectedChat)?.name}</h2>
                            <p className="text-xs text-green-600 flex items-center gap-1">
                                <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                                Online
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 text-slate-400">
                        <button className="hover:text-blue-600 transition-colors"><Phone className="h-5 w-5" /></button>
                        <button className="hover:text-blue-600 transition-colors"><Video className="h-5 w-5" /></button>
                        <button className="hover:text-slate-600 transition-colors"><MoreVertical className="h-5 w-5" /></button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender !== 'me' && (
                                <img src="https://ui-avatars.com/api/?name=Other" alt="Sender" className="h-8 w-8 rounded-full mr-2 self-end" />
                            )}
                            <div className={`max-w-[70%] p-3 rounded-2xl ${msg.sender === 'me' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                                <p>{msg.text}</p>
                                <span className={`text-[10px] block text-right mt-1 ${msg.sender === 'me' ? 'text-blue-100' : 'text-slate-400'}`}>
                                    {msg.time}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-slate-200 bg-white">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                        <button type="button" className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                            <Paperclip className="h-5 w-5" />
                        </button>
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <Smile className="h-5 w-5" />
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={!message.trim()}
                            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            <Send className="h-5 w-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
