// YouTube Trends Analysis Service
// Uses Apify YouTube Scraper (via proxy) + OpenAI for viral content suggestions

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export interface YouTubeVideo {
    id: string;
    title: string;
    url: string;
    thumbnail: string;
    views: number;
    channelName: string;
    channelUrl: string;
    publishedAt: string;
    tags: string[];
    description: string;
}

export interface AISuggestions {
    insights: string;
    titles: string[];
    hooks: string[];
    tags: string[];
}

export interface TrendAnalysisResult {
    videos: YouTubeVideo[];
    aiSuggestions: AISuggestions;
}

/**
 * Search YouTube for trending videos using Apify (via proxy)
 */
import { startActorRun, waitForRun, getActorRunResults } from './apify';

/**
 * Search YouTube for trending videos using Apify (via proxy)
 */
export async function searchYouTubeTrends(
    keyword: string,
    onProgress?: (status: string) => void
): Promise<YouTubeVideo[]> {
    if (onProgress) onProgress('YouTube trendleri taranıyor...');

    try {
        // Use Streamers YouTube Scraper (verified working actor)
        const ACTOR_ID = 'streamers/youtube-scraper';

        // Correct input format for streamers/youtube-scraper
        const input = {
            searchTerm: keyword, // Use searchTerm, not searchKeywords
            maxVideos: 10,
            type: 'video', // video, shorts, or stream
        };

        const runId = await startActorRun(input, ACTOR_ID);

        if (onProgress) onProgress('Sonuçlar toplanıyor...');

        await waitForRun(runId);

        if (onProgress) onProgress('Veriler alınıyor...');

        const results = await getActorRunResults(runId);

        if (!results || results.length === 0) {
            throw new Error('No videos found');
        }

        if (onProgress) onProgress('Sonuçlar işleniyor...');

        // Transform to our format
        const videos: YouTubeVideo[] = results.map((item: any) => ({
            id: item.videoCode || item.id || '',
            title: item.title || 'Untitled',
            url: item.videoUrl || item.url || `https://youtube.com/watch?v=${item.id}`,
            thumbnail: item.thumbnailUrl || `https://img.youtube.com/vi/${item.videoCode || item.id}/hqdefault.jpg`,
            views: item.viewCount || 0,
            channelName: item.channelName || 'Unknown',
            channelUrl: item.channelUrl || '',
            publishedAt: item.date || new Date().toISOString(),
            tags: item.tags || [],
            description: item.description || '',
        })).filter(v => v.id && v.title !== 'Untitled'); // Filter out bad results

        return videos;

    } catch (error) {
        console.warn('⚠️ Apify error, using mock data:', error);
        if (onProgress) onProgress('Demo modu - örnek veriler yükleniyor...');
        return generateMockVideos(keyword);
    }
}

/**
 * Generate mock videos for testing (proxy fallback)
 */
function generateMockVideos(keyword: string): YouTubeVideo[] {
    const mockTitles = [
        `${keyword} - Complete Guide 2024`,
        `How to Master ${keyword} in 10 Minutes`,
        `${keyword} Tutorial for Beginners`,
        `Top 5 ${keyword} Tips You Need to Know`,
        `${keyword} Explained Simply`,
        `Advanced ${keyword} Techniques`,
        `${keyword} vs Alternatives - Which is Better?`,
        `${keyword} Success Stories`,
        `Common ${keyword} Mistakes to Avoid`,
        `${keyword} - Everything You Need to Know`,
    ];

    return mockTitles.map((title, index) => ({
        id: `mock-${index}`,
        title,
        url: `https://youtube.com/watch?v=mock-${index}`,
        thumbnail: '', // No thumbnail for mock data - will show placeholder
        views: Math.floor(Math.random() * 5000000) + 100000,
        channelName: ['TechGuru', 'LearnHub', 'ProTips', 'MasterClass', 'SkillBoost'][index % 5],
        channelUrl: `https://youtube.com/@channel${index}`,
        publishedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        tags: [keyword, 'tutorial', 'guide', '2024'],
        description: `Learn everything about ${keyword} in this comprehensive tutorial.`,
    }));
}


/**
 * Analyze trending videos with AI to generate viral content suggestions
 */
export async function analyzeWithAI(
    videos: YouTubeVideo[],
    onProgress?: (status: string) => void
): Promise<AISuggestions> {
    if (onProgress) onProgress('Yapay zeka analizi yapılıyor...');

    // Prepare video summary for AI
    const videoSummary = videos
        .map(
            (v, i) =>
                `${i + 1}. "${v.title}" - ${formatViews(v.views)} görüntülenme, Kanal: ${v.channelName}, Etiketler: ${v.tags.slice(0, 5).join(', ')}`
        )
        .join('\n');

    const prompt = `Bu ${videos.length} popüler YouTube videosunu analiz et ve viral içerik stratejisi öner:

${videoSummary}

Görevlerin:
1. İzleyicilerin en çok ilgi gösterdiği konuları ve trendleri belirle
2. Bu verilere dayanarak 3 adet viral olabilecek, dikkat çekici video başlığı öner
3. Her başlık için etkileyici bir "hook" (kanca) cümlesi yaz
4. İçerik için önerilen etiketler listesi ver

SADECE JSON formatında yanıt ver, başka metin ekleme:
{
  "insights": "Detaylı trend özeti (2-3 cümle)",
  "titles": ["Başlık 1", "Başlık 2", "Başlık 3"],
  "hooks": ["Hook 1", "Hook 2", "Hook 3"],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

    try {
        // Use OpenAI API (assuming it's configured)
        const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

        if (!OPENAI_API_KEY) {
            // Fallback to mock data if no API key
            return generateMockSuggestions(videos);
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4-turbo-preview',
                messages: [
                    {
                        role: 'system',
                        content: 'Sen bir viral içerik stratejisti ve YouTube trend uzmanısın. JSON formatında yanıt ver.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.8,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            console.error('OpenAI API error:', response.statusText);
            return generateMockSuggestions(videos);
        }

        const data = await response.json();
        const aiResponse = JSON.parse(data.choices[0].message.content);

        return aiResponse as AISuggestions;
    } catch (error) {
        console.error('AI analysis error:', error);
        return generateMockSuggestions(videos);
    }
}

/**
 * Generate mock suggestions when AI is not available
 */
function generateMockSuggestions(videos: YouTubeVideo[]): AISuggestions {
    // Extract keywords from video titles since tags aren't available
    const topKeywords = extractKeywordsFromTitles(videos);
    const avgViews = videos.reduce((sum, v) => sum + v.views, 0) / videos.length;

    return {
        insights: `Analiz edilen videolarda ${formatViews(avgViews)} ortalama görüntülenme görüyoruz. En popüler konular: ${topKeywords.slice(0, 3).join(', ')}. İzleyiciler pratik bilgi ve eğlenceli içeriklere yönelmiş durumda.`,
        titles: [
            `${topKeywords[0] || 'İlginç'} Hakkında Bilmediğiniz 5 Şey! 🔥`,
            `${topKeywords[1] || 'Viral'}: Başarılı Olmanın Sırrı! 💡`,
            `${topKeywords[2] || 'Trend'} ile İlgili Herkesin Konuştuğu Gerçek!`,
        ],
        hooks: [
            'Bu videoyu izledikten sonra hiçbir şey eskisi gibi olmayacak...',
            'Uzmanlar bunu yıllarca saklamış! İşte gerçek...',
            'Son 24 saatte viral olan bu yöntemi mutlaka deneyin!',
        ],
        tags: topKeywords.slice(0, 8),
    };
}

/**
 * Extract keywords from video titles
 */
function extractKeywordsFromTitles(videos: YouTubeVideo[]): string[] {
    const wordCount: Record<string, number> = {};
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'];

    videos.forEach(video => {
        const words = video.title.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopWords.includes(word));

        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });
    });

    return Object.entries(wordCount)
        .sort(([, a], [, b]) => b - a)
        .map(([word]) => word)
        .slice(0, 10);
}


/**
 * Format view count for display
 */
function formatViews(views: number): string {
    if (views >= 1000000) {
        return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
        return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
}

/**
 * Main function to perform complete trend analysis
 */
export async function performTrendAnalysis(
    keyword: string,
    onProgress?: (status: string) => void
): Promise<TrendAnalysisResult> {
    // Step 1: Scrape YouTube
    const videos = await searchYouTubeTrends(keyword, onProgress);

    if (videos.length === 0) {
        throw new Error('No videos found for this keyword');
    }

    // Step 2: AI Analysis
    const aiSuggestions = await analyzeWithAI(videos, onProgress);

    if (onProgress) onProgress('Tamamlandı!');

    return {
        videos,
        aiSuggestions,
    };
}
