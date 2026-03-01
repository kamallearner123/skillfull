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
    ArrowRight,
    Brain,
    Sparkles,
    BookOpen,
    ExternalLink,
    X,
    TrendingUp,
    TrendingDown,
    Star,
    Award
} from 'lucide-react';
import api from '../../api/client';

// Using shared API client from ../../api/client

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
    const [view, setView] = useState<'history' | 'selection' | 'taking' | 'readiness'>('selection');
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
            if (!data.questions || data.questions.length === 0) {
                setError('No questions found for this domain. Please contact the administrator.');
                return;
            }
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

        if (!currentQ) {
            return (
                <div className="flex items-center justify-center min-h-[400px] text-slate-500">
                    No questions available for this assessment.
                </div>
            );
        }

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

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setView('readiness')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm ${view === 'readiness' ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                    >
                        <TrendingUp className="h-4 w-4" /> Overall Readiness
                    </button>

                    <button
                        onClick={() => setView('history')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm ${view === 'history' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                    >
                        <History className="h-4 w-4" /> View History
                    </button>

                    <button
                        onClick={() => setView('selection')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm ${view === 'selection' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                    >
                        <Plus className="h-4 w-4" /> New Assessment
                    </button>
                </div>
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

            {view === 'history' && (
                /* HISTORY VIEW */
                <AssessmentHistoryView onViewReport={handleViewReport} />
            )}

            {view === 'readiness' && (
                /* READINESS VIEW */
                <OverallReadinessView />
            )}

            {view === 'selection' && (
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

// ── AI Feedback Modal ─────────────────────────────────────────────────────────
function AIFeedbackModal({ attemptId, domain, onClose }: { attemptId: string; domain: string; onClose: () => void }) {
    const [feedback, setFeedback] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get(`/assessments/${attemptId}/ai-feedback`);
                if (res.data.error) {
                    setError(res.data.error);
                } else {
                    setFeedback(res.data);
                }
            } catch (e: any) {
                setError('Failed to reach SmartGuide. Make sure it is running on port 8080.');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [attemptId]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between rounded-t-3xl z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <Brain className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wide">SmartGuide AI Analysis</p>
                            <h2 className="text-lg font-bold text-slate-800">{domain}</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                <div className="px-8 py-6 space-y-6">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="relative">
                                <div className="h-14 w-14 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                                <Brain className="h-6 w-6 text-indigo-600 absolute inset-0 m-auto" />
                            </div>
                            <p className="text-slate-500 text-sm">SmartGuide is analysing your performance…</p>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 items-start">
                            <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    {feedback && !loading && (<>
                        {/* Overall Summary */}
                        <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="h-4 w-4 text-indigo-600" />
                                <span className="text-sm font-semibold text-indigo-700">Overall Summary</span>
                            </div>
                            <p className="text-slate-700 leading-relaxed">{feedback.overall_summary}</p>
                        </div>

                        {/* Strengths + Improvements side by side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {feedback.strengths?.length > 0 && (
                                <div className="p-5 bg-green-50 rounded-2xl border border-green-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                        <span className="text-sm font-semibold text-green-700">Strengths</span>
                                    </div>
                                    <ul className="space-y-2">
                                        {feedback.strengths.map((s: string, i: number) => (
                                            <li key={i} className="flex gap-2 text-sm text-slate-700">
                                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                                                {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {feedback.improvement_areas?.length > 0 && (
                                <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <TrendingDown className="h-4 w-4 text-amber-600" />
                                        <span className="text-sm font-semibold text-amber-700">Areas to Improve</span>
                                    </div>
                                    <ul className="space-y-2">
                                        {feedback.improvement_areas.map((a: string, i: number) => (
                                            <li key={i} className="flex gap-2 text-sm text-slate-700">
                                                <XCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                                {a}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Priority Topics */}
                        {feedback.priority_topics?.length > 0 && (
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <BookOpen className="h-4 w-4 text-slate-600" />
                                    <span className="text-sm font-semibold text-slate-700">Priority Topics to Study</span>
                                </div>
                                <ol className="space-y-2">
                                    {feedback.priority_topics.map((t: string, i: number) => (
                                        <li key={i} className="flex gap-3 text-sm text-slate-700">
                                            <span className="flex-shrink-0 h-5 w-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                            {t}
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}

                        {/* Resources */}
                        {feedback.suggested_resources?.length > 0 && (
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Star className="h-4 w-4 text-slate-600" />
                                    <span className="text-sm font-semibold text-slate-700">Suggested Resources</span>
                                </div>
                                <div className="space-y-2">
                                    {feedback.suggested_resources.map((r: any, i: number) => (
                                        <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-colors group">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-medium capitalize">{r.type}</span>
                                                <span className="text-sm text-slate-700 font-medium">{r.title}</span>
                                            </div>
                                            <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Preparation Plan */}
                        {feedback.prep_plan?.length > 0 && (
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <Timer className="h-4 w-4 text-indigo-600" />
                                    <span className="text-sm font-semibold text-slate-800">Personalised Study Plan</span>
                                    <span className="ml-auto text-xs text-slate-400">
                                        {feedback.prep_plan.reduce((s: number, t: any) => s + (t.hours_needed || 0), 0)}h total
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    {feedback.prep_plan.map((plan: any, i: number) => (
                                        <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-slate-800 text-sm">{plan.topic}</span>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${plan.priority === 'high' ? 'bg-red-100 text-red-700' :
                                                        plan.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-green-100 text-green-700'
                                                        }`}>
                                                        {plan.priority}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                        <Timer className="h-3 w-3" />
                                                        {plan.hours_needed}h
                                                    </span>
                                                </div>
                                            </div>
                                            {plan.what_to_study && (
                                                <p className="text-xs text-slate-600 leading-relaxed">{plan.what_to_study}</p>
                                            )}
                                            {plan.resources?.length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {plan.resources.map((r: string, ri: number) => (
                                                        <a key={ri} href={r.startsWith('http') ? r : '#'} target="_blank" rel="noopener noreferrer"
                                                            className="text-xs text-indigo-600 hover:text-indigo-800 underline truncate max-w-[180px]">
                                                            {r.replace('https://', '').replace(/\/$/, '')}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Motivational Note */}
                        {feedback.motivational_note && (
                            <div className="p-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="h-4 w-4" />
                                    <span className="text-sm font-semibold opacity-90">SmartGuide says…</span>
                                </div>
                                <p className="text-white/90 leading-relaxed italic">"{feedback.motivational_note}"</p>
                            </div>
                        )}
                    </>)}
                </div>
            </div>
        </div>
    );
}


// ── History View ──────────────────────────────────────────────────────────────
function AssessmentHistoryView({ onViewReport }: { onViewReport: (result: any) => void }) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyseTarget, setAnalyseTarget] = useState<{ id: string; domain: string } | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await api.get('/assessments/history');
                setHistory(response.data);
            } catch (error) {
                console.error('Failed to fetch history', error);
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
        );
    }

    return (
        <>
            {analyseTarget && (
                <AIFeedbackModal
                    attemptId={analyseTarget.id}
                    domain={analyseTarget.domain}
                    onClose={() => setAnalyseTarget(null)}
                />
            )}

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
                                        <th className="pb-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {history.map((item) => (
                                        <tr key={item.attempt_id} className="group hover:bg-slate-50 transition-colors">
                                            <td className="py-4 font-medium text-slate-800">{item.domain}</td>
                                            <td className="py-4 text-slate-500">{item.date}</td>
                                            <td className="py-4">
                                                <span className={`px-2 py-1 rounded font-bold text-sm ${item.percentage >= 80 ? 'bg-green-100 text-green-700' :
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
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => onViewReport(item)}
                                                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                                    >
                                                        View Report
                                                    </button>
                                                    <span className="text-slate-200">|</span>
                                                    <button
                                                        onClick={() => setAnalyseTarget({ id: item.attempt_id, domain: item.domain })}
                                                        className="flex items-center gap-1.5 text-sm font-medium text-purple-600 hover:text-purple-800 transition-colors"
                                                    >
                                                        <Brain className="h-3.5 w-3.5" />
                                                        Analyse
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-10">
                            <p className="text-slate-500">No assessments taken yet. Take one to see your history!</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
// ── Readiness View ──────────────────────────────────────────────────────────────
function OverallReadinessView() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReadiness = async () => {
            try {
                const response = await api.get('/assessments/overall-readiness');
                setData(response.data);
            } catch (err) {
                console.error("Failed to fetch readiness", err);
                setError("Failed to load readiness analysis. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        fetchReadiness();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                <p className="text-slate-500 font-medium animate-pulse">SmartGuide is calculating your overall readiness...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 bg-red-50 border border-red-100 rounded-3xl text-center">
                <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-700 font-medium">{error}</p>
            </div>
        );
    }

    if (!data || data.assessments_analyzed === 0) {
        return (
            <div className="p-12 bg-white rounded-3xl border border-slate-100 shadow-sm text-center space-y-4">
                <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <Activity className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Not Enough Data</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                    Take at least one assessment to unlock your overall readiness report.
                    SmartGuide needs data to analyze your cross-domain performance.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 -translate-y-4 translate-x-4">
                        <Award className="h-24 w-24 text-emerald-600" />
                    </div>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Readiness Score</p>
                    <div className="flex items-end gap-2">
                        <span className="text-5xl font-black text-emerald-600 tabular-nums">{data.overall_score}%</span>
                        <span className="text-slate-400 mb-2 font-medium">Holistic</span>
                    </div>
                    <div className="mt-4 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${data.overall_score}%` }}></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Data Points</p>
                    <div className="flex items-end gap-2">
                        <span className="text-5xl font-black text-slate-800 tabular-nums">{data.assessments_analyzed}</span>
                        <span className="text-slate-400 mb-2 font-medium">Assessments Analysis</span>
                    </div>
                    <p className="mt-4 text-sm text-slate-500 flex items-center gap-2">
                        <div className="h-2 w-2 bg-indigo-400 rounded-full"></div>
                        Cross-referenced across all domains
                    </p>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none">
                    <p className="text-indigo-100 text-sm font-bold uppercase tracking-wider mb-2">SmartGuide Status</p>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Brain className="h-6 w-6" />
                        </div>
                        <span className="text-xl font-bold">Analysis Synced</span>
                    </div>
                    <p className="mt-6 text-sm text-white/80 leading-relaxed font-medium">
                        Your performance patterns are being used to tailor your placement suggestions.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* AI Analysis Report */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Consolidated Readiness Report</h3>
                        </div>

                        <div className="prose prose-slate max-w-none">
                            <p className="text-slate-700 leading-relaxed text-lg bg-slate-50/50 p-6 rounded-2xl border border-slate-100 italic">
                                "{data.readiness_report}"
                            </p>
                        </div>

                        {data.key_recommendations?.length > 0 && (
                            <div className="mt-8">
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Strategic Key Recommendations</h4>
                                <div className="space-y-3">
                                    {data.key_recommendations.map((rec: string, i: number) => (
                                        <div key={i} className="flex gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-emerald-200 transition-colors">
                                            <div className="h-6 w-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                                                {i + 1}
                                            </div>
                                            <p className="text-slate-700 font-medium">{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Domain Performance */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                        <h3 className="text-xl font-bold text-slate-800 mb-6">Domain Performance</h3>
                        <div className="space-y-6">
                            {data.domain_performance.map((domain: any, i: number) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="font-bold text-slate-800">{domain.domain}</p>
                                            <p className="text-xs text-slate-400 font-medium uppercase">{domain.count} {domain.count === 1 ? 'Attempt' : 'Attempts'}</p>
                                        </div>
                                        <span className="text-lg font-black text-indigo-600">{domain.avg_percentage}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${domain.avg_percentage >= 80 ? 'bg-emerald-500' :
                                            domain.avg_percentage >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                            }`} style={{ width: `${domain.avg_percentage}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                Recommendations are weighted by recency and domain relevance to current job market trends.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
