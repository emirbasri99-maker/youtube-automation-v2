/**
 * Fal.AI Wan v2.6 Model Service for Shorts
 * 
 * Uses Wan v2.6 text-to-image and image-to-video/flash
 * All processing happens in the browser - no backend needed
 */

const FALAI_API_KEY = import.meta.env.VITE_FALAI_API_KEY;

// Fal.AI Wan v2.6 API endpoints (no fal-ai prefix!)
const FALAI_TEXT_TO_IMAGE = 'https://fal.run/wan/v2.6/text-to-image';
const FALAI_IMAGE_TO_VIDEO = 'https://fal.run/wan/v2.6/image-to-video/flash';

export interface SceneScript {
    sceneNumber: number;
    description: string;
    imagePrompt: string;
    duration: number; // 8-15 seconds
}

export interface GeneratedScene {
    sceneNumber: number;
    description: string;
    imageUrl: string;
    videoUrl: string;
    duration: number;
}

export interface ShortsProgress {
    stage: 'script' | 'images' | 'videos' | 'combining' | 'done';
    current: number;
    total: number;
    message: string;
}

/**
 * Generate scene-by-scene script using OpenAI
 */
export async function generateShortsScript(
    topic: string,
    sceneCount: number = 6,
    durationMode: 'auto' | 'manual' = 'auto',
    manualDuration: number = 10
): Promise<SceneScript[]> {
    const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not found');
    }

    const durationInstruction = durationMode === 'manual'
        ? `EVERY SCENE MUST BE EXACTLY ${manualDuration} SECONDS LONG.`
        : `Each scene should be between 5-15 seconds.`;

    const systemPrompt = `You are a professional YouTube Shorts cinematographer. You will break down the user's topic into ${sceneCount} visual scenes.

CRITICAL RULES:
1. ${durationInstruction}
2. Scenes must have visual consistency with each other
3. Write VERY DETAILED image prompts for each scene
4. If there is a character, use the SAME features in every scene (hair color, clothes, etc.)
5. Lighting and atmosphere must be consistent

OUTPUT FORMAT (Strict JSON):
{
  "masterStyle": "Common visual style for all scenes (e.g., cinematic, 4k, dramatic lighting)",
  "characterDesc": "Main character features (if any)",
  "scenes": [
    {
      "sceneNumber": 1,
      "description": "What happens in this scene (Turkish description)",
      "imagePrompt": "DETAILED ENGLISH visual prompt. Include masterStyle + characterDesc. Specify camera angle, lighting, color tone.",
      "duration": ${durationMode === 'manual' ? manualDuration : 10}
    }
  ]
}

IMPORTANT: imagePrompt MUST be in ENGLISH because the AI image model understands English!`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Topic: ${topic}\n\nCreate a ${sceneCount}-scene shorts script.` }
            ],
            temperature: 0.8,
            max_tokens: 2000,
        }),
    });

    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;

    // Extract JSON from markdown if present
    if (content.includes('```json')) {
        content = content.split('```json')[1].split('```')[0];
    } else if (content.includes('```')) {
        content = content.split('```')[1].split('```')[0];
    }

    const parsed = JSON.parse(content.trim());

    // Enhance prompts with master style
    const masterStyle = parsed.masterStyle || 'cinematic, 4k, professional photography';
    const characterDesc = parsed.characterDesc || '';

    return parsed.scenes.map((scene: any) => ({
        sceneNumber: scene.sceneNumber,
        description: scene.description,
        imagePrompt: `${scene.imagePrompt}. ${masterStyle}${characterDesc ? `, ${characterDesc}` : ''}`,
        duration: durationMode === 'manual' ? manualDuration : Math.min(15, Math.max(5, scene.duration || 10)),
    }));
}

/**
 * Generate image using Fal.AI Wan v2.6 text-to-image
 */
export async function generateSceneImage(
    prompt: string,
    sceneNumber: number
): Promise<string> {
    if (!FALAI_API_KEY) {
        throw new Error('Fal.AI API key not found');
    }

    console.log(`🎨 Generating image for scene ${sceneNumber}...`);
    console.log(`Prompt: ${prompt.substring(0, 100)}...`);

    try {
        const response = await fetch(FALAI_TEXT_TO_IMAGE, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${FALAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                negative_prompt: "low resolution, error, worst quality, low quality, deformed, blurry, watermark, text",
                image_size: "portrait_16_9",  // 9:16 vertical for Shorts
                max_images: 1,
                enable_safety_checker: true,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Fal.AI error response:', errorText);
            throw new Error(`Fal.AI text-to-image error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Fal.AI response:', JSON.stringify(result).substring(0, 300));

        // Wan v2.6 returns images array
        const imageUrl = result.images?.[0]?.url;

        if (!imageUrl) {
            console.error('Full Fal.AI response:', result);
            throw new Error('No image URL in Fal.AI response');
        }

        console.log(`✅ Scene ${sceneNumber} image created: ${imageUrl.substring(0, 50)}...`);
        return imageUrl;
    } catch (error) {
        console.error(`❌ Fal.AI image generation failed for scene ${sceneNumber}:`, error);
        throw error;
    }
}

/**
 * Convert image to video using Fal.AI Wan v2.6 image-to-video/flash
 */
export async function convertImageToVideo(
    imageUrl: string,
    sceneNumber: number,
    duration: number = 10
): Promise<string> {
    if (!FALAI_API_KEY) {
        throw new Error('Fal.AI API key not found');
    }

    console.log(`🎬 Converting scene ${sceneNumber} to video (${duration}s)...`);

    try {
        // Map duration to valid values: 5, 10, or 15
        const validDuration = duration <= 7 ? "5" : duration <= 12 ? "10" : "15";

        const response = await fetch(FALAI_IMAGE_TO_VIDEO, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${FALAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: "Smooth, cinematic motion, natural movement, professional quality",
                image_url: imageUrl,
                resolution: "720p",  // 720p or 1080p
                duration: validDuration,  // "5", "10", or "15"
                negative_prompt: "low resolution, error, worst quality, low quality, defects, shaky, jumpy",
                enable_prompt_expansion: false,  // We already have good prompts
                enable_safety_checker: true,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Fal.AI image-to-video error:', errorText);
            throw new Error(`Fal.AI image-to-video error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Fal.AI video response:', JSON.stringify(result).substring(0, 200));

        const videoUrl = result.video?.url;

        if (!videoUrl) {
            console.error('Full Fal.AI video response:', result);
            throw new Error('No video URL in response');
        }

        console.log(`✅ Scene ${sceneNumber} video created: ${videoUrl.substring(0, 50)}...`);
        return videoUrl;
    } catch (error) {
        console.error(`❌ Fal.AI video conversion failed for scene ${sceneNumber}:`, error);
        throw error;
    }
}

/**
 * Process all scenes: generate images, convert to videos
 */
export async function processAllScenes(
    scenes: SceneScript[],
    onProgress?: (progress: ShortsProgress) => void
): Promise<GeneratedScene[]> {
    const generatedScenes: GeneratedScene[] = [];
    const total = scenes.length;

    // Step 1: Generate all images
    for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];

        if (onProgress) {
            onProgress({
                stage: 'images',
                current: i + 1,
                total,
                message: `Sahne ${i + 1}/${total} görseli oluşturuluyor...`
            });
        }

        try {
            const imageUrl = await generateSceneImage(scene.imagePrompt, scene.sceneNumber);

            generatedScenes.push({
                sceneNumber: scene.sceneNumber,
                description: scene.description,
                imageUrl,
                videoUrl: '', // Will be filled later
                duration: scene.duration,
            });
        } catch (error) {
            console.error(`❌ Scene ${i + 1} image failed:`, error);
            throw error;
        }
    }

    // Step 2: Convert all images to videos
    for (let i = 0; i < generatedScenes.length; i++) {
        const scene = generatedScenes[i];

        if (onProgress) {
            onProgress({
                stage: 'videos',
                current: i + 1,
                total,
                message: `Sahne ${i + 1}/${total} videoya dönüştürülüyor...`
            });
        }

        try {
            const videoUrl = await convertImageToVideo(
                scene.imageUrl,
                scene.sceneNumber,
                scene.duration
            );
            scene.videoUrl = videoUrl;
        } catch (error) {
            console.error(`❌ Scene ${i + 1} video failed:`, error);
            throw error;
        }
    }

    if (onProgress) {
        onProgress({
            stage: 'done',
            current: total,
            total,
            message: 'Tüm sahneler hazır!'
        });
    }

    return generatedScenes;
}

/**
 * Parse user's manual script into scenes
 */
export function parseManualScript(
    scriptText: string,
    sceneCount: number = 6,
    durationMode: 'auto' | 'manual' = 'auto',
    manualDuration: number = 10
): SceneScript[] {
    // Split by "Sahne" or numbers or double newlines
    const sections = scriptText
        .split(/(?:Sahne\s*\d+[:\.\-]?|\n\n+|\d+[:\.\-]\s*)/i)
        .map(s => s.trim())
        .filter(s => s.length > 20);

    const scenes: SceneScript[] = [];
    const targetCount = Math.min(sections.length, sceneCount);

    for (let i = 0; i < targetCount; i++) {
        const text = sections[i] || `Scene ${i + 1} abstract visual`;

        scenes.push({
            sceneNumber: i + 1,
            description: text,
            imagePrompt: `${text}. cinematic photography, 9:16 vertical format, professional, 4k, dramatic lighting, vibrant colors`,
            duration: durationMode === 'manual' ? manualDuration : Math.floor(Math.random() * 6) + 5, // Random 5-10s for auto
        });
    }

    // Fill remaining scenes if needed
    while (scenes.length < sceneCount) {
        scenes.push({
            sceneNumber: scenes.length + 1,
            description: 'Abstract visual',
            imagePrompt: 'Abstract cinematic background, professional, 4k, dramatic lighting, 9:16 vertical format',
            duration: durationMode === 'manual' ? manualDuration : 5,
        });
    }

    return scenes;
}
