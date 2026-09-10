/** Shared TTS types + provider switch. */

export type GeneratedSpotAudio = {
  mimeType: "audio/mpeg";
  dataUrl: string;
  filename: string;
  durationSec: number;
  model: string;
  voice: string;
  provider: "elevenlabs" | "gateway";
};

/** ~2.5 words/sec for ad pacing; clamp to spot limits. */
export function estimateDurationSec(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const sec = Math.round(words / 2.5);
  return Math.min(120, Math.max(5, sec || 5));
}

export function assertSpotScript(text: string) {
  const t = text.trim();
  if (t.length < 8) {
    throw new Error("Skript spotu je príliš krátky (min. ~8 znakov).");
  }
  if (t.length > 1200) {
    throw new Error("Skript je príliš dlhý (max. ~1200 znakov / ~30–40 s).");
  }
  return t;
}

export type SpotLanguage = "sk" | "hu";

export type TtsVoiceOption = {
  id: string;
  label: string;
  /** Jazyky, pre ktoré je hlas v katalógu. Default: sk+hu. */
  languages?: SpotLanguage[];
};

export function getTtsProvider(): "elevenlabs" | "gateway" {
  const raw = (process.env.TTS_PROVIDER || "elevenlabs").toLowerCase();
  return raw === "gateway" ? "gateway" : "elevenlabs";
}
