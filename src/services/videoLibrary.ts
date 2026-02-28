/**
 * Video Library Service
 * 
 * Manages video metadata storage using Supabase
 */

import { supabase } from '../lib/supabase';

export interface VideoMetadata {
    id: string;
    title: string;
    description?: string;
    type: 'long' | 'shorts';
    createdAt: string;
    duration: number; // in seconds
    videoUrl: string;
    thumbnailUrl?: string;
    script?: string;
    userId: string;
}

/**
 * Upload video file to Supabase Storage
 */
export async function uploadVideo(file: Blob, userId: string): Promise<string> {
    try {
        const fileName = `${userId}/${crypto.randomUUID()}.mp4`;

        const { error: uploadError } = await supabase.storage
            .from('videos')
            .upload(fileName, file, {
                contentType: 'video/mp4',
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Supabase storage upload error:', uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('videos')
            .getPublicUrl(fileName);

        return data.publicUrl;
    } catch (error) {
        console.error('❌ Failed to upload video:', error);
        throw new Error('Video yüklenemedi');
    }
}

/**
 * Save a video to library
 */
export async function saveVideo(metadata: VideoMetadata): Promise<void> {
    try {
        const { error } = await supabase
            .from('videos')
            .upsert({
                id: metadata.id,
                user_id: metadata.userId,
                title: metadata.title,
                description: metadata.description,
                type: metadata.type,
                video_url: metadata.videoUrl,
                thumbnail_url: metadata.thumbnailUrl,
                duration: metadata.duration,
                script: metadata.script,
                created_at: metadata.createdAt
            });

        if (error) {
            console.error('Supabase error saving video:', error);
            throw error;
        }

        console.log('✅ Video saved to Supabase library:', metadata.title);
    } catch (error) {
        console.error('❌ Failed to save video:', error);
        throw new Error('Video kaydedilemedi');
    }
}

/**
 * Get all videos for current user
 */
export async function getVideos(): Promise<VideoMetadata[]> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.warn('No user logged in, returning empty video list');
            return [];
        }

        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error querying videos:', error);
            throw error;
        }

        return (data || []).map(video => ({
            id: video.id,
            title: video.title,
            description: video.description,
            type: video.type,
            createdAt: video.created_at,
            duration: video.duration,
            videoUrl: video.video_url,
            thumbnailUrl: video.thumbnail_url,
            script: video.script,
            userId: video.user_id
        }));
    } catch (error) {
        console.error('❌ Failed to load videos:', error);
        return [];
    }
}

/**
 * Delete a video from library
 */
export async function deleteVideo(id: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('videos')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Supabase error deleting video:', error);
            throw error;
        }

        console.log('✅ Video deleted from Supabase');
    } catch (error) {
        console.error('❌ Failed to delete video:', error);
        throw new Error('Video silinemedi');
    }
}
