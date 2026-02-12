# Valentine's Day Web App

Interactive Valentine's Day web application with animated teddy bears.

## Tech Stack

- **Frontend:** Next.js 16.1, React 19, TypeScript, Tailwind CSS v4
- **Asset Generation:** Cloudflare Workers AI (Flux 2 Klein), Replicate (Wan 2.2 I2V)
- **Storage:** localStorage only (no backend database)

## Project Structure

```
valentine-app/
├── app/                    Next.js App Router
│   ├── page.tsx            Main page (state machine)
│   ├── layout.tsx          Root layout
│   └── globals.css         Tailwind v4 + custom theme
├── components/
│   ├── FrameAnimator.tsx   Frame-by-frame animation engine
│   ├── BearsScene.tsx      Two-bear scene with positioning
│   ├── QuestionCard.tsx    Question UI + progress indicator
│   └── HeartOverlay.tsx    Fullscreen heart + message
├── lib/
│   ├── storage.ts          localStorage read/write/reset
│   └── useShiftF5Reset.ts  Shift+F5 reset hook
├── types.ts                All types and constants
├── public/anim/            Animation frame sequences (PNG)
├── cf-worker/              Cloudflare Worker for Flux
├── scripts/                Asset generation scripts
├── prompts/                AI generation prompts
│   ├── flux/               Flux image prompts
│   └── wan/                Wan video prompts
└── generated/              Generated assets (git-ignored)
```

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## How It Works

1. Five Valentine's Day questions are shown one by one.
2. Each positive answer moves the bears closer together.
3. If all 5 answers are positive: bears hug, then a giant heart overlay appears with the message.
4. If not all positive: a gentle "thanks" screen.
5. Progress is saved to localStorage and survives normal refreshes.

## Reset Methods

| Method | How |
|---|---|
| Shift+F5 | Sets a flag in sessionStorage; on next load, clears localStorage |
| `?reset=1` | Query param — clears state once and removes param from URL |
| Long-press title | Hold the "Sevgililer Gunu" header for 2 seconds |

## Animation Frames

The app reads PNG frame sequences from `/public/anim/`:

```
public/anim/
├── female/idle/frame_000.png … frame_090.png
├── female/walk/frame_000.png … frame_090.png
├── male/idle/frame_000.png   … frame_090.png
├── male/walk/frame_000.png   … frame_090.png
├── hug/frame_000.png         … frame_090.png   (combined scene)
└── heart/frame_000.png       … frame_090.png
```

**Naming:** `frame_000.png` through `frame_090.png` (91 frames, 0-padded to 3 digits).

If frames are missing, the app shows a placeholder instead of crashing.

---

## Asset Generation

### Step 1: Deploy Cloudflare Worker (Flux)

```bash
cd cf-worker
npm install
npx wrangler login        # one-time auth
npx wrangler deploy       # deploys the worker
```

The worker exposes `POST /flux` and uses Cloudflare Workers AI to run Flux 2 Klein.

Environment variables in `wrangler.toml`:
- `FLUX_MODEL` — default `@cf/black-forest-labs/flux-2-klein-9b`

### Step 2: Generate Flux Images

```bash
cd scripts
npm install
cp .env.example .env      # fill in FLUX_WORKER_URL
npm run generate:flux
```

This produces PNGs in `generated/flux/`:
- `male_bear.png`, `female_bear.png`, `big_heart.png`, `hug_scene.png`

### Step 3: Generate Wan Videos

```bash
# Still in scripts/
# Fill in REPLICATE_API_TOKEN, WAN_MODEL in .env
npm run generate:wan
```

This produces MP4s in `generated/wan/`:
- `male_idle.mp4`, `female_idle.mp4`, `male_walk.mp4`, `female_walk.mp4`, `hug.mp4`, `heart.mp4`

**Finding the correct Wan model:** Go to https://replicate.com, search for "Wan 2.2" or "wan-lab", and copy the model identifier into `WAN_MODEL` in your `.env`.

### Step 4: Extract Frames from Videos

Use FFmpeg to extract PNG frame sequences:

```bash
# Example for male idle animation
ffmpeg -i generated/wan/male_idle.mp4 -vf "fps=16" -start_number 0 public/anim/male/idle/frame_%03d.png

# Repeat for all animations:
ffmpeg -i generated/wan/female_idle.mp4 -vf "fps=16" -start_number 0 public/anim/female/idle/frame_%03d.png
ffmpeg -i generated/wan/male_walk.mp4 -vf "fps=16" -start_number 0 public/anim/male/walk/frame_%03d.png
ffmpeg -i generated/wan/female_walk.mp4 -vf "fps=16" -start_number 0 public/anim/female/walk/frame_%03d.png
ffmpeg -i generated/wan/hug.mp4 -vf "fps=16" -start_number 0 public/anim/hug/frame_%03d.png
ffmpeg -i generated/wan/heart.mp4 -vf "fps=16" -start_number 0 public/anim/heart/frame_%03d.png
```

### Step 5: Remove Backgrounds (Manual)

Use a tool like `rembg` (Python) or any online background remover to make frames transparent:

```bash
pip install rembg
rembg p public/anim/male/idle/ public/anim/male/idle/
```

### Step 6: Verify Frame Count

Ensure each animation directory has frames numbered `frame_000.png` through `frame_090.png` (91 frames). Adjust `frameCount` in the code if your count differs.

---

## Deploy to Vercel

```bash
npm run build         # verify build succeeds
vercel deploy         # or push to GitHub and connect to Vercel
```

The app is a static client-side SPA (all `"use client"`) — no server-side API routes needed.

## Environment Variables

### scripts/.env

| Variable | Description |
|---|---|
| `FLUX_WORKER_URL` | Cloudflare Worker URL (e.g. `https://valentine-flux-worker.xxx.workers.dev`) |
| `REPLICATE_API_TOKEN` | Replicate API token |
| `WAN_MODEL` | Wan 2.2 I2V model identifier on Replicate |
| `WAN_VERSION` | (Optional) specific model version hash |

### cf-worker/wrangler.toml

| Variable | Description |
|---|---|
| `FLUX_MODEL` | Workers AI model ID (default: `@cf/black-forest-labs/flux-2-klein-9b`) |
