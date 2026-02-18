import {
    LayoutDashboard,
    BookOpen,
    Briefcase,
    Calendar,
    MessageSquare,
    Users,
    LogOut,
    GraduationCap,
    Cpu
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

export function Sidebar() {
    const { user, logout } = useAuth();
    const location = useLocation();

    const getLinks = () => {
        switch (user?.role) {
            case 'STUDENT':
                return [
                    { to: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                    { to: '/student/modules', icon: BookOpen, label: 'My Learning' },
                    { to: '/student/assessment', icon: Cpu, label: 'Self Assessment' },
                    { to: '/student/jobs', icon: Briefcase, label: 'Placements' },
                    { to: '/student/events', icon: Calendar, label: 'Events' },
                    { to: '/chat', icon: MessageSquare, label: 'Messages' },
                ];
            case 'MENTOR':
                return [
                    { to: '/mentor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
                    { to: '/mentor/students', icon: Users, label: 'My Students' },
                    { to: '/chat', icon: MessageSquare, label: 'Messages' },
                ];
            default:
                return [];
        }
    };

    const links = getLinks();

    return (
        <div className="w-72 h-screen fixed left-0 top-0 glass-dark text-slate-300 flex flex-col z-50">
            <div className="h-20 flex items-center px-8 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <GraduationCap className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">EduCollab</span>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Placement Portal</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Menu</p>
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname.startsWith(link.to);
                    return (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={clsx(
                                'flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group',
                                isActive
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-900/20'
                                    : 'hover:bg-slate-800/50 hover:text-white'
                            )}
                        >
                            <Icon className={clsx("h-5 w-5 transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
                            <span className="font-medium">{link.label}</span>
                            {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-700/50">
                <div className="p-4 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 mb-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-pink-500 to-orange-400 p-[2px]">
                            <div className="h-full w-full rounded-full bg-slate-900 p-[2px]">
                                <img
                                    src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}`}
                                    alt={user?.name}
                                    className="h-full w-full rounded-full object-cover"
                                />
                            </div>
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                            <p className="text-xs text-slate-400 truncate capitalize">{user?.role?.toLowerCase()}</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 px-4 py-3 text-slate-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 border border-transparent rounded-xl transition-all duration-200 group"
                >
                    <LogOut className="h-5 w-5 group-hover:text-red-400 transition-colors" />
                    <span className="font-medium group-hover:text-red-400">Sign Out</span>
                </button>
            </div>
        </div>
    );
}
