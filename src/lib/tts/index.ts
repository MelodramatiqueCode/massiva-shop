import { generateSpotViaGateway, hasGatewayAuth } from "./gateway";
import {
  ELEVENLABS_VOICES,
  generateSpotViaElevenLabs,
  hasElevenLabsAuth,
} from "./elevenlabs";
import { getTtsProvider, type GeneratedSpotAudio, type TtsVoiceOption } from "./types";
import { TTS_VOICES as GATEWAY_VOICES } from "./gateway";

export type { GeneratedSpotAudio, TtsVoiceOption };

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
}): Promise<GeneratedSpotAudio> {
  const provider = getTtsProvider();
  if (provider === "gateway") {
    return generateSpotViaGateway({
      text: input.text,
      voice: input.voice as Parameters<typeof generateSpotViaGateway>[0]["voice"],
    });
  }
  return generateSpotViaElevenLabs({
    text: input.text,
    voiceId: input.voice,
  });
}
