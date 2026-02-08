import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Video,
    Clapperboard,
    FileText,
    Settings,
    Youtube,
    Sparkles,
    Crown,
    FileVideo,
    LogOut,
    TrendingUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { getPlan } from '../config/plans';
import CreditDisplay from './CreditDisplay';
import './Sidebar.css';

const navItems = [
    { path: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/app/library', icon: FileVideo, label: 'Library' },
    { path: '/app/trends', icon: TrendingUp, label: 'Trend Analyzer' },
    { path: '/app/video/create', icon: Video, label: 'Create Long Video' },
    { path: '/app/shorts/create', icon: Clapperboard, label: 'Create Shorts' },
    { path: '/app/transcribe', icon: FileText, label: 'Transcribe' },
    { path: '/app/settings', icon: Settings, label: 'Settings' },
];

function Sidebar() {
    const { user } = useApp();
    const { logout } = useAuth();
    const { subscription } = useSubscription();

    const plan = subscription ? getPlan(subscription.plan_type as any) : null;

    // Debug logging
    console.log('🎯 Sidebar - Subscription:', subscription);
    console.log('🎯 Sidebar - Plan Type:', subscription?.plan_type);
    console.log('🎯 Sidebar - Plan:', plan);
    console.log('🎯 Sidebar - Credits:', subscription?.credits);

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo">
                    <div className="logo-icon">
                        <Youtube size={28} />
                    </div>
                    <div className="logo-text">
                        <span className="logo-title">YouTube</span>
                        <span className="logo-subtitle">Automation</span>
                    </div>
                </div>
            </div>

            {/* Credit Display */}
            {subscription && (
                <div className="sidebar-credits">
                    {plan ? (
                        <CreditDisplay
                            credits={subscription.credits}
                            maxCredits={plan.credits}
                            planName={plan.name}
                        />
                    ) : (
                        <div className="credit-display">
                            <div className="credit-header">
                                <div className="credit-icon">
                                    <Sparkles size={18} />
                                </div>
                                <div className="credit-info">
                                    <span className="credit-label">Credits</span>
                                    <span className="credit-amount">
                                        {subscription.credits.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            <div className="credit-bar">
                                <div className="credit-bar-fill" style={{ width: '100%' }} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <nav className="sidebar-nav">
                <div className="nav-section">
                    <span className="nav-section-title">Ana Menü</span>
                    <ul className="nav-list">
                        {navItems.map((item) => (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `nav-link ${isActive ? 'active' : ''}`
                                    }
                                    end={item.path === '/'}
                                >
                                    <item.icon size={20} />
                                    <span>{item.label}</span>
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="nav-section">
                    <span className="nav-section-title">Hızlı Erişim</span>
                    <div className="quick-actions">
                        <button className="quick-action-btn">
                            <Sparkles size={18} />
                            <span>AI Video Önerisi</span>
                        </button>
                        <button className="quick-action-btn logout-btn" onClick={logout}>
                            <LogOut size={18} />
                            <span>Çıkış Yap</span>
                        </button>
                    </div>
                </div>
            </nav>

            <div className="sidebar-footer">
                {user?.plan === 'free' && (
                    <div className="upgrade-card">
                        <Crown size={24} className="upgrade-icon" />
                        <div className="upgrade-content">
                            <h4>Pro'ya Yükselt</h4>
                            <p>Sınırsız video oluştur</p>
                        </div>
                        <button className="btn btn-primary btn-sm">Yükselt</button>
                    </div>
                )}
            </div>
        </aside>
    );
}

export default Sidebar;
