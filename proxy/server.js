import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = 3001;

// Enable CORS for frontend
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
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

// Stripe Checkout endpoint (for local development)
app.post('/api/checkout', async (req, res) => {
    try {
        const { priceId, userId, planType } = req.body;
        const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

        if (!STRIPE_SECRET_KEY) {
            return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' });
        }

        if (!priceId || !userId || !planType) {
            return res.status(400).json({ error: 'Missing required fields: priceId, userId, planType' });
        }

        const isOneTime = planType === 'TRIAL';
        const checkoutMode = isOneTime ? 'payment' : 'subscription';

        console.log(`💳 Creating Stripe checkout: plan=${planType}, userId=${userId}, mode=${checkoutMode}`);

        const siteUrl = 'http://localhost:3000';

        // Create Stripe checkout session via raw API call
        const params = new URLSearchParams({
            mode: checkoutMode,
            'payment_method_types[0]': 'card',
            'line_items[0][price]': priceId,
            'line_items[0][quantity]': '1',
            'success_url': `${siteUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&userId=${userId}`,
            'cancel_url': `${siteUrl}/?canceled=true`,
            'metadata[userId]': userId,
            'metadata[planType]': planType,
        });

        const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(STRIPE_SECRET_KEY + ':').toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        const sessionData = await stripeRes.json();

        if (!stripeRes.ok) {
            console.error('❌ Stripe error:', sessionData);
            return res.status(stripeRes.status).json({ error: sessionData.error?.message || 'Stripe error' });
        }

        console.log(`✅ Stripe session created: ${sessionData.id}`);
        res.json({ url: sessionData.url, sessionId: sessionData.id });

    } catch (error) {
        console.error('❌ Checkout error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Verify Stripe checkout session (for PaymentSuccess page fallback)
app.post('/api/verify-session', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

        if (!STRIPE_SECRET_KEY || !sessionId) {
            return res.status(400).json({ error: 'Missing sessionId or STRIPE_SECRET_KEY' });
        }

        const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
            headers: {
                'Authorization': `Basic ${Buffer.from(STRIPE_SECRET_KEY + ':').toString('base64')}`,
            },
        });

        const session = await stripeRes.json();

        if (!stripeRes.ok) {
            return res.status(stripeRes.status).json({ error: session.error?.message });
        }

        const planType = session.metadata?.planType || null;
        const userId = session.metadata?.userId || null;

        console.log(`✅ Session verified: ${sessionId}, plan=${planType}, userId=${userId}`);
        res.json({ planType, userId, status: session.payment_status });

    } catch (error) {
        console.error('❌ Verify session error:', error.message);
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
