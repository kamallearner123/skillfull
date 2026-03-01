import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../api/client';

export type UserRole = 'STUDENT' | 'MENTOR' | 'DEPT_ADMIN' | 'PRINCIPAL' | 'SUPER_ADMIN';

export interface User {
    id: string;
    username: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
    registration_id?: string;
    department_name?: string;
    graduation_year?: number;
    cgpa?: string;
}

interface AuthContextType {
    user: User | null;
    login: (email?: string, password?: string, role?: UserRole) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check current session
        api.get<User>('/users/me')
            .then((res: any) => {
                setUser(res.data);
            })
            .catch(() => {
                setUser(null);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    const login = async (email?: string, password?: string, role?: UserRole) => {
        try {
            // If email/password are provided, use them. Otherwise use demo defaults.
            const effectiveEmail = email || (
                role === 'SUPER_ADMIN' ? 'admin@educollab.com' :
                    role === 'STUDENT' ? 'student@example.com' :
                        role === 'MENTOR' ? 'mentor@example.com' :
                            role === 'DEPT_ADMIN' ? 'deptadmin@example.com' :
                                'student@example.com'
            );

            const effectivePassword = password || (
                (role === 'SUPER_ADMIN' || role === 'DEPT_ADMIN') ? 'admin123' : 'password123'
            );

            await api.post('/users/login', { email: effectiveEmail, password: effectivePassword });
            const res = await api.get('/users/me');
            setUser(res.data);
        } catch (error) {
            console.error('Login failed', error);
            throw error; // Rethrow to handle in the component
        }
    };

    const logout = async () => {
        try {
            await api.post('/users/logout');
        } catch (error) {
            console.error('Logout failed', error);
        }
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
