// Stripe Service
// Client-side Stripe integration functions

import { loadStripe } from '@stripe/stripe-js';
import { STRIPE_CONFIG, getStripePriceId } from '../config/stripe';
import { PlanType } from '../config/plans';

// Initialize Stripe
let stripePromise: ReturnType<typeof loadStripe> | null = null;

export function getStripe() {
    if (!stripePromise) {
        stripePromise = loadStripe(STRIPE_CONFIG.publishableKey);
    }
    return stripePromise;
}

// Create checkout session and redirect to Stripe
export async function createCheckoutSession(planType: PlanType, userId: string): Promise<void> {
    try {
        const priceId = getStripePriceId(planType);

        // Call backend API to create checkout session
        const response = await fetch('/.netlify/functions/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                priceId,
                userId,
                planType,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create checkout session');
        }

        const { sessionId } = await response.json();

        // Redirect to Stripe Checkout
        const stripe = await getStripe();
        if (!stripe) {
            throw new Error('Stripe failed to initialize');
        }

        // Use the correct method for Stripe.js
        const result = await stripe.redirectToCheckout({ sessionId });

        if (result.error) {
            throw result.error;
        }
    } catch (error) {
        console.error('Checkout error:', error);
        throw error;
    }
}
