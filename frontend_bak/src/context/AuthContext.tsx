import { createContext, useContext, useState, ReactNode } from 'react';

type UserRole = 'STUDENT' | 'MENTOR' | 'DEPT_ADMIN' | 'SUPER_ADMIN';

interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
}

interface AuthContextType {
    user: User | null;
    login: (role: UserRole) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    // Mock initial state - in real app would check token
    const [user, setUser] = useState<User | null>({
        id: '1',
        name: 'Kamal Student',
        email: 'kamal@example.com',
        role: 'STUDENT', // Default to student for dev
        avatar: 'https://ui-avatars.com/api/?name=Kamal+Student'
    });

    const login = (role: UserRole) => {
        setUser({
            id: '1',
            name: `Test ${role}`,
            email: `test.${role.toLowerCase()}@example.com`,
            role: role,
            avatar: `https://ui-avatars.com/api/?name=Test+${role}`
        });
    };

    const logout = () => setUser(null);

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
