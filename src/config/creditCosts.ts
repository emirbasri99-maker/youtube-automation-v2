// Credit Cost Configuration
// Central configuration for all credit-based operations

export const CREDIT_COSTS = {
    // Shorts Production
    SHORTS_PER_SCENE: 100,

    // Long Video Production
    LONG_VIDEO_PER_MINUTE: 250,

    // AI Model Costs (additional to base cost)
    AI_MODEL: {
        FAST: 0,      // GPT-4o Mini - Free
        STANDARD: 20, // GPT-4o
        PRO: 50,      // GPT-4 Turbo
    },

    // Trend Analysis
    TREND_ANALYSIS: 50,
} as const;

export type AIModelType = keyof typeof CREDIT_COSTS.AI_MODEL;

/**
 * Calculate cost for Shorts production
 * @param scenes Number of scenes to generate
 * @param aiModel AI model selection ('FAST' | 'STANDARD' | 'PRO')
 * @returns Total credit cost
 */
export function calculateShortsCost(
    scenes: number,
    aiModel: AIModelType = 'FAST'
): number {
    const baseCost = scenes * CREDIT_COSTS.SHORTS_PER_SCENE;
    const aiCost = CREDIT_COSTS.AI_MODEL[aiModel];
    return baseCost + aiCost;
}

/**
 * Calculate cost for Long Video production
 * @param minutes Video duration in minutes
 * @param aiModel AI model selection ('FAST' | 'STANDARD' | 'PRO')
 * @returns Total credit cost
 */
export function calculateLongVideoCost(
    minutes: number,
    aiModel: AIModelType = 'FAST'
): number {
    const baseCost = Math.ceil(minutes) * CREDIT_COSTS.LONG_VIDEO_PER_MINUTE;
    const aiCost = CREDIT_COSTS.AI_MODEL[aiModel];
    return baseCost + aiCost;
}

/**
 * Calculate cost for Trend Analysis
 * @returns Fixed credit cost
 */
export function calculateTrendAnalysisCost(): number {
    return CREDIT_COSTS.TREND_ANALYSIS;
}

/**
 * Get AI model cost
 * @param aiModel AI model type
 * @returns Credit cost for the model
 */
export function getAIModelCost(aiModel: AIModelType): number {
    return CREDIT_COSTS.AI_MODEL[aiModel];
}

/**
 * Format credit amount for display
 * @param credits Number of credits
 * @returns Formatted string (e.g., "1,250 Kredi")
 */
export function formatCredits(credits: number): string {
    return `${credits.toLocaleString('en-US')} Credits`;
}

/**
 * Check if user has sufficient credits
 * @param available Available credits
 * @param required Required credits
 * @returns Object with sufficient flag and shortfall amount
 */
export function checkSufficientCredits(
    available: number,
    required: number
): { sufficient: boolean; shortfall: number } {
    return {
        sufficient: available >= required,
        shortfall: Math.max(0, required - available),
    };
}
