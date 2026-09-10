import { generateSpotViaGateway, hasGatewayAuth } from "./gateway";
import {
  ELEVENLABS_VOICES,
  generateSpotViaElevenLabs,
  hasElevenLabsAuth,
} from "./elevenlabs";
import { getTtsProvider, type GeneratedSpotAudio, type TtsVoiceOption } from "./types";
import { TTS_VOICES as GATEWAY_VOICES } from "./gateway";
import {
  bufferToMp3DataUrl,
  dataUrlToBuffer,
  getBedById,
  mixVoiceWithBed,
} from "./beds";

export type { GeneratedSpotAudio, TtsVoiceOption };
export { BED_CATALOG, getBedById } from "./beds-catalog";

export function listTtsVoices(): TtsVoiceOption[] {
  return getTtsProvider() === "gateway" ? [...GATEWAY_VOICES] : ELEVENLABS_VOICES;
}

export function getActiveTtsProvider() {
  return getTtsProvider();
}

export function hasActiveTtsAuth(): boolean {
  return getTtsProvider() === "gateway"
    ? hasGatewayAuth()
    : hasElevenLabsAuth();
}

export async function generateSpotAudio(input: {
  text: string;
  voice?: string;
  /** ElevenLabs model id (v2 / v3). Ignorované pri gateway. */
  model?: string | null;
  /** sk | hu — pri hu server vynúti eleven_v3 + language_code. */
  language?: string | null;
  bedId?: string | null;
  /** Hlasitosť podkladu v dB (typicky -22 … -12). Default -18. */
  bedVolumeDb?: number;
}): Promise<GeneratedSpotAudio> {
  const provider = getTtsProvider();
  let audio: GeneratedSpotAudio;
  if (provider === "gateway") {
    audio = await generateSpotViaGateway({
      text: input.text,
      voice: input.voice as Parameters<typeof generateSpotViaGateway>[0]["voice"],
    });
  } else {
    audio = await generateSpotViaElevenLabs({
      text: input.text,
      voiceId: input.voice,
      model: input.model,
      language: input.language,
    });
  }

  const bed = getBedById(input.bedId);
  if (!bed) return audio;

  const voiceBuf = dataUrlToBuffer(audio.dataUrl);
  const mixed = await mixVoiceWithBed(
    voiceBuf,
    bed.id,
    input.bedVolumeDb ?? -18,
  );
  const stamp = Date.now().toString(36);

  return {
    ...audio,
    dataUrl: bufferToMp3DataUrl(mixed.buffer),
    filename: `spot-bed-${bed.id}-${stamp}.mp3`,
    durationSec: mixed.durationSec,
  };
}
