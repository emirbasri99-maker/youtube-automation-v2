/**
 * AWS Polly Service
 *
 * Professional text-to-speech using AWS Polly Neural voices.
 * Replaces Edge-TTS (which had WebSocket issues).
 */

const POLLY_API_BASE = '/api/polly';

// ─── Types ──────────────────────────────────────────────────────

export interface PollyVoice {
    id: string;          // e.g. "Ruth"
    name: string;        // e.g. "Ruth"
    gender: string;      // "Female" | "Male"
    locale: string;      // e.g. "en-US"
    engine: string;      // "neural"
}

export interface LanguageGroup {
    locale: string;      // e.g. "en-US"
    language: string;    // e.g. "English (United States)"
    voices: PollyVoice[];
}

export interface SynthesizeResult {
    audio: Blob;
    audioUrl: string;
}

// ─── API Calls ──────────────────────────────────────────────────

/**
 * Get all available Neural voices grouped by language
 */
export async function getPollyVoices(): Promise<LanguageGroup[]> {
    try {
        const response = await fetch(`${POLLY_API_BASE}/voices`);

        if (!response.ok) {
            throw new Error(`Polly API error: ${response.status}`);
        }

        const data = await response.json();
        return data.voices || [];
    } catch (error) {
        console.error('Error fetching AWS Polly voices:', error);
        throw error;
    }
}

/**
 * Synthesize text to speech using Neural engine
 */
export async function synthesizeSpeech(
    text: string,
    voiceId: string = 'Ruth',
    engine: string = 'neural',
): Promise<SynthesizeResult> {
    console.log('🎤 AWS Polly synthesize:', { voiceId, engine, textLength: text.length });

    // 120 second timeout for long texts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
        const response = await fetch(`${POLLY_API_BASE}/synthesize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voiceId, engine }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Polly synthesis error: ${response.status} - ${errorText}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        console.log('✅ Audio generated:', audioBlob.size, 'bytes');

        return { audio: audioBlob, audioUrl };
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error('Polly synthesis timed out after 2 minutes. Try a shorter text or check the server.');
        }
        console.error('❌ Error synthesizing speech:', error);
        throw error;
    }
}

/**
 * Generate a short voice preview
 */
export async function previewVoice(voiceId: string): Promise<SynthesizeResult> {
    // 30 second timeout for preview
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(`${POLLY_API_BASE}/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voiceId }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Preview error: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        return { audio: audioBlob, audioUrl };
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error('Preview timed out. Please try again.');
        }
        console.error('Error generating voice preview:', error);
        throw error;
    }
}

/**
 * Download audio file
 */
export function downloadAudio(audioBlob: Blob, filename: string = 'voiceover.mp3') {
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Estimate audio duration from text
 * Average speaking rate: ~150 words per minute
 */
export function estimateAudioDuration(text: string): number {
    const words = text.trim().split(/\s+/).length;
    const minutes = words / 150;
    return Math.round(minutes * 60); // return seconds
}
