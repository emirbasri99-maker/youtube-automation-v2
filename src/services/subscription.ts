// Subscription Service - Supabase Version
// Manages user subscriptions, credits, and feature access using Supabase

import { PlanType, getPlan, isModelAllowed, AIModel } from '../config/plans';
import { estimateVideoCost } from '../config/credits';
import { getSubscription } from './database';
import type { Subscription, CreditTransaction } from '../lib/supabase';

/**
 * Check if user has access to a specific feature
 */
export async function hasFeatureAccess(
    userId: string,
    feature: keyof import('../config/plans').PlanFeatures
): Promise<boolean> {
    const subscription = await getSubscription(userId);
    if (!subscription) return false;

    const plan = getPlan(subscription.plan_type as PlanType);
    return plan.features[feature] as boolean;
}

/**
 * Check if user can use a specific AI model
 */
export async function canUseModel(userId: string, model: AIModel): Promise<boolean> {
    const subscription = await getSubscription(userId);
    if (!subscription) return false;

    return isModelAllowed(subscription.plan_type as PlanType, model);
}

/**
 * Check if user has sufficient credits
 */
export async function checkBalance(userId: string, requiredCredits: number): Promise<{
    sufficient: boolean;
    currentBalance: number;
    shortfall: number;
}> {
    const subscription = await getSubscription(userId);
    if (!subscription) {
        return {
            sufficient: false,
            currentBalance: 0,
            shortfall: requiredCredits,
        };
    }

    const shortfall = Math.max(0, requiredCredits - subscription.credits);

    return {
        sufficient: subscription.credits >= requiredCredits,
        currentBalance: subscription.credits,
        shortfall,
    };
}

/**
 * Calculate cost for video generation
 */
export function calculateVideoCost(params: {
    type: 'shorts' | 'long';
    duration?: number;
    scenes?: number;
    aiModel?: string;
    includeVoiceover?: boolean;
    useStockVideo?: boolean;
}): number {
    return estimateVideoCost(params);
}

/**
 * Pre-flight check before video generation
 */
export async function validateVideoGeneration(userId: string, params: {
    type: 'shorts' | 'long';
    duration?: number;
    scenes?: number;
    aiModel?: AIModel;
    includeVoiceover?: boolean;
    useStockVideo?: boolean;
}): Promise<{
    allowed: boolean;
    reason?: string;
    estimatedCost?: number;
}> {
    const subscription = await getSubscription(userId);
    if (!subscription) {
        return {
            allowed: false,
            reason: 'No subscription found. Please contact support.',
        };
    }

    const plan = getPlan(subscription.plan_type as PlanType);

    // Check model access
    if (params.aiModel && !(await canUseModel(userId, params.aiModel))) {
        return {
            allowed: false,
            reason: `Model ${params.aiModel} not available on ${plan.name} plan. Upgrade to access this model.`,
        };
    }

    // Check stock video access
    if (params.useStockVideo && !plan.features.stockVideoAccess) {
        return {
            allowed: false,
            reason: `Stock video access not available on ${plan.name} plan. Upgrade to Professional or higher.`,
        };
    }

    // Calculate cost
    const estimatedCost = calculateVideoCost(params);

    // Check credits
    const balance = await checkBalance(userId, estimatedCost);
    if (!balance.sufficient) {
        return {
            allowed: false,
            reason: `Insufficient credits. Required: ${estimatedCost}, Available: ${balance.currentBalance}. Please add ${balance.shortfall} more credits.`,
            estimatedCost,
        };
    }

    return {
        allowed: true,
        estimatedCost,
    };
}

// Re-export types for backward compatibility
export type { Subscription as UserSubscription, CreditTransaction } from '../lib/supabase';
