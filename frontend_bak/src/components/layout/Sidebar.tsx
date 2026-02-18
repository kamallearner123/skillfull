import {
    LayoutDashboard,
    BookOpen,
    Briefcase,
    Calendar,
    MessageSquare,
    Users,
    Settings,
    LogOut,
    GraduationCap
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
                    { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
                    { icon: BookOpen, label: 'Learning Modules', path: '/student/modules' },
                    { icon: Briefcase, label: 'Job Opportunities', path: '/student/jobs' },
                    { icon: Calendar, label: 'Events', path: '/student/events' },
                    { icon: MessageSquare, label: 'Chat', path: '/chat' },
                ];
            case 'MENTOR':
                return [
                    { icon: LayoutDashboard, label: 'Dashboard', path: '/mentor/dashboard' },
                    { icon: Users, label: 'My Students', path: '/mentor/students' },
                    { icon: MessageSquare, label: 'Chat', path: '/chat' },
                ];
            default:
                return [];
        }
    };

    const links = getLinks();

    return (
        <div className="h-screen w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0">
            <div className="p-6 flex items-center gap-3 border-b border-slate-800">
                <GraduationCap className="h-8 w-8 text-blue-400" />
                <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                    EduCollab
                </span>
            </div>

            <div className="flex-1 overflow-y-auto py-6">
                <nav className="px-3 space-y-1">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = location.pathname === link.path;

                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={clsx(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-blue-600/10 text-blue-400"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                                )}
                            >
                                <Icon className="h-5 w-5" />
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="p-4 border-t border-slate-800">
                <div className="flex items-center gap-3 px-3 py-3 mb-2">
                    <img
                        src={user?.avatar}
                        alt={user?.name}
                        className="h-8 w-8 rounded-full bg-slate-700"
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.role}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-red-400 w-full hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
