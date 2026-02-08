// OpenAI API Service for Script Generation
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_BASE = 'https://api.openai.com/v1';

export type ModelTier = 'fast' | 'standard' | 'pro';

export interface ModelConfig {
    tier: ModelTier;
    name: string;
    displayName: string;
    description: string;
    maxTokens: number;
}

export const MODEL_CONFIGS: Record<ModelTier, ModelConfig> = {
    fast: {
        tier: 'fast',
        name: 'gpt-4o-mini',
        displayName: 'Fast (GPT-4o Mini)',
        description: 'Hızlı ve ekonomik - Basit videolar için ideal',
        maxTokens: 4096,
    },
    standard: {
        tier: 'standard',
        name: 'gpt-4o',
        displayName: 'Standard (GPT-4o)',
        description: 'Dengeli performans - Çoğu video için önerilir',
        maxTokens: 8192,
    },
    pro: {
        tier: 'pro',
        name: 'gpt-4-turbo',
        displayName: 'Pro (GPT-4 Turbo)',
        description: 'En gelişmiş - Profesyonel içerik için',
        maxTokens: 16384,
    },
};

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatCompletionOptions {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
}

export interface ChatCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface ScriptGenerationInput {
    userInput: string;
    targetDuration?: number;
    videoType: 'long' | 'short';
    modelTier: ModelTier;
}

export interface ScriptGenerationResult {
    optimizedConcept: string;
    finalScript: string;
    estimatedDuration: number;
    tokensUsed: number;
}

/**
 * Call OpenAI Chat Completions API
 */
async function chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    try {
        const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify(options),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        throw error;
    }
}

/**
 * Stage 1: Optimize user's story concept/outline
 */
async function optimizeConcept(
    userInput: string,
    videoType: 'long' | 'short',
    targetDuration: number,
    modelTier: ModelTier
): Promise<string> {
    const modelConfig = MODEL_CONFIGS[modelTier];

    const systemPrompt = videoType === 'long'
        ? `Sen bir YouTube video içerik uzmanısın. Kullanıcının verdiği video konusunu/kurgusunu analiz edip optimize edeceksin.

Görevin:
1. Kullanıcının girdiği konu/kurguyu detaylı incele
2. YouTube algoritması için optimize et
3. İzleyici ilgisini çekecek hook noktaları ekle
4. Engagement artırıcı öğeler ekle
5. Hedef süreye (${targetDuration} dakika) uygun yapı oluştur

ÇIKTI FORMATINDA SADECE OPTİMİZE EDİLMİŞ KURGUYU VER, AÇIKLAMA YAPMA!`
        : `Sen bir YouTube Shorts uzmanısın. Kullanıcının verdiği kısa video konusunu viral hale getirmek için optimize edeceksin.

Görevin:
1. Kısa ve dikkat çekici başlangıç hook'u ekle
2. Orta kısımda değer ver
3. Güçlü CTA ile bitir
4. 60 saniye içinde anlatılabilir yap

ÇIKTI FORMATINDA SADECE OPTİMİZE EDİLMİŞ KURGUYU VER, AÇIKLAMA YAPMA!`;

    const response = await chatCompletion({
        model: modelConfig.name,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userInput },
        ],
        temperature: 0.7,
        max_tokens: 1000,
    });

    return response.choices[0].message.content.trim();
}

/**
 * Stage 2: Generate voice-ready script from optimized concept
 */
async function generateVoiceScript(
    optimizedConcept: string,
    videoType: 'long' | 'short',
    targetDuration: number,
    modelTier: ModelTier
): Promise<string> {
    const modelConfig = MODEL_CONFIGS[modelTier];

    const wordsPerMinute = 150; // Average speaking rate
    const targetWords = Math.round((targetDuration * wordsPerMinute) * (videoType === 'short' ? 0.016 : 1)); // For shorts, duration is in seconds

    const systemPrompt = videoType === 'long'
        ? `Sen profesyonel bir senaryo yazarısın. Verilen kurgudan seslendirme için hazır script oluşturacaksın.

KURALLARI DİKKATLE UYGULA:
1. ${targetDuration} dakikalık video için ~${targetWords} kelime yaz (150 kelime/dakika)
2. Doğal konuşma dili kullan, okuyucunun rahatça seslendireceği şekilde yaz
3. İlk 10 saniyede güçlü hook ile başla
4. Her 2-3 dakikada engagement loop ekle ("Bu arada...", "Unutma ki...")
5. Sonda net CTA ekle (beğen, abone ol, yorum yap)

ÖNEMLİ FORMATLA İLGİLİ KURALLAR:
- ASLA markdown başlıkları kullanma (# veya ## GİBİ)
- ASLA emoji kullanma (🎬 ❤️ ✅ GİBİ HİÇBİR EMOJI OLMAMALI)
- ASLA özel karakterler kullanma (**, __, ++, --, GİBİ)
- SADECE düz metin olarak yaz
- Bölümler arasında boş satır bırakabilirsin
- Rakamları yazıyla yaz (5 yerine "beş")

Seslendirilecek tam metni ver, açıklama yapma!

ÇIKTI FORMATINDA SADECE SESLENDİRME İÇİN HAZIR METNİ VER!`
        : `Sen viral YouTube Shorts senaristi sin. Verilen kurgudan 60 saniyelik seslendirme scripti oluşturacaksın.

KURALLARI DİKKATLE UYGULA:
1. Maksimum 150 kelime (60 saniye için)
2. İlk 3 saniye dikkat çekici hook
3. Orta kısımda hızla değer sun
4. Son 5 saniyede güçlü CTA
5. Kısa ve net cümleler
6. Doğal konuşma dili

ÇIKTI FORMATINDA SADECE SESLENDİRME İÇİN HAZIR METNİ VER, AÇIKLAMA YAPMA!`;

    const response = await chatCompletion({
        model: modelConfig.name,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Kurgu:\n${optimizedConcept}` },
        ],
        temperature: 0.8,
        max_tokens: modelConfig.maxTokens,
    });

    return response.choices[0].message.content.trim();
}

/**
 * Two-stage script generation
 */
export async function generateScript(input: ScriptGenerationInput): Promise<ScriptGenerationResult> {
    const { userInput, targetDuration = 10, videoType, modelTier } = input;

    try {
        // Stage 1: Optimize concept
        const optimizedConcept = await optimizeConcept(
            userInput,
            videoType,
            targetDuration,
            modelTier
        );

        // Stage 2: Generate voice-ready script
        const finalScript = await generateVoiceScript(
            optimizedConcept,
            videoType,
            targetDuration,
            modelTier
        );

        // Estimate duration from word count
        const wordCount = finalScript.split(/\s+/).length;
        const estimatedDuration = Math.round(wordCount / 2.5); // ~150 words/min = 2.5 words/sec

        return {
            optimizedConcept,
            finalScript,
            estimatedDuration,
            tokensUsed: 0, // We could calculate this from responses if needed
        };
    } catch (error) {
        console.error('Error generating script:', error);
        throw error;
    }
}

/**
 * Stream script generation with progress updates
 */
export async function generateScriptWithProgress(
    input: ScriptGenerationInput,
    onProgress: (stage: 'concept' | 'script', content: string) => void
): Promise<ScriptGenerationResult> {
    const { userInput, targetDuration = 10, videoType, modelTier } = input;

    // Stage 1: Optimize concept
    onProgress('concept', 'Optimizing concept...');
    const optimizedConcept = await optimizeConcept(
        userInput,
        videoType,
        targetDuration,
        modelTier
    );
    onProgress('concept', optimizedConcept);

    // Stage 2: Generate voice-ready script
    onProgress('script', 'Generating narration text...');
    const finalScript = await generateVoiceScript(
        optimizedConcept,
        videoType,
        targetDuration,
        modelTier
    );
    onProgress('script', finalScript);

    // Estimate duration
    const wordCount = finalScript.split(/\s+/).length;
    const estimatedDuration = Math.round(wordCount / 2.5);

    return {
        optimizedConcept,
        finalScript,
        estimatedDuration,
        tokensUsed: 0,
    };
}
