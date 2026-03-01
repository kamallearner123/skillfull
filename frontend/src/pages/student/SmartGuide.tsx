import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Brain, Calendar, MessageSquare, Loader2, Send,
    ChevronDown, ChevronUp, ExternalLink, RefreshCw, Zap,
    Award, Bot, HelpCircle
} from 'lucide-react';
import {
    getFeedback, getSchedule, streamChat, newChatSession, clearChatSession,
    type FeedbackResponse, type ScheduleResponse, type DayPlan,
} from '../../api/smartguide';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// ── Tab type ──────────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'feedback' | 'schedule' | 'chat';

// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard Tab
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardTab({ studentName }: { studentName: string }) {
    const [query, setQuery] = useState('');
    const [history, setHistory] = useState<{ q: string, a: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [tips, setTips] = useState<{ id: string, text: string, color: string }[]>([]);
    const [challenges, setChallenges] = useState<{ id: string, title: string, description: string, difficulty: string, deadline_info: string, failure_rate_label: string, progress_percent: number }[]>([]);
    const [fetchingData, setFetchingData] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tipsRes, challengesRes] = await Promise.all([
                    api.get('/ai-assistant/tips'),
                    api.get('/ai-assistant/challenges')
                ]);
                setTips(tipsRes.data);
                setChallenges(challengesRes.data);
            } catch (err) {
                console.error("Error fetching SmartGuide data", err);
            } finally {
                setFetchingData(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history]);

    const handleQuery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || loading) return;

        const currentQuery = query;
        setQuery('');
        setLoading(true);

        try {
            const res = await api.post('/ai-assistant/query', { query: currentQuery });
            const data = res.data;
            setHistory(h => [...h, { q: currentQuery, a: data.response || data.error || 'I could not process that request.' }]);
        } catch (err) {
            setHistory(h => [...h, { q: currentQuery, a: 'Technical error connecting to SmartGuide service.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
            {/* Left: Assistant */}
            <div className="lg:col-span-8 space-y-6">
                <div className="sg-card h-[550px] flex flex-col relative overflow-hidden backdrop-blur-xl border-indigo-500/10">
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                        <h3 className="sg-section-title flex items-center gap-3 mb-0">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                <Bot className="w-5 h-5 text-indigo-400" />
                            </div>
                            Placement Assistant
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Online</span>
                        </div>
                    </div>

                    <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar mb-4 scroll-smooth">
                        {history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 px-10">
                                <div className="h-16 w-16 bg-slate-800 rounded-2xl flex items-center justify-center">
                                    <HelpCircle className="w-8 h-8 text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-white font-bold opacity-30">Hi {studentName}!</p>
                                    <p className="text-sm text-gray-500 leading-relaxed mt-2">
                                        Ask me about placements, resume tips, or get help with technical concepts like Spark or SQL.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            history.map((item, i) => (
                                <div key={i} className="animate-fadeIn space-y-3">
                                    <div className="flex justify-end">
                                        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl rounded-tr-sm px-4 py-2 text-sm text-white max-w-[85%] shadow-lg shadow-indigo-900/50">
                                            {item.q}
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                                            <Bot className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-300 max-w-[90%] leading-relaxed">
                                            {item.a}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        {loading && (
                            <div className="flex gap-4 animate-pulse">
                                <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-100"></div>
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-200"></div>
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-300"></div>
                                    </div>
                                    <span className="text-[10px] text-indigo-400/50 uppercase font-black">Synthesizing...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleQuery} className="relative mt-auto">
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent -top-8 pointer-events-none"></div>
                        <div className="relative">
                            <input
                                type="text"
                                className="sg-input pr-12 pl-4 py-4 rounded-2xl border-white/10 focus:border-indigo-500/50 transition-all bg-black"
                                placeholder="What would you like to know?"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                disabled={loading}
                            />
                            <button
                                type="submit"
                                disabled={loading || !query.trim()}
                                className="absolute right-2 top-2 bottom-2 bg-gradient-to-br from-indigo-500 to-purple-600 hover:scale-105 active:scale-95 text-white w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-20 disabled:scale-100"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right: Side info */}
            <div className="lg:col-span-4 space-y-6">
                {/* Motivation Card */}
                <div className="sg-card bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden relative group">
                    <div className="absolute -right-4 -top-4 opacity-10 rotate-12 transition-transform group-hover:scale-125 duration-700">
                        <Bot className="w-32 h-32 text-white" />
                    </div>
                    <div className="relative">
                        <h4 className="text-white font-black text-lg mb-1 leading-tight">Ready for your dream job?</h4>
                        <p className="text-indigo-100 text-xs font-medium opacity-80">SmartGuide has analyzed 10k+ career paths to help you.</p>
                        <button className="mt-6 w-full bg-white text-indigo-600 font-black text-[10px] uppercase tracking-widest py-3 rounded-xl shadow-xl shadow-indigo-950/20 active:translate-y-1 transition-all">
                            Personalize My Journey
                        </button>
                    </div>
                </div>

                {/* Tips */}
                <div className="sg-card bg-slate-800/20 border-white/5 hover:border-indigo-500/20 transition-all">
                    <h4 className="sg-subsection-title flex items-center gap-2 text-indigo-400 mb-4">
                        <Zap className="w-3 h-3" /> Dashboard Tips
                    </h4>
                    <ul className="space-y-4">
                        {fetchingData ? (
                            [1, 2, 3].map(i => <div key={i} className="h-4 bg-white/5 rounded animate-pulse w-full"></div>)
                        ) : tips.length > 0 ? (
                            tips.map((tip) => (
                                <li key={tip.id} className="flex gap-4 group">
                                    <div className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 bg-${tip.color}-400 group-hover:scale-150 transition-transform`}></div>
                                    <p className="text-xs text-gray-400 leading-relaxed font-medium">{tip.text}</p>
                                </li>
                            ))
                        ) : (
                            <p className="text-xs text-gray-500 italic">No tips available yet.</p>
                        )}
                    </ul>
                </div>

                {/* Challenges */}
                <div className="sg-card bg-slate-800/20 border-white/5">
                    <h4 className="sg-subsection-title flex items-center gap-2 text-amber-500 mb-4">
                        <Award className="w-3 h-3" /> Live Challenge
                    </h4>
                    <div className="space-y-4">
                        {fetchingData ? (
                            <div className="h-24 bg-white/5 rounded animate-pulse"></div>
                        ) : challenges.length > 0 ? (
                            challenges.map((c) => (
                                <div key={c.id} className="p-4 bg-black/40 rounded-2xl border border-white/5 group hover:border-amber-500/30 transition-all cursor-pointer">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full font-black uppercase tracking-wider">{c.difficulty}</span>
                                        <span className="text-[10px] text-gray-500 font-bold">{c.deadline_info}</span>
                                    </div>
                                    <p className="text-sm font-bold text-white group-hover:text-amber-200 transition-colors">{c.title}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">{c.description}</p>

                                    <div className="mt-4 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${c.progress_percent}%` }}></div>
                                    </div>
                                    <div className="mt-2 flex justify-between items-center text-[10px] font-bold">
                                        <span className="text-gray-500">{c.failure_rate_label}</span>
                                        <span className="text-amber-500 uppercase tracking-tighter">Enter Contest →</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-gray-500 italic text-center">No challenges today.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Feedback Tab
// ═══════════════════════════════════════════════════════════════════════════════
function FeedbackTab({ studentName }: { studentName: string }) {
    const [form, setForm] = useState({
        attempt_id: '', domain: 'Data Engineering', score: 0, total: 20,
        weak_topics: '', strong_topics: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<FeedbackResponse | null>(null);

    const DOMAINS = [
        'Data Engineering', 'Cloud / DevOps', 'AI / ML',
        'Full Stack', 'Data Science', 'Cyber Security', 'Embedded Engineer',
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError(''); setResult(null);
        try {
            const percentage = form.total > 0 ? (form.score / form.total) * 100 : 0;
            const res = await getFeedback({
                attempt_id: form.attempt_id || 'manual-' + Date.now(),
                student_name: studentName,
                domain: form.domain,
                score: form.score,
                total: form.total,
                percentage,
                weak_topics: form.weak_topics.split(',').map(t => t.trim()).filter(Boolean),
                strong_topics: form.strong_topics.split(',').map(t => t.trim()).filter(Boolean),
            });
            setResult(res);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="sg-card">
                <h3 className="sg-section-title">Assessment Details</h3>
                <div className="sg-grid-2">
                    <div>
                        <label className="sg-label">Domain</label>
                        <select className="sg-input" value={form.domain}
                            onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}>
                            {DOMAINS.map(d => <option key={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="sg-label">Score</label>
                        <div className="flex gap-2">
                            <input type="number" className="sg-input" placeholder="Score"
                                value={form.score} min={0} max={form.total}
                                onChange={e => setForm(f => ({ ...f, score: Number(e.target.value) }))} />
                            <span className="sg-label self-center">/</span>
                            <input type="number" className="sg-input" placeholder="Total"
                                value={form.total} min={1}
                                onChange={e => setForm(f => ({ ...f, total: Number(e.target.value) }))} />
                        </div>
                    </div>
                </div>
                <div className="sg-grid-2">
                    <div>
                        <label className="sg-label">Weak Topics <span className="text-xs text-gray-400">(comma-separated)</span></label>
                        <input type="text" className="sg-input" placeholder="e.g. Spark, Kafka"
                            value={form.weak_topics}
                            onChange={e => setForm(f => ({ ...f, weak_topics: e.target.value }))} />
                    </div>
                    <div>
                        <label className="sg-label">Strong Topics <span className="text-xs text-gray-400">(comma-separated)</span></label>
                        <input type="text" className="sg-input" placeholder="e.g. SQL, Airflow"
                            value={form.strong_topics}
                            onChange={e => setForm(f => ({ ...f, strong_topics: e.target.value }))} />
                    </div>
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button type="submit" disabled={loading} className="sg-btn-primary w-full">
                    {loading ? <><Loader2 className="animate-spin w-4 h-4 mr-2" />Generating Feedback…</> : <><Zap className="w-4 h-4 mr-2" />Get AI Feedback</>}
                </button>
            </form>

            {result && (
                <div className="sg-card space-y-5 animate-fadeIn">
                    {/* Summary */}
                    <div className="sg-highlight">
                        <p className="text-indigo-100 leading-relaxed">{result.overall_summary}</p>
                    </div>

                    {/* Strengths & Improvement */}
                    <div className="sg-grid-2">
                        <div>
                            <h4 className="sg-subsection-title text-emerald-400">✓ Strengths</h4>
                            <ul className="space-y-1">
                                {result.strengths.map((s, i) => (
                                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                        <span className="text-emerald-500 mt-0.5">•</span>{s}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h4 className="sg-subsection-title text-amber-400">▲ Improve</h4>
                            <ul className="space-y-1">
                                {result.improvement_areas.map((a, i) => (
                                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                                        <span className="text-amber-500 mt-0.5">•</span>{a}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Priority Topics */}
                    <div>
                        <h4 className="sg-subsection-title">🎯 Study Next</h4>
                        <div className="flex flex-wrap gap-2">
                            {result.priority_topics.map((t, i) => (
                                <span key={i} className="sg-tag-priority">{t}</span>
                            ))}
                        </div>
                    </div>

                    {/* Resources */}
                    {result.suggested_resources.length > 0 && (
                        <div>
                            <h4 className="sg-subsection-title">📚 Resources</h4>
                            <div className="space-y-2">
                                {result.suggested_resources.map((r, i) => (
                                    <a key={i} href={r.url} target="_blank" rel="noreferrer"
                                        className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                                        <ExternalLink className="w-3 h-3" />{r.title}
                                        <span className="text-gray-500 text-xs">({r.type})</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Motivation */}
                    {result.motivational_note && (
                        <div className="border-t border-white/10 pt-4">
                            <p className="text-gray-400 italic text-sm">"{result.motivational_note}"</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Schedule Tab
// ═══════════════════════════════════════════════════════════════════════════════
function ScheduleTab({ studentName }: { studentName: string }) {
    const [form, setForm] = useState({
        domain: 'Data Engineering', weak_topics: '', strong_topics: '',
        target_date: '', available_hours_per_day: 2, goal: 'Interview',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<ScheduleResponse | null>(null);
    const [expandedDay, setExpandedDay] = useState<number | null>(0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError(''); setResult(null);
        try {
            const res = await getSchedule({
                student_name: studentName,
                domain: form.domain,
                weak_topics: form.weak_topics.split(',').map(t => t.trim()).filter(Boolean),
                strong_topics: form.strong_topics.split(',').map(t => t.trim()).filter(Boolean),
                target_date: form.target_date,
                available_hours_per_day: form.available_hours_per_day,
                goal: form.goal,
            });
            setResult(res);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="sg-card">
                <h3 className="sg-section-title">Generate Prep Schedule</h3>
                <div className="sg-grid-2">
                    <div>
                        <label className="sg-label">Domain</label>
                        <select className="sg-input" value={form.domain}
                            onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}>
                            {['Data Engineering', 'Cloud / DevOps', 'AI / ML', 'Full Stack', 'Data Science', 'Cyber Security', 'Embedded Engineer'].map(d => <option key={d}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="sg-label">Goal</label>
                        <select className="sg-input" value={form.goal}
                            onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}>
                            {['Interview', 'Written test', 'Both'].map(g => <option key={g}>{g}</option>)}
                        </select>
                    </div>
                </div>
                <div className="sg-grid-2">
                    <div>
                        <label className="sg-label">Target Date</label>
                        <input type="date" className="sg-input" min={today} required
                            value={form.target_date}
                            onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
                    </div>
                    <div>
                        <label className="sg-label">Hours/Day</label>
                        <input type="number" className="sg-input" min={0.5} max={12} step={0.5}
                            value={form.available_hours_per_day}
                            onChange={e => setForm(f => ({ ...f, available_hours_per_day: Number(e.target.value) }))} />
                    </div>
                </div>
                <div>
                    <label className="sg-label">Weak Topics <span className="text-xs text-gray-400">(comma-separated)</span></label>
                    <input type="text" className="sg-input" placeholder="e.g. Spark, Kafka, Docker"
                        value={form.weak_topics}
                        onChange={e => setForm(f => ({ ...f, weak_topics: e.target.value }))} />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <button type="submit" disabled={loading || !form.target_date} className="sg-btn-primary w-full">
                    {loading ? <><Loader2 className="animate-spin w-4 h-4 mr-2" />Generating Schedule…</> : <><Calendar className="w-4 h-4 mr-2" />Generate Schedule</>}
                </button>
            </form>

            {result && (
                <div className="sg-card animate-fadeIn">
                    <div className="mb-4">
                        <h3 className="sg-section-title mb-1">{result.student_name}'s Prep Plan</h3>
                        <p className="text-gray-400 text-sm">{result.overall_strategy}</p>
                        <div className="flex gap-4 mt-3">
                            <span className="sg-badge-blue">{result.domain}</span>
                            <span className="sg-badge-purple">{result.goal}</span>
                            <span className="text-gray-400 text-xs self-center">{result.total_days} days · {result.start_date} → {result.target_date}</span>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {result.plan.map((day: DayPlan, i: number) => (
                            <div key={i} className="sg-day-card">
                                <button
                                    className="flex items-center justify-between w-full text-left"
                                    onClick={() => setExpandedDay(expandedDay === i ? null : i)}>
                                    <div className="flex items-center gap-3">
                                        <span className="sg-day-badge">{i + 1}</span>
                                        <div>
                                            <p className="text-white text-sm font-medium">{day.day_label}</p>
                                            <p className="text-gray-500 text-xs">{day.date} · {day.total_hours}h</p>
                                        </div>
                                    </div>
                                    {expandedDay === i ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                </button>
                                {expandedDay === i && (
                                    <div className="mt-3 pl-10 space-y-2 border-t border-white/10 pt-3">
                                        {day.tasks.map((t, j) => (
                                            <div key={j} className="bg-black/20 rounded-lg p-3">
                                                <p className="text-white text-sm font-medium">{t.title}</p>
                                                <p className="text-gray-400 text-xs mt-1">{t.description}</p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="text-gray-500 text-xs">~{t.estimated_minutes} min</span>
                                                    {t.resource_url && (
                                                        <a href={t.resource_url} target="_blank" rel="noreferrer"
                                                            className="text-indigo-400 text-xs hover:underline flex items-center gap-1">
                                                            <ExternalLink className="w-3 h-3" />Resource
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Chat Tab
// ═══════════════════════════════════════════════════════════════════════════════
interface Message { role: 'user' | 'assistant'; content: string; streaming?: boolean; }

function ChatTab(_: { studentName: string }) {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [context, setContext] = useState('Technical mock interview preparation');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const abortRef = useRef<AbortController | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Start a session on mount
    useEffect(() => {
        newChatSession().then(setSessionId).catch(() => setError('Could not connect to SmartGuide'));
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = useCallback(async () => {
        if (!input.trim() || !sessionId || loading) return;
        const userMsg = input.trim();
        setInput('');
        setLoading(true);
        setError('');

        setMessages(m => [...m, { role: 'user', content: userMsg }]);
        // Placeholder streaming message
        setMessages(m => [...m, { role: 'assistant', content: '', streaming: true }]);

        let buffer = '';
        abortRef.current = streamChat(
            sessionId, userMsg, context,
            (token) => {
                buffer += token;
                setMessages(m => {
                    const next = [...m];
                    next[next.length - 1] = { role: 'assistant', content: buffer, streaming: true };
                    return next;
                });
            },
            (_len) => {
                setMessages(m => {
                    const next = [...m];
                    next[next.length - 1] = { role: 'assistant', content: buffer, streaming: false };
                    return next;
                });
                setLoading(false);
            },
            (err) => {
                setError(err);
                setMessages(m => m.slice(0, -1)); // remove empty assistant message
                setLoading(false);
            },
        );
    }, [input, sessionId, loading, context]);

    const handleReset = async () => {
        if (sessionId) await clearChatSession(sessionId);
        const newId = await newChatSession();
        setSessionId(newId);
        setMessages([]);
        setError('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    return (
        <div className="flex flex-col h-[620px] sg-card p-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/20">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-medium text-white">Mock Interview</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="flex items-center gap-2">
                    <input
                        className="sg-input text-xs py-1 px-2 w-52"
                        placeholder="Session context…"
                        value={context}
                        onChange={e => setContext(e.target.value)} />
                    <button onClick={handleReset} title="New session"
                        className="text-gray-400 hover:text-white transition-colors">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                        <Brain className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-sm">SmartGuide is ready to interview you.</p>
                        <p className="text-xs mt-1">Type a message or ask "Start the interview" to begin.</p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
              ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-br-sm'
                                : 'bg-white/10 text-gray-200 rounded-bl-sm'}`}>
                            {msg.content}
                            {msg.streaming && <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse rounded-sm" />}
                        </div>
                    </div>
                ))}
                {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-white/10 bg-black/20">
                <div className="flex gap-2">
                    <textarea
                        rows={1}
                        className="sg-input flex-1 resize-none py-2 text-sm"
                        placeholder="Type your answer…  (Enter to send, Shift+Enter for newline)"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={loading || !sessionId} />
                    <button onClick={handleSend} disabled={loading || !input.trim() || !sessionId}
                        className="sg-btn-primary px-4 py-2">
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main SmartGuide Page
// ═══════════════════════════════════════════════════════════════════════════════
export default function SmartGuide() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const studentName = (user as { name?: string })?.name ?? 'Student';

    const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'dashboard', label: 'Home', icon: <Bot className="w-4 h-4" /> },
        { id: 'feedback', label: 'AI Feedback', icon: <Brain className="w-4 h-4" /> },
        { id: 'schedule', label: 'Schedule', icon: <Calendar className="w-4 h-4" /> },
        { id: 'chat', label: 'Mock Interview', icon: <MessageSquare className="w-4 h-4" /> },
    ];

    return (
        <div className="min-h-screen sg-bg p-6">
            {/* Hero */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="sg-logo-badge">
                        <Zap className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">SmartGuide</h1>
                        <p className="text-gray-400 text-sm">Your AI-powered placement preparation coach</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-black/30 p-1 rounded-xl w-fit">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === t.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                        {t.icon}{t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="max-w-7xl">
                {activeTab === 'dashboard' && <DashboardTab studentName={studentName} />}
                {activeTab === 'feedback' && <FeedbackTab studentName={studentName} />}
                {activeTab === 'schedule' && <ScheduleTab studentName={studentName} />}
                {activeTab === 'chat' && <ChatTab studentName={studentName} />}
            </div>

            {/* Inline styles (component-scoped via className convention) */}
            <style>{`
        .sg-bg { background: linear-gradient(135deg, #0f0f1a 0%, #12122a 100%); }
        .sg-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 1.5rem; }
        .sg-section-title { font-size: 1rem; font-weight: 600; color: white; margin-bottom: 1rem; }
        .sg-subsection-title { font-size: 0.8rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.05em; margin-bottom: 0.5rem; color: #9ca3af; }
        .sg-label { display: block; font-size: 0.75rem; font-weight: 500; color: #9ca3af; margin-bottom: 0.25rem; }
        .sg-input { width: 100%; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; padding: 0.5rem 0.75rem; color: white; font-size: 0.875rem; outline: none;
          transition: border-color 0.15s; }
        .sg-input:focus { border-color: #6366f1; }
        .sg-input::placeholder { color: #4b5563; }
        .sg-btn-primary { display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white;
          font-size: 0.875rem; font-weight: 600; padding: 0.625rem 1.25rem;
          border-radius: 10px; transition: all 0.2s; border: none; cursor: pointer; }
        .sg-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(99,102,241,0.35); }
        .sg-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .sg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .sg-highlight { background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1));
          border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 1rem; }
        .sg-tag-priority { background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.4);
          color: #a5b4fc; font-size: 0.75rem; padding: 0.25rem 0.75rem; border-radius: 9999px; }
        .sg-badge-blue { background: rgba(59,130,246,0.2); color: #93c5fd; font-size: 0.7rem;
          padding: 0.2rem 0.6rem; border-radius: 9999px; }
        .sg-badge-purple { background: rgba(139,92,246,0.2); color: #c4b5fd; font-size: 0.7rem;
          padding: 0.2rem 0.6rem; border-radius: 9999px; }
        .sg-day-card { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px; padding: 0.875rem 1rem; }
        .sg-day-badge { background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white; font-size: 0.7rem; font-weight: 700;
          width: 1.5rem; height: 1.5rem; border-radius: 6px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sg-logo-badge { background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3);
          border-radius: 12px; padding: 0.625rem; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .animate-fadeIn { animation: fadeIn 0.4s ease; }
      `}</style>
        </div>
    );
}
