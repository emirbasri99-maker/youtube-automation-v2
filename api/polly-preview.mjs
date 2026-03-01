import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';

const pollyClient = new PollyClient({
    region: process.env.AWS_REGION || 'eu-west-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, body: '' };
    }

    try {
        const { voiceId = 'Ruth' } = JSON.parse(event.body || '{}');
        const previewText = `Hi, my name is ${voiceId}. I'm an AI voice powered by AWS Polly Neural engine.`;

        const command = new SynthesizeSpeechCommand({
            Text: previewText,
            VoiceId: voiceId,
            OutputFormat: 'mp3',
            Engine: 'neural',
        });

        const response = await pollyClient.send(command);

        const chunks = [];
        for await (const chunk of response.AudioStream) {
            chunks.push(chunk);
        }
        const audioBuffer = Buffer.concat(chunks);

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
        console.error('Polly preview error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: error.message }),
        };
    }
};
