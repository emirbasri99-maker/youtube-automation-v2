import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import {
    getSubscription,
    upgradeSubscriptionInDatabase,
} from '../services/database';
import { getPlan, PlanType, AIModel } from '../config/plans';
import type { Subscription } from '../lib/supabase';

interface SubscriptionContextType {
    subscription: Subscription | null;
    loading: boolean;
    refreshSubscription: () => Promise<void>;
    upgradeSubscription: (planType: PlanType) => Promise<void>;
    hasFeatureAccess: (feature: string) => boolean;
    canUseModel: (model: AIModel) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);

    // Load subscription from database
    const loadSubscription = async () => {
        if (!user?.id) {
            console.log('❌ No user ID, skipping subscription load');
            setSubscription(null);
            setLoading(false);
            return;
        }

        console.log('🔄 Loading subscription for user:', user.id);
        try {
            const sub = await getSubscription(user.id);
            console.log('✅ Subscription loaded:', sub);
            setSubscription(sub);
        } catch (error) {
            console.error('❌ Failed to load subscription:', error);
            setSubscription(null);
        } finally {
            setLoading(false);
        }
    };

    // Load subscription when user changes
    useEffect(() => {
        if (isAuthenticated && user) {
            loadSubscription();
        } else {
            setSubscription(null);
            setLoading(false);
        }
    }, [user, isAuthenticated]);

    // Real-time subscription updates
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel('subscription-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'subscriptions',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('Subscription updated:', payload);
                    if (payload.new) {
                        setSubscription(payload.new as Subscription);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    const refreshSubscription = async () => {
        await loadSubscription();
    };

    const upgradeSubscription = async (planType: PlanType) => {
        if (!user?.id) {
            console.error('No user logged in');
            return;
        }

        try {
            const plan = getPlan(planType);
            const result = await upgradeSubscriptionInDatabase(
                user.id,
                planType,
                plan.credits
            );

            if (result.success) {
                await refreshSubscription();
            } else {
                console.error('Upgrade failed:', result.error);
            }
        } catch (error) {
            console.error('Failed to upgrade subscription:', error);
        }
    };

    const hasFeatureAccess = (feature: string): boolean => {
        if (!subscription) return false;

        const plan = getPlan(subscription.plan_type as PlanType);

        switch (feature) {
            case 'stockVideoAccess':
                return plan.features.stockVideoAccess;
            case 'hd1080pRender':
                return plan.features.hd1080pRender;
            case 'socialAutoPost':
                return plan.features.socialAutoPost;
            default:
                return false;
        }
    };

    const canUseModel = (model: AIModel): boolean => {
        if (!subscription) return false;

        const plan = getPlan(subscription.plan_type as PlanType);
        return plan.features.allowedModels.includes(model);
    };

    return (
        <SubscriptionContext.Provider
            value={{
                subscription,
                loading,
                refreshSubscription,
                upgradeSubscription,
                hasFeatureAccess,
                canUseModel,
            }}
        >
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
}
