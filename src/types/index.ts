// User types
export interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    plan: 'free' | 'pro' | 'enterprise';
    createdAt: string;
}

// YouTube Channel types
export interface YouTubeChannel {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    subscriberCount: number;
    videoCount: number;
    viewCount: number;
    isConnected: boolean;
}

// Video types
export interface Video {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    duration: number; // in seconds
    status: 'draft' | 'processing' | 'published' | 'scheduled';
    publishedAt?: string;
    scheduledAt?: string;
    views: number;
    likes: number;
    comments: number;
    type: 'long' | 'shorts';
}

// Script types
export interface Script {
    id: string;
    title: string;
    content: string;
    hook: string;
    sections: ScriptSection[];
    targetDuration: number; // in minutes
    language: string;
    createdAt: string;
    updatedAt: string;
}

export interface ScriptSection {
    id: string;
    title: string;
    content: string;
    duration: number; // estimated duration in seconds
}

// Voiceover types
export interface VoiceoverSettings {
    voiceId: string;
    language: string;
    speed: number; // 0.5 - 2.0
    pitch: number; // -20 to 20
    emotion: 'neutral' | 'happy' | 'sad' | 'excited' | 'serious';
}

export interface Voice {
    id: string;
    name: string;
    language: string;
    gender: 'male' | 'female' | 'neutral';
    preview: string;
    isPremium: boolean;
}

// Video creation types
export interface VideoProject {
    id: string;
    title: string;
    type: 'long' | 'shorts';
    status: 'script' | 'voiceover' | 'assembly' | 'review' | 'publishing';
    script?: Script;
    voiceover?: {
        settings: VoiceoverSettings;
        audioUrl?: string;
        duration?: number;
    };
    visuals?: VideoVisual[];
    music?: {
        trackId: string;
        volume: number;
    };
    output?: {
        videoUrl: string;
        thumbnailUrl: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface VideoVisual {
    id: string;
    type: 'stock' | 'ai-generated' | 'upload';
    url: string;
    thumbnail: string;
    startTime: number;
    endTime: number;
    caption?: string;
}

// Analytics types
export interface ChannelAnalytics {
    period: 'today' | 'week' | 'month' | 'year';
    views: number;
    viewsChange: number;
    watchTime: number; // in hours
    watchTimeChange: number;
    subscribers: number;
    subscribersChange: number;
    revenue: number;
    revenueChange: number;
    topVideos: VideoPerformance[];
}

export interface VideoPerformance {
    videoId: string;
    title: string;
    thumbnail: string;
    views: number;
    watchTime: number;
    ctr: number;
    avgViewDuration: number;
    likes: number;
    comments: number;
}

// Transcription types
export interface Transcription {
    id: string;
    videoUrl: string;
    videoTitle: string;
    language: string;
    text: string;
    segments: TranscriptSegment[];
    createdAt: string;
}

export interface TranscriptSegment {
    id: string;
    startTime: number;
    endTime: number;
    text: string;
}

// SEO types
export interface SEOSuggestion {
    title: string[];
    description: string;
    tags: string[];
    hashtags: string[];
    thumbnailSuggestions: string[];
    predictedCTR: number;
    predictedWatchTime: number;
}

// App Context types
export interface AppState {
    user: User | null;
    channel: YouTubeChannel | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    notifications: Notification[];
}

export interface Notification {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    createdAt: string;
}

// API Response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Wizard Step types
export interface WizardStep {
    id: string;
    title: string;
    description: string;
    isCompleted: boolean;
    isActive: boolean;
}
