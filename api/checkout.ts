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
        // Using 'payment' mode for one-time purchases
        // TODO: Switch to 'subscription' mode when recurring prices are configured in Stripe
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            // Collect customer email for guest users
            customer_email: userId === 'guest' ? undefined : undefined, // Stripe will always ask for email
            success_url: `${siteUrl}/app/dashboard?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${siteUrl}/?canceled=true`,
            metadata: {
                userId,
                planType,
            },
        });

        console.log('Stripe session created successfully:', session.id);
        console.log('Checkout URL:', session.url);

        // Return checkout URL for direct redirect (Stripe.js v8+ compatibility)
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: session.url, // Return checkout URL instead of session ID
                sessionId: session.id,
            }),
        };
    } catch (error: any) {
        console.error('Checkout session creation error:', error);
        console.error('Error details:', {
            message: error.message,
            type: error.type,
            code: error.code,
            statusCode: error.statusCode,
        });

        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: error.message || 'Failed to create checkout session',
                error: error.type || 'unknown_error',
            }),
        };
    }
};
