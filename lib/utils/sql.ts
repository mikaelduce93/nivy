/**
 * Split SQL into executable statements.
 *
 * Needs to handle:
 * - Dollar-quoted strings: $$...$$ or $tag$...$tag$
 * - Single quotes: '...'
 * - Double quotes: "ident"
 * - Line comments: -- ...\n
 * - Block comments: /* ... *\/
 *
 * We split only on semicolons that are NOT inside any of the above.
 */
export function splitSqlStatements(sql: string): string[] {
  // Remove BOM if present
  let s = sql.replace(/^\uFEFF/, "")

  const statements: string[] = []
  let buf = ""

  let inSingle = false
  let inDouble = false
  let inLineComment = false
  let inBlockComment = false

  // Dollar-quote handling
  let dollarTag: string | null = null

  const len = s.length
  let i = 0

  const flush = () => {
    const stmt = buf.trim()
    if (stmt.length > 0) statements.push(stmt)
    buf = ""
  }

  while (i < len) {
    const ch = s[i]
    const next = i + 1 < len ? s[i + 1] : ""

    // End line comment
    if (inLineComment) {
      buf += ch
      if (ch === "\n") inLineComment = false
      i++
      continue
    }

    // End block comment
    if (inBlockComment) {
      buf += ch
      if (ch === "*" && next === "/") {
        buf += next
        inBlockComment = false
        i += 2
      } else {
        i++
      }
      continue
    }

    // Inside dollar-quoted string
    if (dollarTag) {
      buf += ch
      // Check for closing tag
      if (ch === "$") {
        const tagLen = dollarTag.length
        const start = i - tagLen + 1
        if (start >= 0 && s.slice(start, i + 1) === dollarTag) {
          dollarTag = null
        }
      }
      i++
      continue
    }

    // Start of line comment
    if (!inSingle && !inDouble && ch === "-" && next === "-") {
      buf += ch + next
      inLineComment = true
      i += 2
      continue
    }

    // Start of block comment
    if (!inSingle && !inDouble && ch === "/" && next === "*") {
      buf += ch + next
      inBlockComment = true
      i += 2
      continue
    }

    // Dollar-quote start detection: $tag$ (tag can be empty => $$)
    if (!inSingle && !inDouble && ch === "$") {
      // Parse tag
      let j = i + 1
      while (j < len) {
        const cj = s[j]
        if (cj === "$") break
        if (!/[A-Za-z0-9_]/.test(cj)) {
          j = -1
          break
        }
        j++
      }
      if (j !== -1 && j < len && s[j] === "$") {
        dollarTag = s.slice(i, j + 1) // includes both $...$
        buf += dollarTag
        i = j + 1
        continue
      }
    }

    // Toggle single quote (handle escaped '' inside strings)
    if (!inDouble && ch === "'") {
      buf += ch
      if (inSingle && next === "'") {
        // Escaped single quote inside string
        buf += next
        i += 2
        continue
      }
      inSingle = !inSingle
      i++
      continue
    }

    // Toggle double quote (handle escaped "" inside identifiers)
    if (!inSingle && ch === '"') {
      buf += ch
      if (inDouble && next === '"') {
        buf += next
        i += 2
        continue
      }
      inDouble = !inDouble
      i++
      continue
    }

    // Statement terminator
    if (!inSingle && !inDouble && ch === ";") {
      flush()
      i++
      continue
    }

    buf += ch
    i++
  }

  flush()
  return statements
}


