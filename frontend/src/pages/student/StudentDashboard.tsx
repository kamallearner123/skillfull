import { useState, useEffect } from 'react';
import { BookOpen, Clock, Award, Calendar, User, Hash, GraduationCap, Building2, BarChart3, ClipboardList, Timer, TrendingUp } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface Stats {
    modules_completed: number;
    study_hours: number;
    avg_score: number;
}

interface LatestAssessment {
    domain: string;
    attempt_no: number;
    date: string;
    report_generated_on: string;
}

const StudentProfileHeader = ({ user, assessment }: { user: any, assessment: LatestAssessment | null }) => {
    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 h-24 relative">
                <div className="absolute -bottom-12 left-8 flex items-end gap-6">
                    <div className="relative group">
                        <div className="h-32 w-32 rounded-3xl bg-white p-1.5 shadow-xl shadow-indigo-100 ring-4 ring-white">
                            <div className="h-full w-full rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                                ) : (
                                    <User className="h-16 w-16 text-indigo-300" />
                                )}
                            </div>
                        </div>
                        <div className="absolute bottom-1 right-1 h-6 w-6 bg-green-500 border-4 border-white rounded-full shadow-sm animate-pulse"></div>
                    </div>
                </div>
            </div>

            <div className="pt-16 pb-8 px-8">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                    <div className="xl:col-span-12 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-50">
                        <div>
                            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                                {user?.name}
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full uppercase tracking-wider">Student</span>
                            </h2>
                            <div className="flex flex-col gap-1 mt-1.5">
                                <p className="text-slate-500 font-medium flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-slate-400" />
                                    {user?.department_name || 'Department not set'}
                                </p>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                    <User className="h-3.5 w-3.5" />
                                    {user?.email}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button className="px-5 py-2.5 bg-white border-2 border-slate-100 text-slate-700 font-semibold rounded-2xl hover:bg-slate-50 transition-all">
                                Edit Profile
                            </button>
                        </div>
                    </div>

                    <div className="xl:col-span-7">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Hash className="h-4 w-4" /> Academic Snapshot
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                            <div className="flex items-center gap-4 group">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                    <Hash className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reg ID</p>
                                    <p className="text-slate-900 font-bold text-lg">{user?.registration_id || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 group">
                                <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform">
                                    <GraduationCap className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Graduation Year</p>
                                    <p className="text-slate-900 font-bold text-lg">{user?.graduation_year || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 group md:col-span-2 lg:col-span-1">
                                <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                    <BarChart3 className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Final CGPA</p>
                                    <p className="text-slate-900 font-bold text-2xl tabular-nums">{user?.cgpa ? parseFloat(user.cgpa).toFixed(2) : 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="xl:col-span-5 bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" /> Latest Assessment
                        </h3>
                        <div className="space-y-5">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100">
                                        <Award className="h-5 w-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase">Topic</p>
                                        <p className="text-slate-900 font-bold">{assessment?.domain || 'No Assessment Yet'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Attempt No.</p>
                                    <p className="text-indigo-600 font-black text-xl">#{assessment?.attempt_no || 0}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm group">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Test Date</p>
                                    </div>
                                    <p className="text-slate-900 font-bold text-sm tracking-tight">{assessment?.date || 'N/A'}</p>
                                </div>
                                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm group">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Timer className="h-3.5 w-3.5 text-slate-400" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Generated</p>
                                    </div>
                                    <p className="text-slate-900 font-bold text-sm tracking-tight">{assessment?.report_generated_on || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function StudentDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<Stats | null>(null);
    const [latestAssessment, setLatestAssessment] = useState<LatestAssessment | null>(null);
    const [readinessScore, setReadinessScore] = useState<number>(0);
    const [readinessHistory, setReadinessHistory] = useState<any[]>([]);
    const [companyReadiness, setCompanyReadiness] = useState<{ service: number, product: number, faang: number }>({ service: 0, product: 0, faang: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, assessmentRes, readinessRes, historyRes] = await Promise.allSettled([
                    api.get('/courses/stats/me'),
                    api.get('/assessments/latest-summary'),
                    api.get('/assessments/overall-readiness'),
                    api.get('/assessments/readiness-history')
                ]);

                if (statsRes.status === 'fulfilled') {
                    setStats(statsRes.value.data);
                } else {
                    setStats({ modules_completed: 0, study_hours: 0, avg_score: 0 });
                }

                if (assessmentRes.status === 'fulfilled') {
                    setLatestAssessment(assessmentRes.value.data);
                }

                if (readinessRes.status === 'fulfilled') {
                    setReadinessScore(readinessRes.value.data.overall_score || 0);
                    setCompanyReadiness({
                        service: readinessRes.value.data.service_ready || 0,
                        product: readinessRes.value.data.product_ready || 0,
                        faang: readinessRes.value.data.faang_ready || 0
                    });
                }

                if (historyRes.status === 'fulfilled') {
                    setReadinessHistory(historyRes.value.data);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse">Designing your personal dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            <header className="mb-10">
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Student Workspace</h2>
                <p className="text-slate-500 mt-2 text-lg">Manage your progress and evaluate your skills through assessments.</p>
            </header>

            <StudentProfileHeader user={user} assessment={latestAssessment} />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Modules Completed', value: stats?.modules_completed || 0, sub: 'Total', icon: BookOpen, color: 'blue' },
                    { label: 'Study Hours', value: stats?.study_hours || 0, sub: 'Total', icon: Clock, color: 'purple' },
                    { label: 'Placement Readiness', value: `${readinessScore}%`, sub: 'Based on Assessments', icon: Award, color: 'amber' },
                ].map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50 transition-all duration-300 group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3.5 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform duration-300 ring-4 ring-transparent group-hover:ring-${stat.color}-100/50`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-black text-slate-800 mb-1 tabular-nums">{stat.value}</h3>
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Readiness Progress Graph */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Readiness Progression</h3>
                            <p className="text-sm text-slate-500 mt-1">Holistic preparation score over time</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold ring-1 ring-amber-100">
                            <TrendingUp className="h-3 w-3" />
                            +{readinessHistory.length > 1 ? (readinessHistory[readinessHistory.length - 1].score - readinessHistory[0].score).toFixed(1) : 0}% Growth
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-[250px]">
                        {readinessHistory.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={readinessHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            borderRadius: '16px',
                                            border: 'none',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                            padding: '12px'
                                        }}
                                        itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="score"
                                        name="Readiness Score"
                                        stroke="#6366f1"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorScore)"
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center">
                                <BarChart3 className="h-12 w-12 text-slate-100 mb-4" />
                                <p className="text-slate-400">Complete more assessments to see your readiness trend.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Company Readiness Tracks */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 h-fit flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-bold text-slate-900">Career Tracks</h3>
                        <BarChart3 className="h-5 w-5 text-slate-400" />
                    </div>

                    <div className="space-y-8">
                        {[
                            { label: 'Service Based', value: companyReadiness.service, color: 'blue', desc: 'TCS, Infosys, Wipro' },
                            { label: 'Product Based', value: companyReadiness.product, color: 'indigo', desc: 'Atlassian, Uber, Zomato' },
                            { label: 'FAANG+', value: companyReadiness.faang, color: 'purple', desc: 'Google, Meta, Amazon' },
                        ].map((track, i) => (
                            <div key={i} className="group cursor-default">
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{track.label}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">{track.desc}</p>
                                    </div>
                                    <span className="text-sm font-black text-slate-800 tabular-nums">{track.value}%</span>
                                </div>
                                <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                    <div
                                        className={`h-full rounded-full bg-gradient-to-r from-${track.color}-400 to-${track.color}-600 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(var(--tw-color-${track.color}-500),0.3)]`}
                                        style={{ width: `${track.value}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic">
                            💡 These scores are derived from your performance in data structures, system design, and specialized domains.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
