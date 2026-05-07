/**
 * /api/dev/ai-smoke — manual probe to verify the configured AI model is
 * reachable and not deprecated.
 *
 * The audit's #1 surprising finding: the previous default Claude model
 * `claude-3-sonnet-20240229` was retired. Daily content generation has
 * been silently 404-ing in prod since launch. This route is the
 * lightest possible smoke test: 1-token call against each provider.
 *
 * GUARD: returns 404 in production. Only available in dev / preview.
 *
 * Usage:
 *   GET /api/dev/ai-smoke              → probes the default provider
 *   GET /api/dev/ai-smoke?provider=openai
 *   GET /api/dev/ai-smoke?provider=claude
 */

import { NextRequest, NextResponse } from "next/server"
import { AIProviderFactory, type AIProviderType } from "@/lib/ai/providers/factory"
import { resolveModelId } from "@/lib/ai/content-generator"

export const dynamic = "force-dynamic"

interface ProbeResult {
  provider: AIProviderType
  model: string
  ok: boolean
  latencyMs?: number
  tokensUsed?: number
  error?: string
}

async function probe(provider: AIProviderType): Promise<ProbeResult> {
  const model = resolveModelId(provider)
  try {
    const ai = AIProviderFactory.getProvider(provider, model)
    const started = Date.now()
    // 1-token-style probe: tiny system + user prompt, model is asked to
    // reply with a single character. We can't directly cap to 1 token
    // through this provider abstraction, but the prompt is intentionally
    // tiny and the response will typically be <5 tokens.
    const { metadata } = await ai.call(
      "Reply with exactly the single character: K",
      "K?",
    )
    return {
      provider,
      model,
      ok: true,
      latencyMs: Date.now() - started,
      tokensUsed: metadata?.tokensUsed,
    }
  } catch (err) {
    return {
      provider,
      model,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const requested = request.nextUrl.searchParams.get("provider")
  const providers: AIProviderType[] =
    requested === "openai" || requested === "claude"
      ? [requested]
      : (((process.env.AI_PROVIDER as AIProviderType) || "openai") === "claude"
          ? ["claude"]
          : ["openai"])

  const results = await Promise.all(providers.map((p) => probe(p)))
  const allOk = results.every((r) => r.ok)

  return NextResponse.json(
    {
      ok: allOk,
      env: process.env.NODE_ENV,
      ai_provider_default: process.env.AI_PROVIDER || "openai",
      results,
    },
    { status: allOk ? 200 : 500 },
  )
}
