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
        description: 'Fast and affordable - Ideal for simple videos',
        maxTokens: 4096,
    },
    standard: {
        tier: 'standard',
        name: 'gpt-4o',
        displayName: 'Standard (GPT-4o)',
        description: 'Balanced performance - Recommended for most videos',
        maxTokens: 8192,
    },
    pro: {
        tier: 'pro',
        name: 'gpt-4-turbo',
        displayName: 'Pro (GPT-4 Turbo)',
        description: 'Most advanced - For professional content',
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
 * Detect language of input text (English or Turkish)
 */
function detectLanguage(text: string): 'en' | 'tr' {
    const lowerText = text.toLowerCase();

    // 1. Check for distinct Turkish characters (Strongest signal)
    if (/[ğığöşüç]/.test(lowerText)) {
        console.log(`Language detection: 'tr' (Turkish chars found) - Input: "${text.substring(0, 50)}..."`);
        return 'tr';
    }

    // 2. Score based on common words
    const trCommonWords = ['bir', 'ile', 'için', 've', 'veya', 'ama', 'bu', 'şu', 'o', 'ne', 'nasıl', 'neden', 'yapay', 'zeka', 'hakkında', 'olarak', 'gibi', 'çok', 'daha', 'en', 'kadar'];
    const enCommonWords = ['the', 'and', 'to', 'of', 'in', 'is', 'you', 'that', 'it', 'he', 'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'at', 'be', 'this', 'have', 'from', 'or', 'one', 'had', 'by', 'word', 'but', 'not', 'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'use', 'an', 'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will', 'way', 'about', 'many', 'then', 'them', 'make', 'write', 'money', 'ai'];

    const words = lowerText.split(/[\s,.!?;:"']+/);
    let trScore = 0;
    let enScore = 0;

    for (const word of words) {
        if (trCommonWords.includes(word)) trScore++;
        if (enCommonWords.includes(word)) enScore++;
    }

    console.log(`Language detection scores - EN: ${enScore}, TR: ${trScore} - Input: "${text.substring(0, 50)}..."`);

    // Only return 'tr' if Turkish score is significantly higher or if no English words found but some Turkish words are
    if (trScore > enScore) {
        return 'tr';
    }

    return 'en'; // Default to English
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

    // Detect input language
    const language = detectLanguage(userInput);

    const systemPromptLong = language === 'en'
        ? `You are a YouTube content expert. You will analyze and optimize the user's video topic/concept.

CRITICAL: You MUST respond ENTIRELY in English. Do NOT use any Turkish words or phrases.

Your tasks:
1. Analyze the user's input topic/concept in detail
2. Optimize for YouTube algorithm
3. Add hook points to capture viewer interest
4. Add engagement-boosting elements
5. Create structure suitable for target duration (${targetDuration} minutes)

OUTPUT ONLY THE OPTIMIZED CONCEPT IN ENGLISH, NO EXPLANATIONS!`
        : `Sen bir YouTube video içerik uzmanısın. Kullanıcının verdiği video konusunu/kurgusunu analiz edip optimize edeceksin.

Görevin:
1. Kullanıcının girdiği konu/kurguyu detaylı incele
2. YouTube algoritması için optimize et
3. İzleyici ilgisini çekecek hook noktaları ekle
4. Engagement artırıcı öğeler ekle
5. Hedef süreye (${targetDuration} dakika) uygun yapı oluştur

ÇIKTI FORMATINDA SADECE OPTİMİZE EDİLMİŞ KURGUYU VER, AÇIKLAMA YAP MA!`;

    const systemPromptShort = language === 'en'
        ? `You are a YouTube Shorts expert. You will optimize the user's short video topic to make it viral.

CRITICAL: You MUST respond ENTIRELY in English. Do NOT use any Turkish words or phrases.

Your tasks:
1. Add short and attention-grabbing hook
2. Provide value in the middle section
3. End with strong CTA
4. Make it tellable within 60 seconds

OUTPUT ONLY THE OPTIMIZED CONCEPT IN ENGLISH, NO EXPLANATIONS!`
        : `Sen bir YouTube Shorts uzmanısın. Kullanıcının verdiği kısa video konusunu viral hale getirmek için optimize edeceksin.

Görevin:
1. Kısa ve dikkat çekici başlangıç hook'u ekle
2. Orta kısımda değer ver
3. Güçlü CTA ile bitir
4. 60 saniye içinde anlatılabilir yap

ÇIKTI FORMATINDA SADECE OPTİMİZE EDİLMİŞ KURGUYU VER, AÇIKLAMA YAPMA!`;

    const systemPrompt = videoType === 'long' ? systemPromptLong : systemPromptShort;

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

    // Detect concept language to match script language
    const language = detectLanguage(optimizedConcept);

    const systemPromptLong = language === 'en'
        ? `You are a professional scriptwriter. You will create a voice-ready script from the given concept.

FOLLOW THESE RULES CAREFULLY:
1. Write ~${targetWords} words for a ${targetDuration}-minute video (150 words/minute)
2. Use natural conversational language that the narrator can easily read
3. Start with a strong hook in the first 10 seconds
4. Add engagement loops every 2-3 minutes ("By the way...", "Remember that...")
5. End with a clear CTA (like, subscribe, comment)

CRITICAL FORMATTING RULES:
- NEVER use markdown headers (NO # or ##)
- NEVER use emojis (NO 🎬 ❤️ ✅ OR ANY EMOJIS)
- NEVER use special characters (NO **, __, ++, --)
- ONLY write plain text
- You can leave blank lines between sections
- Write numbers as words (use "five" instead of 5)

Provide the complete narration text, no explanations!

OUTPUT ONLY THE VOICE-READY SCRIPT!`
        : `Sen profesyonel bir senaryo yazarısın. Verilen kurgudan seslendirme için hazır script oluşturacaksın.

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

ÇIKTI FORMATINDA SADECE SESLENDİRME İÇİN HAZIR METNİ VER!`;

    const systemPromptShort = language === 'en'
        ? `You are a viral YouTube Shorts scriptwriter. You will create a 60-second voiceover script from the given concept.

FOLLOW THESE RULES CAREFULLY:
1. Maximum 150 words (for 60 seconds)
2. Attention-grabbing hook in first 3 seconds
3. Quickly provide value in the middle
4. Strong CTA in last 5 seconds
5. Short and clear sentences
6. Natural conversational language

OUTPUT ONLY THE VOICE-READY SCRIPT, NO EXPLANATIONS!`
        : `Sen viral YouTube Shorts senaristi sin. Verilen kurgudan 60 saniyelik seslendirme scripti oluşturacaksın.

KURALLARI DİKKATLE UYGULA:
1. Maksimum 150 kelime (60 saniye için)
2. İlk 3 saniye dikkat çekici hook
3. Orta kısımda hızla değer sun
4. Son 5 saniyede güçlü CTA
5. Kısa ve net cümleler
6. Doğal konuşma dili

ÇIKTI FORMATINDA SADECE SESLENDİRME İÇİN HAZIR METNİ VER, AÇIKLAMA YAPMA!`;

    const systemPrompt = videoType === 'long' ? systemPromptLong : systemPromptShort;

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
