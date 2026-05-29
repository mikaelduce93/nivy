# CLAUDE.md

Behavioral guidelines to reduce common coding mistakes. For trivial tasks, use judgment.

## 1. Think Before Coding
- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, surface them — don't pick silently.
- If a simpler approach exists, say so.

## 2. Simplicity First
- Minimum code that solves the problem. Nothing speculative.
- No unrequested features, abstractions, or "flexibility".
- "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes
- Touch only what the request requires. Match existing style.
- Don't refactor or "improve" unrelated code; mention dead code, don't delete it.
- Remove only the orphans your own changes created.

## 4. Goal-Driven Execution
- Turn tasks into verifiable goals ("Fix the bug" → "write a failing test, then make it pass").
- For multi-step work, state a brief plan with a check per step.
