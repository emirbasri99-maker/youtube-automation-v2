import { Bell, Search, Plus, ChevronDown, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';

function Header() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showCreateMenu, setShowCreateMenu] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate('/app/trends', { state: { searchQuery: searchQuery.trim() } });
            setSearchQuery('');
        }
    };

    return (
        <header className="header">
            <div className="header-left">
                <div className="search-container">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search videos, analyze..."
                        className="search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearch}
                    />
                </div>
            </div>

            <div className="header-right">
                <div className="create-dropdown">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowCreateMenu(!showCreateMenu)}
                    >
                        <Plus size={18} />
                        <span>Create</span>
                        <ChevronDown size={16} />
                    </button>

                    {showCreateMenu && (
                        <>
                            <div className="dropdown-backdrop" onClick={() => setShowCreateMenu(false)} />
                            <div className="dropdown-menu create-menu">
                                <button
                                    className="dropdown-item"
                                    onClick={() => {
                                        navigate('/app/video/create');
                                        setShowCreateMenu(false);
                                    }}
                                >
                                    <div className="dropdown-icon long-video">📹</div>
                                    <div className="dropdown-text">
                                        <span className="dropdown-title">Long Video</span>
                                        <span className="dropdown-desc">1-60 minute content</span>
                                    </div>
                                </button>
                                <button
                                    className="dropdown-item"
                                    onClick={() => {
                                        navigate('/app/shorts/create');
                                        setShowCreateMenu(false);
                                    }}
                                >
                                    <div className="dropdown-icon shorts">📱</div>
                                    <div className="dropdown-text">
                                        <span className="dropdown-title">YouTube Shorts</span>
                                        <span className="dropdown-desc">Up to 60 seconds</span>
                                    </div>
                                </button>
                                <div className="dropdown-divider" />
                                <button
                                    className="dropdown-item"
                                    onClick={() => {
                                        navigate('/app/transcribe');
                                        setShowCreateMenu(false);
                                    }}
                                >
                                    <div className="dropdown-icon transcribe">📝</div>
                                    <div className="dropdown-text">
                                        <span className="dropdown-title">Transcribe</span>
                                        <span className="dropdown-desc">Extract text from video</span>
                                    </div>
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <button className="header-btn notification-btn">
                    <Bell size={20} />
                    <span className="notification-badge">3</span>
                </button>

                <div className="user-dropdown">
                    <button
                        className="user-btn"
                        onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                        <div className="user-avatar">
                            <User size={20} />
                        </div>
                        <ChevronDown size={16} />
                    </button>

                    {showUserMenu && (
                        <>
                            <div className="dropdown-backdrop" onClick={() => setShowUserMenu(false)} />
                            <div className="dropdown-menu user-menu">
                                <div className="user-menu-header">
                                    <div className="user-avatar large">
                                        <User size={24} />
                                    </div>
                                    <div className="user-menu-info">
                                        <span className="user-menu-name">{user?.email?.split('@')[0] || 'Kullanıcı'}</span>
                                        <span className="user-menu-email">{user?.email}</span>
                                    </div>
                                </div>
                                <div className="dropdown-divider" />
                                <button className="dropdown-item" onClick={() => navigate('/settings')}>
                                    Hesap Ayarları
                                </button>
                                <button className="dropdown-item" onClick={() => navigate('/settings')}>
                                    YouTube Bağlantısı
                                </button>
                                <div className="dropdown-divider" />
                                <button
                                    className="dropdown-item logout"
                                    onClick={() => {
                                        logout();
                                        setShowUserMenu(false);
                                    }}
                                >
                                    Çıkış Yap
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Header;
