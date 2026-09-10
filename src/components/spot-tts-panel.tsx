"use client";

import { useState } from "react";
import { TTS_VOICES, type TtsVoiceId } from "@/lib/tts/gateway";

type Props = {
  disabled?: boolean;
  defaultScript?: string;
};

type AudioPayload = {
  dataUrl: string;
  filename: string;
  durationSec: number;
  voice: string;
  model: string;
};

export function SpotTtsPanel({
  disabled = false,
  defaultScript = "Navštívte našu predajňu tento víkend. Akciové ceny na celý sortiment. Massiva Air — váš spot medzi regálmi.",
}: Props) {
  const [script, setScript] = useState(defaultScript);
  const [voice, setVoice] = useState<TtsVoiceId>("nova");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [audio, setAudio] = useState<AudioPayload | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const res = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: script, voice }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        hint?: string;
        audio?: AudioPayload;
      };
      if (!res.ok || !data.audio) {
        setError(data.error || "Generovanie zlyhalo.");
        setHint(data.hint || null);
        setAudio(null);
        return;
      }
      setAudio(data.audio);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sieťová chyba.");
      setAudio(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[rgba(7,21,18,0.03)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-[family-name:var(--font-display)] text-base font-bold">
          Spot cez AI Gateway (TTS)
        </h3>
        <span className="chip">openai/tts-1</span>
      </div>

      <div className="field">
        <label htmlFor="spotScript">Text spotu (SK)</label>
        <textarea
          id="spotScript"
          name="spotScript"
          rows={4}
          value={script}
          onChange={(e) => setScript(e.target.value)}
          disabled={disabled}
          required
          className="min-h-[6rem] w-full resize-y"
          placeholder="Napíšte text reklamy…"
        />
        <p className="mt-1 text-xs text-[var(--ink-soft)]">
          Cieľ ~15–30 s. Gateway na Verceli beží cez OIDC; lokálne treba
          AI_GATEWAY_API_KEY.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="field">
          <label htmlFor="ttsVoice">Hlas</label>
          <select
            id="ttsVoice"
            name="ttsVoice"
            value={voice}
            onChange={(e) => setVoice(e.target.value as TtsVoiceId)}
            disabled={disabled || loading}
          >
            {TTS_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            className="btn btn-ghost w-full"
            onClick={generate}
            disabled={disabled || loading || script.trim().length < 8}
          >
            {loading ? "Generujem…" : "Vygenerovať audio"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-[rgba(212,83,60,0.45)] bg-[rgba(212,83,60,0.12)] px-3 py-2 text-sm">
          <p className="font-semibold">{error}</p>
          {hint ? <p className="mt-1 text-[var(--ink-soft)]">{hint}</p> : null}
        </div>
      ) : null}

      {audio ? (
        <div className="space-y-2">
          <audio controls src={audio.dataUrl} className="w-full" />
          <p className="text-xs text-[var(--ink-soft)]">
            {audio.filename} · ~{audio.durationSec}s · {audio.voice}
          </p>
        </div>
      ) : (
        <p className="text-xs text-[var(--ink-soft)]">
          Bez generovania sa použije mock súbor (ako doteraz).
        </p>
      )}

      <input
        type="hidden"
        name="spotFilename"
        value={audio?.filename || "spot-30s.mp3"}
      />
      <input
        type="hidden"
        name="spotDurationSec"
        value={audio?.durationSec || 30}
      />
      <input type="hidden" name="spotStorageKey" value={audio?.dataUrl || ""} />
      <input type="hidden" name="spotSource" value={audio ? "gateway-tts" : "mock"} />
    </div>
  );
}
