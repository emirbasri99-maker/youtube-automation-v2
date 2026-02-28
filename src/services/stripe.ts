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

        // Determine API URL based on environment
        // In development (localhost), point to the local proxy server
        const apiUrl = import.meta.env.DEV
            ? 'http://localhost:3001/api/checkout'
            : '/.netlify/functions/checkout';

        console.log('Using API URL:', apiUrl);

        // Call backend API to create checkout session
        const response = await fetch(apiUrl, {
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

        const { url, sessionId } = data;

        if (!url) {
            throw new Error('No checkout URL received from server');
        }

        console.log('Checkout URL:', url);
        console.log('Session ID:', sessionId);

        // Direct redirect to Stripe Checkout (v8+ compatible)
        // No need for Stripe.js instance, just redirect to the URL
        console.log('Redirecting to Stripe checkout...');
        window.location.href = url;

    } catch (error) {
        console.error('Checkout error:', error);
        throw error;
    }
}
