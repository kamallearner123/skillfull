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
}

interface AuthContextType {
    user: User | null;
    login: (role: UserRole) => void; // TODO: Replace with real login logic
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

    const login = async (role: UserRole) => {
        try {
            // Note: The backend login expects email and password. 
            // For now, we are hardcoding a password for demo purposes based on the role, 
            // but in a real app, you would pass the password from a form.
            const email = role === 'SUPER_ADMIN' ? 'admin@educollab.com' :
                role === 'STUDENT' ? 'student@example.com' :
                    role === 'MENTOR' ? 'mentor@example.com' :
                        `test.${role.toLowerCase()}@example.com`;

            const password = role === 'SUPER_ADMIN' ? 'admin123' : 'password123';

            await api.post('/users/login', { email, password });
            const res = await api.get('/users/me');
            setUser(res.data);
        } catch (error) {
            console.error('Login failed', error);
            alert('Login failed. Please ensure the backend is running and users are created.');
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
