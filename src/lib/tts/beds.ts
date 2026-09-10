import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpegStatic from "ffmpeg-static";
import {
  BED_FADE_IN_SEC,
  BED_FADE_OUT_SEC,
  BED_LEAD_SEC,
  BED_TAIL_SEC,
  getBedById,
} from "./beds-catalog";

export {
  BED_CATALOG,
  BED_FADE_IN_SEC,
  BED_FADE_OUT_SEC,
  BED_LEAD_SEC,
  BED_TAIL_SEC,
  getBedById,
  type BedOption,
} from "./beds-catalog";

const execFileAsync = promisify(execFile);

function resolveFfmpeg(): string {
  if (ffmpegStatic) return ffmpegStatic;
  return "ffmpeg";
}

async function probeDurationSec(ffmpeg: string, filePath: string): Promise<number> {
  // ffprobe is usually next to ffmpeg-static binary; fall back to parsing ffmpeg -i
  const ffprobe = ffmpeg.replace(/ffmpeg$/, "ffprobe");
  try {
    const { stdout } = await execFileAsync(
      ffprobe,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      { timeout: 15_000 },
    );
    const n = Number.parseFloat(stdout.trim());
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    /* fall through */
  }

  try {
    await execFileAsync(ffmpeg, ["-i", filePath], { timeout: 15_000 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(msg);
    if (m) {
      const h = Number(m[1]);
      const min = Number(m[2]);
      const sec = Number(m[3]);
      return h * 3600 + min * 60 + sec;
    }
  }
  return 15;
}

/**
 * Mixuje TTS hlas s podkladom.
 * Podmaz začína skôr a končí neskôr než hlas, s pomalým fade-in/out.
 * bedVolumeDb: typicky -22 až -12 (nižšie = tichší podklad).
 */
export async function mixVoiceWithBed(
  voiceMp3: Buffer,
  bedId: string,
  bedVolumeDb = -18,
): Promise<{ buffer: Buffer; durationSec: number }> {
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
  const voiceDur = await probeDurationSec(ffmpeg, voicePath);
  const lead = BED_LEAD_SEC;
  const tail = BED_TAIL_SEC;
  const fadeIn = BED_FADE_IN_SEC;
  const fadeOut = BED_FADE_OUT_SEC;
  const total = lead + voiceDur + tail;
  const fadeOutStart = Math.max(0, total - fadeOut);

  // Voice: silence lead + voice + silence tail
  // Bed: looped, trimmed to total, volume, slow fade in/out
  const filter = [
    `[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,asetpts=PTS-STARTPTS[vraw]`,
    `anullsrc=r=44100:cl=stereo,atrim=0:${lead.toFixed(3)},asetpts=PTS-STARTPTS[silpre]`,
    `anullsrc=r=44100:cl=stereo,atrim=0:${tail.toFixed(3)},asetpts=PTS-STARTPTS[silpost]`,
    `[silpre][vraw][silpost]concat=n=3:v=0:a=1[voice]`,
    `[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=${vol}dB,afade=t=in:st=0:d=${fadeIn.toFixed(3)},afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeOut.toFixed(3)},atrim=0:${total.toFixed(3)},asetpts=PTS-STARTPTS[bed]`,
    `[voice][bed]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`,
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
        outPath,
      ],
      { timeout: 90_000, maxBuffer: 20 * 1024 * 1024 },
    );

    const buffer = await readFile(outPath);
    return { buffer, durationSec: Math.round(total) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Mixovanie podkladu zlyhalo: ${msg.slice(0, 280)}`);
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
