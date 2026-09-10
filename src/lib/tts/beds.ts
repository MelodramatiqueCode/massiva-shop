import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpegStatic from "ffmpeg-static";
import { getBedById } from "./beds-catalog";

export { BED_CATALOG, getBedById, type BedOption } from "./beds-catalog";

const execFileAsync = promisify(execFile);

function resolveFfmpeg(): string {
  if (ffmpegStatic) return ffmpegStatic;
  return "ffmpeg";
}

/**
 * Mixuje TTS hlas s podkladom. Dĺžka = hlas, podklad loopovaný a stíšený.
 * bedVolumeDb: typicky -22 až -12 (nižšie = tichší podklad).
 */
export async function mixVoiceWithBed(
  voiceMp3: Buffer,
  bedId: string,
  bedVolumeDb = -18,
): Promise<Buffer> {
  const bed = getBedById(bedId);
  if (!bed) {
    throw new Error(`Neznámy podklad: ${bedId}`);
  }

  const bedPath = join(process.cwd(), "public", "beds", bed.file);
  let bedBuffer: Buffer;
  try {
    bedBuffer = await readFile(bedPath);
  } catch {
    throw new Error(`Podkladový súbor chýba: ${bed.file}`);
  }

  const workDir = join(tmpdir(), `massiva-mix-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });

  const voicePath = join(workDir, "voice.mp3");
  const bedTmp = join(workDir, "bed.mp3");
  const outPath = join(workDir, "out.mp3");

  await writeFile(voicePath, voiceMp3);
  await writeFile(bedTmp, bedBuffer);

  const vol = Math.max(-40, Math.min(-6, bedVolumeDb));
  const ffmpeg = resolveFfmpeg();

  const filter = [
    `[1:a]volume=${vol}dB,afade=t=in:st=0:d=0.4[bed]`,
    `[0:a][bed]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`,
  ].join(";");

  try {
    await execFileAsync(
      ffmpeg,
      [
        "-y",
        "-i",
        voicePath,
        "-stream_loop",
        "-1",
        "-i",
        bedTmp,
        "-filter_complex",
        filter,
        "-map",
        "[aout]",
        "-c:a",
        "libmp3lame",
        "-b:a",
        "192k",
        "-shortest",
        outPath,
      ],
      { timeout: 60_000, maxBuffer: 10 * 1024 * 1024 },
    );

    return await readFile(outPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Mixovanie podkladu zlyhalo: ${msg.slice(0, 200)}`);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function dataUrlToBuffer(dataUrl: string): Buffer {
  const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!m) throw new Error("Neplatný audio data URL.");
  return Buffer.from(m[2], "base64");
}

export function bufferToMp3DataUrl(buf: Buffer): string {
  return `data:audio/mpeg;base64,${buf.toString("base64")}`;
}
