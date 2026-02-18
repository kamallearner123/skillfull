import { useState, useEffect } from 'react';
import { BookOpen, Clock, BarChart } from 'lucide-react';
import api from '../../api/client';

export default function ModulesList() {
    const [modules, setModules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchModules = async () => {
            try {
                const res = await api.get('/courses/');
                setModules(res.data);
            } catch (error) {
                console.error("Failed to fetch modules", error);
            } finally {
                setLoading(false);
            }
        };

        fetchModules();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading modules...</div>;
    }

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Learning Modules</h1>
                    <p className="text-slate-500 mt-1">Track your progress and continue learning</p>
                </div>
            </div>

            {modules.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                    <div className="mx-auto h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <BookOpen className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No modules available</h3>
                    <p className="text-slate-500 mt-1 max-w-sm mx-auto">Check back later for new course content.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {modules.map((module) => (
                        <div key={module.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow group">
                            <div className="h-48 overflow-hidden relative bg-slate-100 flex items-center justify-center">
                                {/* Placeholder image since backend doesn't support images yet */}
                                <BookOpen className="h-12 w-12 text-slate-300" />
                            </div>
                            <div className="p-5">
                                <h3 className="font-semibold text-lg text-slate-800 mb-2">{module.title}</h3>
                                <p className="text-slate-500 text-sm mb-4 line-clamp-2">{module.description}</p>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {/* Mock duration for now */}
                                            0 hrs
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <BarChart className="h-3 w-3" />
                                            0%
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `0%` }}
                                        ></div>
                                    </div>

                                    <button className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-blue-600 font-medium rounded-lg text-sm transition-colors mt-2">
                                        Start Learning
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
