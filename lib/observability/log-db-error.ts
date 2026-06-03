/**
 * Logging structuré des erreurs Supabase / PostgREST.
 *
 * Un `PostgrestError` est un objet plain (PAS une instance d'`Error`). Passé tel
 * quel à `console.error(label, error)`, il se sérialise `{}` dans la console RSC de
 * Next 16 — le SQLSTATE est perdu. C'est exactement ce qui a masqué le `42703` du
 * bug « Error fetching user crew: {} » pendant des semaines (audit 2026-06-03).
 *
 * Toujours logger les champs utiles explicitement (message/code/details/hint).
 */
export type DbErrorLike = {
  message?: string
  code?: string
  details?: string
  hint?: string
} | null | undefined

/**
 * Logge une erreur DB de façon structurée (champs extraits, jamais l'objet nu).
 * No-op si `error` est falsy, pour pouvoir l'appeler inconditionnellement.
 */
export function logDbError(scope: string, error: DbErrorLike): void {
  if (!error) return
  console.error(
    `[db:${scope}]`,
    JSON.stringify({
      message: error.message ?? null,
      code: error.code ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
    }),
  )
}
