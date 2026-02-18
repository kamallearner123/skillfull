import { useState, useEffect } from 'react';
import { BookOpen, Clock, Award, TrendingUp, Calendar } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface Stats {
    modules_completed: number;
    study_hours: number;
    avg_score: number;
    certificates: number;
}

export default function StudentDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // In a real app, you would fetch courses and events here too
                // For now, we fetch stats. If backend doesn't implement it yet, we fallback to 0s gracefully
                const res = await api.get('/courses/stats/me');
                setStats(res.data);
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
                // Fallback to 0s if API fails (e.g. backend not ready)
                setStats({
                    modules_completed: 0,
                    study_hours: 0,
                    avg_score: 0,
                    certificates: 0
                });
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-8 p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Welcome back, {user?.name?.split(' ')[0]}! 👋</h2>
                    <p className="text-slate-500 mt-1">Here is your learning overview.</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                        View Schedule
                    </button>
                    <button className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 hover:shadow-indigo-300">
                        Resume Learning
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Modules Completed', value: stats?.modules_completed || 0, sub: 'Total', icon: BookOpen, color: 'blue' },
                    { label: 'Study Hours', value: stats?.study_hours || 0, sub: 'Total', icon: Clock, color: 'purple' },
                    { label: 'Avg. Score', value: `${stats?.avg_score || 0}%`, sub: 'Overall', icon: TrendingUp, color: 'green' },
                    { label: 'Certificates', value: stats?.certificates || 0, sub: 'Earned', icon: Award, color: 'orange' }
                ].map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform duration-300`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800 mb-1">{stat.value}</h3>
                        <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Current Course */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
                    <div className="p-4 bg-slate-50 rounded-full mb-4">
                        <BookOpen className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">No Active Courses</h3>
                    <p className="text-slate-500 max-w-sm mb-6">You are not enrolled in any courses yet. Browse the catalog to get started.</p>
                    <button className="px-4 py-2 bg-indigo-50 text-indigo-600 font-medium rounded-lg hover:bg-indigo-100 transition-colors">
                        Browse Courses
                    </button>
                </div>

                {/* Upcoming Events */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-fit min-h-[300px] flex flex-col">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">Upcoming Schedule</h3>

                    <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                        <div className="p-3 bg-slate-50 rounded-full mb-3">
                            <Calendar className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-slate-500 font-medium">No upcoming events</p>
                        <p className="text-slate-400 text-sm mt-1">Your schedule is clear for now.</p>
                    </div>

                    <button className="w-full mt-auto py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl text-sm hover:bg-slate-50 transition-colors">
                        View Full Calendar
                    </button>
                </div>
            </div>
        </div>
    );
}
