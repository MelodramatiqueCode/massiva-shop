import { NextResponse } from "next/server";
import {
  generateSpotAudio,
  getActiveTtsProvider,
  hasActiveTtsAuth,
} from "@/lib/tts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      voice?: string;
      bedId?: string | null;
      bedVolumeDb?: number;
    };

    const text = String(body.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "Chýba text spotu." }, { status: 400 });
    }

    const provider = getActiveTtsProvider();
    if (!hasActiveTtsAuth()) {
      const hint =
        provider === "elevenlabs"
          ? "Pridajte ELEVENLABS_API_KEY do Vercel Environment Variables a redeploynite."
          : "Pridajte AI_GATEWAY_API_KEY (alebo OIDC) a redeploynite.";
      return NextResponse.json(
        {
          error: `TTS provider (${provider}) nie je nakonfigurovaný.`,
          hint,
        },
        { status: 503 },
      );
    }

    const bedVolumeDb =
      typeof body.bedVolumeDb === "number" && Number.isFinite(body.bedVolumeDb)
        ? body.bedVolumeDb
        : undefined;

    const audio = await generateSpotAudio({
      text,
      voice: body.voice,
      bedId: body.bedId || null,
      bedVolumeDb,
    });

    return NextResponse.json({ ok: true, audio, provider });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Generovanie audia zlyhalo.";
    const provider = getActiveTtsProvider();
    const needsKey = /api key|auth|unauthorized|401|permission|ELEVENLABS/i.test(
      message,
    );

    return NextResponse.json(
      {
        error: message,
        hint: needsKey
          ? provider === "elevenlabs"
            ? "Skontrolujte ELEVENLABS_API_KEY a oprávnenia kľúča (text_to_speech)."
            : "Skontrolujte AI_GATEWAY_API_KEY / OIDC."
          : undefined,
      },
      { status: 502 },
    );
  }
}
