/**
 * Wave 4B — static guard: no native window.alert / window.confirm /
 * window.prompt anywhere in app/components/lib/hooks production code.
 *
 * Native dialogs are canon §0 forbidden:
 *   - they break mobile UX (blocking modal that ignores theme/styling)
 *   - they bypass a11y / focus-trap conventions
 *   - they can't be tested or themed
 *
 * Replacements:
 *   - alert() / window.alert()  → sonner toast.error / toast.success
 *   - confirm()                 → confirmToast() from lib/ui/confirm-toast
 *   - prompt() / window.prompt  → Dialog with form input
 */
import { describe, expect, it } from "vitest"
import { execSync } from "node:child_process"

function rgList(pattern: string): string[] {
  // git ls-files | grep -E '\.(ts|tsx)$' filtered to app/components/lib/hooks
  // and run a Node-side regex match. Avoids depending on rg.
  const files = execSync('git ls-files "app/**/*.ts" "app/**/*.tsx" "components/**/*.ts" "components/**/*.tsx" "lib/**/*.ts" "lib/**/*.tsx" "hooks/**/*.ts" "hooks/**/*.tsx"', {
    encoding: "utf8",
    cwd: process.cwd(),
  })
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean)
  const re = new RegExp(pattern)
  const hits: string[] = []
  for (const file of files) {
    let src = ""
    try {
      src = require("node:fs").readFileSync(file, "utf8")
    } catch {
      continue
    }
    // Strip line + block comments so docstring mentions of the canonical
    // ban don't trigger false positives.
    const stripped = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
    if (re.test(stripped)) {
      // Capture the file once and continue.
      hits.push(file)
    }
  }
  return hits
}

describe("Wave 4B — no native dialogs in app code", () => {
  it("no window.alert(", () => {
    const hits = rgList(String.raw`\bwindow\s*\.\s*alert\s*\(`)
    expect(hits, hits.join("\n") || "ok").toEqual([])
  })

  it("no bare alert(", () => {
    // Allow `assertDialog.alert` style member access; require a free `alert(`.
    const hits = rgList(String.raw`(^|[^.\w])alert\s*\(`)
    // The PWA install prompt declares a method `prompt(): Promise<void>` on
    // the BeforeInstallPromptEvent type — that's a member, not a free call,
    // so the regex above won't match. Same for sonner toast's `cancel`.
    expect(hits, hits.join("\n") || "ok").toEqual([])
  })

  it("no window.confirm(", () => {
    const hits = rgList(String.raw`\bwindow\s*\.\s*confirm\s*\(`)
    expect(hits, hits.join("\n") || "ok").toEqual([])
  })

  it("no bare confirm( as a control flow primitive", () => {
    // We allow `confirmToast(` (the canonical replacement) and member access
    // like `something.confirm(`. We forbid the bare `confirm(` call.
    const hits = rgList(String.raw`(^|[^.\w])confirm\s*\(`).filter((f) => {
      const src = require("node:fs").readFileSync(f, "utf8") as string
      // Strip comments first.
      const stripped = src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "")
      // Match only standalone confirm( — not confirmToast( or this.confirm(.
      const re = /(^|[^.\w])confirm\s*\(/
      // Walk lines and check that each match is not preceded by 'confirmToast'.
      for (const line of stripped.split("\n")) {
        if (!re.test(line)) continue
        if (/confirmToast\s*\(/.test(line)) continue
        return true
      }
      return false
    })
    expect(hits, hits.join("\n") || "ok").toEqual([])
  })

  it("no window.prompt(", () => {
    const hits = rgList(String.raw`\bwindow\s*\.\s*prompt\s*\(`)
    expect(hits, hits.join("\n") || "ok").toEqual([])
  })
})
