import { type Page, expect } from "@playwright/test"

/**
 * Shared helpers for the V5 mobile-viewport E2E suite (#224).
 *
 * Every mobile spec sets this viewport via `test.use(MOBILE_USE)` so it runs
 * inside the existing `chromium` project without disturbing the desktop specs.
 * 390×844 ≈ iPhone 14 (notch + gesture bar) — see docs/qa/mobile-qa-runbook.md.
 */
export const MOBILE_VIEWPORT = { width: 390, height: 844 }
export const MOBILE_USE = {
  viewport: MOBILE_VIEWPORT,
  isMobile: true,
  hasTouch: true,
} as const

/**
 * We assert on the V5 *crash class*, not on every console line. Zero-tolerance
 * console assertions are notoriously brittle (CSP policy notices, dev-only React
 * warnings — e.g. Radix useId / stale-SW chunks — third-party scripts, network
 * failures that depend on whether Supabase/CDN is reachable). Those are noise.
 *
 * What we DO fail on:
 *   - any uncaught page exception (`pageerror`) — a real crash, and
 *   - console errors that match the FATAL crash class below (the exact symptoms
 *     V5 set out to eliminate: the "Application error" blank page, the bogus
 *     "Rendered more hooks", hydration mismatches, the CSR-bailout build error).
 * The Playwright `webServer` boots `next start` (production) in CI, where the
 * benign dev-only console noise does not occur at all.
 */
const FATAL_CONSOLE = [
  /Application error/i,
  /Minified React error/i,
  /Rendered more hooks/i,
  /Hydration failed/i,
  /Text content does(?: not| n.t) match/i,
  /error while hydrating/i,
  /Maximum update depth exceeded/i,
  /missing-suspense-with-csr-bailout/i,
]

export type ErrorSink = { console: string[]; page: string[] }

/** Start collecting uncaught page exceptions + fatal-class console errors. */
export function watchErrors(page: Page): ErrorSink {
  const sink: ErrorSink = { console: [], page: [] }
  page.on("console", (msg) => {
    if (msg.type() !== "error") return
    const text = msg.text()
    if (FATAL_CONSOLE.some((re) => re.test(text))) sink.console.push(text)
  })
  page.on("pageerror", (err) => sink.page.push(String(err?.stack || err)))
  return sink
}

/** Assert no uncaught exceptions and no crash-class console errors fired. */
export function expectNoErrors(sink: ErrorSink, label = "page") {
  expect(sink.page, `${label}: uncaught page exception(s):\n${sink.page.join("\n")}`).toEqual([])
  expect(sink.console, `${label}: crash-class console error(s):\n${sink.console.join("\n")}`).toEqual([])
}

/** Assert the document does not scroll horizontally at the current viewport. */
export async function expectNoHorizontalOverflow(page: Page, label = "page") {
  // Let layout settle (fonts, lazy content) before measuring.
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {})
  const m = await page.evaluate(() => {
    const el = document.documentElement
    return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }
  })
  // 1px tolerance for sub-pixel rounding.
  expect(
    m.scrollWidth,
    `${label}: horizontal overflow — scrollWidth ${m.scrollWidth}px > viewport ${m.clientWidth}px`,
  ).toBeLessThanOrEqual(m.clientWidth + 1)
}

/** Assert a visible interactive element is at least `min`px tall (tap target). */
export async function expectTappable(page: Page, locator: ReturnType<Page["locator"]>, label: string, min = 40) {
  await expect(locator, `${label}: must be visible`).toBeVisible({ timeout: 15_000 })
  const box = await locator.boundingBox()
  expect(box, `${label}: must have a bounding box`).not.toBeNull()
  expect(box!.height, `${label}: tap target ${Math.round(box!.height)}px < ${min}px`).toBeGreaterThanOrEqual(min)
}
