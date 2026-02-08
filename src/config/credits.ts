// Credit Cost Configuration
// Defines how many credits each operation costs

export enum OperationType {
    SHORTS_SCENE = 'SHORTS_SCENE',
    LONG_VIDEO_MINUTE = 'LONG_VIDEO_MINUTE',
    AI_VOICEOVER_MINUTE = 'AI_VOICEOVER_MINUTE',
    STOCK_VIDEO_SEARCH = 'STOCK_VIDEO_SEARCH',
}

export interface CreditCost {
    operation: OperationType;
    baseCredits: number;
    description: string;
}

export const CREDIT_COSTS: Record<OperationType, CreditCost> = {
    [OperationType.SHORTS_SCENE]: {
        operation: OperationType.SHORTS_SCENE,
        baseCredits: 100,
        description: 'Per Shorts scene (image + video generation)',
    },
    [OperationType.LONG_VIDEO_MINUTE]: {
        operation: OperationType.LONG_VIDEO_MINUTE,
        baseCredits: 250,
        description: 'Per minute of long-form video',
    },
    [OperationType.AI_VOICEOVER_MINUTE]: {
        operation: OperationType.AI_VOICEOVER_MINUTE,
        baseCredits: 50,
        description: 'Per minute of AI voiceover (ElevenLabs)',
    },
    [OperationType.STOCK_VIDEO_SEARCH]: {
        operation: OperationType.STOCK_VIDEO_SEARCH,
        baseCredits: 10,
        description: 'Per stock video search/download (Pexels)',
    },
};

// AI Model cost multipliers (applied to base cost)
export const MODEL_MULTIPLIERS = {
    'gpt-4o-mini': 1.0,           // Fast - no multiplier
    'gpt-4o': 1.5,                // Standard - 1.5x cost
    'gpt-4-turbo-preview': 2.0,   // Pro - 2x cost
};

// Helper function to calculate total cost
export function calculateCost(
    operation: OperationType,
    quantity: number = 1,
    aiModel?: string
): number {
    const baseCost = CREDIT_COSTS[operation].baseCredits;
    const multiplier = aiModel ? (MODEL_MULTIPLIERS[aiModel] || 1.0) : 1.0;
    return Math.ceil(baseCost * quantity * multiplier);
}

// Helper function to estimate video cost
export function estimateVideoCost(params: {
    type: 'shorts' | 'long';
    duration?: number;      // minutes (for long videos)
    scenes?: number;        // number of scenes (for shorts)
    aiModel?: string;
    includeVoiceover?: boolean;
    useStockVideo?: boolean;
}): number {
    let totalCost = 0;

    if (params.type === 'shorts') {
        const scenes = params.scenes || 1;
        totalCost += calculateCost(OperationType.SHORTS_SCENE, scenes, params.aiModel);
    } else {
        const duration = params.duration || 1;
        totalCost += calculateCost(OperationType.LONG_VIDEO_MINUTE, duration, params.aiModel);

        if (params.includeVoiceover) {
            totalCost += calculateCost(OperationType.AI_VOICEOVER_MINUTE, duration);
        }
    }

    if (params.useStockVideo) {
        const searches = params.scenes || Math.ceil((params.duration || 1) * 2);
        totalCost += calculateCost(OperationType.STOCK_VIDEO_SEARCH, searches);
    }

    return totalCost;
}
