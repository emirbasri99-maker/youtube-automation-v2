import { useState, useEffect } from 'react';
import {
    Video,
    Zap,
    Coins,
    TrendingUp,
    Clock,
    ArrowRight,
    Play,
    Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { supabase } from '../lib/supabase';
import './Dashboard.css';

interface VideoStats {
    totalVideos: number;
    totalShorts: number;
    recentVideos: any[];
}

function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { subscription } = useSubscription();
    const [videoStats, setVideoStats] = useState<VideoStats>({
        totalVideos: 0,
        totalShorts: 0,
        recentVideos: [],
    });
    const [loading, setLoading] = useState(true);

    // Load video statistics from Supabase
    useEffect(() => {
        const loadStats = async () => {
            if (!user?.id) return;

            try {
                // Get all videos for this user
                const { data: videos, error } = await supabase
                    .from('videos')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(6);

                if (error) throw error;

                const shorts = videos?.filter(v => v.type === 'shorts') || [];
                const longVideos = videos?.filter(v => v.type === 'long') || [];

                setVideoStats({
                    totalVideos: longVideos.length,
                    totalShorts: shorts.length,
                    recentVideos: videos || [],
                });
            } catch (error) {
                console.error('Error loading stats:', error);
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, [user?.id]);

    const stats = [
        {
            icon: Coins,
            label: 'Remaining Credits',
            value: subscription?.credits.toLocaleString() || '0',
            gradient: 'from-pink-500 to-rose-500',
            bgGradient: 'from-pink-500/10 to-rose-500/10',
        },
        {
            icon: Video,
            label: 'Total Videos',
            value: videoStats.totalVideos.toString(),
            gradient: 'from-blue-500 to-cyan-500',
            bgGradient: 'from-blue-500/10 to-cyan-500/10',
        },
        {
            icon: Zap,
            label: 'Total Shorts',
            value: videoStats.totalShorts.toString(),
            gradient: 'from-purple-500 to-pink-500',
            bgGradient: 'from-purple-500/10 to-pink-500/10',
        },
        {
            icon: TrendingUp,
            label: 'This Month',
            value: `${videoStats.totalVideos + videoStats.totalShorts}`,
            gradient: 'from-emerald-500 to-teal-500',
            bgGradient: 'from-emerald-500/10 to-teal-500/10',
        },
    ];

    const quickActions = [
        {
            title: 'Create Shorts',
            description: 'Create viral short videos with AI',
            icon: Zap,
            gradient: 'from-purple-600 via-pink-600 to-rose-600',
            path: '/app/shorts/create',
            iconBg: 'from-purple-500/20 to-pink-500/20',
        },
        {
            title: 'Create Long Video',
            description: '1-60 minute professional content',
            icon: Video,
            gradient: 'from-blue-600 via-cyan-600 to-teal-600',
            path: '/app/video/create',
            iconBg: 'from-blue-500/20 to-cyan-500/20',
        },
    ];

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('tr-TR');
    };

    return (
        <div className="dashboard-modern">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">
                        Welcome, <span className="gradient-text">{user?.email?.split('@')[0]}</span>
                    </h1>
                    <p className="dashboard-subtitle">
                        Ready to create content with AI?
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid-modern">
                {stats.map((stat, index) => (
                    <div key={index} className="stat-card-modern">
                        <div className={`stat-icon-wrapper bg-gradient-to-br ${stat.bgGradient}`}>
                            <stat.icon className={`stat-icon bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`} size={24} />
                        </div>
                        <div className="stat-content">
                            <p className="stat-label">{stat.label}</p>
                            <p className="stat-value">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="quick-actions-section">
                <h2 className="section-title">
                    <Sparkles size={20} />
                    Quick Start
                </h2>
                <div className="quick-actions-grid-modern">
                    {quickActions.map((action, index) => (
                        <button
                            key={index}
                            className="quick-action-modern"
                            onClick={() => navigate(action.path)}
                        >
                            <div className={`quick-action-bg bg-gradient-to-br ${action.gradient}`} />
                            <div className="quick-action-content">
                                <div className={`quick-action-icon-modern bg-gradient-to-br ${action.iconBg}`}>
                                    <action.icon size={32} className="text-white" />
                                </div>
                                <div className="quick-action-text">
                                    <h3>{action.title}</h3>
                                    <p>{action.description}</p>
                                </div>
                                <ArrowRight className="quick-action-arrow" size={24} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Recent Videos */}
            <div className="recent-section">
                <div className="section-header-modern">
                    <h2 className="section-title">
                        <Clock size={20} />
                        Recent Videos
                    </h2>
                    <button
                        className="view-all-btn"
                        onClick={() => navigate('/app/library')}
                    >
                        View All
                        <ArrowRight size={16} />
                    </button>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <div className="spinner" />
                        <p>Loading...</p>
                    </div>
                ) : videoStats.recentVideos.length > 0 ? (
                    <div className="recent-videos-grid">
                        {videoStats.recentVideos.map((video) => (
                            <div key={video.id} className="recent-video-card">
                                <div className="video-thumbnail">
                                    {video.thumbnail_url ? (
                                        <img src={video.thumbnail_url} alt={video.title} />
                                    ) : (
                                        <div className="video-placeholder">
                                            <Play size={32} />
                                        </div>
                                    )}
                                    <div className="video-type-badge">
                                        {video.type === 'shorts' ? (
                                            <><Zap size={12} /> Shorts</>
                                        ) : (
                                            <><Video size={12} /> Video</>
                                        )}
                                    </div>
                                </div>
                                <div className="video-info">
                                    <h4 className="video-title">{video.title || 'Untitled Video'}</h4>
                                    <p className="video-meta">
                                        {formatDate(video.created_at)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <Video size={48} />
                        </div>
                        <h3>No videos yet</h3>
                        <p>Use the buttons above to create your first video</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/app/shorts/create')}
                        >
                            <Zap size={18} />
                            Create Shorts
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
