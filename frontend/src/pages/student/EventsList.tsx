import { Calendar } from 'lucide-react';

export default function EventsList() {
    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Upcoming Events</h1>
                    <p className="text-slate-500 mt-1">Workshops, seminars, and networking sessions</p>
                </div>
            </div>

            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                <div className="mx-auto h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Calendar className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No upcoming events</h3>
                <p className="text-slate-500 mt-1 max-w-sm mx-auto">There are no events scheduled at the moment.</p>
            </div>
        </div>
    );
}
