"use client";

import { useMemo, useState } from "react";
import {
  ELEVENLABS_VOICES,
} from "@/lib/tts/elevenlabs";
import { TTS_VOICES as GATEWAY_VOICES } from "@/lib/tts/gateway";
import { BED_CATALOG } from "@/lib/tts/beds-catalog";

type Props = {
  disabled?: boolean;
  defaultScript?: string;
  /** Client hint — actual provider is chosen server-side via TTS_PROVIDER. */
  providerHint?: "elevenlabs" | "gateway";
};

type AudioPayload = {
  dataUrl: string;
  filename: string;
  durationSec: number;
  voice: string;
  model: string;
  provider?: string;
};

export function SpotTtsPanel({
  disabled = false,
  defaultScript = "Navštívte našu predajňu tento víkend. Akciové ceny na celý sortiment. Massiva Air — váš spot medzi regálmi.",
  providerHint = "elevenlabs",
}: Props) {
  const voices = useMemo(
    () => (providerHint === "gateway" ? [...GATEWAY_VOICES] : ELEVENLABS_VOICES),
    [providerHint],
  );
  const [script, setScript] = useState(defaultScript);
  const [voice, setVoice] = useState(voices[0]?.id ?? "");
  const [bedEnabled, setBedEnabled] = useState(true);
  const [bedId, setBedId] = useState(BED_CATALOG[0]?.id ?? "soft");
  /** UI: 0–100 → mapuje na ~−28 … −10 dB */
  const [bedLevel, setBedLevel] = useState(45);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [audio, setAudio] = useState<AudioPayload | null>(null);

  function bedVolumeDbFromLevel(level: number): number {
    const t = Math.max(0, Math.min(100, level)) / 100;
    return -28 + t * 18;
  }

  async function generate() {
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const res = await fetch("/api/tts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: script,
          voice,
          bedId: bedEnabled ? bedId : null,
          bedVolumeDb: bedEnabled ? bedVolumeDbFromLevel(bedLevel) : undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        hint?: string;
        audio?: AudioPayload;
        provider?: string;
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

  const badge =
    providerHint === "gateway" ? "openai/tts-1" : "elevenlabs · multilingual v2";

  return (
    <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[rgba(7,21,18,0.03)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-[family-name:var(--font-display)] text-base font-bold">
          Spot TTS
        </h3>
        <span className="chip">{badge}</span>
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
          Cieľ ~15–30 s. Provider:{" "}
          {providerHint === "gateway"
            ? "Vercel AI Gateway"
            : "ElevenLabs (SK cez multilingual v2)"}
          .
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="field">
          <label htmlFor="ttsVoice">Hlas</label>
          <select
            id="ttsVoice"
            name="ttsVoice"
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            disabled={disabled || loading}
          >
            {voices.map((v) => (
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

      <div className="space-y-3 border-t border-[var(--line)] pt-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={bedEnabled}
            onChange={(e) => setBedEnabled(e.target.checked)}
            disabled={disabled || loading}
          />
          <span className="font-medium">Podmaz (hudba pod hlasom)</span>
        </label>

        {bedEnabled ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="field">
              <label htmlFor="bedStyle">Štýl podkladu</label>
              <select
                id="bedStyle"
                name="bedStyle"
                value={bedId}
                onChange={(e) => setBedId(e.target.value)}
                disabled={disabled || loading}
              >
                {BED_CATALOG.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="bedLevel">
                Hlasitosť podkladu ({bedLevel}%)
              </label>
              <input
                id="bedLevel"
                name="bedLevel"
                type="range"
                min={0}
                max={100}
                value={bedLevel}
                onChange={(e) => setBedLevel(Number(e.target.value))}
                disabled={disabled || loading}
                className="w-full"
              />
              <p className="mt-1 text-xs text-[var(--ink-soft)]">
                Hlas ostáva dominantný; podklad ~{bedVolumeDbFromLevel(bedLevel).toFixed(0)}{" "}
                dB.
              </p>
            </div>
          </div>
        ) : null}
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
            {audio.provider ? ` · ${audio.provider}` : ""}
            {bedEnabled ? ` · podmaz ${bedId}` : ""}
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
      <input
        type="hidden"
        name="spotSource"
        value={audio ? `${audio.provider || providerHint}-tts` : "mock"}
      />
    </div>
  );
}
