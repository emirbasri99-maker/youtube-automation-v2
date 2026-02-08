import { useState } from 'react';
import {
    Settings as SettingsIcon,
    User,
    Bell,
    Globe,
    CreditCard,
    Check,
    ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { getPlan } from '../config/plans';
import './Settings.css';

type Tab = 'profile' | 'notifications' | 'language' | 'billing';

function Settings() {
    const { user, logout } = useAuth();
    const { subscription } = useSubscription();
    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [notificationSettings, setNotificationSettings] = useState({
        videoComplete: true,
        weeklyReport: true,
        trendAlerts: true,
        emailNotifications: false,
    });

    const tabs = [
        { id: 'profile' as Tab, icon: User, label: 'Profile' },
        { id: 'notifications' as Tab, icon: Bell, label: 'Notifications' },
        { id: 'language' as Tab, icon: Globe, label: 'Language & Region' },
        { id: 'billing' as Tab, icon: CreditCard, label: 'Subscription' },
    ];

    return (
        <div className="settings animate-fadeIn">
            <div className="page-header">
                <h1 className="heading-lg">
                    <SettingsIcon className="header-icon" />
                    Settings
                </h1>
            </div>

            <div className="settings-layout">
                {/* Sidebar */}
                <div className="settings-sidebar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <tab.icon size={20} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="settings-content">
                    {/* Profile */}
                    {activeTab === 'profile' && (
                        <div className="settings-section">
                            <h2>Profile Settings</h2>
                            <p className="section-desc">Update your account information.</p>

                            <div className="profile-form glass-card-static">
                                <div className="profile-avatar-section">
                                    <div className="profile-avatar-lg">
                                        <User size={40} />
                                    </div>
                                    <button className="btn btn-secondary btn-sm">Change Photo</button>
                                </div>

                                <div className="form-row">
                                    <div className="input-group">
                                        <label className="input-label">Full Name</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            defaultValue={user?.email?.split('@')[0] || 'Kullanıcı'}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">E-posta</label>
                                        <input
                                            type="email"
                                            className="input-field"
                                            defaultValue={user?.email || ''}
                                            disabled
                                        />
                                    </div>
                                </div>

                                <div className="form-actions" style={{ display: 'flex', gap: '12px' }}>
                                    <button className="btn btn-primary">Save Changes</button>
                                    <button className="btn btn-secondary">Cancel</button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={logout}
                                        type="button"
                                    >
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notifications */}
                    {activeTab === 'notifications' && (
                        <div className="settings-section">
                            <h2>Notification Settings</h2>
                            <p className="section-desc">Choose which notifications you want to receive.</p>

                            <div className="notification-list glass-card-static">
                                {Object.entries({
                                    videoComplete: { label: 'Video Tamamlandı', desc: 'Video işleme bittiğinde bildir' },
                                    weeklyReport: { label: 'Haftalık Rapor', desc: 'Her hafta performans özeti gönder' },
                                    trendAlerts: { label: 'Trend Uyarıları', desc: 'Yeni trend konular hakkında bildir' },
                                    emailNotifications: { label: 'E-posta Bildirimleri', desc: 'Bildirimleri e-posta olarak da gönder' },
                                }).map(([key, { label, desc }]) => (
                                    <div key={key} className="notification-item">
                                        <div className="notification-info">
                                            <span className="notification-label">{label}</span>
                                            <span className="notification-desc">{desc}</span>
                                        </div>
                                        <label className="toggle">
                                            <input
                                                type="checkbox"
                                                checked={notificationSettings[key as keyof typeof notificationSettings]}
                                                onChange={(e) =>
                                                    setNotificationSettings({
                                                        ...notificationSettings,
                                                        [key]: e.target.checked,
                                                    })
                                                }
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Language */}
                    {activeTab === 'language' && (
                        <div className="settings-section">
                            <h2>Language & Region</h2>
                            <p className="section-desc">Set your language and region preferences.</p>

                            <div className="language-settings glass-card-static">
                                <div className="input-group">
                                    <label className="input-label">Uygulama Dili</label>
                                    <select className="input-field">
                                        <option value="tr">🇹🇷 Türkçe</option>
                                        <option value="en">🇺🇸 English</option>
                                        <option value="de">🇩🇪 Deutsch</option>
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Varsayılan Video Dili</label>
                                    <select className="input-field">
                                        <option value="tr">Türkçe</option>
                                        <option value="en">İngilizce</option>
                                        <option value="de">Almanca</option>
                                        <option value="fr">Fransızca</option>
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Saat Dilimi</label>
                                    <select className="input-field">
                                        <option value="europe/istanbul">İstanbul (GMT+3)</option>
                                        <option value="europe/london">Londra (GMT+0)</option>
                                        <option value="america/new_york">New York (GMT-5)</option>
                                    </select>
                                </div>

                                <button className="btn btn-primary">Kaydet</button>
                            </div>
                        </div>
                    )}

                    {/* Billing */}
                    {activeTab === 'billing' && (
                        <div className="settings-section">
                            <h2>Subscription</h2>
                            <p className="section-desc">Manage your current plan and billing information.</p>

                            <div className="current-plan glass-card-static">
                                <div className="plan-header">
                                    <div className="plan-info">
                                        <span className="plan-name">
                                            {subscription ? getPlan(subscription.plan_type as any).name : 'Starter Plan'}
                                        </span>
                                        <span className="plan-badge">Aktif</span>
                                    </div>
                                    <div className="plan-credits">
                                        <span className="credits-value">{subscription?.credits || 0}</span>
                                        <span className="credits-label">Remaining Credits</span>
                                    </div>
                                </div>

                                <div className="plan-features">
                                    <div className="feature-row">
                                        <Check size={16} />
                                        <span>{subscription?.credits || 0} Credits</span>
                                    </div>
                                    <div className="feature-row">
                                        <Check size={16} />
                                        <span>Shorts Video Creation</span>
                                    </div>
                                    <div className="feature-row">
                                        <Check size={16} />
                                        <span>AI Script Writing</span>
                                    </div>
                                    <div className="feature-row">
                                        <Check size={16} />
                                        <span>Automatic Editing</span>
                                    </div>
                                </div>

                                <div className="plan-actions">
                                    {subscription?.plan_type === 'STARTER' ? (
                                        <button className="btn btn-primary">
                                            <ExternalLink size={18} />
                                            Upgrade to Professional
                                        </button>
                                    ) : (
                                        <button className="btn btn-secondary">Planı Değiştir</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Settings;
