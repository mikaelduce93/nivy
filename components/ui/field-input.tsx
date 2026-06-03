"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export interface FieldInputProps
  extends Omit<React.ComponentProps<"input">, "prefix"> {
  /** Label en eyebrow mono UPPERCASE (JetBrains Mono, ls 1.6). */
  label?: string
  /** Aide sous le champ (mono discret). */
  hint?: string
  /** Message d'erreur — bascule la bordure en corail. */
  error?: string
  /** Coche succès (rond lime ✓) à droite du champ. */
  success?: boolean
  /** Préfixe collé non éditable, ex. `🇲🇦 +212`. */
  prefix?: React.ReactNode
  containerClassName?: string
}

/**
 * FieldInput — champ texte charte (label mono + bordure line→ink au focus).
 *
 * Wrapper au-dessus de `Input` (kit shadcn rhabillé). Focus = bordure encre
 * nette (pas d'anneau flou). Variante `prefix` pour le préfixe pays collé.
 */
export function FieldInput({
  label,
  hint,
  error,
  success,
  prefix,
  id,
  className,
  containerClassName,
  ...props
}: FieldInputProps) {
  const reactId = React.useId()
  const inputId = id ?? reactId
  const describedBy = error
    ? `${inputId}-err`
    : hint
      ? `${inputId}-hint`
      : undefined

  return (
    <div className={cn("flex flex-col gap-1.5", containerClassName)}>
      {label ? (
        <label htmlFor={inputId} className="eyebrow tracking-[0.16em]">
          {label}
        </label>
      ) : null}

      {prefix ? (
        <div
          className={cn(
            "flex h-11 items-center overflow-hidden rounded-xl border-2 bg-card transition-colors",
            error ? "border-coral" : "border-input focus-within:border-ink",
          )}
        >
          <span className="select-none pl-3.5 pr-2 font-mono text-sm font-semibold text-mute">
            {prefix}
          </span>
          <span className="h-6 w-0.5 bg-line" aria-hidden="true" />
          <input
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              "h-full w-full min-w-0 bg-transparent px-3.5 text-base outline-none placeholder:text-mute md:text-sm",
              className,
            )}
            {...props}
          />
        </div>
      ) : (
        <div className="relative">
          <Input
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              // Focus charte : bordure encre nette, pas d'anneau flou résiduel.
              "focus-visible:border-ink focus-visible:ring-0",
              error && "border-coral focus-visible:border-coral",
              success && "border-lime",
              className,
            )}
            {...props}
          />
          {success ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-lime text-[11px] font-black text-white"
            >
              ✓
            </span>
          ) : null}
        </div>
      )}

      {error ? (
        <p id={`${inputId}-err`} className="text-xs font-medium text-coral">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-mute">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export default FieldInput
