import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50/50">
            <Sidebar />
            <div className="pl-72 transition-all duration-300">
                <Header />
                <main>
                    {children}
                </main>
            </div>
        </div>
    );
}
