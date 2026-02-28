/**
 * Pexels Video API Service
 * 
 * This service provides scene-synchronized stock video selection for YouTube automation.
 * All visual selection is driven by the video script, narration, and scene structure.
 * 
 * Key Principles:
 * 1. Scene-Based Video Structure - Scripts are divided into scenes with duration, voiceover, and visual intent
 * 2. Voiceover-to-Visual Alignment - Videos must visually reinforce spoken narration
 * 3. Narrative Clarity - Visuals must match what is being spoken
 * 4. Looping & Duration Matching - Videos extended seamlessly to match scene duration
 * 5. Consistency & Continuity - Maintain visual flow across scenes
 */

const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY;
const PEXELS_API_BASE = 'https://api.pexels.com';

export interface PexelsVideo {
    id: number;
    width: number;
    height: number;
    duration: number;
    image: string;
    url: string;
    user: {
        id: number;
        name: string;
        url: string;
    };
    video_files: {
        id: number;
        quality: string;
        file_type: string;
        width: number;
        height: number;
        link: string;
    }[];
    video_pictures: {
        id: number;
        picture: string;
        nr: number;
    }[];
}

export interface PexelsSearchResponse {
    page: number;
    per_page: number;
    total_results: number;
    url: string;
    videos: PexelsVideo[];
}

export interface VideoScene {
    sceneNumber: number;
    duration: number; // in seconds
    voiceoverText: string;
    visualIntent: string;
    emotionalTone?: 'dark' | 'calm' | 'tense' | 'inspirational' | 'mysterious' | 'energetic' | 'neutral';
    keywords?: string[];
}

export interface SelectedSceneVideo {
    scene: VideoScene;
    video: PexelsVideo;
    selectedFile: {
        quality: string;
        link: string;
        width: number;
        height: number;
    };
    needsLooping: boolean;
    loopCount?: number;
}

/**
 * Search Pexels videos with query
 */
export async function searchVideos(
    query: string,
    options: {
        orientation?: 'landscape' | 'portrait' | 'square';
        size?: 'large' | 'medium' | 'small';
        per_page?: number;
        page?: number;
    } = {}
): Promise<PexelsSearchResponse> {
    const {
        orientation = 'landscape',
        size = 'medium',
        per_page = 15,
        page = 1,
    } = options;

    const params = new URLSearchParams({
        query,
        orientation,
        size,
        per_page: per_page.toString(),
        page: page.toString(),
    });

    try {
        const response = await fetch(`${PEXELS_API_BASE}/videos/search?${params}`, {
            headers: {
                'Authorization': PEXELS_API_KEY,
            },
        });

        if (!response.ok) {
            throw new Error(`Pexels API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error searching Pexels videos:', error);
        throw error;
    }
}

/**
 * Get popular/curated videos
 */
export async function getPopularVideos(
    options: {
        per_page?: number;
        page?: number;
    } = {}
): Promise<PexelsSearchResponse> {
    const { per_page = 15, page = 1 } = options;

    const params = new URLSearchParams({
        per_page: per_page.toString(),
        page: page.toString(),
    });

    try {
        const response = await fetch(`${PEXELS_API_BASE}/videos/popular?${params}`, {
            headers: {
                'Authorization': PEXELS_API_KEY,
            },
        });

        if (!response.ok) {
            throw new Error(`Pexels API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting popular videos:', error);
        throw error;
    }
}

/**
 * Extract keywords from voiceover text using semantic analysis
 */
function extractKeywordsFromVoiceover(voiceoverText: string): string[] {
    // Remove common words and extract meaningful keywords
    const commonWords = new Set([
        've', 'veya', 'ama', 'için', 'ile', 'bu', 'bir', 'da', 'de', 'ki',
        'mi', 'mu', 'mı', 'mü', 'ne', 'şu', 'o', 'and', 'or', 'but', 'the',
        'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are',
    ]);

    const words = voiceoverText
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !commonWords.has(word));

    // Get unique words and return top 5
    const uniqueWords = [...new Set(words)];
    return uniqueWords.slice(0, 5);
}

/**
 * Generate search query from scene data
 */
function generateSearchQuery(scene: VideoScene): string {
    const parts: string[] = [];

    // Add visual intent (primary)
    if (scene.visualIntent) {
        parts.push(scene.visualIntent);
    }

    // Add keywords if provided
    if (scene.keywords && scene.keywords.length > 0) {
        parts.push(...scene.keywords.slice(0, 2));
    } else {
        // Extract from voiceover
        const extractedKeywords = extractKeywordsFromVoiceover(scene.voiceoverText);
        if (extractedKeywords.length > 0) {
            parts.push(extractedKeywords[0]);
        }
    }

    // Add emotional tone modifier
    if (scene.emotionalTone && scene.emotionalTone !== 'neutral') {
        parts.push(scene.emotionalTone);
    }

    return parts.join(' ').trim() || 'cinematic abstract';
}

/**
 * Select best video file from available options
 * Prefers HD quality and MP4 format
 */
function selectBestVideoFile(video: PexelsVideo, preferredWidth = 1920) {
    const sortedFiles = [...video.video_files]
        .filter(file => file.file_type === 'video/mp4')
        .sort((a, b) => {
            // Prefer closest to preferred width
            const aDiff = Math.abs(a.width - preferredWidth);
            const bDiff = Math.abs(b.width - preferredWidth);
            return aDiff - bDiff;
        });

    return sortedFiles[0] || video.video_files[0];
}

/**
 * Find videos for a single scene with voiceover alignment
 */
export async function findVideoForScene(
    scene: VideoScene,
    orientation: 'landscape' | 'portrait' = 'landscape'
): Promise<SelectedSceneVideo> {
    const searchQuery = generateSearchQuery(scene);

    const searchResults = await searchVideos(searchQuery, {
        orientation,
        per_page: 10,
    });

    if (!searchResults.videos || searchResults.videos.length === 0) {
        // Fallback to popular videos
        const popularResults = await getPopularVideos({ per_page: 5 });
        searchResults.videos = popularResults.videos;
    }

    // Select first suitable video (can be enhanced with scoring algorithm)
    const selectedVideo = searchResults.videos[0];
    const selectedFile = selectBestVideoFile(
        selectedVideo,
        orientation === 'portrait' ? 1080 : 1920
    );

    // Check if looping is needed
    const needsLooping = scene.duration > selectedVideo.duration;
    const loopCount = needsLooping ? Math.ceil(scene.duration / selectedVideo.duration) : 1;

    return {
        scene,
        video: selectedVideo,
        selectedFile: {
            quality: selectedFile.quality,
            link: selectedFile.link,
            width: selectedFile.width,
            height: selectedFile.height,
        },
        needsLooping,
        loopCount,
    };
}

/**
 * Find videos for all scenes in a script
 * Ensures consistency and continuity across scenes
 */
export async function findVideosForAllScenes(
    scenes: VideoScene[],
    orientation: 'landscape' | 'portrait' = 'landscape'
): Promise<SelectedSceneVideo[]> {
    const results: SelectedSceneVideo[] = [];
    const usedVideoIds = new Set<number>();

    for (const scene of scenes) {
        let selectedSceneVideo = await findVideoForScene(scene, orientation);

        // Avoid reusing same video too frequently
        if (usedVideoIds.has(selectedSceneVideo.video.id) && results.length < scenes.length - 1) {
            // Try to get a different video by searching again with modified query
            const fallbackQuery = scene.visualIntent || scene.keywords?.[0] || 'cinematic';
            const fallbackResults = await searchVideos(fallbackQuery, {
                orientation,
                per_page: 15,
            });

            const unusedVideo = fallbackResults.videos.find(v => !usedVideoIds.has(v.id));
            if (unusedVideo) {
                const file = selectBestVideoFile(unusedVideo, orientation === 'portrait' ? 1080 : 1920);
                selectedSceneVideo = {
                    scene,
                    video: unusedVideo,
                    selectedFile: {
                        quality: file.quality,
                        link: file.link,
                        width: file.width,
                        height: file.height,
                    },
                    needsLooping: scene.duration > unusedVideo.duration,
                    loopCount: Math.ceil(scene.duration / unusedVideo.duration),
                };
            }
        }

        usedVideoIds.add(selectedSceneVideo.video.id);
        results.push(selectedSceneVideo);
    }

    return results;
}

/**
 * Parse script text into scenes
 * Expects format with markdown headers and timing info
 */
export function parseScriptIntoScenes(
    scriptText: string,
    totalDuration: number
): VideoScene[] {
    const scenes: VideoScene[] = [];
    const lines = scriptText.split('\n').filter(line => line.trim());

    let currentScene: Partial<VideoScene> = {};
    let sceneNumber = 1;
    let voiceoverLines: string[] = [];

    for (const line of lines) {
        // Check for markdown headers (scene markers)
        if (line.startsWith('#')) {
            // Save previous scene if exists
            if (voiceoverLines.length > 0) {
                scenes.push({
                    sceneNumber: sceneNumber++,
                    duration: 0, // Will be calculated later
                    voiceoverText: voiceoverLines.join(' '),
                    visualIntent: currentScene.visualIntent || 'cinematic abstract',
                    emotionalTone: currentScene.emotionalTone || 'neutral',
                    keywords: currentScene.keywords || [],
                });
                voiceoverLines = [];
            }

            // Start new scene
            const headerText = line.replace(/^#+\s*/, '');
            currentScene = {
                visualIntent: headerText,
            };
        } else if (line.trim()) {
            voiceoverLines.push(line.trim());
        }
    }

    // Add last scene
    if (voiceoverLines.length > 0) {
        scenes.push({
            sceneNumber: sceneNumber,
            duration: 0,
            voiceoverText: voiceoverLines.join(' '),
            visualIntent: currentScene.visualIntent || 'cinematic abstract',
            emotionalTone: currentScene.emotionalTone || 'neutral',
            keywords: currentScene.keywords || [],
        });
    }

    // Auto-split scenes to match audio duration with 8-12 second scenes
    if (scenes.length > 0) {
        const MIN_SCENE_DURATION = 8;
        const MAX_SCENE_DURATION = 12;
        const TARGET_SCENE_DURATION = 10; // Ideal scene length

        // Calculate minimum required scenes to cover totalDuration
        const minRequiredScenes = Math.ceil(totalDuration / MAX_SCENE_DURATION);

        console.log(`Audio duration: ${totalDuration}s, Initial scenes: ${scenes.length}, Min required: ${minRequiredScenes}`);

        // If we don't have enough scenes, split them
        if (scenes.length < minRequiredScenes) {
            console.warn(`Need to split ${scenes.length} scenes into ${minRequiredScenes} scenes to match ${totalDuration}s audio`);

            const originalScenes = [...scenes];
            scenes.length = 0; // Clear array

            // Calculate how many new scenes each original should become
            const splitFactor = Math.ceil(minRequiredScenes / originalScenes.length);

            for (const originalScene of originalScenes) {
                // Split voiceover text into chunks
                const words = originalScene.voiceoverText.split(' ');
                const wordsPerChunk = Math.ceil(words.length / splitFactor);

                for (let i = 0; i < splitFactor; i++) {
                    const startIdx = i * wordsPerChunk;
                    const endIdx = Math.min(startIdx + wordsPerChunk, words.length);
                    const chunkText = words.slice(startIdx, endIdx).join(' ');

                    if (chunkText.trim()) {
                        scenes.push({
                            sceneNumber: scenes.length + 1,
                            duration: 0, // Will be set below
                            voiceoverText: chunkText,
                            visualIntent: originalScene.visualIntent,
                            emotionalTone: originalScene.emotionalTone,
                            keywords: originalScene.keywords,
                        });
                    }
                }
            }

            console.log(`Split into ${scenes.length} scenes`);
        }

        // Now distribute totalDuration evenly across all scenes
        const durationPerScene = totalDuration / scenes.length;

        // Clamp to reasonable range
        const finalDuration = Math.max(MIN_SCENE_DURATION, Math.min(MAX_SCENE_DURATION, durationPerScene));

        console.log(`Final: ${scenes.length} scenes @ ${finalDuration.toFixed(1)}s each = ${(scenes.length * finalDuration).toFixed(1)}s total`);

        scenes.forEach(scene => {
            scene.duration = finalDuration;
        });
    }

    return scenes;
}
