/**
 * Netlify Function: polly-synthesize
 * Uses OpenAI TTS API to synthesize speech (replaces AWS Polly)
 * POST /api/polly/synthesize
 * Body: { text, voiceId, engine }
 */
export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' },
            body: '',
        };
    }

    try {
        const { text, voiceId = 'alloy' } = JSON.parse(event.body || '{}');

        if (!text || !text.trim()) {
            return { statusCode: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'Text cannot be empty' }) };
        }

        const apiKey = process.env.VITE_OPENAI_API_KEY;
        if (!apiKey) {
            return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'OpenAI API key not configured' }) };
        }

        // Map AWS Polly voice IDs to OpenAI voices
        const voiceMap = {
            'Ruth': 'nova', 'Joanna': 'nova', 'Kendra': 'nova', 'Kimberly': 'nova', 'Salli': 'shimmer',
            'Amy': 'shimmer', 'Emma': 'shimmer', 'Ivy': 'alloy',
            'Matthew': 'onyx', 'Justin': 'echo', 'Joey': 'fable', 'Stephen': 'echo',
            'Brian': 'onyx', 'Arthur': 'fable',
            'alloy': 'alloy', 'echo': 'echo', 'fable': 'fable', 'onyx': 'onyx', 'nova': 'nova', 'shimmer': 'shimmer',
        };
        const openaiVoice = voiceMap[voiceId] || 'nova';

        // OpenAI TTS has 4096 char limit per request — split if needed
        const MAX_CHUNK = 4000;
        const chunks = [];
        let remaining = text.trim();

        while (remaining.length > 0) {
            if (remaining.length <= MAX_CHUNK) {
                chunks.push(remaining);
                break;
            }
            // Find last sentence boundary before MAX_CHUNK
            const slice = remaining.substring(0, MAX_CHUNK);
            const lastPeriod = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
            const cutAt = lastPeriod > 0 ? lastPeriod + 2 : MAX_CHUNK;
            chunks.push(remaining.substring(0, cutAt));
            remaining = remaining.substring(cutAt);
        }

        const audioBuffers = [];
        for (const chunk of chunks) {
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'tts-1', input: chunk, voice: openaiVoice }),
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenAI TTS error: ${response.status} - ${errText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            audioBuffers.push(Buffer.from(arrayBuffer));
        }

        const finalBuffer = Buffer.concat(audioBuffers);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'audio/mpeg', 'Access-Control-Allow-Origin': '*', 'Content-Length': String(finalBuffer.length) },
            body: finalBuffer.toString('base64'),
            isBase64Encoded: true,
        };
    } catch (error) {
        console.error('TTS synthesis error:', error);
        return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: error.message }) };
    }
};
