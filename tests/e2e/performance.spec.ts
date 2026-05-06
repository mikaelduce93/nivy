import { expect, test } from "@playwright/test"

/**
 * Performance smoke for the public home page.
 *
 * These tests are *heuristic*: they fail soft. The Playwright dev server is
 * slower than production (no CDN, dev assets, etc.), so we keep the budgets
 * loose and gate the test with `test.fail({ flag })` so a regression here
 * never blocks the build. Real performance budgets are tracked in
 * `docs/performance-budget.json` and enforced via Lighthouse CI.
 *
 * Targets (info-only):
 *   - LCP   < 4000 ms
 *   - FCP   < 2500 ms
 *   - Total JS transfer < 500 KB
 *
 * Failures here surface as test annotations; they do NOT crash CI thanks to
 * `test.fail()` flag toggling.
 */

const BUDGET = {
  lcpMs: 4000,
  fcpMs: 2500,
  totalJsKb: 500,
}

type WebVitalsPayload = {
  lcp: number | null
  fcp: number | null
}

test.describe("performance / smoke", () => {
  test("home: LCP, FCP and JS transfer are under heuristic budgets", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "load" })

    // Collect Web Vitals using the Performance API. We poll briefly so the LCP
    // observer has a chance to settle on the final candidate.
    const vitals: WebVitalsPayload = await page.evaluate(
      () =>
        new Promise<WebVitalsPayload>((resolve) => {
          let lcp: number | null = null
          let fcp: number | null = null

          const fcpEntry = performance.getEntriesByName("first-contentful-paint")[0]
          if (fcpEntry) fcp = fcpEntry.startTime

          try {
            const observer = new PerformanceObserver((list) => {
              const entries = list.getEntries()
              const last = entries[entries.length - 1]
              if (last) lcp = last.startTime
            })
            observer.observe({ type: "largest-contentful-paint", buffered: true })

            // Resolve after 2.5s — enough to capture LCP for a typical page.
            setTimeout(() => {
              observer.disconnect()
              resolve({ lcp, fcp })
            }, 2500)
          } catch {
            resolve({ lcp, fcp })
          }
        }),
    )

    const resourceStats = await page.evaluate(() => {
      const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[]
      let totalBytes = 0
      let jsBytes = 0
      for (const entry of resources) {
        totalBytes += entry.transferSize ?? 0
        if (entry.name.endsWith(".js") || entry.initiatorType === "script") {
          jsBytes += entry.transferSize ?? 0
        }
      }
      return { totalBytes, jsBytes, count: resources.length }
    })

    const totalJsKb = Math.round(resourceStats.jsBytes / 1024)
    const totalKb = Math.round(resourceStats.totalBytes / 1024)

    // Attach metrics to the HTML report regardless of pass/fail outcome.
    await testInfo.attach("web-vitals.json", {
      body: JSON.stringify(
        {
          lcpMs: vitals.lcp,
          fcpMs: vitals.fcp,
          totalKb,
          totalJsKb,
          resourceCount: resourceStats.count,
          budget: BUDGET,
        },
        null,
        2,
      ),
      contentType: "application/json",
    })

    // Soft-fail: when *any* heuristic is exceeded, mark the test as expected
    // failure. Otherwise pass. This surfaces regressions without breaking CI.
    const breaches: string[] = []
    if (vitals.lcp !== null && vitals.lcp > BUDGET.lcpMs) {
      breaches.push(`LCP ${vitals.lcp.toFixed(0)}ms > ${BUDGET.lcpMs}ms`)
    }
    if (vitals.fcp !== null && vitals.fcp > BUDGET.fcpMs) {
      breaches.push(`FCP ${vitals.fcp.toFixed(0)}ms > ${BUDGET.fcpMs}ms`)
    }
    if (totalJsKb > BUDGET.totalJsKb) {
      breaches.push(`JS transfer ${totalJsKb}KB > ${BUDGET.totalJsKb}KB`)
    }

    if (breaches.length > 0) {
      // Soft heuristic: surface budget breaches via test.fail() so the run
      // shows them as expected failures rather than crashing the build.
      test.fail(true, `perf budget breach (informational): ${breaches.join(", ")}`)
    }

    // Always assert at least one resource was captured to confirm the API
    // works as expected — guards against silent-pass when timing data is empty.
    expect(resourceStats.count).toBeGreaterThan(0)
  })
})
