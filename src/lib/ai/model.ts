import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import type { LanguageModelV1 } from "ai";

/**
 * Returns the configured AI model based on AI_PROVIDER env var.
 * Supports "anthropic" (default) and "google".
 *
 * .env.local:
 *   AI_PROVIDER=anthropic | google
 *   ANTHROPIC_API_KEY=...         ANTHROPIC_MODEL=claude-sonnet-4-6 (optional)
 *   GOOGLE_GENERATIVE_AI_API_KEY=... GOOGLE_MODEL=gemini-2.0-flash (optional)
 */
export function getModel(): LanguageModelV1 {
  const provider = process.env.AI_PROVIDER ?? "anthropic";

  if (provider === "google") {
    return google(process.env.GOOGLE_MODEL ?? "gemini-3-flash-preview");
  }

  return anthropic(process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6");
}
