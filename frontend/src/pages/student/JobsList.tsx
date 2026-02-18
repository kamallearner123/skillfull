import { Briefcase } from 'lucide-react';

export default function JobsList() {
    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Job Opportunities</h1>
                    <p className="text-slate-500 mt-1">Explore exclusive openings from our partners</p>
                </div>
            </div>

            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                <div className="mx-auto h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                    <Briefcase className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No job openings yet</h3>
                <p className="text-slate-500 mt-1 max-w-sm mx-auto">We are actively sourcing new opportunities. Please check back later.</p>
            </div>
        </div>
    );
}
