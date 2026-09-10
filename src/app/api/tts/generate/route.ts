import { NextResponse } from "next/server";
import {
  generateSpotViaGateway,
  hasGatewayAuth,
  type TtsVoiceId,
} from "@/lib/tts/gateway";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      voice?: TtsVoiceId;
    };

    const text = String(body.text || "").trim();
    if (!text) {
      return NextResponse.json({ error: "Chýba text spotu." }, { status: 400 });
    }

    if (!hasGatewayAuth() && !process.env.AI_GATEWAY_API_KEY) {
      // Still attempt — on Vercel OIDC may inject at runtime via @vercel/oidc
    }

    const audio = await generateSpotViaGateway({
      text,
      voice: body.voice,
    });

    return NextResponse.json({
      ok: true,
      audio,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Generovanie audia zlyhalo.";
    const needsKey =
      /api key|auth|unauthorized|401|oidc|credential/i.test(message) ||
      (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN);

    return NextResponse.json(
      {
        error: message,
        hint: needsKey
          ? "Na Verceli stačí linked projekt (OIDC). Lokálne: AI_GATEWAY_API_KEY alebo `vercel env pull`."
          : undefined,
      },
      { status: 502 },
    );
  }
}
