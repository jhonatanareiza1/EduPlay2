import type { AIProvider } from "./AIProvider";
import { GeminiAIProvider } from "./GeminiAIProvider";

export function createAIProvider(): AIProvider {
    const provider = process.env.AI_PROVIDER ?? "gemini";

    switch (provider) {
        case "gemini": {
            const apiKey = process.env.GEMINI_API_KEY;

            if (!apiKey) {
                throw new Error(
                    "GEMINI_API_KEY is not configured.",
                );
            }

            const model =
                process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

            return new GeminiAIProvider(apiKey, model);
        }

        default:
            throw new Error(
                `Unsupported AI provider: ${provider}`,
            );
    }
}