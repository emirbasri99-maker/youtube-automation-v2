/**
 * Video Library Service
 * 
 * Manages video metadata storage using LocalStorage
 */

export interface VideoMetadata {
    id: string;
    title: string;
    type: 'long' | 'shorts';
    createdAt: string;
    duration: number;
    videoUrl: string;
    thumbnailUrl?: string;
    script?: string;
}

const STORAGE_KEY = 'youtube_automation_videos';

/**
 * Save a video to library
 */
export function saveVideo(metadata: VideoMetadata): void {
    try {
        const videos = getVideos();

        // Check if video already exists (update)
        const existingIndex = videos.findIndex(v => v.id === metadata.id);
        if (existingIndex >= 0) {
            videos[existingIndex] = metadata;
        } else {
            videos.push(metadata);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
        console.log('✅ Video saved to library:', metadata.title);
    } catch (error) {
        console.error('❌ Failed to save video:', error);
        throw new Error('Video kaydedilemedi');
    }
}

/**
 * Get all videos from library
 */
export function getVideos(): VideoMetadata[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];

        return JSON.parse(stored);
    } catch (error) {
        console.error('❌ Failed to load videos:', error);
        return [];
    }
}

/**
 * Get a single video by ID
 */
export function getVideoById(id: string): VideoMetadata | null {
    const videos = getVideos();
    return videos.find(v => v.id === id) || null;
}

/**
 * Delete a video from library
 */
export function deleteVideo(id: string): void {
    try {
        const videos = getVideos();
        const filtered = videos.filter(v => v.id !== id);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        console.log('✅ Video deleted from library');
    } catch (error) {
        console.error('❌ Failed to delete video:', error);
        throw new Error('Video silinemedi');
    }
}

/**
 * Get videos filtered by type
 */
export function getVideosByType(type: 'long' | 'shorts'): VideoMetadata[] {
    return getVideos().filter(v => v.type === type);
}

/**
 * Get videos sorted by date
 */
export function getVideosSorted(order: 'newest' | 'oldest' = 'newest'): VideoMetadata[] {
    const videos = getVideos();
    return videos.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return order === 'newest' ? dateB - dateA : dateA - dateB;
    });
}
