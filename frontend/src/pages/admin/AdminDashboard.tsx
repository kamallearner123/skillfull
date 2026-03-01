import { useState, useEffect } from 'react';
import { Users, GraduationCap, ArrowUpRight, Search, BarChart3, Award } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface StudentReadiness {
    id: string;
    name: string;
    email: string;
    readiness_score: number;
    service_ready: number;
    product_ready: number;
    faang_ready: number;
}

export default function AdminDashboard() {
    const { user } = useAuth();
    const [students, setStudents] = useState<StudentReadiness[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const response = await api.get('/users/department-students');
                setStudents(response.data);
            } catch (error) {
                console.error("Failed to fetch department students", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
    }, []);

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse">Analyzing department performance...</p>
                </div>
            </div>
        );
    }

    const getAvg = (key: keyof StudentReadiness) => {
        if (students.length === 0) return '0';
        const sum = students.reduce((acc, s) => acc + (s[key] as number), 0);
        return (sum / students.length).toFixed(1);
    };

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-5">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-100 ring-4 ring-white">
                        {user?.name?.charAt(0) || 'A'}
                    </div>
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{user?.name}</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg uppercase tracking-widest border border-indigo-100">Dept Admin</span>
                            <span className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
                                <Search className="h-3 w-3" /> {user?.email}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="bg-white px-4 py-2.5 rounded-2xl flex items-center gap-3 border border-slate-100 font-bold text-slate-700 shadow-sm">
                        <Users className="h-5 w-5 text-indigo-500" />
                        <span className="text-lg">{students.length}</span>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Students</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                        {user?.department_name || 'All Departments'} Monitoring
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Overall Readiness', value: getAvg('readiness_score'), icon: BarChart3, color: 'indigo' },
                    { label: 'Service Based', value: getAvg('service_ready'), icon: GraduationCap, color: 'blue' },
                    { label: 'Product Based', value: getAvg('product_ready'), icon: ArrowUpRight, color: 'emerald' },
                    { label: 'FAANG+', value: getAvg('faang_ready'), icon: Award, color: 'purple' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50 transition-all duration-300 group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform duration-300`}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-1 tabular-nums">{stat.value}%</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-xl font-bold text-slate-900">Student Standings</h3>
                    <div className="relative max-w-sm w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-2xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Student</th>
                                <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest text-indigo-600">Overall</th>
                                <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest text-blue-600">Service</th>
                                <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest text-emerald-600">Product</th>
                                <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest text-purple-600">FAANG+</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-50">
                            {filteredStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                                {student.name.charAt(0)}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{student.name}</div>
                                                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{student.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="text-sm font-black text-slate-800 tabular-nums">{student.readiness_score}%</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="text-sm font-bold text-blue-600 tabular-nums">{student.service_ready}%</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="text-sm font-bold text-emerald-600 tabular-nums">{student.product_ready}%</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="text-sm font-bold text-purple-600 tabular-nums">{student.faang_ready}%</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        {student.readiness_score >= 80 ? (
                                            <span className="px-3 py-1 inline-flex text-[10px] leading-5 font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider shadow-sm">
                                                FAANG Ready
                                            </span>
                                        ) : student.readiness_score >= 60 ? (
                                            <span className="px-3 py-1 inline-flex text-[10px] leading-5 font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider shadow-sm">
                                                Product Ready
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 inline-flex text-[10px] leading-5 font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wider shadow-sm">
                                                Developing
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredStudents.length === 0 && (
                        <div className="p-12 text-center">
                            <Users className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">No students found matching your criteria.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
