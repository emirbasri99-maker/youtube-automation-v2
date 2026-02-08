/**
 * Apify YouTube Video Summarizer API Service
 * 
 * This service uses Apify's YouTube Video Summarizer to generate concise summaries
 * of YouTube videos by providing a video URL.
 * 
 * Features:
 * - Supports regular YouTube videos and Shorts
 * - Maximum video length: 60 minutes
 * - Returns text summary of video content
 */

const APIFY_API_KEY = import.meta.env.VITE_APIFY_API_KEY;
// Use direct API instead of proxy (proxy causing connection issues)
const APIFY_API_BASE = 'https://api.apify.com/v2';
const ACTOR_ID = 'vulnv/youtube-video-summarizer';

export interface ApifyYouTubeSummarizerInput {
    start_urls: string[];
}

export interface ApifyYouTubeSummarizerOutput {
    videoUrl: string;
    title?: string;
    summary: string;
    transcript?: string;
    duration?: number;
}

export interface ApifyRunResponse {
    data: {
        id: string;
        actId: string;
        userId: string;
        actorTaskId: string | null;
        startedAt: string;
        finishedAt: string | null;
        status: string;
        statusMessage: string | null;
        isStatusMessageTerminal: boolean;
        meta: {
            origin: string;
            clientIp: string;
            userAgent: string;
        };
        stats: any;
        options: any;
        buildId: string;
        buildNumber: string;
        exitCode: number | null;
        defaultKeyValueStoreId: string;
        defaultDatasetId: string;
        defaultRequestQueueId: string;
        containerUrl: string;
    };
}

/**
 * Start an Apify actor run
 */
async function startActorRun(input: ApifyYouTubeSummarizerInput): Promise<string> {
    try {
        console.log('🚀 Starting Apify actor run with input:', input);
        console.log('API Key:', APIFY_API_KEY ? `${APIFY_API_KEY.substring(0, 15)}...` : 'NOT SET');
        console.log('Actor ID:', ACTOR_ID);

        const url = `${APIFY_API_BASE}/acts/${ACTOR_ID}/runs?token=${APIFY_API_KEY}`;
        console.log('Request URL:', url.replace(APIFY_API_KEY || '', 'REDACTED'));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Apify API error response:', errorText);

            // Provide helpful error messages
            if (response.status === 401 || response.status === 403) {
                throw new Error(`API anahtarı geçersiz. Lütfen .env dosyasında VITE_APIFY_API_KEY kontrol edin.`);
            } else if (response.status === 404) {
                throw new Error(`Apify actor bulunamadı. Actor ID kontrol edin.`);
            } else {
                throw new Error(`Apify API error: ${response.status} - ${errorText}`);
            }
        }

        const result: ApifyRunResponse = await response.json();
        console.log('✅ Actor run started successfully. Run ID:', result.data.id);
        return result.data.id;
    } catch (error) {
        console.error('❌ Error starting Apify actor run:', error);

        // Detect CORS errors
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            throw new Error('Apify API bağlantı hatası. CORS veya network sorunu olabilir. API key kontroledin.');
        }

        throw error;
    }
}

/**
 * Get actor run status
 */
async function getActorRunStatus(runId: string): Promise<string> {
    try {
        const response = await fetch(
            `${APIFY_API_BASE}/actor-runs/${runId}?token=${APIFY_API_KEY}`
        );

        if (!response.ok) {
            throw new Error(`Apify API error: ${response.status}`);
        }

        const result: ApifyRunResponse = await response.json();
        return result.data.status; // RUNNING, SUCCEEDED, FAILED, etc.
    } catch (error) {
        console.error('Error getting actor run status:', error);
        throw error;
    }
}

/**
 * Get actor run dataset items (results)
 */
async function getActorRunResults(runId: string): Promise<any[]> {
    try {
        const response = await fetch(
            `${APIFY_API_BASE}/actor-runs/${runId}/dataset/items?token=${APIFY_API_KEY}`
        );

        if (!response.ok) {
            throw new Error(`Apify API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting actor run results:', error);
        throw error;
    }
}

/**
 * Wait for actor run to complete
 */
async function waitForRun(
    runId: string,
    maxWaitTime = 300000, // 5 minutes
    pollInterval = 3000 // 3 seconds
): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
        const status = await getActorRunStatus(runId);

        if (status === 'SUCCEEDED') {
            return;
        } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
            throw new Error(`Actor run ${status.toLowerCase()}`);
        }

        // Still running, wait and check again
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Actor run timed out');
}

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
        /youtube\.com\/embed\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

/**
 * Validate YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
    return extractYouTubeVideoId(url) !== null;
}

/**
 * Summarize YouTube video(s)
 * Main function to get video summaries
 */
export async function summarizeYouTubeVideos(
    videoUrls: string[],
    onProgress?: (status: string) => void
): Promise<ApifyYouTubeSummarizerOutput[]> {
    try {
        // Validate URLs
        const validUrls = videoUrls.filter(url => isValidYouTubeUrl(url));
        if (validUrls.length === 0) {
            throw new Error('No valid YouTube URLs provided');
        }

        if (onProgress) onProgress('Starting video summarization...');

        // Start actor run
        const runId = await startActorRun({ start_urls: validUrls });

        if (onProgress) onProgress('Processing video...');

        // Wait for completion
        await waitForRun(runId);

        if (onProgress) onProgress('Retrieving results...');

        // Get results
        const results = await getActorRunResults(runId);

        if (!results || results.length === 0) {
            throw new Error('No results returned from Apify');
        }

        if (onProgress) onProgress('Summary complete!');

        // Map results to output format
        return results.map(result => ({
            videoUrl: result.url || result.videoUrl || validUrls[0],
            title: result.title,
            summary: result.summary || result.text || 'No summary available',
            transcript: result.transcript,
            duration: result.duration,
        }));
    } catch (error) {
        console.error('Error summarizing YouTube videos:', error);
        throw error;
    }
}

/**
 * Summarize single YouTube video
 * 
 * TEMPORARY: Using mock data due to CORS restrictions.
 * Browser cannot directly call Apify API - needs backend proxy.
 */
export async function summarizeSingleYouTubeVideo(
    videoUrl: string,
    onProgress?: (status: string) => void
): Promise<ApifyYouTubeSummarizerOutput> {
    // Real API via Vite proxy (CORS issue resolved)
    const USE_MOCK = false;

    if (USE_MOCK) {
        console.log('⚠️ Using MOCK data (CORS workaround - backend proxy needed)');

        if (onProgress) onProgress('Başlatılıyor...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (onProgress) onProgress('Video analiz ediliyor...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (onProgress) onProgress('Özet oluşturuluyor...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (onProgress) onProgress('Tamamlandı!');

        // Extract video ID for title
        const videoId = extractYouTubeVideoId(videoUrl);

        return {
            videoUrl,
            title: 'Yapay Zeka ile Para Kazanma Yöntemleri 2024',
            summary: `Bu videoda yapay zeka araçlarını kullanarak para kazanma yöntemleri anlatılıyor.

**Ana Konular:**

1. **ChatGPT ve AI Yazılım Araçları**
   - Freelance içerik yazarlığı
   - Blog yazıları ve makaleler
   - Sosyal medya içerikleri

2. **AI Görsel Üretimi** 
   - Midjourney ile logo tasarımı
   - DALL-E ile ürün görselleri
   - NFT ve dijital sanat

3. **YouTube Otomasyonu**
   - AI ile script yazımı
   - Text-to-speech seslendirme
   - Otomatik video montajı

4. **Diğer Yöntemler**
   - AI chatbot geliştirme
   - Kod üretimi ve yazılım
   - Veri analizi hizmetleri

Video, başlangıç seviyesindeki kullanıcılar için pratik örnekler ve kazanç tahminleri sunuyor.`,
            transcript: `[00:00] Merhaba arkadaşlar, bugün çok önemli bir konuyu konuşacağız.

[00:15] Yapay zeka teknolojileri 2024 yılında inanılmaz bir hızla gelişiyor.

[00:30] Peki bu teknolojileri kullanarak nasıl para kazanabiliriz?

[00:45] İlk yöntem: ChatGPT ve benzeri AI yazılım araçları.

[01:05] Bu araçlarla freelance iş yapabilir, blog yazıları oluşturabilirsiniz.

[01:25] İkinci yöntem: AI görsel üretimi. Midjourney ve DALL-E çok popüler.

[01:50] Logo tasarımından ürün görsellerine kadar her şeyi yapabilirsiniz.

[02:10] Üçüncü ve en karlı yöntem: YouTube otomasyonu!

[02:30] AI ile script yazıp, seslendirme yapıp, video oluşturabilirsiniz.

[02:50] Minimal çabayla profesyonel içerikler üretebilirsiniz.

[03:10] Videoyu beğenmeyi ve abone olmayı unutmayın!`,
            duration: 190, // ~3 dakika
        };
    }

    // Real API call (currently blocked by CORS)
    const results = await summarizeYouTubeVideos([videoUrl], onProgress);
    return results[0];
}
