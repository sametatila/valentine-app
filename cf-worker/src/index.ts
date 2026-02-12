export interface Env {
  AI: Ai;
  FLUX_MODEL: string;
}

interface FluxRequestBody {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  num_steps?: number;
  guidance?: number;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Only POST /flux
    if (request.method !== "POST" || url.pathname !== "/flux") {
      return jsonError("Not found. Use POST /flux", 404);
    }

    let body: FluxRequestBody;
    try {
      body = (await request.json()) as FluxRequestBody;
    } catch {
      return jsonError("Invalid JSON body", 400);
    }

    if (!body.prompt || typeof body.prompt !== "string") {
      return jsonError("Missing required field: prompt", 400);
    }

    try {
      const result = await env.AI.run(env.FLUX_MODEL as Parameters<Ai["run"]>[0], {
        prompt: body.prompt,
        negative_prompt: body.negative_prompt ?? "",
        width: body.width ?? 1024,
        height: body.height ?? 1024,
        seed: body.seed ?? Math.floor(Math.random() * 1_000_000),
        num_steps: body.num_steps ?? 4,
        guidance: body.guidance ?? 3.5,
      });

      // Workers AI text-to-image returns a ReadableStream or ArrayBuffer
      return new Response(result as ReadableStream | ArrayBuffer, {
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "image/png",
        },
      });
    } catch (err) {
      console.error("AI.run error:", err);
      return jsonError(
        `AI generation failed: ${err instanceof Error ? err.message : String(err)}`,
        500,
      );
    }
  },
} satisfies ExportedHandler<Env>;
