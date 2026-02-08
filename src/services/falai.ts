/**
 * Fal.AI Image Generation Service
 * 
 * Uses Flux Pro v1.1-ultra model for high-quality AI image generation
 * Generates scene-based images from script prompts
 */

const FALAI_API_KEY = import.meta.env.VITE_FALAI_API_KEY;
const FALAI_API_BASE = 'https://fal.run/fal-ai/flux-pro/v1.1-ultra';

export interface FalAIImageRequest {
    prompt: string;
    image_size?: {
        width: number;
        height: number;
    };
    num_inference_steps?: number;
    guidance_scale?: number;
    num_images?: number;
    enable_safety_checker?: boolean;
    output_format?: 'jpeg' | 'png';
}

export interface FalAIImageResponse {
    images: {
        url: string;
        width: number;
        height: number;
        content_type: string;
    }[];
    timings: {
        inference: number;
    };
    seed: number;
    has_nsfw_concepts: boolean[];
    prompt: string;
}

export interface SceneImageData {
    sceneNumber: number;
    prompt: string;
    imageUrl: string;
    duration: number; // 5-12 seconds
}

/**
 * Generate image using Fal.AI Flux Pro
 */
export async function generateImage(request: FalAIImageRequest): Promise<FalAIImageResponse> {
    if (!FALAI_API_KEY) {
        throw new Error('Fal.AI API key is missing. Please check your .env file.');
    }

    console.log('🎨 Generating image with Fal.AI Flux Pro...');
    console.log('Prompt:', request.prompt);

    try {
        const response = await fetch(FALAI_API_BASE, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${FALAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: request.prompt,
                image_size: request.image_size || {
                    width: 1920,
                    height: 1080,
                },
                num_inference_steps: request.num_inference_steps || 28,
                guidance_scale: request.guidance_scale || 3.5,
                num_images: request.num_images || 1,
                enable_safety_checker: request.enable_safety_checker ?? true,
                output_format: request.output_format || 'jpeg',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Fal.AI API error:', errorText);
            throw new Error(`Fal.AI API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Image generated:', result.images[0].url);

        return result;
    } catch (error) {
        console.error('❌ Error generating image:', error);
        throw error;
    }
}

/**
 * Generate image prompts from script scenes
 */
export function generateImagePromptsFromScript(
    scriptText: string,
    sceneCount: number
): string[] {
    const prompts: string[] = [];

    console.log(`📝 Generating ${sceneCount} prompts from script`);

    // Split script into sentences for better distribution
    const sentences = scriptText
        .replace(/\n+/g, ' ')  // Remove line breaks
        .split(/[.!?]+/)       // Split by sentence endings
        .map(s => s.trim())
        .filter(s => s.length > 20); // Filter out very short fragments

    console.log(`Found ${sentences.length} sentences in script`);

    // Group sentences into scenes
    const sentencesPerScene = Math.max(1, Math.floor(sentences.length / sceneCount));

    for (let i = 0; i < sceneCount; i++) {
        const startIdx = i * sentencesPerScene;
        const endIdx = Math.min((i + 1) * sentencesPerScene, sentences.length);
        const sceneText = sentences.slice(startIdx, endIdx).join('. ');

        if (sceneText.length > 0) {
            // Create descriptive prompt from scene text
            const prompt = `${sceneText.slice(0, 400)}. cinematic photography, professional, high quality, 4k, ultra detailed, dramatic lighting, vibrant colors`;
            prompts.push(prompt);
            console.log(`Scene ${i + 1} prompt: ${prompt.substring(0, 100)}...`);
        } else {
            // Fallback generic prompt
            const genericPrompts = [
                'Cinematic landscape, professional photography, 4k, dramatic lighting',
                'Abstract modern background, professional, vibrant colors, high quality',
                'Cinematic cityscape, professional photography, ultra detailed',
                'Nature scene, professional, 4k, dramatic lighting, vibrant colors',
                'Tech background, futuristic, professional, high quality, 4k',
            ];
            const prompt = genericPrompts[i % genericPrompts.length];
            prompts.push(prompt);
            console.log(`Scene ${i + 1} using generic prompt: ${prompt}`);
        }
    }

    return prompts;
}

/**
 * Generate images for all scenes
 */
export async function generateImagesForScenes(
    scriptText: string,
    audioDuration: number,
    onProgress?: (current: number, total: number, imageUrl?: string) => void
): Promise<SceneImageData[]> {
    // Calculate scene count (5-12 seconds per scene)
    const MIN_SCENE_DURATION = 5;
    const MAX_SCENE_DURATION = 12;

    // Use average duration of 8 seconds
    const avgSceneDuration = 8;
    const sceneCount = Math.ceil(audioDuration / avgSceneDuration);

    console.log(`🎬 Generating ${sceneCount} images for ${audioDuration}s video`);

    // Generate prompts
    const prompts = generateImagePromptsFromScript(scriptText, sceneCount);

    // Generate images
    const sceneImages: SceneImageData[] = [];

    for (let i = 0; i < prompts.length; i++) {
        if (onProgress) {
            onProgress(i + 1, prompts.length);
        }

        try {
            const result = await generateImage({
                prompt: prompts[i],
                image_size: {
                    width: 1920,
                    height: 1080,
                },
            });

            // Calculate duration for this scene
            const remainingDuration = audioDuration - (sceneImages.reduce((sum, s) => sum + s.duration, 0));
            const remainingScenes = prompts.length - i;
            let sceneDuration = remainingDuration / remainingScenes;

            // Clamp to 5-12 seconds
            sceneDuration = Math.max(MIN_SCENE_DURATION, Math.min(MAX_SCENE_DURATION, sceneDuration));

            sceneImages.push({
                sceneNumber: i + 1,
                prompt: prompts[i],
                imageUrl: result.images[0].url,
                duration: Math.round(sceneDuration),
            });

            if (onProgress) {
                onProgress(i + 1, prompts.length, result.images[0].url);
            }

            console.log(`✅ Scene ${i + 1}/${prompts.length} generated (${sceneDuration}s)`);

        } catch (error) {
            console.error(`❌ Error generating image for scene ${i + 1}:`, error);
            throw error;
        }
    }

    return sceneImages;
}

/**
 * Download image as blob
 */
export async function downloadImageBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
    }
    return await response.blob();
}
