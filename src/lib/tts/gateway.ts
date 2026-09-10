import { generateSpeech } from "ai";
import { gateway } from "@ai-sdk/gateway";

export const TTS_VOICES = [
  { id: "alloy", label: "Alloy (neutrál)" },
  { id: "nova", label: "Nova (ženský)" },
  { id: "onyx", label: "Onyx (mužský)" },
  { id: "shimmer", label: "Shimmer (svetlý)" },
  { id: "echo", label: "Echo" },
  { id: "fable", label: "Fable" },
] as const;

export type TtsVoiceId = (typeof TTS_VOICES)[number]["id"];

export type GeneratedSpotAudio = {
  mimeType: "audio/mpeg";
  /** data: URL for preview + mock Content storage */
  dataUrl: string;
  filename: string;
  /** Rough duration estimate from script length */
  durationSec: number;
  model: string;
  voice: string;
  provider: "gateway";
};

/** ~2.5 words/sec for ad-like pacing; clamp to in-store spot limits. */
export function estimateDurationSec(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const sec = Math.round(words / 2.5);
  return Math.min(120, Math.max(5, sec || 5));
}

export function hasGatewayAuth(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY ||
      process.env.VERCEL_OIDC_TOKEN ||
      process.env.VERCEL,
  );
}

/**
 * Generate spot audio via Vercel AI Gateway (OpenAI TTS).
 * On Vercel: OIDC usually works with no extra keys.
 * Locally: set AI_GATEWAY_API_KEY or run `vercel env pull`.
 */
export async function generateSpotViaGateway(input: {
  text: string;
  voice?: TtsVoiceId;
  model?: string;
}): Promise<GeneratedSpotAudio> {
  const text = input.text.trim();
  if (text.length < 8) {
    throw new Error("Skript spotu je príliš krátky (min. ~8 znakov).");
  }
  if (text.length > 1200) {
    throw new Error("Skript je príliš dlhý (max. ~1200 znakov / ~30–40 s).");
  }

  const voice = input.voice ?? "alloy";
  const modelId = input.model ?? "openai/tts-1";

  const result = await generateSpeech({
    model: gateway.speechModel(modelId),
    text,
    voice,
    outputFormat: "mp3",
  });

  const bytes = result.audio.uint8Array;
  const base64 = Buffer.from(bytes).toString("base64");
  const stamp = Date.now().toString(36);

  return {
    mimeType: "audio/mpeg",
    dataUrl: `data:audio/mpeg;base64,${base64}`,
    filename: `spot-tts-${stamp}.mp3`,
    durationSec: estimateDurationSec(text),
    model: modelId,
    voice,
    provider: "gateway",
  };
}
