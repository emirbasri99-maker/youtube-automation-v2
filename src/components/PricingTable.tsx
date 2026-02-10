import { useState } from 'react';
import { Check, Zap, Crown, Sparkles, Loader2, Rocket } from 'lucide-react';
import { getAllPlans, PlanType } from '../config/plans';
import { createCheckoutSession } from '../services/stripe';
import { useAuth } from '../context/AuthContext';
import './PricingTable.css';

interface PricingTableProps {
    currentPlan?: PlanType;
}

function PricingTable({ currentPlan }: PricingTableProps) {
    const plans = getAllPlans();
    const { user } = useAuth();
    const [loading, setLoading] = useState<PlanType | null>(null);
    const [error, setError] = useState<string | null>(null);

    const getPlanIcon = (planType: PlanType) => {
        switch (planType) {
            case PlanType.TRIAL:
                return <Rocket size={32} />;
            case PlanType.STARTER:
                return <Zap size={32} />;
            case PlanType.PROFESSIONAL:
                return <Sparkles size={32} />;
            case PlanType.BUSINESS:
                return <Crown size={32} />;
        }
    };

    const getFeatureList = (planType: PlanType) => {
        const plan = plans.find(p => p.type === planType)!;
        const features: string[] = [
            `${plan.credits.toLocaleString()} credits/month`,
            `Up to ${plan.features.maxVideosPerMonth === -1 ? 'unlimited' : plan.features.maxVideosPerMonth} videos`,
            `${plan.features.maxDurationMinutes} min max duration`,
        ];

        // Model access
        const modelNames = {
            'gpt-4o-mini': 'Fast AI (GPT-4o Mini)',
            'gpt-4o': 'Standard AI (GPT-4o)',
            'gpt-4-turbo-preview': 'Pro AI (GPT-4 Turbo)',
        };
        features.push(...plan.features.allowedModels.map(m => modelNames[m]));

        // Additional features
        if (plan.features.stockVideoAccess) features.push('Pexels Stock Video Access');
        if (plan.features.hd1080pRender) features.push('1080p HD Rendering');
        if (plan.features.socialAutoPost) features.push('Auto-Post to YouTube/Instagram');

        return features;
    };

    const handleSelectPlan = async (planType: PlanType) => {
        // Allow checkout without login - user account will be created after payment
        // If user is logged in, use their ID; otherwise use 'guest' and email will be captured in Stripe
        const userId = user?.id || 'guest';

        if (currentPlan === planType) {
            return;
        }

        try {
            setLoading(planType);
            setError(null);

            // Create checkout session and redirect to Stripe
            await createCheckoutSession(planType, userId);
        } catch (err: any) {
            console.error('Checkout error:', err);
            setError(err.message || 'Failed to start checkout. Please try again.');
            setLoading(null);
        }
    };

    return (
        <div className="pricing-section">
            <div className="pricing-header">
                <h2 className="heading-xl">Choose Your Plan</h2>
                <p className="text-lg text-muted">
                    Start creating viral content today. Upgrade or downgrade anytime.
                </p>
            </div>

            {error && (
                <div className="error-banner">
                    <p>{error}</p>
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            <div className="pricing-grid">
                {plans.map((plan) => (
                    <div
                        key={plan.type}
                        className={`pricing-card glass-card ${plan.popular ? 'popular' : ''} ${currentPlan === plan.type ? 'current' : ''}`}
                    >
                        {plan.popular && (
                            <div className="popular-badge">
                                <Sparkles size={14} />
                                Most Popular
                            </div>
                        )}

                        <div className="plan-icon">{getPlanIcon(plan.type)}</div>

                        <h3 className="plan-name">{plan.name}</h3>
                        <p className="plan-description">{plan.description}</p>

                        <div className="plan-price">
                            <span className="price-amount">${plan.price}</span>
                            <span className="price-period">/month</span>
                        </div>

                        <ul className="feature-list">
                            {getFeatureList(plan.type).map((feature, index) => (
                                <li key={index} className="feature-item">
                                    <Check size={18} className="check-icon" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            className={`btn ${currentPlan === plan.type ? 'btn-secondary' : 'btn-primary'} btn-lg w-full`}
                            onClick={() => handleSelectPlan(plan.type)}
                            disabled={currentPlan === plan.type || loading === plan.type}
                        >
                            {loading === plan.type ? (
                                <>
                                    <Loader2 size={18} className="spinner" />
                                    Processing...
                                </>
                            ) : currentPlan === plan.type ? (
                                'Current Plan'
                            ) : (
                                'Get Started'
                            )}
                        </button>
                    </div>
                ))}
            </div>

            <div className="pricing-footer">
                <p className="text-sm text-muted">
                    All plans include: AI-powered video generation, trend analysis, and 24/7 support
                </p>
            </div>
        </div>
    );
}

export default PricingTable;
