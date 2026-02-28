/**
 * Edge-TTS Backend Server
 * Free text-to-speech using Microsoft Edge TTS
 * 
 * Endpoints:
 *   GET  /api/tts/voices    - List all available voices grouped by language
 *   POST /api/tts/synthesize - Generate audio from text
 *   POST /api/tts/preview   - Generate short voice preview
 */

import express from 'express';
import cors from 'cors';
import { EdgeTTS, VoicesManager } from 'edge-tts-universal';

const app = express();
const PORT = 5050;

// CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Cache voices
let voicesCache = null;

/**
 * GET /api/tts/voices
 * Returns all voices grouped by language
 */
app.get('/api/tts/voices', async (req, res) => {
    try {
        if (!voicesCache) {
            console.log('🔄 Fetching voices from Microsoft Edge TTS...');
            const manager = await VoicesManager.create();
            const allVoices = manager.voices;

            // Group by locale
            const grouped = {};
            for (const v of allVoices) {
                const locale = v.Locale;
                const langName = v.Locale;
                // Try to extract a friendly name from FriendlyName
                const friendlyLabel = v.FriendlyName || locale;

                if (!grouped[locale]) {
                    grouped[locale] = {
                        locale,
                        language: friendlyLabel.split(' - ')[0] || locale,
                        voices: [],
                    };
                }

                // Clean display name
                let displayName = v.FriendlyName || v.ShortName;
                displayName = displayName
                    .replace('Microsoft Server Speech Text to Speech Voice ', '')
                    .replace(`(${v.Locale}, `, '(')
                    .trim();

                grouped[locale].voices.push({
                    name: v.ShortName,
                    displayName,
                    gender: v.Gender,
                    locale: v.Locale,
                });
            }

            // Sort by locale, move en-US to top
            let result = Object.values(grouped).sort((a, b) =>
                a.locale.localeCompare(b.locale)
            );

            const enUS = result.find(l => l.locale === 'en-US');
            if (enUS) {
                result = [enUS, ...result.filter(l => l.locale !== 'en-US')];
            }

            voicesCache = result;
            console.log(`✅ Cached ${allVoices.length} voices in ${result.length} languages`);
        }

        res.json({ voices: voicesCache });
    } catch (error) {
        console.error('❌ Error listing voices:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/tts/synthesize
 * Body: { text, voice, rate }
 * Returns: audio/mpeg blob
 */
app.post('/api/tts/synthesize', async (req, res) => {
    const { text, voice = 'en-US-GuyNeural', rate = '+0%' } = req.body;

    if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Text cannot be empty' });
    }

    console.log(`🎤 Synthesizing: voice=${voice}, rate=${rate}, text=${text.length} chars`);

    try {
        const tts = new EdgeTTS(text, voice, { rate });
        const result = await tts.synthesize();

        // Convert Blob/ArrayBuffer to Buffer
        const arrayBuffer = await result.audio.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log(`✅ Audio generated: ${buffer.length} bytes`);

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': buffer.length,
            'Content-Disposition': 'attachment; filename=voiceover.mp3',
        });
        res.send(buffer);
    } catch (error) {
        console.error('❌ Synthesis error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/tts/preview
 * Body: { voice }
 * Returns: short audio preview
 */
app.post('/api/tts/preview', async (req, res) => {
    const { voice = 'en-US-GuyNeural' } = req.body;
    const previewText = 'Hello! This is a preview of my voice. I hope you like how I sound.';

    console.log(`🔊 Preview: voice=${voice}`);

    try {
        const tts = new EdgeTTS(previewText, voice);
        const result = await tts.synthesize();

        const arrayBuffer = await result.audio.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': buffer.length,
        });
        res.send(buffer);
    } catch (error) {
        console.error('❌ Preview error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Health check
 */
app.get('/api/tts/health', (req, res) => {
    res.json({ status: 'ok', service: 'Edge-TTS Server' });
});

app.listen(PORT, () => {
    console.log(`
${'='.repeat(50)}
🎤 Edge-TTS Server
${'='.repeat(50)}

📡 Server: http://localhost:${PORT}
🏥 Health: http://localhost:${PORT}/api/tts/health

${'='.repeat(50)}
    `);
});
