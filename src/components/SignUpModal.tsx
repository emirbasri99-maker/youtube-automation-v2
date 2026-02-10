import { useState } from 'react';
import { X, Mail, Lock, Loader2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PlanType } from '../config/plans';
import './SignUpModal.css';

interface SignUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedPlan: PlanType;
    onSignUpSuccess: () => void;
}

function SignUpModal({ isOpen, onClose, selectedPlan, onSignUpSuccess }: SignUpModalProps) {
    const { signUp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email || !password || password.length < 6) {
            setError('Please enter a valid email and password (min 6 characters)');
            return;
        }

        try {
            setLoading(true);

            // Sign up with Supabase
            await signUp(email, password);

            // Success - close modal and proceed to payment
            onSignUpSuccess();
            onClose();
        } catch (err: any) {
            console.error('Signup error:', err);
            setError(err.message || 'Failed to create account. Please try again.');
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
                    <h2 className="heading-lg">Create Your Account</h2>
                    <p className="text-muted">
                        Sign up to continue with your {selectedPlan} plan
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="signup-form">
                    {error && (
                        <div className="error-banner">
                            <p>{error}</p>
                        </div>
                    )}

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
                            placeholder="Min 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-full"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="spinner" />
                                Creating Account...
                            </>
                        ) : (
                            'Create Account & Continue to Payment'
                        )}
                    </button>

                    <p className="text-sm text-muted text-center">
                        By creating an account, you agree to our Terms of Service
                    </p>
                </form>
            </div>
        </div>
    );
}

export default SignUpModal;
