import { supabase, type Profile, type Subscription, type CreditTransaction } from '../lib/supabase';

/**
 * Database helper functions for Supabase
 */

// ============================================
// PROFILE OPERATIONS
// ============================================

export async function getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
        return null;
    }

    return data;
}

export async function createProfile(userId: string, email: string, fullName?: string): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .insert({
            id: userId,
            email,
            full_name: fullName,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating profile:', error);
        return null;
    }

    return data;
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating profile:', error);
        return null;
    }

    return data;
}

// ============================================
// SUBSCRIPTION OPERATIONS
// ============================================

export async function getSubscription(userId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error('Error fetching subscription:', error);
        return null;
    }

    return data;
}

export async function updateSubscriptionCredits(
    userId: string,
    newCredits: number
): Promise<Subscription | null> {
    const { data, error } = await supabase
        .from('subscriptions')
        .update({ credits: newCredits })
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating credits:', error);
        return null;
    }

    return data;
}

export async function updateSubscriptionPlan(
    userId: string,
    planType: 'STARTER' | 'PROFESSIONAL' | 'BUSINESS',
    credits: number
): Promise<Subscription | null> {
    const { data, error } = await supabase
        .from('subscriptions')
        .update({
            plan_type: planType,
            credits: credits,
        })
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        console.error('Error updating subscription plan:', error);
        return null;
    }

    return data;
}

// ============================================
// CREDIT TRANSACTION OPERATIONS
// ============================================

export async function logCreditTransaction(
    userId: string,
    amount: number,
    type: 'PURCHASE' | 'USAGE' | 'REFUND' | 'BONUS',
    description: string,
    balanceAfter: number,
    relatedVideoId?: string
): Promise<CreditTransaction | null> {
    const { data, error } = await supabase
        .from('credit_transactions')
        .insert({
            user_id: userId,
            amount,
            type,
            description,
            balance_after: balanceAfter,
            related_video_id: relatedVideoId,
        })
        .select()
        .single();

    if (error) {
        console.error('Error logging transaction:', error);
        return null;
    }

    return data;
}

export async function getCreditHistory(
    userId: string,
    limit: number = 50
): Promise<CreditTransaction[]> {
    const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching credit history:', error);
        return [];
    }

    return data || [];
}

// ============================================
// COMBINED OPERATIONS
// ============================================

/**
 * Deduct credits and log transaction atomically
 */
export async function deductCreditsFromDatabase(
    userId: string,
    amount: number,
    description: string,
    relatedVideoId?: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
        // Get current subscription
        const subscription = await getSubscription(userId);
        if (!subscription) {
            return { success: false, error: 'Subscription not found' };
        }

        // Check sufficient balance
        if (subscription.credits < amount) {
            return {
                success: false,
                error: `Insufficient credits. Required: ${amount}, Available: ${subscription.credits}`,
            };
        }

        // Calculate new balance
        const newBalance = subscription.credits - amount;

        // Update credits
        const updatedSub = await updateSubscriptionCredits(userId, newBalance);
        if (!updatedSub) {
            return { success: false, error: 'Failed to update credits' };
        }

        // Log transaction
        await logCreditTransaction(
            userId,
            -amount,
            'USAGE',
            description,
            newBalance,
            relatedVideoId
        );

        return { success: true, newBalance };
    } catch (error) {
        console.error('Error deducting credits:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Add credits and log transaction atomically
 */
export async function addCreditsToDatabase(
    userId: string,
    amount: number,
    description: string,
    type: 'PURCHASE' | 'BONUS' | 'REFUND' = 'PURCHASE'
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
        // Get current subscription
        const subscription = await getSubscription(userId);
        if (!subscription) {
            return { success: false, error: 'Subscription not found' };
        }

        // Calculate new balance
        const newBalance = subscription.credits + amount;

        // Update credits
        const updatedSub = await updateSubscriptionCredits(userId, newBalance);
        if (!updatedSub) {
            return { success: false, error: 'Failed to update credits' };
        }

        // Log transaction
        await logCreditTransaction(
            userId,
            amount,
            type,
            description,
            newBalance
        );

        return { success: true, newBalance };
    } catch (error) {
        console.error('Error adding credits:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Upgrade subscription plan
 */
export async function upgradeSubscriptionInDatabase(
    userId: string,
    newPlanType: 'STARTER' | 'PROFESSIONAL' | 'BUSINESS',
    newPlanCredits: number
): Promise<{ success: boolean; error?: string }> {
    try {
        // Get current subscription
        const subscription = await getSubscription(userId);
        if (!subscription) {
            return { success: false, error: 'Subscription not found' };
        }

        // Calculate total credits (current + new plan allocation)
        const totalCredits = subscription.credits + newPlanCredits;

        // Update plan and credits
        const updated = await updateSubscriptionPlan(userId, newPlanType, totalCredits);
        if (!updated) {
            return { success: false, error: 'Failed to upgrade subscription' };
        }

        // Log the credit addition
        await logCreditTransaction(
            userId,
            newPlanCredits,
            'PURCHASE',
            `Plan upgraded to ${newPlanType}`,
            totalCredits
        );

        return { success: true };
    } catch (error) {
        console.error('Error upgrading subscription:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Refund credits to user (typically after an error)
 * @param userId User ID
 * @param amount Amount to refund
 * @param reason Reason for refund
 * @param relatedVideoId Optional related video ID
 * @returns Result with success status and new balance
 */
export async function refundCredits(
    userId: string,
    amount: number,
    reason: string,
    relatedVideoId?: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    return addCreditsToDatabase(userId, amount, `Refund: ${reason}`, 'REFUND');
}
