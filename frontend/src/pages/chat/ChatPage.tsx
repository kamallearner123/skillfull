import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Send, Search, Plus, MessageSquare, Loader2,
    UserPlus, X, Check, CheckCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserBrief {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    role: string;
}

interface MessageData {
    id: string;
    content: string;
    sender_id: string;
    sender_name: string;
    sender_avatar?: string;
    timestamp: string;
    client_generated_id?: string;
    pending?: boolean; // optimistic
}

interface Room {
    id: string;
    name: string;
    is_direct_message: boolean;
    participants: UserBrief[];
    last_message?: string;
    last_message_time?: string;
    unread_count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarUrl(name: string, url?: string | null): string {
    if (url) return url;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&bold=true`;
}

function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── New DM Modal ─────────────────────────────────────────────────────────────

function NewDMModal({ onClose, onCreated }: { onClose: () => void; onCreated: (room: Room) => void }) {
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState<UserBrief[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await api.get('/chat/users', { params: { q: query } });
                setUsers(res.data);
            } catch { /* ignore */ } finally { setLoading(false); }
        }, 300);
        return () => clearTimeout(t);
    }, [query]);

    const startDM = async (userId: string) => {
        try {
            const res = await api.post('/chat/rooms/direct', { user_id: userId });
            onCreated(res.data);
            onClose();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">Start a new chat</h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search people..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                    {loading && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-indigo-600" /></div>}
                    {!loading && users.map(u => (
                        <button
                            key={u.id}
                            onClick={() => startDM(u.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 transition-colors text-left"
                        >
                            <img src={avatarUrl(u.username, u.avatar)} alt={u.username} className="h-9 w-9 rounded-full" />
                            <div>
                                <p className="font-medium text-slate-800 text-sm">{u.username}</p>
                                <p className="text-xs text-slate-500">{u.role.toLowerCase().replace('_', ' ')}</p>
                            </div>
                        </button>
                    ))}
                    {!loading && users.length === 0 && (
                        <p className="text-center text-sm text-slate-400 py-4">No users found</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main ChatPage ─────────────────────────────────────────────────────────────

export default function ChatPage() {
    const { user } = useAuth();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [messages, setMessages] = useState<MessageData[]>([]);
    const [message, setMessage] = useState('');
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [typingName, setTypingName] = useState<string | null>(null);
    const [showNewDM, setShowNewDM] = useState(false);
    const [search, setSearch] = useState('');
    const [wsConnected, setWsConnected] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const typingSentRef = useRef(false);

    // ── Load rooms ──────────────────────────────────────────────────────────────
    const fetchRooms = useCallback(async () => {
        try {
            const res = await api.get('/chat/rooms');
            setRooms(res.data);
        } catch { /* silent */ } finally { setLoadingRooms(false); }
    }, []);

    useEffect(() => { fetchRooms(); }, [fetchRooms]);

    // ── Select room ─────────────────────────────────────────────────────────────
    const selectRoom = useCallback(async (room: Room) => {
        // Close existing WS
        wsRef.current?.close();
        setSelectedRoom(room);
        setMessages([]);
        setTypingName(null);
        setLoadingMessages(true);

        try {
            const res = await api.get(`/chat/rooms/${room.id}/messages`);
            setMessages(res.data);
            // Mark as read
            await api.post(`/chat/rooms/${room.id}/read`);
            setRooms(prev => prev.map(r => r.id === room.id ? { ...r, unread_count: 0 } : r));

        } catch { /* silent */ } finally { setLoadingMessages(false); }

        // Open WebSocket
        const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${wsProto}://${window.location.hostname}:8000/ws/chat/${room.id}/`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => setWsConnected(true);
        ws.onclose = () => setWsConnected(false);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'typing') {
                if (data.sender_id !== user?.id) {
                    setTypingName(data.sender_name);
                    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                    typingTimerRef.current = setTimeout(() => setTypingName(null), 2500);
                }
            } else if (data.type === 'message') {
                setMessages(prev => {
                    // Replace optimistic if same client_id, otherwise append
                    const exists = prev.find(m => m.id === data.id || (data.client_id && m.client_generated_id === data.client_id));
                    if (exists) {
                        return prev.map(m =>
                            (m.id === data.id || m.client_generated_id === data.client_id)
                                ? { ...data, pending: false }
                                : m
                        );
                    }
                    return [...prev, { ...data, pending: false }];
                });
                // Update room's last message in sidebar
                setRooms(prev => prev.map(r =>
                    r.id === room.id
                        ? { ...r, last_message: data.content, last_message_time: data.timestamp }
                        : data.sender_id !== user?.id
                            ? { ...r, unread_count: r.id === room.id ? 0 : r.unread_count }
                            : r
                ));
            }
        };
        wsRef.current = ws;
    }, [user?.id]);

    // ── Scroll to bottom ────────────────────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Cleanup on unmount ──────────────────────────────────────────────────────
    useEffect(() => () => { wsRef.current?.close(); }, []);

    // ── Send message ────────────────────────────────────────────────────────────
    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        // Optimistic update
        const optimistic: MessageData = {
            id: clientId,
            content: message,
            sender_id: user!.id,
            sender_name: user!.name || user!.username,
            sender_avatar: user!.avatar,
            timestamp: new Date().toISOString(),
            client_generated_id: clientId,
            pending: true,
        };
        setMessages(prev => [...prev, optimistic]);

        wsRef.current.send(JSON.stringify({ message, client_id: clientId }));
        setMessage('');
        typingSentRef.current = false;
    };

    // ── Typing indicator ────────────────────────────────────────────────────────
    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessage(e.target.value);
        if (wsRef.current?.readyState === WebSocket.OPEN && !typingSentRef.current) {
            wsRef.current.send(JSON.stringify({ type: 'typing' }));
            typingSentRef.current = true;
            setTimeout(() => { typingSentRef.current = false; }, 2000);
        }
    };

    // ── New DM created ──────────────────────────────────────────────────────────
    const handleRoomCreated = (room: Room) => {
        setRooms(prev => {
            const exists = prev.find(r => r.id === room.id);
            if (exists) return prev;
            return [room, ...prev];
        });
        selectRoom(room);
    };

    const filteredRooms = rooms.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase())
    );

    // ─── Sidebar ───────────────────────────────────────────────────────────────
    return (
        <div className="flex h-[calc(100vh-4rem)] bg-white overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
            {/* Sidebar */}
            <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/50 flex-shrink-0">

                {/* Sidebar header */}
                <div className="p-4 border-b border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-bold text-slate-800 text-lg">Messages</h2>
                        <button
                            onClick={() => setShowNewDM(true)}
                            className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                            title="Start new chat"
                        >
                            <UserPlus className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search chats..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                </div>

                {/* Room list */}
                <div className="flex-1 overflow-y-auto">
                    {loadingRooms ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                        </div>
                    ) : filteredRooms.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 p-8">
                            <MessageSquare className="h-10 w-10 opacity-30" />
                            <p className="text-sm text-center">No chats yet. Start one by clicking the <strong>+</strong> button above.</p>
                        </div>
                    ) : (
                        filteredRooms.map(room => (
                            <div
                                key={room.id}
                                onClick={() => selectRoom(room)}
                                className={`p-4 flex items-center gap-3 cursor-pointer transition-colors hover:bg-white border-b border-slate-100/50
                                    ${selectedRoom?.id === room.id ? 'bg-white border-l-2 border-l-indigo-600' : ''}`}
                            >
                                {/* Avatar */}
                                {room.is_direct_message ? (
                                    <img
                                        src={avatarUrl(room.name, room.participants.find(p => p.id !== user?.id)?.avatar)}
                                        alt={room.name}
                                        className="h-11 w-11 rounded-full flex-shrink-0 ring-2 ring-white"
                                    />
                                ) : (
                                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {room.name.slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <h3 className="font-semibold text-slate-800 truncate text-sm">{room.name}</h3>
                                        {room.last_message_time && (
                                            <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                                                {formatTime(room.last_message_time)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center mt-0.5">
                                        <p className="text-xs text-slate-500 truncate">{room.last_message || 'No messages yet'}</p>
                                        {room.unread_count > 0 && (
                                            <span className="ml-2 h-5 min-w-[20px] px-1 flex items-center justify-center bg-indigo-600 text-white text-xs font-bold rounded-full flex-shrink-0">
                                                {room.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Main chat area */}
            {selectedRoom ? (
                <div className="flex-1 flex flex-col h-full min-w-0">
                    {/* Chat header */}
                    <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-white flex-shrink-0">
                        <div className="flex items-center gap-3">
                            {selectedRoom.is_direct_message ? (
                                <img
                                    src={avatarUrl(selectedRoom.name, selectedRoom.participants.find(p => p.id !== user?.id)?.avatar)}
                                    alt={selectedRoom.name}
                                    className="h-9 w-9 rounded-full"
                                />
                            ) : (
                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                                    {selectedRoom.name.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h2 className="font-semibold text-slate-800 text-sm">{selectedRoom.name}</h2>
                                <p className={`text-xs flex items-center gap-1 ${wsConnected ? 'text-green-600' : 'text-slate-400'}`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                                    {wsConnected ? 'Connected' : 'Connecting...'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {selectedRoom.participants
                                .filter(p => p.id !== user?.id)
                                .slice(0, 4)
                                .map(p => (
                                    <img key={p.id} src={avatarUrl(p.username, p.avatar)} alt={p.username} className="h-7 w-7 rounded-full ring-2 ring-white -ml-2 first:ml-0" title={p.username} />
                                ))}
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30">
                        {loadingMessages ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                                <MessageSquare className="h-10 w-10 opacity-30" />
                                <p className="text-sm">Be the first to say hello! 👋</p>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.sender_id === user?.id;
                                return (
                                    <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        {!isMe && (
                                            <img src={avatarUrl(msg.sender_name, msg.sender_avatar)} alt={msg.sender_name} className="h-7 w-7 rounded-full flex-shrink-0 mb-0.5" />
                                        )}
                                        <div className={`max-w-[65%] space-y-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                            {!isMe && (
                                                <span className="text-xs text-slate-500 font-medium px-1">{msg.sender_name}</span>
                                            )}
                                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                                                ${isMe
                                                    ? 'bg-indigo-600 text-white rounded-br-sm'
                                                    : 'bg-white text-slate-700 border border-slate-100 shadow-sm rounded-bl-sm'
                                                }
                                                ${msg.pending ? 'opacity-60' : ''}
                                            `}>
                                                {msg.content}
                                            </div>
                                            <div className={`flex items-center gap-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <span className="text-[10px] text-slate-400">{formatTime(msg.timestamp)}</span>
                                                {isMe && (
                                                    msg.pending
                                                        ? <Check className="h-3 w-3 text-slate-300" />
                                                        : <CheckCheck className="h-3 w-3 text-indigo-400" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        {/* Typing indicator */}
                        {typingName && (
                            <div className="flex items-center gap-2 text-slate-400">
                                <div className="flex gap-1 px-3 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                    <span className="h-2 w-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0ms]" />
                                    <span className="h-2 w-2 bg-slate-300 rounded-full animate-bounce [animation-delay:150ms]" />
                                    <span className="h-2 w-2 bg-slate-300 rounded-full animate-bounce [animation-delay:300ms]" />
                                </div>
                                <span className="text-xs">{typingName} is typing…</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0">
                        <form onSubmit={handleSend} className="flex items-center gap-2">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={message}
                                    onChange={handleTyping}
                                    placeholder="Type a message…"
                                    className="w-full pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any); } }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!message.trim() || !wsConnected}
                                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-indigo-200 hover:shadow-indigo-300"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                /* Empty state */
                <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-50/20 text-slate-400">
                    <div className="h-20 w-20 rounded-2xl bg-indigo-50 flex items-center justify-center">
                        <MessageSquare className="h-10 w-10 text-indigo-300" />
                    </div>
                    <div className="text-center">
                        <p className="font-medium text-slate-600">Your messages</p>
                        <p className="text-sm mt-1">Select a chat or start a new one.</p>
                    </div>
                    <button
                        onClick={() => setShowNewDM(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
                    >
                        <Plus className="h-4 w-4" /> New Chat
                    </button>
                </div>
            )}

            {/* New DM modal */}
            {showNewDM && (
                <NewDMModal onClose={() => setShowNewDM(false)} onCreated={handleRoomCreated} />
            )}
        </div>
    );
}
