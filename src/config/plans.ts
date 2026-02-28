// Subscription Plan Configuration
// Defines the 3-tier subscription system with features and restrictions

export enum PlanType {
    TRIAL = 'TRIAL',
    STARTER = 'STARTER',
    PROFESSIONAL = 'PROFESSIONAL',
    BUSINESS = 'BUSINESS',
}

export enum AIModel {
    FAST = 'gpt-4o-mini',           // Fast (GPT-4o Mini)
    STANDARD = 'gpt-4o',            // Standard (GPT-4o)
    PRO = 'gpt-4-turbo-preview',    // Pro (GPT-4 Turbo)
}

export interface PlanFeatures {
    // Model Access
    allowedModels: AIModel[];

    // Feature Flags
    stockVideoAccess: boolean;      // Pexels integration
    hd1080pRender: boolean;         // 1080p export
    socialAutoPost: boolean;        // YouTube/Instagram auto-post

    // Limits
    maxVideosPerMonth: number;
    maxDurationMinutes: number;
}

export interface SubscriptionPlan {
    type: PlanType;
    name: string;
    price: number;                  // USD per month
    credits: number;                // Monthly credit allocation
    features: PlanFeatures;
    description: string;
    popular?: boolean;              // Highlight flag for UI
}

export const SUBSCRIPTION_PLANS: Record<PlanType, SubscriptionPlan> = {
    [PlanType.TRIAL]: {
        type: PlanType.TRIAL,
        name: 'Trial',
        price: 1,
        credits: 1500,
        description: 'Try our platform with limited credits',
        features: {
            allowedModels: [AIModel.FAST],
            stockVideoAccess: false,
            hd1080pRender: false,
            socialAutoPost: false,
            maxVideosPerMonth: 4,       // ~4 shorts at 100 credits each
            maxDurationMinutes: 3,
        },
    },
    [PlanType.STARTER]: {
        type: PlanType.STARTER,
        name: 'Starter',
        price: 29,
        credits: 30000,
        description: 'Perfect for content creators getting started',
        features: {
            allowedModels: [AIModel.FAST],
            stockVideoAccess: false,
            hd1080pRender: false,
            socialAutoPost: false,
            maxVideosPerMonth: 25,      // ~25 shorts at 100 credits each
            maxDurationMinutes: 5,
        },
    },
    [PlanType.PROFESSIONAL]: {
        type: PlanType.PROFESSIONAL,
        name: 'Professional',
        price: 69,
        credits: 75000,
        description: 'For serious creators scaling their content',
        popular: true,
        features: {
            allowedModels: [AIModel.FAST, AIModel.STANDARD],
            stockVideoAccess: true,
            hd1080pRender: true,
            socialAutoPost: false,
            maxVideosPerMonth: 75,
            maxDurationMinutes: 15,
        },
    },
    [PlanType.BUSINESS]: {
        type: PlanType.BUSINESS,
        name: 'Business',
        price: 149,
        credits: 160000,
        description: 'For agencies and power users',
        features: {
            allowedModels: [AIModel.FAST, AIModel.STANDARD, AIModel.PRO],
            stockVideoAccess: true,
            hd1080pRender: true,
            socialAutoPost: true,
            maxVideosPerMonth: -1,      // Unlimited
            maxDurationMinutes: 60,
        },
    },
};

// Helper function to get plan by type
export function getPlan(planType: PlanType): SubscriptionPlan {
    return SUBSCRIPTION_PLANS[planType];
}

// Helper function to check if model is allowed for plan
export function isModelAllowed(planType: PlanType, model: AIModel): boolean {
    const plan = getPlan(planType);
    return plan.features.allowedModels.includes(model);
}

// Helper function to get all plans as array (for UI)
export function getAllPlans(): SubscriptionPlan[] {
    return Object.values(SUBSCRIPTION_PLANS);
}
