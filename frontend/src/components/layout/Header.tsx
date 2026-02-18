import { Bell, Search } from 'lucide-react';
// import { useAuth } from '../../context/AuthContext';

export function Header() {
    // const { user } = useAuth();

    return (
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-40 px-8 flex items-center justify-between transition-all duration-300">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-slate-800 hidden md:block">Dashboard</h1>
                <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search anything..."
                        className="pl-10 pr-4 py-2 w-64 bg-slate-100/50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button className="relative p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                </button>
            </div>
        </header>
    );
}
