import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';

const pollyClient = new PollyClient({
    region: process.env.AWS_REGION || 'eu-west-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const MAX_CHUNK_SIZE = 2800;

async function synthesizeChunk(text, voiceId, engine) {
    const command = new SynthesizeSpeechCommand({
        Text: text,
        VoiceId: voiceId,
        OutputFormat: 'mp3',
        Engine: engine,
    });
    const response = await pollyClient.send(command);
    const chunks = [];
    for await (const chunk of response.AudioStream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
            },
            body: '',
        };
    }

    try {
        const { text, voiceId = 'Ruth', engine = 'neural' } = JSON.parse(event.body || '{}');

        if (!text || !text.trim()) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Text cannot be empty' }),
            };
        }

        console.log(`🎤 Synthesizing: voice=${voiceId}, engine=${engine}, length=${text.length}`);

        let audioBuffer;

        if (text.length <= MAX_CHUNK_SIZE) {
            // Short text — single request
            audioBuffer = await synthesizeChunk(text, voiceId, engine);
        } else {
            // Long text — split into sentence chunks
            const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [text];
            let currentChunk = '';
            const textChunks = [];

            for (const sentence of sentences) {
                if ((currentChunk + sentence).length < MAX_CHUNK_SIZE) {
                    currentChunk += sentence;
                } else {
                    if (currentChunk) textChunks.push(currentChunk.trim());
                    currentChunk = sentence;
                    while (currentChunk.length >= MAX_CHUNK_SIZE) {
                        textChunks.push(currentChunk.substring(0, MAX_CHUNK_SIZE));
                        currentChunk = currentChunk.substring(MAX_CHUNK_SIZE);
                    }
                }
            }
            if (currentChunk.trim()) textChunks.push(currentChunk.trim());

            console.log(`🧩 Split into ${textChunks.length} chunks`);
            const buffers = await Promise.all(
                textChunks.map(chunk => synthesizeChunk(chunk, voiceId, engine))
            );
            audioBuffer = Buffer.concat(buffers);
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Access-Control-Allow-Origin': '*',
                'Content-Length': String(audioBuffer.length),
            },
            body: audioBuffer.toString('base64'),
            isBase64Encoded: true,
        };
    } catch (error) {
        console.error('Polly synthesis error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: error.message }),
        };
    }
};
