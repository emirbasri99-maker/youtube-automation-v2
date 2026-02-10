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

        console.log('Creating checkout for plan:', planType, 'with priceId:', priceId);
        console.log('UserId:', userId);
        console.log('Calling Netlify function at: /.netlify/functions/checkout');

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

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error:', errorText);
            try {
                const error = JSON.parse(errorText);
                throw new Error(error.message || 'Failed to create checkout session');
            } catch {
                throw new Error(`Failed to create checkout session: ${errorText}`);
            }
        }

        const data = await response.json();
        console.log('Checkout session response:', data);

        const { sessionId } = data;

        if (!sessionId) {
            throw new Error('No session ID received from server');
        }

        console.log('Session ID:', sessionId);

        // Redirect to Stripe Checkout
        const stripe = await getStripe();
        console.log('Stripe instance:', !!stripe);
        console.log('Stripe publishable key:', STRIPE_CONFIG.publishableKey?.substring(0, 20) + '...');

        if (!stripe) {
            throw new Error('Stripe failed to initialize. Check VITE_STRIPE_PUBLISHABLE_KEY environment variable.');
        }

        // Use the correct method for Stripe.js
        console.log('Redirecting to Stripe checkout with sessionId:', sessionId);
        const result = await stripe.redirectToCheckout({ sessionId });

        console.log('Redirect result:', result);

        if (result.error) {
            console.error('Stripe redirect error:', result.error);
            throw result.error;
        }
    } catch (error) {
        console.error('Checkout error:', error);
        throw error;
    }
}
