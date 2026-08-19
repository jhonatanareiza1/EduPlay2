export interface AIContentGenerationRequest {
    type: string;
    subject?: string;
    topic?: string;
    difficulty?: string;
    language?: string;
    count?: number;
    instructions?: string;
    context?: Record<string, unknown>;
}

export interface AIContentGenerationResult {
    content: unknown;
    provider: string;
    model: string;
    generatedAt: Date;
}

export interface AIContentValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    normalizedContent?: unknown;
}

export interface AIProvider {
    generateContent(
        request: AIContentGenerationRequest,
    ): Promise<AIContentGenerationResult>;

    validateContent(
        content: unknown,
        context?: Record<string, unknown>,
    ): Promise<AIContentValidationResult>;
}