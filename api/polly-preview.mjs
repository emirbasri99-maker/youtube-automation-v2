/**
 * Netlify Function: polly-preview
 * Uses OpenAI TTS to preview a voice
 * POST /api/polly/preview
 * Body: { voiceId }
 */
export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, body: '' };
    }

    try {
        const { voiceId = 'nova' } = JSON.parse(event.body || '{}');
        const apiKey = process.env.VITE_OPENAI_API_KEY;

        if (!apiKey) {
            return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'OpenAI API key not configured' }) };
        }

        const voiceMap = {
            'Ruth': 'nova', 'Joanna': 'nova', 'Kendra': 'nova', 'Kimberly': 'nova', 'Salli': 'shimmer',
            'Amy': 'shimmer', 'Emma': 'shimmer',
            'Matthew': 'onyx', 'Justin': 'echo', 'Joey': 'fable', 'Brian': 'onyx',
            'alloy': 'alloy', 'echo': 'echo', 'fable': 'fable', 'onyx': 'onyx', 'nova': 'nova', 'shimmer': 'shimmer',
        };
        const openaiVoice = voiceMap[voiceId] || voiceId;

        const previewText = `Hello! I'm ${openaiVoice}, your AI voiceover assistant. I'm ready to narrate your video.`;

        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'tts-1', input: previewText, voice: openaiVoice }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenAI TTS error: ${response.status} - ${errText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'audio/mpeg', 'Access-Control-Allow-Origin': '*', 'Content-Length': String(audioBuffer.length) },
            body: audioBuffer.toString('base64'),
            isBase64Encoded: true,
        };
    } catch (error) {
        console.error('Preview error:', error);
        return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: error.message }) };
    }
};
