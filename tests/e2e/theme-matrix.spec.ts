import { expect, test, type Page } from "@playwright/test"

/**
 * Theme matrix: light + dark color schemes against critical public pages.
 *
 * The objective is to catch the most common cross-theme regressions:
 *   - White text on white backgrounds (or near-white).
 *   - Black text on black backgrounds (or near-black).
 *   - Gen-Z accent buttons (lime / mint / peach) whose `text-on-bright`
 *     foreground must remain dark in both modes.
 *
 * We do NOT attempt a full WCAG contrast audit here — Agent A7 owns the axe
 * scans under `tests/a11y/`. Instead, we sample 5–10 visually important
 * elements per page and assert the *contrast ratio* between their resolved
 * `color` and the background of their nearest opaque ancestor.
 */

const PAGES = [
  { path: "/", label: "home" },
  { path: "/auth/login", label: "login" },
  { path: "/aide", label: "aide" },
] as const

/**
 * Parse an `rgb(...)` / `rgba(...)` string into a tuple. Returns null when the
 * value is `transparent` or otherwise unparseable.
 */
function parseColor(value: string): [number, number, number, number] | null {
  if (!value || value === "transparent") return null
  const match = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/)
  if (!match) return null
  const [, r, g, b, a] = match
  return [Number(r), Number(g), Number(b), a !== undefined ? Number(a) : 1]
}

/** Relative luminance per WCAG 2.1. */
function luminance([r, g, b]: [number, number, number, number]): number {
  const channel = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function contrastRatio(
  fg: [number, number, number, number],
  bg: [number, number, number, number],
): number {
  const lf = luminance(fg)
  const lb = luminance(bg)
  const [light, dark] = lf > lb ? [lf, lb] : [lb, lf]
  return (light + 0.05) / (dark + 0.05)
}

/**
 * Pull the resolved foreground/background color pair for a list of selectors
 * by walking up the DOM until we hit the first non-transparent ancestor.
 */
async function sampleColors(
  page: Page,
  selectors: string[],
): Promise<Array<{ selector: string; fg: string; bg: string; text: string }>> {
  return await page.evaluate((sels) => {
    const findOpaqueBg = (el: Element): string => {
      let current: Element | null = el
      while (current) {
        const bg = window.getComputedStyle(current).backgroundColor
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
          return bg
        }
        current = current.parentElement
      }
      // Fallback to <html> background.
      return window.getComputedStyle(document.documentElement).backgroundColor
    }
    const out: Array<{ selector: string; fg: string; bg: string; text: string }> = []
    for (const sel of sels) {
      const node = document.querySelector(sel)
      if (!node) continue
      const style = window.getComputedStyle(node)
      out.push({
        selector: sel,
        fg: style.color,
        bg: findOpaqueBg(node),
        text: (node.textContent ?? "").trim().slice(0, 60),
      })
    }
    return out
  }, selectors)
}

const SAMPLE_SELECTORS = [
  "h1",
  "h2",
  "main p",
  "main a",
  "button",
  "[class*='lime']",
  "[class*='mint']",
  "[class*='peach']",
  "[data-testid='cta-primary']",
  "nav a",
]

/**
 * Assert that every sampled foreground/background pair clears a 3:1 contrast
 * floor (WCAG AA for large text). We deliberately use the lower bar because
 * full AA-normal coverage belongs to the axe-driven a11y suite.
 */
async function assertNoSameOnSame(page: Page, scheme: "light" | "dark", label: string) {
  const samples = await sampleColors(page, SAMPLE_SELECTORS)
  expect(samples.length, `at least one sample element should exist on ${label}`).toBeGreaterThan(0)

  const failures: string[] = []
  for (const sample of samples) {
    const fg = parseColor(sample.fg)
    const bg = parseColor(sample.bg)
    if (!fg || !bg) continue
    // Skip transparent foregrounds — typically icon placeholders.
    if (fg[3] < 0.1) continue
    const ratio = contrastRatio(fg, bg)
    if (ratio < 3) {
      failures.push(
        `[${label}/${scheme}] ${sample.selector} text="${sample.text}" fg=${sample.fg} bg=${sample.bg} ratio=${ratio.toFixed(2)}`,
      )
    }
  }
  expect(failures, `low-contrast foreground/background pairs:\n${failures.join("\n")}`).toEqual([])
}

test.describe("theme matrix", () => {
  for (const { path, label } of PAGES) {
    test(`${label} renders legibly in light mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: "light" })
      await page.goto(path, { waitUntil: "domcontentloaded" })
      await assertNoSameOnSame(page, "light", label)
    })

    test(`${label} renders legibly in dark mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: "dark" })
      await page.goto(path, { waitUntil: "domcontentloaded" })
      await assertNoSameOnSame(page, "dark", label)
    })
  }

  test("gen-z accent buttons keep dark text in both modes", async ({ page }) => {
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto("/", { waitUntil: "domcontentloaded" })

      const accentSelectors = [
        "[class*='bg-lime']",
        "[class*='bg-mint']",
        "[class*='bg-peach']",
        "[class*='text-on-bright']",
      ]
      const samples = await sampleColors(page, accentSelectors)
      // Empty samples are acceptable — not every page surfaces accent buttons.
      for (const sample of samples) {
        const fg = parseColor(sample.fg)
        const bg = parseColor(sample.bg)
        if (!fg || !bg) continue
        const ratio = contrastRatio(fg, bg)
        expect(
          ratio,
          `${scheme}: gen-z accent text "${sample.text}" must stay legible (got ${ratio.toFixed(2)})`,
        ).toBeGreaterThanOrEqual(3)
      }
    }
  })
})
