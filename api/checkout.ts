// Stripe Checkout API Endpoint
// Creates a Stripe Checkout session for subscription purchase

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia' as any,
});

export const handler = async (event: any) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ message: 'Method not allowed' }),
        };
    }

    try {
        const { priceId, userId, planType } = JSON.parse(event.body || '{}');

        console.log('Checkout request received:', { priceId, userId, planType });

        // Validate input
        if (!priceId || !userId || !planType) {
            console.error('Missing required fields:', { priceId, userId, planType });
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Missing required fields: priceId, userId, planType',
                }),
            };
        }

        // Get the site URL from Netlify environment or use default
        const siteUrl = process.env.URL || 'https://youtubesiauto.netlify.app';

        console.log('Creating Stripe session with:', {
            priceId,
            siteUrl,
            stripeKeyExists: !!process.env.STRIPE_SECRET_KEY
        });

        // Create Checkout Session
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${siteUrl}/app/dashboard?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${siteUrl}/?canceled=true`,
            metadata: {
                userId,
                planType,
            },
            subscription_data: {
                metadata: {
                    userId,
                    planType,
                },
            },
        });

        // Return session ID
        return {
            statusCode: 200,
            body: JSON.stringify({
                sessionId: session.id,
            }),
        };
    } catch (error: any) {
        console.error('Checkout session creation error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: error.message || 'Failed to create checkout session',
            }),
        };
    }
};
