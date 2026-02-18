export default function MentorDashboard() {
    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Mentor Dashboard</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Placeholder Cards */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-slate-800 mb-2">Total Students</h3>
                    <p className="text-3xl font-bold text-blue-600">24</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-slate-800 mb-2">Pending Reviews</h3>
                    <p className="text-3xl font-bold text-amber-500">5</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-semibold text-slate-800 mb-2">Team Activity</h3>
                    <p className="text-slate-500 text-sm">High activity in Team Alpha</p>
                </div>
            </div>
        </div>
    );
}
