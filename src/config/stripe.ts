// Stripe Configuration
// Maps plan types to Stripe Price IDs

import { PlanType } from './plans';

export const STRIPE_CONFIG = {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    priceIds: {
        [PlanType.TRIAL]: import.meta.env.VITE_STRIPE_PRICE_TRIAL,
        [PlanType.STARTER]: import.meta.env.VITE_STRIPE_PRICE_STARTER,
        [PlanType.PROFESSIONAL]: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL,
        [PlanType.BUSINESS]: import.meta.env.VITE_STRIPE_PRICE_BUSINESS,
    },
} as const;

// Helper function to get Price ID by plan type
export function getStripePriceId(planType: PlanType): string {
    const priceId = STRIPE_CONFIG.priceIds[planType];
    if (!priceId) {
        throw new Error(`No Stripe Price ID configured for plan: ${planType}`);
    }
    return priceId;
}

// Validate Stripe configuration
export function validateStripeConfig(): boolean {
    if (!STRIPE_CONFIG.publishableKey) {
        console.error('Missing VITE_STRIPE_PUBLISHABLE_KEY');
        return false;
    }

    const missingPriceIds = Object.entries(STRIPE_CONFIG.priceIds)
        .filter(([_, priceId]) => !priceId)
        .map(([planType]) => planType);

    if (missingPriceIds.length > 0) {
        console.error('Missing Stripe Price IDs for plans:', missingPriceIds);
        return false;
    }

    return true;
}
