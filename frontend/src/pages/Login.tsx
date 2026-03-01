import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../context/AuthContext';
import { GraduationCap, Loader2, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const { login, isAuthenticated, isLoading, user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedRole, setSelectedRole] = useState<UserRole>('STUDENT');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const roleRedirect = (role: string) => {
        if (role === 'MENTOR') return '/mentor/dashboard';
        if (role === 'DEPT_ADMIN' || role === 'PRINCIPAL' || role === 'SUPER_ADMIN') return '/admin/dashboard';
        return '/student/dashboard';
    };

    // Show loading while AuthContext is checking session
    if (isLoading) return null;

    // Already authenticated — redirect to the right dashboard
    if (isAuthenticated && user) {
        return <Navigate to={roleRedirect(user.role)} replace />;
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await login(email, password, selectedRole);
            // Since we use await login, if it succeeds, the user will be set in AuthContext
            // and the component will re-render and hit the Navigate above.
        } catch (error) {
            console.error('Login failed', error);
            alert('Login failed. Please check your credentials.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-100">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-blue-50 p-3 rounded-full mb-4">
                        <GraduationCap className="h-8 w-8 text-blue-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Welcome Back</h1>
                    <p className="text-slate-500 mt-2">Sign in to your account</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Quick Select (Demo)
                        </label>
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        >
                            <option value="STUDENT">Student</option>
                            <option value="MENTOR">Mentor</option>
                            <option value="DEPT_ADMIN">Department Admin</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all pr-10"
                                placeholder="Enter your password"
                                required
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-500">
                    Don't have an account?{' '}
                    <a href="#" className="text-blue-600 hover:underline font-medium">
                        Contact Admin
                    </a>
                </div>
            </div>
        </div>
    );
}
