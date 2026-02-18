export default function AdminDashboard() {
    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Department Dashboard</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Placeholder Cards */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-slate-800 mb-2">Total Students</h3>
                    <p className="text-3xl font-bold text-indigo-600">120</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-slate-800 mb-2">Total Mentors</h3>
                    <p className="text-3xl font-bold text-purple-600">12</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-slate-800 mb-2">Active Teams</h3>
                    <p className="text-3xl font-bold text-green-600">30</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-slate-800 mb-2">Completion Rate</h3>
                    <p className="text-3xl font-bold text-blue-600">85%</p>
                </div>
            </div>
        </div>
    );
}
