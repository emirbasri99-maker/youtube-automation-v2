/**
 * Netlify Function: polly-voices
 * Returns OpenAI TTS voices in the same format as AWS Polly groups
 * GET /api/polly/voices
 */
export const handler = async () => {
    const voices = [
        {
            locale: 'en-US',
            language: 'English (United States)',
            voices: [
                { id: 'nova', name: 'Nova (Female)', gender: 'Female', locale: 'en-US', engine: 'neural' },
                { id: 'shimmer', name: 'Shimmer (Female)', gender: 'Female', locale: 'en-US', engine: 'neural' },
                { id: 'alloy', name: 'Alloy (Neutral)', gender: 'Neutral', locale: 'en-US', engine: 'neural' },
                { id: 'echo', name: 'Echo (Male)', gender: 'Male', locale: 'en-US', engine: 'neural' },
                { id: 'fable', name: 'Fable (Male)', gender: 'Male', locale: 'en-US', engine: 'neural' },
                { id: 'onyx', name: 'Onyx (Male)', gender: 'Male', locale: 'en-US', engine: 'neural' },
            ],
        },
    ];

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ voices }),
    };
};
