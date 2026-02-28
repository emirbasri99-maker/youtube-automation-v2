import { useState, useEffect } from 'react';
import {
    FileVideo,
    Video,
    Film,
    Download,
    Trash2,
    Filter,
    SortDesc,
    Play,
    Clock,
    Calendar,
} from 'lucide-react';
import {
    getVideos,
    deleteVideo,
    type VideoMetadata,
} from '../services/videoLibrary';
import './Library.css';

type FilterType = 'all' | 'long' | 'shorts';
type SortType = 'newest' | 'oldest' | 'title';

function Library() {
    const [videos, setVideos] = useState<VideoMetadata[]>([]);
    const [filter, setFilter] = useState<FilterType>('all');
    const [sort, setSort] = useState<SortType>('newest');

    useEffect(() => {
        loadVideos();
    }, []);

    const loadVideos = async () => {
        const allVideos = await getVideos();
        setVideos(allVideos);
    };

    // Download helper function (works with cross-origin URLs)
    const handleDownloadFile = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(url, '_blank');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this video?')) {
            await deleteVideo(id);
            loadVideos();
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    // Filter videos
    const filteredVideos = videos.filter(video => {
        if (filter === 'all') return true;
        return video.type === filter;
    });

    // Sort videos
    const sortedVideos = [...filteredVideos].sort((a, b) => {
        if (sort === 'newest') {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sort === 'oldest') {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else {
            return a.title.localeCompare(b.title);
        }
    });

    return (
        <div className="library-page">
            <div className="library-header">
                <div className="header-content">
                    <h1>
                        <FileVideo size={32} />
                        Video Library
                    </h1>
                    <p>{videos.length} videos saved</p>
                </div>

                <div className="library-controls">
                    <div className="filter-group">
                        <Filter size={18} />
                        <select value={filter} onChange={(e) => setFilter(e.target.value as FilterType)}>
                            <option value="all">All</option>
                            <option value="long">Long Videos</option>
                            <option value="shorts">Shorts</option>
                        </select>
                    </div>

                    <div className="sort-group">
                        <SortDesc size={18} />
                        <select value={sort} onChange={(e) => setSort(e.target.value as SortType)}>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="title">By Title</option>
                        </select>
                    </div>
                </div>
            </div>

            {sortedVideos.length === 0 ? (
                <div className="empty-state">
                    <FileVideo size={64} />
                    <h2>No videos yet</h2>
                    <p>Videos you create will automatically appear here</p>
                </div>
            ) : (
                <div className="videos-grid">
                    {sortedVideos.map((video) => (
                        <div key={video.id} className="video-card">
                            <div className="video-thumbnail">
                                {video.thumbnailUrl ? (
                                    <img src={video.thumbnailUrl} alt={video.title} />
                                ) : (
                                    <div className="thumbnail-placeholder">
                                        {video.type === 'shorts' ? (
                                            <Film size={48} />
                                        ) : (
                                            <Video size={48} />
                                        )}
                                    </div>
                                )}
                                <div className="play-overlay">
                                    <Play size={32} />
                                </div>
                                <div className="video-type-badge">
                                    {video.type === 'shorts' ? 'Shorts' : 'Video'}
                                </div>
                            </div>

                            <div className="video-info">
                                <h3>{video.title}</h3>

                                <div className="video-meta">
                                    <span>
                                        <Clock size={14} />
                                        {formatDuration(video.duration)}
                                    </span>
                                    <span>
                                        <Calendar size={14} />
                                        {formatDate(video.createdAt)}
                                    </span>
                                </div>

                                <div className="video-actions">
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleDownloadFile(video.videoUrl, `${video.title}.mp4`)}
                                    >
                                        <Download size={16} />
                                        Download
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => handleDelete(video.id)}
                                    >
                                        <Trash2 size={16} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Library;
