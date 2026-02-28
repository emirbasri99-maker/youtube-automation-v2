import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Youtube,
    Video,
    Clapperboard,
    FileText,
    BarChart3,
    Sparkles,
    ArrowRight,
    Check,
    Zap,
    Clock,
    TrendingUp,
    LogIn,
    Mail,
    Lock,
    Eye,
    EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PricingTable from '../components/PricingTable';
import './LandingPage.css';

function LandingPage() {
    const navigate = useNavigate();
    const { login, signUp } = useAuth();
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [showSignUpModal, setShowSignUpModal] = useState(false);

    // Login form states
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    // Sign up form states
    const [signUpEmail, setSignUpEmail] = useState('');
    const [signUpPassword, setSignUpPassword] = useState('');
    const [signUpFullName, setSignUpFullName] = useState('');
    const [showSignUpPassword, setShowSignUpPassword] = useState(false);
    const [isSignUpLoading, setIsSignUpLoading] = useState(false);
    const [signUpError, setSignUpError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        setIsLoginLoading(true);

        try {
            await login(loginEmail, loginPassword);
            navigate('/app/dashboard');
        } catch (err) {
            setLoginError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setIsLoginLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setSignUpError('');
        setIsSignUpLoading(true);

        try {
            await signUp(signUpEmail, signUpPassword, signUpFullName);
            navigate('/app/dashboard');
        } catch (err) {
            setSignUpError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setIsSignUpLoading(false);
        }
    };

    const features = [
        {
            icon: Video,
            title: 'Create Long Video',
            description: 'AI-powered automatic scripting, voiceover, and video editing. Professional content in minutes.',
            color: '#f43f5e'
        },
        {
            icon: Clapperboard,
            title: 'Create Shorts',
            description: 'AI-powered visual and video generation for viral Shorts. Fast and effective.',
            color: '#ec4899'
        },
        {
            icon: FileText,
            title: 'Video Transcript',
            description: 'Automatically analyze YouTube videos and extract summaries.',
            color: '#8b5cf6'
        },
        {
            icon: BarChart3,
            title: 'Analytics & Statistics',
            description: 'Track and optimize your video performance.',
            color: '#06b6d4'
        }
    ];

    const benefits = [
        'AI-powered video creation',
        'Automatic scriptwriting',
        'Professional voiceover',
        'Visual and video generation',
        'Video library',
        'Unlimited possibilities'
    ];

    return (
        <div className="landing-page">
            {/* Header */}
            <header className="landing-header">
                <div className="header-container">
                    <div className="logo">
                        <div className="logo-icon">
                            <Youtube size={28} />
                        </div>
                        <div className="logo-text">
                            <span className="logo-title">IntelliTube</span>
                            <span className="logo-subtitle">AI</span>
                        </div>
                    </div>

                    <div className="header-actions">
                        <button className="btn-signin" onClick={() => setShowLoginModal(true)}>
                            <LogIn size={18} />
                            Sign In
                        </button>
                        <button className="btn-signup" onClick={() => setShowSignUpModal(true)}>
                            Sign Up
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-container">
                    <div className="hero-badge">
                        <Sparkles size={16} />
                        <span>AI-Powered Video Creation</span>
                    </div>

                    <h1 className="hero-title">
                        Automate Your YouTube
                        <span className="gradient-text"> Content Production</span>
                    </h1>

                    <p className="hero-description">
                        Create professional YouTube videos and Shorts in minutes with our AI-powered tools.
                        Automate the entire process from scriptwriting to editing.
                    </p>

                    <div className="hero-actions">
                        <button className="btn btn-primary btn-lg" onClick={() => setShowSignUpModal(true)}>
                            Subscribe Now
                            <ArrowRight size={20} />
                        </button>
                    </div>

                    <div className="hero-stats">
                        <div className="stat">
                            <Zap />
                            <span><strong>10x</strong> Faster</span>
                        </div>
                        <div className="stat">
                            <Clock />
                            <span><strong>5 Minutes</strong> Average Time</span>
                        </div>
                        <div className="stat">
                            <TrendingUp />
                            <span><strong>95%</strong> Time Saved</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="section-container">
                    <div className="section-header">
                        <h2>Powerful Features</h2>
                        <p>AI-powered tools that streamline your content production process</p>
                    </div>

                    <div className="features-grid">
                        {features.map((feature, index) => (
                            <div key={index} className="feature-card">
                                <div className="feature-icon" style={{ background: `${feature.color}15`, color: feature.color }}>
                                    <feature.icon size={28} />
                                </div>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="benefits-section">
                <div className="section-container">
                    <div className="benefits-content">
                        <div className="benefits-text">
                            <h2>Why IntelliTube AI?</h2>
                            <p>Speed up your video production process and improve quality</p>

                            <ul className="benefits-list">
                                {benefits.map((benefit, index) => (
                                    <li key={index}>
                                        <Check size={20} />
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>

                            <button className="btn btn-primary" onClick={() => setShowSignUpModal(true)}>
                                Start Now
                                <ArrowRight size={18} />
                            </button>
                        </div>

                        <div className="benefits-visual">
                            <div className="visual-card">
                                <Sparkles size={48} />
                                <h3>AI-Powered</h3>
                                <p>AI-powered support</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="pricing-section-wrapper" id="pricing">
                <PricingTable />
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="cta-container">
                    <h2>Ready to Get Started?</h2>
                    <p>Create a free account and make your first video in minutes</p>
                    <button className="btn btn-primary btn-lg" onClick={() => setShowSignUpModal(true)}>
                        Subscribe Now
                        <ArrowRight size={20} />
                    </button>
                </div>
            </section>

            {/* Login Modal */}
            {showLoginModal && (
                <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Sign In</h2>
                            <button className="modal-close" onClick={() => setShowLoginModal(false)}>
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleLogin} className="login-form">
                            <div className="form-group">
                                <label htmlFor="login-email">
                                    <Mail size={18} />
                                    Email
                                </label>
                                <input
                                    id="login-email"
                                    type="email"
                                    placeholder="ornek@email.com"
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="login-password">
                                    <Lock size={18} />
                                    Password
                                </label>
                                <div className="password-input">
                                    <input
                                        id="login-password"
                                        type={showLoginPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                                    >
                                        {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {loginError && (
                                <div className="error-message">
                                    {loginError}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary btn-block"
                                disabled={isLoginLoading}
                            >
                                {isLoginLoading ? 'Signing in...' : 'Sign In'}
                            </button>

                            <div className="modal-footer-text">
                                Don't have an account?{' '}
                                <button
                                    type="button"
                                    className="link-button"
                                    onClick={() => {
                                        setShowLoginModal(false);
                                        setShowSignUpModal(true);
                                    }}
                                >
                                    Sign Up
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sign Up Modal */}
            {showSignUpModal && (
                <div className="modal-overlay" onClick={() => setShowSignUpModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Sign Up</h2>
                            <button className="modal-close" onClick={() => setShowSignUpModal(false)}>
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSignUp} className="login-form">
                            <div className="form-group">
                                <label htmlFor="signup-name">
                                    <Mail size={18} />
                                    Full Name
                                </label>
                                <input
                                    id="signup-name"
                                    type="text"
                                    placeholder="Your Full Name"
                                    value={signUpFullName}
                                    onChange={(e) => setSignUpFullName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="signup-email">
                                    <Mail size={18} />
                                    Email
                                </label>
                                <input
                                    id="signup-email"
                                    type="email"
                                    placeholder="ornek@email.com"
                                    value={signUpEmail}
                                    onChange={(e) => setSignUpEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="signup-password">
                                    <Lock size={18} />
                                    Password
                                </label>
                                <div className="password-input">
                                    <input
                                        id="signup-password"
                                        type={showSignUpPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={signUpPassword}
                                        onChange={(e) => setSignUpPassword(e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                                    >
                                        {showSignUpPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <small className="form-hint">Must be at least 6 characters</small>
                            </div>

                            {signUpError && (
                                <div className="error-message">
                                    {signUpError}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary btn-block"
                                disabled={isSignUpLoading}
                            >
                                {isSignUpLoading ? 'Signing up...' : 'Sign Up'}
                            </button>

                            <div className="modal-footer-text">
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    className="link-button"
                                    onClick={() => {
                                        setShowSignUpModal(false);
                                        setShowLoginModal(true);
                                    }}
                                >
                                    Sign In
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LandingPage;
