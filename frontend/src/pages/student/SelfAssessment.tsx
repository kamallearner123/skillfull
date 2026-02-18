import { useState, useEffect } from 'react';
import {
    Cpu,
    Cloud,
    Database,
    Shield,
    Layers,
    Terminal,
    Activity,
    Plus,
    History,
    Timer,
    CheckCircle,
    XCircle,
    ArrowLeft,
    ArrowRight
} from 'lucide-react';
import axios from 'axios';

// Configure Axios
// Dynamically determine backend URL to match current hostname (localhost or 127.0.0.1)
// This ensures cookies (CSRF/Session) are shared correctly.
const backendHost = window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:8000/api' : 'http://localhost:8000/api';

const api = axios.create({
    baseURL: backendHost,
    withCredentials: true,
});

// Add interceptor for headers
api.interceptors.request.use((config) => {
    // CSRF token in cookie
    const getCookie = (name: string) => {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    };

    // Set CSRF token
    const csrftoken = getCookie('csrftoken');
    if (csrftoken) {
        config.headers['X-CSRFToken'] = csrftoken;
    }

    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`; // Adjust based on your auth
    }
    return config;
});

interface AssessmentType {
    id: string; // The ID used for the API call (e.g., 'Data Engineering')
    title: string;
    icon: any;
    color: string;
}

const assessmentTypes: AssessmentType[] = [
    { id: 'Data Engineering', title: 'Data Engineering', icon: Database, color: 'blue' },
    { id: 'Cloud / DevOps', title: 'Cloud / DevOps', icon: Cloud, color: 'sky' },
    { id: 'Embedded Engineer', title: 'Embedded Engineer', icon: Cpu, color: 'orange' },
    { id: 'AI / ML', title: 'AI / ML', icon: Activity, color: 'purple' },
    { id: 'Full Stack', title: 'Full Stack', icon: Layers, color: 'indigo' },
    { id: 'Testing', title: 'Testing', icon: Terminal, color: 'red' },
    { id: 'Electronics', title: 'Electronics', icon: Cpu, color: 'amber' },
    { id: 'Cyber Security', title: 'Cyber Security', icon: Shield, color: 'emerald' },
];

// Update Question interface to include report details
interface Question {
    id: string;
    text: string;
    options: string[];
    correctAnswer?: string;
    userAnswer?: string;
    isCorrect?: boolean;
}

// ... (AssessmentState remains same roughly, but questions now has more fields)

interface AssessmentState {
    attemptId: string;
    questions: Question[];
    answers: { [questionId: string]: string };
    currentQuestionIndex: number;
    timeLeft: number; // in seconds
    isSubmitting: boolean;
    isCompleted: boolean;
    result?: {
        score: number;
        total: number;
        percentage: number;
        feedback: string;
    };
}


interface Stats {
    total_finished: number;
    average_score: number;
    rank: number;
    total_participants: number;
}

export default function SelfAssessment() {
    const [view, setView] = useState<'history' | 'selection' | 'taking'>('history');
    const [assessmentState, setAssessmentState] = useState<AssessmentState | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<Stats | null>(null);

    // Fetch Stats
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/assessments/stats');
                setStats(response.data);
            } catch (err) {
                console.error("Failed to fetch stats", err);
            }
        };
        fetchStats();
    }, [view]);

    // Timer Logic
    useEffect(() => {
        let interval: any;
        if (view === 'taking' && assessmentState && !assessmentState.isCompleted && assessmentState.timeLeft > 0) {
            interval = setInterval(() => {
                setAssessmentState(prev => {
                    if (!prev) return null;
                    if (prev.timeLeft <= 1) {
                        // Time's up! Auto-submit or handle appropriately
                        handleTimeUp();
                        return { ...prev, timeLeft: 0 };
                    }
                    return { ...prev, timeLeft: prev.timeLeft - 1 };
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [view, assessmentState?.isCompleted, assessmentState?.timeLeft]);

    const handleTimeUp = () => {
        if (assessmentState && !assessmentState.isSubmitting && !assessmentState.isCompleted) {
            submitAssessment();
        }
    };

    const startAssessment = async (domain: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/assessments/start', { domain });
            const data = response.data;

            setAssessmentState({
                attemptId: data.attempt_id,
                questions: data.questions,
                answers: {},
                currentQuestionIndex: 0,
                timeLeft: 30 * 60, // 30 minutes in seconds
                isSubmitting: false,
                isCompleted: false
            });
            setView('taking');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to start assessment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSelect = (questionId: string, answer: string) => {
        setAssessmentState(prev => {
            if (!prev) return null;
            return {
                ...prev,
                answers: {
                    ...prev.answers,
                    [questionId]: answer
                }
            };
        });
    };

    const handleNextQuestion = () => {
        setAssessmentState(prev => {
            if (!prev) return null;
            const nextIndex = prev.currentQuestionIndex + 1;
            if (nextIndex < prev.questions.length) {
                return { ...prev, currentQuestionIndex: nextIndex as any };
            }
            return prev;
        });
    };

    const handlePreviousQuestion = () => {
        setAssessmentState(prev => {
            if (!prev) return null;
            const prevIndex = prev.currentQuestionIndex - 1;
            if (prevIndex >= 0) {
                return { ...prev, currentQuestionIndex: prevIndex as any };
            }
            return prev;
        });
    };

    const jumpToQuestion = (index: number) => {
        setAssessmentState(prev => {
            if (!prev) return null;
            return { ...prev, currentQuestionIndex: index as any };
        });
    }

    const submitAssessment = async () => {
        if (!assessmentState) return;

        setAssessmentState(prev => prev ? { ...prev, isSubmitting: true } : null);
        try {
            const formattedAnswers = Object.entries(assessmentState.answers).map(([qId, ans]) => ({
                question_id: qId,
                answer: ans
            }));

            const response = await api.post('/assessments/submit', {
                attempt_id: assessmentState.attemptId,
                answers: formattedAnswers
            });

            setAssessmentState(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    isCompleted: true,
                    isSubmitting: false,
                    result: response.data
                }
            });

        } catch (err: any) {
            console.error(err);
            setError('Failed to submit assessment. Please try again.');
            setAssessmentState(prev => prev ? { ...prev, isSubmitting: false } : null);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    if (loading && !assessmentState) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // --- ASSESSMENT TAKING UI ---
    if (view === 'taking' && assessmentState) {
        if (assessmentState.isCompleted && assessmentState.result) {
            // RESULT SCREEN
            return (
                <div className="max-w-3xl mx-auto p-8 space-y-8">
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden text-center p-12 space-y-6">
                        <div className={`mx-auto h-24 w-24 rounded-full flex items-center justify-center ${assessmentState.result.percentage >= 70 ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            {assessmentState.result.percentage >= 70 ? <CheckCircle className="h-12 w-12" /> : <Activity className="h-12 w-12" />}
                        </div>

                        <div>
                            <h2 className="text-3xl font-bold text-slate-800 mb-2">Assessment Completed!</h2>
                            <p className="text-slate-500 text-lg">{assessmentState.result.feedback}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto py-6">
                            <div className="p-4 bg-slate-50 rounded-2xl">
                                <p className="text-slate-500 text-sm mb-1">Score</p>
                                <p className="text-2xl font-bold text-slate-800">{assessmentState.result.score} <span className="text-sm font-normal text-slate-400">/ {assessmentState.result.total}</span></p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl">
                                <p className="text-slate-500 text-sm mb-1">Percentage</p>
                                <p className="text-2xl font-bold text-indigo-600">{assessmentState.result.percentage.toFixed(1)}%</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-2xl">
                                <p className="text-slate-500 text-sm mb-1">Status</p>
                                <p className="text-2xl font-bold text-slate-800">
                                    {assessmentState.result.percentage >= 50 ? 'Passed' : 'Needs Work'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setAssessmentState(null);
                                setView('history');
                            }}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                        >
                            Back to Dashboard
                        </button>
                    </div>

                    {/* Detailed Report Section (Only show if questions exist, which they do for reports/new submissions if passed) */}
                    {assessmentState.questions.length > 0 && (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <History className="h-5 w-5 text-indigo-600" />
                                Detailed Report
                            </h3>
                            <div className="space-y-8">
                                {assessmentState.questions.map((q, idx) => (
                                    <div key={q.id} className="border-b border-slate-100 pb-8 last:border-0 last:pb-0">
                                        <div className="flex gap-4">
                                            <div className={`
                                                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white
                                                ${q.isCorrect ? 'bg-green-500' : 'bg-red-500'}
                                            `}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <p className="font-medium text-lg text-slate-800">{q.text}</p>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {q.options.map((option, optIdx) => {
                                                        const isSelected = q.userAnswer === option;
                                                        const isCorrect = q.correctAnswer === option;

                                                        let styleClass = "border-slate-200 bg-white hover:bg-slate-50"; // default
                                                        let icon = null;

                                                        if (isCorrect) {
                                                            styleClass = "border-green-200 bg-green-50 text-green-800";
                                                            icon = <CheckCircle className="h-4 w-4 text-green-600" />;
                                                        } else if (isSelected && !isCorrect) {
                                                            styleClass = "border-red-200 bg-red-50 text-red-800";
                                                            icon = <XCircle className="h-4 w-4 text-red-600" />;
                                                        } else if (isSelected && isCorrect) {
                                                            styleClass = "border-green-200 bg-green-50 text-green-800"; // Should already be covered
                                                        }

                                                        return (
                                                            <div key={optIdx} className={`p-3 rounded-lg border flex items-center justify-between ${styleClass}`}>
                                                                <span className="text-sm">{option}</span>
                                                                {icon}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )
        }

        const currentQ = assessmentState.questions[assessmentState.currentQuestionIndex];
        const isLastQuestion = assessmentState.currentQuestionIndex === assessmentState.questions.length - 1;

        return (
            <div className="max-w-5xl mx-auto p-4 md:p-8 h-[calc(100vh-80px)] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Self Assessment</h2>
                        <p className="text-sm text-slate-500">Question {assessmentState.currentQuestionIndex + 1} of {assessmentState.questions.length}</p>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold ${assessmentState.timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Timer className="h-5 w-5" />
                        {formatTime(assessmentState.timeLeft)}
                    </div>
                </div>

                <div className="flex gap-6 flex-1 min-h-0">
                    {/* Main Question Area */}
                    <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-8 flex-1 overflow-y-auto">
                            <h3 className="text-xl md:text-2xl font-medium text-slate-800 mb-8 leading-relaxed">
                                {currentQ.text}
                            </h3>

                            <div className="space-y-4">
                                {currentQ.options.map((option, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleAnswerSelect(currentQ.id, option)}
                                        className={`p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:bg-slate-50 flex items-center gap-4 group 
                                            ${assessmentState.answers[currentQ.id] === option
                                                ? 'border-indigo-600 bg-indigo-50/50 hover:bg-indigo-50'
                                                : 'border-slate-100 hover:border-indigo-200'}`}
                                    >
                                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                                            ${assessmentState.answers[currentQ.id] === option
                                                ? 'border-indigo-600 bg-indigo-600'
                                                : 'border-slate-300 group-hover:border-indigo-400'}`}>
                                            {assessmentState.answers[currentQ.id] === option && <div className="h-2.5 w-2.5 rounded-full bg-white" />}
                                        </div>
                                        <span className={`text-lg ${assessmentState.answers[currentQ.id] === option ? 'text-indigo-900 font-medium' : 'text-slate-600'}`}>
                                            {option}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer Navigation */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <button
                                onClick={handlePreviousQuestion}
                                disabled={assessmentState.currentQuestionIndex === 0}
                                className="px-6 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors flex items-center gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" /> Previous
                            </button>

                            {isLastQuestion ? (
                                <button
                                    onClick={submitAssessment}
                                    disabled={assessmentState.isSubmitting}
                                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center gap-2"
                                >
                                    {assessmentState.isSubmitting ? 'Submitting...' : 'Submit Assessment'}
                                    {!assessmentState.isSubmitting && <CheckCircle className="h-4 w-4" />}
                                </button>
                            ) : (
                                <button
                                    onClick={handleNextQuestion}
                                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center gap-2"
                                >
                                    Next Question <ArrowRight className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sidebar / Question Map (Hidden on mobile) */}
                    <div className="hidden lg:block w-72 bg-white rounded-3xl shadow-sm border border-slate-100 p-6 overflow-y-auto">
                        <h4 className="font-bold text-slate-800 mb-4">Questions Map</h4>
                        <div className="grid grid-cols-4 gap-3">
                            {assessmentState.questions.map((q, idx) => {
                                const isAnswered = !!assessmentState.answers[q.id];
                                const isCurrent = idx === assessmentState.currentQuestionIndex;
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => jumpToQuestion(idx)}
                                        className={`aspect-square rounded-lg flex items-center justify-center font-medium text-sm transition-all
                                            ${isCurrent ? 'bg-indigo-600 text-white ring-2 ring-indigo-200 ring-offset-2' :
                                                isAnswered ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' :
                                                    'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        {idx + 1}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="mt-8 space-y-3">
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <div className="w-3 h-3 rounded-full bg-indigo-600"></div> Current
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <div className="w-3 h-3 rounded-full bg-indigo-100"></div> Answered
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <div className="w-3 h-3 rounded-full bg-slate-100"></div> Unanswered
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- MAIN DASHBOARD / SELECTION UI ---
    const handleViewReport = async (resultSummary: any) => {
        setLoading(true);
        try {
            const response = await api.get(`/assessments/report/${resultSummary.attempt_id}`);
            const report = response.data;

            // Map the report questions to our Question interface
            const questionsWithDetails: Question[] = report.questions.map((q: any) => ({
                id: q.id,
                text: q.text,
                options: q.options,
                correctAnswer: q.correct_answer,
                userAnswer: q.user_answer,
                isCorrect: q.is_correct
            }));

            // Create answers map for compatibility
            const answersMap: { [key: string]: string } = {};
            report.questions.forEach((q: any) => {
                if (q.user_answer) answersMap[q.id] = q.user_answer;
            });

            setAssessmentState({
                attemptId: report.attempt_id,
                questions: questionsWithDetails,
                answers: answersMap,
                currentQuestionIndex: 0,
                timeLeft: 0,
                isSubmitting: false,
                isCompleted: true, // This triggers the Result View
                result: {
                    score: report.score,
                    total: report.total,
                    percentage: report.percentage,
                    feedback: report.feedback
                }
            });
            setView('taking');
        } catch (err) {
            console.error("Failed to fetch report", err);
            setError("Failed to load report. Please try again.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Self Assessment</h1>
                    <p className="text-slate-500 mt-1">Evaluate your skills and track your progress</p>
                </div>

                {view === 'history' && (
                    <button
                        onClick={() => setView('selection')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 hover:shadow-indigo-300"
                    >
                        <Plus className="h-4 w-4" /> New Assessment
                    </button>
                )}

                {view === 'selection' && (
                    <button
                        onClick={() => setView('history')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <History className="h-4 w-4" /> View History
                    </button>
                )}
            </div>

            {/* Stats Section */}
            {stats && view !== 'taking' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <CheckCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm">Assessments Completed</p>
                            <p className="text-2xl font-bold text-slate-800">{stats.total_finished}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                            <Activity className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm">Average Score</p>
                            <p className="text-2xl font-bold text-slate-800">{stats.average_score}%</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                            <Shield className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-slate-500 text-sm">Overall Rank</p>
                            <p className="text-2xl font-bold text-slate-800">#{stats.rank} <span className="text-sm font-normal text-slate-400">/ {stats.total_participants}</span></p>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    {error}
                </div>
            )}

            {view === 'history' ? (
                /* HISTORY VIEW */
                <AssessmentHistoryView onViewReport={handleViewReport} />
            ) : (
                /* SELECTION VIEW */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {assessmentTypes.map((type) => (
                        <div
                            key={type.id}
                            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col items-center text-center relative overflow-hidden"
                            onClick={() => startAssessment(type.id)}
                        >
                            <div className={`p-4 rounded-2xl bg-${type.color}-50 text-${type.color}-600 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                <type.icon className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">{type.title}</h3>
                            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-auto flex items-center gap-1">
                                Start Assessment <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Separated History Component for cleaner code
// Separated History Component for cleaner code
function AssessmentHistoryView({ onViewReport }: { onViewReport: (result: any) => void }) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const backendHost = window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:8000/api' : 'http://localhost:8000/api';
                const token = localStorage.getItem('token');

                const response = await axios.get(`${backendHost}/assessments/history`, {
                    withCredentials: true,
                    headers: {
                        'Authorization': token ? `Bearer ${token}` : ''
                    }
                });
                setHistory(response.data);
            } catch (error) {
                console.error("Failed to fetch history", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Assessment History</h3>
                {history.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 text-slate-500 text-sm">
                                    <th className="pb-3 font-medium">Assessment Type</th>
                                    <th className="pb-3 font-medium">Date</th>
                                    <th className="pb-3 font-medium">Score</th>
                                    <th className="pb-3 font-medium">Status</th>
                                    <th className="pb-3 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {history.map((item) => (
                                    <tr key={item.attempt_id} className="group hover:bg-slate-50 transition-colors">
                                        <td className="py-4 font-medium text-slate-800">{item.domain}</td>
                                        <td className="py-4 text-slate-500">{item.date}</td>
                                        <td className="py-4">
                                            <span className={`px-2 py-1 rounded-xs font-bold ${item.percentage >= 80 ? 'bg-green-100 text-green-700' :
                                                item.percentage >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                {item.percentage.toFixed(0)}%
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                Completed
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <button
                                                onClick={() => onViewReport(item)}
                                                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                            >
                                                View Report
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-slate-500">No assessments taken yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
