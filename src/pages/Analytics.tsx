import { useState } from 'react';
import {
    BarChart3,
    TrendingUp,
    Eye,
    Clock,
    Users,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Video,
    Zap,
} from 'lucide-react';
import './Analytics.css';

type Period = 'today' | 'week' | 'month' | 'year';

function Analytics() {
    const [period, setPeriod] = useState<Period>('month');

    const stats = {
        today: {
            views: '2,450',
            viewsChange: 12,
            watchTime: '45',
            watchTimeChange: 8,
            subscribers: '+12',
            subscribersChange: 15,
            revenue: '₺145',
            revenueChange: -3,
        },
        week: {
            views: '18,320',
            viewsChange: 8,
            watchTime: '312',
            watchTimeChange: 5,
            subscribers: '+87',
            subscribersChange: 12,
            revenue: '₺980',
            revenueChange: 6,
        },
        month: {
            views: '125,400',
            viewsChange: 15,
            watchTime: '2,540',
            watchTimeChange: 18,
            subscribers: '+1,245',
            subscribersChange: 22,
            revenue: '₺4,850',
            revenueChange: 12,
        },
        year: {
            views: '1.25M',
            viewsChange: 45,
            watchTime: '28,500',
            watchTimeChange: 38,
            subscribers: '+15.4K',
            subscribersChange: 156,
            revenue: '₺58,200',
            revenueChange: 67,
        },
    };

    const currentStats = stats[period];

    const topVideos = [
        {
            id: 1,
            title: 'Yapay Zeka ile Para Kazanmanın 10 Yolu',
            views: '45.2K',
            ctr: '8.4%',
            avgDuration: '6:45',
            revenue: '₺1,240',
        },
        {
            id: 2,
            title: 'ChatGPT Kullanarak Pasif Gelir Oluşturma',
            views: '32.1K',
            ctr: '7.2%',
            avgDuration: '8:12',
            revenue: '₺890',
        },
        {
            id: 3,
            title: 'YouTube Shorts ile Hızlı Büyüme',
            views: '28.7K',
            ctr: '12.5%',
            avgDuration: '0:45',
            revenue: '₺320',
        },
        {
            id: 4,
            title: 'AI Araçları - Tam Rehber 2024',
            views: '21.4K',
            ctr: '6.8%',
            avgDuration: '12:30',
            revenue: '₺780',
        },
        {
            id: 5,
            title: 'Affiliate Marketing Başlangıç Rehberi',
            views: '18.9K',
            ctr: '5.9%',
            avgDuration: '9:15',
            revenue: '₺620',
        },
    ];

    const insights = [
        {
            type: 'positive',
            icon: '🚀',
            title: 'Büyüme Fırsatı',
            message: 'Shorts videolarınız %45 daha fazla etkileşim alıyor. Daha fazla shorts içerik üretmeyi düşünün.',
        },
        {
            type: 'warning',
            icon: '⏰',
            title: 'En İyi Yayın Saati',
            message: 'Verilerinize göre Salı ve Perşembe 19:00-21:00 arası en yüksek trafik.',
        },
        {
            type: 'positive',
            icon: '💰',
            title: 'Gelir Artışı',
            message: 'RPM\'iniz geçen aya göre %18 arttı. Harika gidiyorsunuz!',
        },
    ];

    return (
        <div className="analytics animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1 className="heading-lg">
                        <BarChart3 className="header-icon" />
                        Kanal Analizi
                    </h1>
                    <p className="page-subtitle">Performansınızı takip edin ve büyüme stratejileri oluşturun</p>
                </div>
            </div>

            {/* Period Selector */}
            <div className="period-selector">
                <button
                    className={`period-btn ${period === 'today' ? 'active' : ''}`}
                    onClick={() => setPeriod('today')}
                >
                    Bugün
                </button>
                <button
                    className={`period-btn ${period === 'week' ? 'active' : ''}`}
                    onClick={() => setPeriod('week')}
                >
                    Bu Hafta
                </button>
                <button
                    className={`period-btn ${period === 'month' ? 'active' : ''}`}
                    onClick={() => setPeriod('month')}
                >
                    Bu Ay
                </button>
                <button
                    className={`period-btn ${period === 'year' ? 'active' : ''}`}
                    onClick={() => setPeriod('year')}
                >
                    Bu Yıl
                </button>
            </div>

            {/* Stats Grid */}
            <div className="analytics-stats">
                <div className="stat-card glass-card">
                    <div className="stat-icon views">
                        <Eye size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{currentStats.views}</span>
                        <span className="stat-label">Görüntülenme</span>
                    </div>
                    <div className={`stat-change ${currentStats.viewsChange >= 0 ? 'positive' : 'negative'}`}>
                        {currentStats.viewsChange >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        {Math.abs(currentStats.viewsChange)}%
                    </div>
                </div>

                <div className="stat-card glass-card">
                    <div className="stat-icon watch-time">
                        <Clock size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{currentStats.watchTime}</span>
                        <span className="stat-label">İzlenme Süresi (saat)</span>
                    </div>
                    <div className={`stat-change ${currentStats.watchTimeChange >= 0 ? 'positive' : 'negative'}`}>
                        {currentStats.watchTimeChange >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        {Math.abs(currentStats.watchTimeChange)}%
                    </div>
                </div>

                <div className="stat-card glass-card">
                    <div className="stat-icon subscribers">
                        <Users size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{currentStats.subscribers}</span>
                        <span className="stat-label">Yeni Abone</span>
                    </div>
                    <div className={`stat-change ${currentStats.subscribersChange >= 0 ? 'positive' : 'negative'}`}>
                        {currentStats.subscribersChange >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        {Math.abs(currentStats.subscribersChange)}%
                    </div>
                </div>

                <div className="stat-card glass-card">
                    <div className="stat-icon revenue">
                        <DollarSign size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{currentStats.revenue}</span>
                        <span className="stat-label">Tahmini Gelir</span>
                    </div>
                    <div className={`stat-change ${currentStats.revenueChange >= 0 ? 'positive' : 'negative'}`}>
                        {currentStats.revenueChange >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        {Math.abs(currentStats.revenueChange)}%
                    </div>
                </div>
            </div>

            {/* Chart Placeholder */}
            <div className="analytics-chart glass-card-static">
                <div className="chart-header">
                    <h3><TrendingUp size={20} /> Performans Grafiği</h3>
                    <div className="chart-legend">
                        <span className="legend-item views">
                            <span className="legend-dot"></span>
                            Görüntülenme
                        </span>
                        <span className="legend-item watch-time">
                            <span className="legend-dot"></span>
                            İzlenme Süresi
                        </span>
                    </div>
                </div>
                <div className="chart-placeholder">
                    <div className="chart-bars">
                        {[65, 45, 80, 55, 90, 70, 85].map((height, i) => (
                            <div key={i} className="chart-bar-group">
                                <div className="chart-bar views" style={{ height: `${height}%` }}></div>
                                <div className="chart-bar watch-time" style={{ height: `${height * 0.7}%` }}></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="analytics-grid">
                {/* Top Videos */}
                <div className="top-videos glass-card-static">
                    <div className="section-header">
                        <h3><Video size={20} /> En İyi Videolar</h3>
                    </div>
                    <div className="videos-table">
                        <div className="table-header">
                            <span>Video</span>
                            <span>Görüntülenme</span>
                            <span>CTR</span>
                            <span>Ort. Süre</span>
                            <span>Gelir</span>
                        </div>
                        {topVideos.map((video, index) => (
                            <div key={video.id} className="table-row">
                                <div className="video-info">
                                    <span className="video-rank">#{index + 1}</span>
                                    <span className="video-title">{video.title}</span>
                                </div>
                                <span>{video.views}</span>
                                <span className="ctr-value">{video.ctr}</span>
                                <span>{video.avgDuration}</span>
                                <span className="revenue-value">{video.revenue}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI Insights */}
                <div className="ai-insights glass-card-static">
                    <div className="section-header">
                        <h3><Zap size={20} /> AI Önerileri</h3>
                    </div>
                    <div className="insights-list">
                        {insights.map((insight, index) => (
                            <div key={index} className={`insight-item ${insight.type}`}>
                                <span className="insight-icon">{insight.icon}</span>
                                <div className="insight-content">
                                    <h4>{insight.title}</h4>
                                    <p>{insight.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Analytics;
