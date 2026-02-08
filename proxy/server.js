import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = 3001;

// Enable CORS for frontend
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

app.use(express.json());

// Apify API proxy endpoint
app.post('/api/apify/trends', async (req, res) => {
    try {
        const { keyword } = req.body;
        const APIFY_API_KEY = process.env.VITE_APIFY_API_KEY;

        if (!APIFY_API_KEY) {
            return res.status(500).json({ error: 'APIFY_API_KEY not configured' });
        }

        console.log(`🔍 Searching YouTube trends for: "${keyword}"`);

        // Start Apify actor run
        const runResponse = await fetch(
            `https://api.apify.com/v2/acts/streamers~youtube-scraper/runs?token=${APIFY_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    searchQueries: [keyword],
                    maxResults: 10,
                    maxResultsShorts: 0,
                    maxResultsStreams: 0,
                }),
            }
        );

        if (!runResponse.ok) {
            throw new Error(`Apify API error: ${runResponse.statusText}`);
        }

        const runData = await runResponse.json();
        const runId = runData.data.id;

        console.log(`⏳ Actor run started: ${runId}`);

        // Poll for completion
        let status = 'RUNNING';
        let attempts = 0;
        const maxAttempts = 60;

        while (status === 'RUNNING' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            attempts++;

            const statusResponse = await fetch(
                `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`
            );

            const statusData = await statusResponse.json();
            status = statusData.data.status;

            console.log(`📊 Status: ${status} (attempt ${attempts}/${maxAttempts})`);

            if (status === 'FAILED') {
                throw new Error('Apify actor run failed');
            }
        }

        if (status === 'RUNNING') {
            throw new Error('Request timeout');
        }

        // Fetch results
        const resultsResponse = await fetch(
            `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_KEY}`
        );

        const results = await resultsResponse.json();

        console.log(`✅ Found ${results.length} videos`);

        res.json({ success: true, videos: results });

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Proxy server running' });
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
    console.log(`📡 Accepting requests from http://localhost:3000`);
});
