/**
 * Wan 2.2 I2V Video Generator
 *
 * Replicate API üzerinden Wan 2.2 modelini kullanarak
 * statik görselden video üretir.
 *
 * Mevcut ai-story projesindeki wan_animator.py'den adapte edildi.
 * Parametreler: num_frames=81, fps=16, max_area="480p", fast_mode="balanced"
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.join(__dirname, "..", "prompts", "wan");
const FLUX_DIR = path.join(__dirname, "..", "generated", "flux");
const OUTPUT_DIR = path.join(__dirname, "..", "generated", "wan");

// Replicate credentials
const API_TOKEN = process.env.REPLICATE_API_TOKEN;
const BASE_URL = "https://api.replicate.com/v1";

// Wan 2.2 model version (ai-story projesinden)
const WAN_VERSION =
  process.env.WAN_MODEL_VERSION ??
  "4eaf2b01d3bf70d8a2e00b219efeb7cb415855ad18b7dacdc4cae664a73a6eea";

// Wan parametreleri (ai-story Config ile aynı)
const WAN_FRAMES = 81;
const WAN_FPS = 16;
const WAN_RESOLUTION = "480p";
const WAN_FAST_MODE = "balanced";
const WAN_SAMPLE_STEPS = 4;
const WAN_GUIDE_SCALE = 1.0;

// Rate limit: min 10s aralık
const MIN_INTERVAL_MS = 10_000;

interface VideoTask {
  name: string;
  inputImage: string;
  promptFile: string;
}

const ALL_TASKS: VideoTask[] = [
  { name: "male_idle", inputImage: "male_bear.png", promptFile: "idle.txt" },
  { name: "female_idle", inputImage: "female_bear.png", promptFile: "idle.txt" },
  { name: "male_walk", inputImage: "male_bear.png", promptFile: "walk_male.txt" },
  { name: "female_walk", inputImage: "female_bear.png", promptFile: "walk_female.txt" },
  { name: "hug", inputImage: "hug_scene.png", promptFile: "hug.txt" },
  { name: "heart", inputImage: "big_heart.png", promptFile: "heart_reveal.txt" },
];

// CLI arg ile filtreleme: npx tsx generate-wan-videos.ts male_walk
const filterName = process.argv[2];
const TASKS = filterName
  ? ALL_TASKS.filter((t) => t.name === filterName)
  : ALL_TASKS;

/** Prompt dosyasını oku. "---" sonrası negative prompt. */
async function readPrompt(file: string): Promise<{ prompt: string; negative: string }> {
  const raw = await fs.readFile(path.join(PROMPTS_DIR, file), "utf-8");
  const parts = raw.split(/^---$/m);
  return {
    prompt: parts[0].trim(),
    negative: (parts[1] ?? "").trim(),
  };
}

/** Görseli data URI'ye çevir (wan_animator.py'deki gibi) */
function imageToDataUri(imageBuffer: Buffer, ext: string): string {
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  };
  const mimeType = mimeTypes[ext] ?? "image/png";
  return `data:${mimeType};base64,${imageBuffer.toString("base64")}`;
}

/** Replicate prediction oluştur (wan_animator.py'deki gibi direkt HTTP) */
async function createPrediction(imageUri: string, prompt: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
      Prefer: "wait", // senkron bekleme dene
    },
    body: JSON.stringify({
      version: WAN_VERSION,
      input: {
        image: imageUri,
        prompt,
        num_frames: WAN_FRAMES,
        fps: WAN_FPS,
        max_area: WAN_RESOLUTION,
        fast_mode: WAN_FAST_MODE,
        sample_steps: WAN_SAMPLE_STEPS,
        sample_guide_scale: WAN_GUIDE_SCALE,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Prediction create failed ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { id: string; status: string; output?: unknown };

  // "Prefer: wait" ile succeeded dönmüş olabilir
  if (data.status === "succeeded" && data.output) {
    return `DONE:${JSON.stringify(data.output)}`;
  }

  return data.id;
}

/** Prediction sonucunu bekle ve video URL'sini döndür */
async function waitForResult(predictionId: string): Promise<string> {
  const timeout = 600_000; // 10 dakika
  const pollInterval = 5_000;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const res = await fetch(`${BASE_URL}/predictions/${predictionId}`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });

    if (!res.ok) {
      console.log(`  status check error: ${res.status}`);
      await new Promise((r) => setTimeout(r, pollInterval));
      continue;
    }

    const data = (await res.json()) as {
      status: string;
      output?: unknown;
      error?: string;
    };

    if (data.status === "succeeded") {
      const output = data.output;
      const videoUrl = typeof output === "string" ? output : Array.isArray(output) ? output[0] : null;
      if (!videoUrl) throw new Error("Output boş!");
      return videoUrl as string;
    }

    if (data.status === "failed") {
      throw new Error(`Prediction başarısız: ${data.error ?? "bilinmeyen hata"}`);
    }

    if (data.status === "canceled") {
      throw new Error("Prediction iptal edildi");
    }

    const elapsed = Math.round((Date.now() - start) / 1000);
    process.stdout.write(`  durum: ${data.status} (${elapsed}s)\r`);
    await new Promise((r) => setTimeout(r, pollInterval));
  }

  throw new Error("Timeout (600s)");
}

/** Video dosyasını indir */
async function downloadVideo(url: string, outPath: string): Promise<void> {
  console.log(`  Video indiriliyor…`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`İndirme hatası: ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(outPath, buf);
  console.log(`  ✓ Saved ${outPath} (${(buf.byteLength / 1024 / 1024).toFixed(1)} MB)`);
}

async function generateVideo(task: VideoTask): Promise<void> {
  const { prompt } = await readPrompt(task.promptFile);
  const imagePath = path.join(FLUX_DIR, task.inputImage);
  const imageBytes = await fs.readFile(imagePath);
  const imageUri = imageToDataUri(imageBytes, path.extname(imagePath));

  console.log(`\n[${task.name}] Prediction oluşturuluyor…`);
  console.log(`  prompt: ${prompt.slice(0, 80)}…`);
  console.log(`  params: frames=${WAN_FRAMES}, fps=${WAN_FPS}, res=${WAN_RESOLUTION}, fast=${WAN_FAST_MODE}`);

  const result = await createPrediction(imageUri, prompt);

  let videoUrl: string;

  if (result.startsWith("DONE:")) {
    // Senkron yanıt geldi
    const output = JSON.parse(result.slice(5));
    videoUrl = typeof output === "string" ? output : output[0];
    console.log(`  Senkron tamamlandı!`);
  } else {
    console.log(`  prediction id: ${result}`);
    videoUrl = await waitForResult(result);
    console.log();
  }

  const outPath = path.join(OUTPUT_DIR, `${task.name}.mp4`);
  await downloadVideo(videoUrl, outPath);
}

async function main() {
  console.log("=== Wan 2.2 I2V Video Generation ===");
  console.log(`Model version: ${WAN_VERSION.slice(0, 16)}…`);
  console.log(`Params: frames=${WAN_FRAMES} fps=${WAN_FPS} res=${WAN_RESOLUTION} fast=${WAN_FAST_MODE}\n`);

  if (!API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN is not set in .env");
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  for (const task of TASKS) {
    try {
      await generateVideo(task);
    } catch (err) {
      console.error(`  ✗ Failed: ${err}`);
    }
    // Rate limit: minimum 10s aralık
    await new Promise((r) => setTimeout(r, MIN_INTERVAL_MS));
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);
