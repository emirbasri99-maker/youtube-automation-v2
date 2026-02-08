// Stripe Checkout API Endpoint
// Creates a Stripe Checkout session for subscription purchase

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover',
});

export default async function handler(req: any, res: any) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { priceId, userId, planType } = req.body;

        // Validate input
        if (!priceId || !userId || !planType) {
            return res.status(400).json({
                message: 'Missing required fields: priceId, userId, planType',
            });
        }

        // Get user email from Supabase (optional, for better UX)
        // For now, we'll let Stripe collect the email

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
            success_url: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/app/dashboard?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/app/settings?canceled=true`,
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
        return res.status(200).json({
            sessionId: session.id,
        });
    } catch (error: any) {
        console.error('Checkout session creation error:', error);
        return res.status(500).json({
            message: error.message || 'Failed to create checkout session',
        });
    }
}
