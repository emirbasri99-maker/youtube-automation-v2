import { useState } from 'react';
import {
    FolderOpen,
    Video,
    Filter,
    Search,
    Grid,
    List,
    MoreVertical,
    Play,
    Eye,
    Clock,
    Calendar,
    Edit,
    Trash2,
    Youtube,
    Zap,
} from 'lucide-react';
import './MyVideos.css';

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'long' | 'shorts' | 'draft' | 'published';

const mockVideos = [
    {
        id: '1',
        title: 'Yapay Zeka ile Para Kazanmanın 10 Yolu',
        thumbnail: '',
        duration: '12:34',
        type: 'long',
        status: 'published',
        views: 45200,
        createdAt: '2024-01-15',
        publishedAt: '2024-01-16',
    },
    {
        id: '2',
        title: 'ChatGPT Kullanarak Pasif Gelir Oluşturma',
        thumbnail: '',
        duration: '18:22',
        type: 'long',
        status: 'published',
        views: 32100,
        createdAt: '2024-01-12',
        publishedAt: '2024-01-13',
    },
    {
        id: '3',
        title: '3 Saniyede Çay Demleme Hilesi',
        thumbnail: '',
        duration: '0:45',
        type: 'shorts',
        status: 'published',
        views: 128500,
        createdAt: '2024-01-20',
        publishedAt: '2024-01-20',
    },
    {
        id: '4',
        title: 'AI ile Logo Tasarlama - Başlangıç Rehberi',
        thumbnail: '',
        duration: '25:10',
        type: 'long',
        status: 'draft',
        views: 0,
        createdAt: '2024-01-22',
    },
    {
        id: '5',
        title: 'Günde 5 Dakikada Verimlilik',
        thumbnail: '',
        duration: '0:58',
        type: 'shorts',
        status: 'draft',
        views: 0,
        createdAt: '2024-01-23',
    },
    {
        id: '6',
        title: 'Freelance İş Bulma Taktikleri',
        thumbnail: '',
        duration: '15:45',
        type: 'long',
        status: 'published',
        views: 18900,
        createdAt: '2024-01-10',
        publishedAt: '2024-01-11',
    },
];

function MyVideos() {
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

    const filteredVideos = mockVideos.filter((video) => {
        if (filter === 'long' && video.type !== 'long') return false;
        if (filter === 'shorts' && video.type !== 'shorts') return false;
        if (filter === 'draft' && video.status !== 'draft') return false;
        if (filter === 'published' && video.status !== 'published') return false;
        if (searchQuery && !video.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const formatViews = (views: number) => {
        if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
        if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
        return views.toString();
    };

    return (
        <div className="my-videos animate-fadeIn">
            <div className="page-header">
                <div>
                    <h1 className="heading-lg">
                        <FolderOpen className="header-icon" />
                        Videolarım
                    </h1>
                    <p className="page-subtitle">Tüm video projelerinizi yönetin</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="videos-toolbar">
                <div className="toolbar-left">
                    <div className="search-box">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Video ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="filter-tabs">
                        <button
                            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            Tümü
                        </button>
                        <button
                            className={`filter-tab ${filter === 'long' ? 'active' : ''}`}
                            onClick={() => setFilter('long')}
                        >
                            <Video size={14} />
                            Uzun
                        </button>
                        <button
                            className={`filter-tab ${filter === 'shorts' ? 'active' : ''}`}
                            onClick={() => setFilter('shorts')}
                        >
                            <Zap size={14} />
                            Shorts
                        </button>
                        <button
                            className={`filter-tab ${filter === 'draft' ? 'active' : ''}`}
                            onClick={() => setFilter('draft')}
                        >
                            Taslak
                        </button>
                        <button
                            className={`filter-tab ${filter === 'published' ? 'active' : ''}`}
                            onClick={() => setFilter('published')}
                        >
                            Yayında
                        </button>
                    </div>
                </div>

                <div className="toolbar-right">
                    <div className="view-toggle">
                        <button
                            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                        >
                            <Grid size={18} />
                        </button>
                        <button
                            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="videos-stats">
                <div className="stat-item">
                    <span className="stat-number">{mockVideos.length}</span>
                    <span className="stat-text">Toplam Video</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{mockVideos.filter(v => v.status === 'published').length}</span>
                    <span className="stat-text">Yayında</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{mockVideos.filter(v => v.status === 'draft').length}</span>
                    <span className="stat-text">Taslak</span>
                </div>
                <div className="stat-item">
                    <span className="stat-number">{mockVideos.filter(v => v.type === 'shorts').length}</span>
                    <span className="stat-text">Shorts</span>
                </div>
            </div>

            {/* Videos Grid/List */}
            <div className={`videos-container ${viewMode}`}>
                {filteredVideos.map((video) => (
                    <div key={video.id} className="video-item glass-card">
                        <div className="video-thumbnail">
                            <Play size={32} className="play-icon" />
                            <span className="video-duration">{video.duration}</span>
                            {video.type === 'shorts' && (
                                <span className="shorts-badge">
                                    <Zap size={12} />
                                    Shorts
                                </span>
                            )}
                        </div>

                        <div className="video-content">
                            <h3 className="video-title">{video.title}</h3>

                            <div className="video-meta">
                                {video.status === 'published' ? (
                                    <>
                                        <span className="meta-item">
                                            <Eye size={14} />
                                            {formatViews(video.views)}
                                        </span>
                                        <span className="meta-item">
                                            <Calendar size={14} />
                                            {new Date(video.publishedAt!).toLocaleDateString('tr-TR')}
                                        </span>
                                    </>
                                ) : (
                                    <span className="meta-item draft">
                                        <Clock size={14} />
                                        Taslak
                                    </span>
                                )}
                            </div>

                            <div className="video-actions">
                                {video.status === 'draft' ? (
                                    <button className="btn btn-primary btn-sm">
                                        <Youtube size={14} />
                                        Yayınla
                                    </button>
                                ) : (
                                    <button className="btn btn-secondary btn-sm">
                                        <Eye size={14} />
                                        İncele
                                    </button>
                                )}
                                <button className="btn btn-ghost btn-sm">
                                    <Edit size={14} />
                                </button>
                                <button className="btn btn-ghost btn-sm">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredVideos.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">
                        <Video size={48} />
                    </div>
                    <h3 className="empty-title">Video Bulunamadı</h3>
                    <p className="empty-desc">
                        Arama kriterlerinize uygun video yok veya henüz video oluşturmadınız.
                    </p>
                </div>
            )}
        </div>
    );
}

export default MyVideos;
