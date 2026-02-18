import { Search, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StudentsList() {
    const navigate = useNavigate();

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">My Students</h1>
                    <p className="text-slate-500 mt-1">Manage and track your mentees</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                    Add Student
                </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search students..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    {/* Filter dropdowns could go here */}
                </div>

                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Student</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Progress</th>
                            <th className="px-6 py-4">Last Active</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden">
                                            <img src={`https://ui-avatars.com/api/?name=Student+${i}&background=random`} alt="" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800">Student Name {i}</p>
                                            <p className="text-xs text-slate-500">student{i}@example.com</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Active
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="w-24 bg-slate-100 rounded-full h-1.5 mb-1">
                                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${60 + i * 5}%` }}></div>
                                    </div>
                                    <span className="text-xs text-slate-500">{60 + i * 5}% completed</span>
                                </td>
                                <td className="px-6 py-4">
                                    Dec 12, 2025
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => navigate('/chat')}
                                        className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 ml-auto"
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                        Message
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
