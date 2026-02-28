/**
 * AWS Polly Neural TTS Backend Server
 * Professional text-to-speech using AWS Polly Neural voices
 * 
 * Endpoints:
 *   GET  /api/polly/voices    - List all Neural voices grouped by language
 *   POST /api/polly/synthesize - Generate audio from text
 *   POST /api/polly/preview   - Generate short voice preview
 */

import { config } from 'dotenv';
import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PollyClient, DescribeVoicesCommand, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = 5051;

// Initialize Polly client
const pollyClient = new PollyClient({
    region: process.env.AWS_REGION || 'eu-north-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Ensure temp audio directory exists
const TEMP_AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio', 'temp');
await fs.mkdir(TEMP_AUDIO_DIR, { recursive: true });

// Cache voices
let voicesCache = null;

/**
 * GET /api/polly/voices
 * Returns all Neural voices grouped by language
 */
app.get('/api/polly/voices', async (req, res) => {
    try {
        if (!voicesCache) {
            console.log('🔄 Fetching voices from AWS Polly...');

            const command = new DescribeVoicesCommand({
                Engine: 'neural', // Only Neural voices
            });

            const response = await pollyClient.send(command);
            const allVoices = response.Voices || [];

            // Group by language
            const grouped = {};
            for (const v of allVoices) {
                const locale = v.LanguageCode;
                const langName = v.LanguageName;

                if (!grouped[locale]) {
                    grouped[locale] = {
                        locale,
                        language: langName || locale,
                        voices: [],
                    };
                }

                grouped[locale].voices.push({
                    id: v.Id,
                    name: v.Name,
                    gender: v.Gender,
                    locale: v.LanguageCode,
                    engine: 'neural',
                });
            }

            // Sort by locale, prioritize en-US and tr-TR
            let result = Object.values(grouped).sort((a, b) =>
                a.locale.localeCompare(b.locale)
            );

            // Move en-US to top, tr-TR to second
            const enUS = result.find(l => l.locale === 'en-US');
            const trTR = result.find(l => l.locale === 'tr-TR');
            result = result.filter(l => l.locale !== 'en-US' && l.locale !== 'tr-TR');

            if (trTR) result.unshift(trTR);
            if (enUS) result.unshift(enUS);

            voicesCache = result;
            console.log(`✅ Cached ${allVoices.length} Neural voices in ${result.length} languages`);
        }

        res.json({ voices: voicesCache });
    } catch (error) {
        console.error('❌ Error listing voices:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/polly/synthesize
 * Body: { text, voiceId, engine }
 * Returns: audio/mpeg blob
 */
app.post('/api/polly/synthesize', async (req, res) => {
    const { text, voiceId = 'Ruth', engine = 'neural' } = req.body;

    if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Text cannot be empty' });
    }

    console.log(`🎤 Synthesizing: voice=${voiceId}, engine=${engine}, text=${text.length} chars`);

    try {
        // AWS Polly limit is ~3000 chars. We'll use 2800 to be safe.
        const MAX_CHUNK_SIZE = 2800;

        let localAudioChunks = [];

        if (text.length <= MAX_CHUNK_SIZE) {
            // Short text - single request
            const command = new SynthesizeSpeechCommand({
                Text: text,
                VoiceId: voiceId,
                OutputFormat: 'mp3',
                Engine: engine,
            });
            const response = await pollyClient.send(command);

            for await (const chunk of response.AudioStream) {
                localAudioChunks.push(chunk);
            }
        } else {
            // Long text - split into chunks at sentence boundaries
            console.log(`📜 Text too long (${text.length} chars), splitting into chunks...`);

            // Split by sentence endings (. ! ?), keeping the delimiters
            // Check for . ! ? followed by space or end of string
            const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [text];

            let currentChunk = '';
            const textChunks = [];

            for (const sentence of sentences) {
                if ((currentChunk + sentence).length < MAX_CHUNK_SIZE) {
                    currentChunk += sentence;
                } else {
                    if (currentChunk) textChunks.push(currentChunk);
                    currentChunk = sentence;

                    // If a single sentence is too long (unlikely but possible), split it blindly
                    while (currentChunk.length >= MAX_CHUNK_SIZE) {
                        textChunks.push(currentChunk.substring(0, MAX_CHUNK_SIZE));
                        currentChunk = currentChunk.substring(MAX_CHUNK_SIZE);
                    }
                }
            }
            if (currentChunk) textChunks.push(currentChunk);

            console.log(`🧩 Split into ${textChunks.length} chunks. Processing sequentially...`);

            // Synthesize each chunk
            for (let i = 0; i < textChunks.length; i++) {
                const chunkText = textChunks[i].trim();
                if (!chunkText) continue;

                console.log(`   Processing chunk ${i + 1}/${textChunks.length} (${chunkText.length} chars)...`);

                const command = new SynthesizeSpeechCommand({
                    Text: chunkText,
                    VoiceId: voiceId,
                    OutputFormat: 'mp3',
                    Engine: engine,
                });

                const response = await pollyClient.send(command);

                for await (const audioChunk of response.AudioStream) {
                    localAudioChunks.push(audioChunk);
                }
            }
        }

        const audioBuffer = Buffer.concat(localAudioChunks);

        // Save to temp directory
        const filename = `voiceover_${Date.now()}.mp3`;
        const filepath = path.join(TEMP_AUDIO_DIR, filename);
        await fs.writeFile(filepath, audioBuffer);

        console.log(`✅ Audio generated: ${audioBuffer.length} bytes → ${filename}`);

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length,
            'Content-Disposition': `attachment; filename=${filename}`,
        });
        res.send(audioBuffer);
    } catch (error) {
        console.error('❌ Synthesis error:', error);
        res.status(500).json({
            error: error.message,
            details: 'Failed to synthesize speech. If text is very long, it might have exceeded limits even with chunking.'
        });
    }
});

/**
 * POST /api/polly/preview
 * Body: { voiceId }
 * Returns: short audio preview
 */
app.post('/api/polly/preview', async (req, res) => {
    const { voiceId = 'Ruth' } = req.body;
    const previewText = 'Hello! This is a preview of my voice. I hope you like how I sound.';

    console.log(`🔊 Preview: voice=${voiceId}`);

    try {
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

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length,
        });
        res.send(audioBuffer);
    } catch (error) {
        console.error('❌ Preview error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Health check
 */
app.get('/api/polly/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'AWS Polly Neural TTS Server',
        region: process.env.AWS_REGION || 'eu-north-1',
    });
});

app.listen(PORT, () => {
    console.log(`
${'='.repeat(60)}
🎤 AWS Polly Neural TTS Server
${'='.repeat(60)}

📡 Server:  http://localhost:${PORT}
🏥 Health:  http://localhost:${PORT}/api/polly/health
🌍 Region:  ${process.env.AWS_REGION || 'eu-north-1'}
🎙️  Engine:  Neural (Premium Quality)

${'='.repeat(60)}
    `);
});
