"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ELEVENLABS_MODELS,
  SPOT_LANGUAGES,
  modelsForLanguage,
  voicesForLanguage,
  type ElevenLabsModelId,
} from "@/lib/tts/elevenlabs";
import type { SpotLanguage } from "@/lib/tts/types";
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

const DEFAULT_SCRIPTS: Record<SpotLanguage, string> = {
  sk: "Navštívte našu predajňu tento víkend. Akciové ceny na celý sortiment. Massiva Air — váš spot medzi regálmi.",
  hu: "Látogasson el üzletünkbe ezen a hétvégén. Akciós árak a teljes választékra. Massiva Air — az Ön spotja a polcok között.",
};

export function SpotTtsPanel({
  disabled = false,
  defaultScript,
  providerHint = "elevenlabs",
}: Props) {
  const [language, setLanguage] = useState<SpotLanguage>("sk");
  const voices = useMemo(() => {
    if (providerHint === "gateway") return [...GATEWAY_VOICES];
    return voicesForLanguage(language);
  }, [providerHint, language]);
  const models = useMemo(() => modelsForLanguage(language), [language]);

  const [script, setScript] = useState(
    defaultScript ?? DEFAULT_SCRIPTS.sk,
  );
  const [voice, setVoice] = useState(voices[0]?.id ?? "");
  const [model, setModel] = useState<ElevenLabsModelId>("eleven_multilingual_v2");
  const [bedEnabled, setBedEnabled] = useState(true);
  const [bedId, setBedId] = useState(BED_CATALOG[0]?.id ?? "podmaz-1");
  /** UI: 0–100 → mapuje na ~−28 … −10 dB */
  const [bedLevel, setBedLevel] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [audio, setAudio] = useState<AudioPayload | null>(null);

  // Pri zmene jazyka: HU → v3, filtrované hlasy, default script ak ešte default
  useEffect(() => {
    if (providerHint !== "elevenlabs") return;

    const allowed = modelsForLanguage(language);
    if (!allowed.some((m) => m.id === model)) {
      setModel(allowed[0]?.id ?? "eleven_v3");
    }

    const nextVoices = voicesForLanguage(language);
    if (!nextVoices.some((v) => v.id === voice)) {
      setVoice(nextVoices[0]?.id ?? "");
    }

    const defaults = Object.values(DEFAULT_SCRIPTS);
    if (!defaultScript && defaults.includes(script)) {
      setScript(DEFAULT_SCRIPTS[language]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only on language change
  }, [language, providerHint]);

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
          model: providerHint === "elevenlabs" ? model : undefined,
          language: providerHint === "elevenlabs" ? language : undefined,
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

  const modelMeta = ELEVENLABS_MODELS.find((m) => m.id === model);
  const langMeta = SPOT_LANGUAGES.find((l) => l.id === language);
  const badge =
    providerHint === "gateway"
      ? "openai/tts-1"
      : model === "eleven_v3"
        ? `elevenlabs · v3 · ${language}`
        : `elevenlabs · v2 · ${language}`;

  return (
    <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[rgba(7,21,18,0.03)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-[family-name:var(--font-display)] text-base font-bold">
          Spot TTS
        </h3>
        <span className="chip">{badge}</span>
      </div>

      <div className="field">
        <label htmlFor="spotScript">
          Text spotu ({language === "hu" ? "HU" : "SK"})
        </label>
        <textarea
          id="spotScript"
          name="spotScript"
          rows={4}
          value={script}
          onChange={(e) => setScript(e.target.value)}
          disabled={disabled}
          required
          className="min-h-[6rem] w-full resize-y"
          placeholder={
            language === "hu"
              ? "Írja be a reklám szövegét…"
              : "Napíšte text reklamy…"
          }
        />
        <p className="mt-1 text-xs text-[var(--ink-soft)]">
          Cieľ ~15–30 s. Provider:{" "}
          {providerHint === "gateway"
            ? "Vercel AI Gateway"
            : `ElevenLabs · ${modelMeta?.label ?? model}`}
          .
          {providerHint === "elevenlabs" && model === "eleven_v3"
            ? ` V3 posiela language_code=${language}.`
            : null}
          {providerHint === "elevenlabs" && language === "hu"
            ? " Maďarčina vyžaduje model v3 (Multilingual v2 HU nepodporuje)."
            : null}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {providerHint === "elevenlabs" ? (
          <div className="field">
            <label htmlFor="ttsLanguage">Jazyk</label>
            <select
              id="ttsLanguage"
              name="ttsLanguage"
              value={language}
              onChange={(e) => setLanguage(e.target.value as SpotLanguage)}
              disabled={disabled || loading}
            >
              {SPOT_LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label} — {l.hint}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {providerHint === "elevenlabs" ? (
          <div className="field">
            <label htmlFor="ttsModel">Model</label>
            <select
              id="ttsModel"
              name="ttsModel"
              value={model}
              onChange={(e) => setModel(e.target.value as ElevenLabsModelId)}
              disabled={disabled || loading}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.hint}
                </option>
              ))}
            </select>
          </div>
        ) : null}

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

        <div
          className={`flex items-end ${providerHint === "elevenlabs" ? "md:col-span-2" : ""}`}
        >
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
                Hlas ostáva dominantný; podklad ~
                {bedVolumeDbFromLevel(bedLevel).toFixed(0)} dB.
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
            {audio.model ? ` · ${audio.model}` : ""}
            {audio.provider ? ` · ${audio.provider}` : ""}
            {langMeta ? ` · ${langMeta.id}` : ""}
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
      <input type="hidden" name="spotLanguage" value={language} />
    </div>
  );
}
