import { existsSync, readdirSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { describe, expect, it } from "vitest"

const repoRoot = process.cwd()
const forbiddenRouteRoots = [
  "app/api/test",
  "app/test",
  "app/preview",
  "app/gamification-demo",
  "gamification-system/demo",
]

function toRepoPath(path: string): string {
  return relative(repoRoot, path).split(sep).join("/")
}

function listFiles(root: string): string[] {
  const absoluteRoot = join(repoRoot, root)

  if (!existsSync(absoluteRoot)) {
    return []
  }

  return readdirSync(absoluteRoot).flatMap((entry) => {
    const absolutePath = join(absoluteRoot, entry)
    const stat = statSync(absolutePath)

    if (stat.isDirectory()) {
      return listFiles(toRepoPath(absolutePath))
    }

    return toRepoPath(absolutePath)
  })
}

describe("public test/demo routes", () => {
  it("does not expose public test, preview, or demo route files", () => {
    const routeFiles = forbiddenRouteRoots.flatMap(listFiles).sort()

    expect(routeFiles).toEqual([])
  })
})
