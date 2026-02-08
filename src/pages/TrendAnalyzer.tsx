import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TrendingUp, Search, Sparkles, ArrowRight, Play, Eye } from 'lucide-react';
import { performTrendAnalysis, YouTubeVideo, AISuggestions } from '../services/youtubeTrends';
import './TrendAnalyzer.css';

function TrendAnalyzer() {
    const navigate = useNavigate();
    const location = useLocation();
    const [keyword, setKeyword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [videos, setVideos] = useState<YouTubeVideo[]>([]);
    const [aiSuggestions, setAiSuggestions] = useState<AISuggestions | null>(null);
    const [error, setError] = useState('');

    // Auto-search if query comes from Header
    useEffect(() => {
        const searchQuery = (location.state as any)?.searchQuery;
        if (searchQuery) {
            setKeyword(searchQuery);
            // Trigger search automatically
            setTimeout(() => {
                handleSearchWithQuery(searchQuery);
            }, 100);
        }
    }, [location.state]);

    const handleSearchWithQuery = async (query: string) => {
        if (!query.trim()) {
            setError('Lütfen bir anahtar kelime girin');
            return;
        }

        setError('');
        setIsLoading(true);
        setVideos([]);
        setAiSuggestions(null);

        try {
            const result = await performTrendAnalysis(query, (status) => {
                setLoadingStatus(status);
            });

            setVideos(result.videos);
            setAiSuggestions(result.aiSuggestions);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Bir hata oluştu');
        } finally {
            setIsLoading(false);
            setLoadingStatus('');
        }
    };

    const handleSearch = () => {
        handleSearchWithQuery(keyword);
    };

    const handleUseTitle = (title: string) => {
        navigate('/app/shorts/create', {
            state: { suggestedTopic: title },
        });
    };

    const formatViews = (views: number): string => {
        if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
        if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
        return views.toString();
    };

    const formatDate = (dateStr: string): string => {
        // Handle "X years ago" format from Apify
        if (dateStr.includes('ago')) {
            return dateStr;
        }

        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Bugün';
        if (diffDays === 1) return 'Dün';
        if (diffDays < 7) return `${diffDays} gün önce`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} hafta önce`;
        return `${Math.floor(diffDays / 30)} ay önce`;
    };

    return (
        <div className="trend-analyzer animate-fadeIn">
            {/* Header */}
            <div className="page-header">
                <h1 className="heading-lg">
                    <TrendingUp className="header-icon" />
                    Trend Analizörü
                </h1>
                <p className="header-desc">
                    YouTube trendlerini analiz edin ve viral içerik fikirleri keşfedin
                </p>
            </div>

            {/* Search Section */}
            <div className="search-section glass-card">
                <div className="search-input-wrapper">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Anahtar kelime girin (örn: yapay zeka, teknoloji, eğitim...)"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        disabled={isLoading}
                    />
                </div>
                <button
                    className="btn btn-primary btn-lg"
                    onClick={handleSearch}
                    disabled={isLoading || !keyword.trim()}
                >
                    <TrendingUp size={20} />
                    {isLoading ? 'Analyzing...' : 'Scan Trends'}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="error-message glass-card">
                    <p>{error}</p>
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="loading-section glass-card">
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                    </div>
                    <p className="loading-text">{loadingStatus}</p>
                    <div className="loading-bar">
                        <div className="loading-bar-fill"></div>
                    </div>
                </div>
            )}

            {/* Results */}
            {!isLoading && videos.length > 0 && aiSuggestions && (
                <div className="results-grid">
                    {/* Left Panel - Videos */}
                    <div className="videos-panel">
                        <h2 className="panel-title">
                            <Play size={20} />
                            Popüler Videolar ({videos.length})
                        </h2>

                        <div className="videos-list">
                            {videos.map((video, index) => (
                                <div key={video.id || index} className="video-card glass-card">
                                    <div className="video-thumbnail">
                                        {video.thumbnail ? (
                                            <img src={video.thumbnail} alt={video.title} />
                                        ) : (
                                            <div className="thumbnail-placeholder">
                                                <Play size={40} />
                                            </div>
                                        )}
                                        <div className="video-rank">#{index + 1}</div>
                                    </div>

                                    <div className="video-info">
                                        <h3 className="video-title">
                                            <a
                                                href={video.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {video.title}
                                            </a>
                                        </h3>

                                        <div className="video-meta">
                                            <span className="video-channel">{video.channelName}</span>
                                            <span className="video-divider">•</span>
                                            <span className="video-views">
                                                <Eye size={14} />
                                                {formatViews(video.views)}
                                            </span>
                                            <span className="video-divider">•</span>
                                            <span className="video-date">{formatDate(video.publishedAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Panel - AI Suggestions */}
                    <div className="ai-panel">
                        <div className="ai-report glass-card">
                            <div className="ai-header">
                                <Sparkles size={24} className="ai-icon" />
                                <h2 className="panel-title">Yapay Zeka Strateji Raporu</h2>
                            </div>

                            {/* Insights */}
                            <div className="ai-section">
                                <h3 className="ai-section-title">📊 Trend Analizi</h3>
                                <p className="ai-insights">{aiSuggestions.insights}</p>
                            </div>

                            {/* Suggested Titles */}
                            <div className="ai-section">
                                <h3 className="ai-section-title">💡 Önerilen Başlıklar</h3>
                                <div className="suggested-titles">
                                    {aiSuggestions.titles.map((title, index) => (
                                        <div key={index} className="title-suggestion">
                                            <div className="title-content">
                                                <span className="title-number">{index + 1}</span>
                                                <div className="title-text">
                                                    <p className="title">{title}</p>
                                                    <p className="hook">{aiSuggestions.hooks[index]}</p>
                                                </div>
                                            </div>
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => handleUseTitle(title)}
                                            >
                                                <ArrowRight size={16} />
                                                Videoya Dönüştür
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Suggested Tags */}
                            <div className="ai-section">
                                <h3 className="ai-section-title">🎯 Önerilen Etiketler</h3>
                                <div className="suggested-tags">
                                    {aiSuggestions.tags.map((tag, index) => (
                                        <span key={index} className="suggested-tag">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && videos.length === 0 && !error && (
                <div className="empty-state glass-card">
                    <TrendingUp size={64} className="empty-icon" />
                    <h3>Start Discovering Trends</h3>
                    <p>
                        <p>Enter a keyword and analyze popular videos on YouTube to discover viral content ideas.</p>
                    </p>
                </div>
            )}
        </div>
    );
}

export default TrendAnalyzer;
