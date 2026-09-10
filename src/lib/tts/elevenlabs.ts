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
  { id: "8DN33ptiiwyivln5PvDi", label: "Massiva (predvolený)" },
  { id: "21m00Tcm4TlvDq8ikWAM", label: "Rachel (ženský)" },
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah (ženský)" },
  { id: "pNInz6obpgDQGcFmaJgB", label: "Adam (mužský)" },
  { id: "VR6AewLTigWG4xSOukaG", label: "Arnold (mužský)" },
  { id: "TxGEqnHWrfWFTfGW9XjX", label: "Josh (mužský)" },
  { id: "MF3mGyEYCl7XYWbV9V6O", label: "Elli (ženský)" },
];

export const DEFAULT_ELEVENLABS_VOICE =
  process.env.ELEVENLABS_VOICE_ID || "8DN33ptiiwyivln5PvDi";

export const ELEVENLABS_MODEL =
  process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

export function hasElevenLabsAuth(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

export async function generateSpotViaElevenLabs(input: {
  text: string;
  voiceId?: string;
}): Promise<GeneratedSpotAudio> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Chýba ELEVENLABS_API_KEY. Pridajte ho do Vercel Environment Variables.",
    );
  }

  const text = assertSpotScript(input.text);
  const voiceId = input.voiceId || DEFAULT_ELEVENLABS_VOICE;
  const model = ELEVENLABS_MODEL;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.15,
          use_speaker_boost: true,
        },
      }),
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
