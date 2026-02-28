/**
 * Edge-TTS Service
 *
 * Free text-to-speech using Microsoft Edge TTS (via Python backend).
 * Replaces ElevenLabs API.
 */

const TTS_API_BASE = '/api/tts';

// ─── Types ──────────────────────────────────────────────────────

export interface EdgeTtsVoice {
    name: string;        // e.g. "en-US-GuyNeural"
    displayName: string; // e.g. "Guy (Neural)"
    gender: string;      // "Male" | "Female"
    locale: string;      // e.g. "en-US"
}

export interface LanguageGroup {
    locale: string;      // e.g. "en-US"
    language: string;    // e.g. "English (United States)"
    voices: EdgeTtsVoice[];
}

export interface SynthesizeResult {
    audio: Blob;
    audioUrl: string;
}

// ─── API Calls ──────────────────────────────────────────────────

/**
 * Get all available voices grouped by language
 */
export async function getEdgeTtsVoices(): Promise<LanguageGroup[]> {
    try {
        const response = await fetch(`${TTS_API_BASE}/voices`);

        if (!response.ok) {
            throw new Error(`TTS API error: ${response.status}`);
        }

        const data = await response.json();
        return data.voices || [];
    } catch (error) {
        console.error('Error fetching edge-tts voices:', error);
        throw error;
    }
}

/**
 * Synthesize text to speech
 */
export async function synthesizeSpeech(
    text: string,
    voice: string = 'en-US-GuyNeural',
    speed: number = 1.0,
): Promise<SynthesizeResult> {
    // Convert speed multiplier to edge-tts rate format
    // 1.0 = "+0%", 1.5 = "+50%", 0.5 = "-50%"
    const ratePercent = Math.round((speed - 1) * 100);
    const rate = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

    console.log('🎤 Edge-TTS synthesize:', { voice, rate, textLength: text.length });

    // 120 second timeout for long texts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
        const response = await fetch(`${TTS_API_BASE}/synthesize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice, rate }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`TTS synthesis error: ${response.status} - ${errorText}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        console.log('✅ Audio generated:', audioBlob.size, 'bytes');

        return { audio: audioBlob, audioUrl };
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error('TTS synthesis timed out after 2 minutes. Try a shorter text or check the TTS server.');
        }
        console.error('❌ Error synthesizing speech:', error);
        throw error;
    }
}

/**
 * Generate a short voice preview
 */
export async function previewVoice(voice: string): Promise<SynthesizeResult> {
    try {
        const response = await fetch(`${TTS_API_BASE}/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voice }),
        });

        if (!response.ok) {
            throw new Error(`Preview error: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        return { audio: audioBlob, audioUrl };
    } catch (error) {
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
