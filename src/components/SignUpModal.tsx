import { useState } from 'react';
import { X, Mail, Lock, Loader2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PlanType } from '../config/plans';
import './SignUpModal.css';

interface SignUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedPlan: PlanType;
    onSignUpSuccess: (userId: string) => void;
}

function SignUpModal({ isOpen, onClose, selectedPlan, onSignUpSuccess }: SignUpModalProps) {
    const { signUp, login } = useAuth();
    const [mode, setMode] = useState<'signup' | 'login'>('signup');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email || !password || password.length < 6) {
            setError('Please enter a valid email and password (min 6 characters)');
            return;
        }

        try {
            setLoading(true);
            const userData = await signUp(email, password, name);
            if (!userData) throw new Error('Failed to create user account');
            onSignUpSuccess(userData.userId);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email || !password) {
            setError('Please enter your email and password');
            return;
        }

        try {
            setLoading(true);
            await login(email, password);
            // Get the user ID from AuthContext after login
            // We need to wait a tick for state to update, so use a small hack
            // Actually login doesn't return userId, so we re-read from supabase
            const { supabase } = await import('../lib/supabase');
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Login failed');
            onSignUpSuccess(user.id);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content signup-modal glass-card" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="modal-header">
                    <h2 className="heading-lg">
                        {mode === 'signup' ? 'Create Your Account' : 'Sign In'}
                    </h2>
                    <p className="text-muted">
                        Continue with the <strong>{selectedPlan}</strong> plan
                    </p>
                </div>

                {/* Tab switcher */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <button
                        type="button"
                        className={`btn ${mode === 'signup' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '8px 0' }}
                        onClick={() => { setMode('signup'); setError(null); }}
                    >
                        New Account
                    </button>
                    <button
                        type="button"
                        className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, padding: '8px 0' }}
                        onClick={() => { setMode('login'); setError(null); }}
                    >
                        Sign In
                    </button>
                </div>

                <form onSubmit={mode === 'signup' ? handleSignUp : handleLogin} className="signup-form">
                    {error && (
                        <div className="error-banner">
                            <p>{error}</p>
                        </div>
                    )}

                    {mode === 'signup' && (
                        <div className="form-group">
                            <label htmlFor="name" className="form-label">
                                <User size={18} />
                                Full Name (Optional)
                            </label>
                            <input
                                type="text"
                                id="name"
                                className="form-input"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email" className="form-label">
                            <Mail size={18} />
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">
                            <Lock size={18} />
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            className="form-input"
                            placeholder={mode === 'signup' ? 'Min 6 characters' : 'Your password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={mode === 'signup' ? 6 : 1}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-full"
                        disabled={loading}
                    >
                        {loading ? (
                            <><Loader2 size={18} className="spinner" /> İşleniyor...</>
                        ) : mode === 'signup' ? (
                            'Create Account & Continue to Payment →'
                        ) : (
                            'Sign In & Continue to Payment →'
                        )}
                    </button>

                    <p className="text-sm text-muted text-center">
                        By creating an account, you agree to our Terms of Service.
                    </p>
                </form>
            </div>
        </div>
    );
}

export default SignUpModal;
