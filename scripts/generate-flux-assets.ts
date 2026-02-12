/**
 * Flux Asset Generator
 *
 * İki mod destekler:
 *   1. Cloudflare REST API (direkt) — CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN
 *   2. Cloudflare Worker endpoint — FLUX_WORKER_URL
 *
 * Mevcut .env'de direkt API credential'ları varsa onları kullanır,
 * yoksa Worker URL'sine düşer.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.join(__dirname, "..", "prompts", "flux");
const OUTPUT_DIR = path.join(__dirname, "..", "generated", "flux");

// Credentials
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const FLUX_MODEL = process.env.FLUX_MODEL ?? "@cf/black-forest-labs/flux-2-klein-4b";
const WORKER_URL = process.env.FLUX_WORKER_URL;

const USE_DIRECT_API = Boolean(CF_ACCOUNT_ID && CF_API_TOKEN);

interface Asset {
  name: string;
  promptFile: string;
  width: number;
  height: number;
}

const ALL_ASSETS: Asset[] = [
  { name: "male_bear", promptFile: "male_bear.txt", width: 1024, height: 1024 },
  { name: "female_bear", promptFile: "female_bear.txt", width: 1024, height: 1024 },
  { name: "big_heart", promptFile: "big_heart.txt", width: 1024, height: 1024 },
  { name: "hug_scene", promptFile: "hug_scene.txt", width: 1024, height: 1024 },
];

// CLI arg ile filtreleme: npm run generate:flux -- hug_scene
const filterName = process.argv[2];
const ASSETS = filterName
  ? ALL_ASSETS.filter((a) => a.name === filterName)
  : ALL_ASSETS;

/** Read a prompt file. Lines after "---" are treated as negative prompt. */
async function readPrompt(file: string): Promise<{ prompt: string; negative: string }> {
  const raw = await fs.readFile(path.join(PROMPTS_DIR, file), "utf-8");
  const parts = raw.split(/^---$/m);
  return {
    prompt: parts[0].trim(),
    negative: (parts[1] ?? "").trim(),
  };
}

/**
 * Cloudflare REST API ile görsel üret (Python projesindeki yaklaşım)
 */
async function generateViaDirectAPI(
  prompt: string,
  width: number,
  height: number,
): Promise<Buffer> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${FLUX_MODEL}`;

  // Python projesindeki gibi form-encoded data gönder
  const form = new URLSearchParams();
  form.set("prompt", prompt);
  form.set("width", String(width));
  form.set("height", String(height));

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare API ${res.status}: ${text}`);
  }

  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("image")) {
    // Direkt binary image döndü
    return Buffer.from(await res.arrayBuffer());
  }

  // JSON (base64) response
  const json = (await res.json()) as {
    success: boolean;
    result?: string | { image: string };
  };

  if (!json.success || !json.result) {
    throw new Error(`API hata: ${JSON.stringify(json)}`);
  }

  const b64 =
    typeof json.result === "string"
      ? json.result
      : json.result.image;

  return Buffer.from(b64, "base64");
}

/**
 * Cloudflare Worker endpoint ile görsel üret
 */
async function generateViaWorker(
  prompt: string,
  negative: string,
  width: number,
  height: number,
): Promise<Buffer> {
  if (!WORKER_URL) throw new Error("FLUX_WORKER_URL is not set");

  const res = await fetch(WORKER_URL + "/flux", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, negative_prompt: negative, width, height }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Worker ${res.status}: ${text}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function generate(asset: Asset): Promise<void> {
  const { prompt, negative } = await readPrompt(asset.promptFile);

  console.log(`\n[${asset.name}] Generating (${asset.width}x${asset.height})…`);
  console.log(`  prompt: ${prompt.slice(0, 100)}…`);

  let buf: Buffer;

  if (USE_DIRECT_API) {
    console.log(`  mode: Cloudflare REST API (${FLUX_MODEL})`);
    buf = await generateViaDirectAPI(prompt, asset.width, asset.height);
  } else if (WORKER_URL) {
    console.log(`  mode: Worker endpoint (${WORKER_URL})`);
    buf = await generateViaWorker(prompt, negative, asset.width, asset.height);
  } else {
    throw new Error(
      "CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN veya FLUX_WORKER_URL gerekli",
    );
  }

  const out = path.join(OUTPUT_DIR, `${asset.name}.png`);
  await fs.writeFile(out, buf);
  console.log(`  ✓ Saved ${out} (${buf.byteLength} bytes)`);
}

async function main() {
  console.log("=== Flux Asset Generation ===");
  console.log(`Mode: ${USE_DIRECT_API ? "Direct Cloudflare REST API" : "Worker endpoint"}`);
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  for (const asset of ASSETS) {
    try {
      await generate(asset);
    } catch (err) {
      console.error(`  ✗ Failed: ${err}`);
    }
    // Rate limit delay
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);
