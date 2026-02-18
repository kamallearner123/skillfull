import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

export function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar />
            <div className="pl-64">
                {/* Header could go here */}
                <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-10 px-8 flex items-center justify-between">
                    <h1 className="text-lg font-semibold text-slate-800">Dashboard</h1>
                    {/* Add notifications, etc here */}
                </header>
                <main className="p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
