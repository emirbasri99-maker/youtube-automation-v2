// ElevenLabs API Service
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

export interface ElevenLabsVoice {
    voice_id: string;
    name: string;
    preview_url?: string;
    category?: string;
    labels?: {
        accent?: string;
        description?: string;
        age?: string;
        gender?: string;
        use_case?: string;
    };
}

export interface TextToSpeechOptions {
    text: string;
    voice_id: string;
    model_id?: string;
    voice_settings?: {
        stability?: number;
        similarity_boost?: number;
        style?: number;
        use_speaker_boost?: boolean;
    };
    output_format?: string;
    optimize_streaming_latency?: number;
}

export interface TextToSpeechResponse {
    audio: Blob;
    audioUrl: string;
}

/**
 * Get all available voices from ElevenLabs
 */
export async function getVoices(): Promise<ElevenLabsVoice[]> {
    try {
        const response = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
            method: 'GET',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
            },
        });

        if (!response.ok) {
            throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.voices || [];
    } catch (error) {
        console.error('Error fetching ElevenLabs voices:', error);
        throw error;
    }
}

/**
 * Convert text to speech using ElevenLabs
 */
export async function textToSpeech(
    options: TextToSpeechOptions
): Promise<TextToSpeechResponse> {
    const {
        text,
        voice_id,
        model_id = 'eleven_multilingual_v2',
        voice_settings = {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
        },
        output_format = 'mp3_44100_128',
        optimize_streaming_latency = 0,
    } = options;

    // Validate API key
    if (!ELEVENLABS_API_KEY) {
        throw new Error('ElevenLabs API key is missing. Please check your .env file.');
    }

    console.log('🎤 Starting text-to-speech conversion...');
    console.log('Voice ID:', voice_id);
    console.log('Text length:', text.length, 'characters');
    console.log('Model:', model_id);

    try {
        const url = `${ELEVENLABS_API_BASE}/text-to-speech/${voice_id}?output_format=${output_format}&optimize_streaming_latency=${optimize_streaming_latency}`;

        const requestBody = {
            text,
            model_id,
            voice_settings,
        };

        console.log('📡 Sending request to:', url);
        console.log('Request body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ ElevenLabs API error:', errorText);
            throw new Error(`ElevenLabs TTS error: ${response.status} - ${errorText}`);
        }

        const audioBlob = await response.blob();
        console.log('✅ Audio blob created:', audioBlob.size, 'bytes');

        const audioUrl = URL.createObjectURL(audioBlob);
        console.log('✅ Audio URL created:', audioUrl);

        return {
            audio: audioBlob,
            audioUrl,
        };
    } catch (error) {
        console.error('❌ Error converting text to speech:', error);
        throw error;
    }
}

/**
 * Get voice details by ID
 */
export async function getVoiceById(voice_id: string): Promise<ElevenLabsVoice> {
    try {
        const response = await fetch(`${ELEVENLABS_API_BASE}/voices/${voice_id}`, {
            method: 'GET',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
            },
        });

        if (!response.ok) {
            throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching voice details:', error);
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
 * Estimate audio duration from text (rough estimate)
 * Average speaking rate: ~150 words per minute
 */
export function estimateAudioDuration(text: string): number {
    const words = text.trim().split(/\s+/).length;
    const minutes = words / 150;
    return Math.round(minutes * 60); // return seconds
}
