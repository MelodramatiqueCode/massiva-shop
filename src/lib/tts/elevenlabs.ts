import {
  assertSpotScript,
  estimateDurationSec,
  type GeneratedSpotAudio,
  type TtsVoiceOption,
} from "./types";

/**
 * Premade ElevenLabs voices (multilingual_v2 supports Slovak).
 * Restricted API keys often cannot list voices — keep a fixed catalog.
 */
export const ELEVENLABS_VOICES: TtsVoiceOption[] = [
  { id: "8DN33ptiiwyivln5PvDi", label: "Massiva 1" },
  { id: "LDkdzEZ4RBoQe2cmKR9W", label: "Massiva 2" },
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel (ženský)" },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah (ženský)" },
  { id: "pNInz6obpgDQGcFmaJgB", label: "Adam (mužský)" },
  { id: "VR6AewLTigWG4xSOukaG", label: "Arnold (mužský)" },
  { id: "TxGEqnHWrfWFTfGW9XjX", label: "Josh (mužský)" },
  { id: "MF3mGyEYCl7XYWbV9V6O", label: "Elli (ženský)" },
];

export const DEFAULT_ELEVENLABS_VOICE =
  process.env.ELEVENLABS_VOICE_ID || "8DN33ptiiwyivln5PvDi";

/** Povolené TTS modely (SK: v2 + v3). */
export const ELEVENLABS_MODELS = [
  {
    id: "eleven_multilingual_v2",
    label: "Multilingual v2",
    hint: "Stabilný, overený pre spoty",
  },
  {
    id: "eleven_v3",
    label: "Eleven v3",
    hint: "Expresívnejší, SK cez language_code",
  },
] as const;

export type ElevenLabsModelId = (typeof ELEVENLABS_MODELS)[number]["id"];

export const ELEVENLABS_MODEL =
  process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

export function resolveElevenLabsModel(
  requested?: string | null,
): ElevenLabsModelId {
  const raw = (requested || ELEVENLABS_MODEL || "").trim();
  const found = ELEVENLABS_MODELS.find((m) => m.id === raw);
  return found?.id ?? "eleven_multilingual_v2";
}

export function hasElevenLabsAuth(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

export async function generateSpotViaElevenLabs(input: {
  text: string;
  voiceId?: string;
  model?: string | null;
}): Promise<GeneratedSpotAudio> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Chýba ELEVENLABS_API_KEY. Pridajte ho do Vercel Environment Variables.",
    );
  }

  const text = assertSpotScript(input.text);
  const voiceId = input.voiceId || DEFAULT_ELEVENLABS_VOICE;
  const model = resolveElevenLabsModel(input.model);
  const isV3 = model === "eleven_v3";

  const body: Record<string, unknown> = {
    text,
    model_id: model,
    voice_settings: isV3
      ? {
          // V3: vyššia stabilita = menej „divoký“ výkon — vhodné pre spoty
          stability: 0.5,
          similarity_boost: 0.75,
        }
      : {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.15,
          use_speaker_boost: true,
        },
  };

  // language_code funguje na V3 (nie na multilingual_v2)
  if (isV3) {
    body.language_code = "sk";
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    let detail = `ElevenLabs HTTP ${res.status}`;
    try {
      const err = (await res.json()) as {
        detail?: { message?: string } | string;
      };
      if (typeof err.detail === "string") detail = err.detail;
      else if (err.detail?.message) detail = err.detail.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const stamp = Date.now().toString(36);
  const voiceLabel =
    ELEVENLABS_VOICES.find((v) => v.id === voiceId)?.label || voiceId;

  return {
    mimeType: "audio/mpeg",
    dataUrl: `data:audio/mpeg;base64,${buf.toString("base64")}`,
    filename: `spot-el-${stamp}.mp3`,
    durationSec: estimateDurationSec(text),
    model,
    voice: voiceLabel,
    provider: "elevenlabs",
  };
}
