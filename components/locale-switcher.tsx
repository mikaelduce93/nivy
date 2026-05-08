"use client"

/**
 * NIVY - Locale switcher
 * ======================
 *
 * Dropdown that lets the user pick FR / AR / Darija / EN. V1 ships with
 * only French selectable; the other entries are visible-but-disabled with
 * a "Bientot disponible" tooltip so the locale roadmap is discoverable
 * without being clickable until translators have populated the bundles.
 *
 * Activation
 * ----------
 * Flip `NEXT_PUBLIC_I18N_ENABLE_NON_FR=true` (and re-deploy) to unlock the
 * other locales. The flag must be `NEXT_PUBLIC_*` because this component
 * runs client-side; using the non-prefixed `I18N_ENABLE_NON_FR` would
 * always be `undefined` in the browser bundle.
 *
 * See `docs/vision/ops-runbooks/06-i18n-activation.md` for the full flip
 * procedure (translation cost, RTL audit checklist, QA gates).
 */

import { Globe, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useLocale, useSetLocale, useT } from "@/lib/i18n"
import {
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type Locale,
} from "@/lib/i18n/types"
import { cn } from "@/lib/utils"

interface LocaleSwitcherProps {
  /** Visual variant — `compact` is a 32px icon button, `full` shows the language name. */
  variant?: "compact" | "full"
  /** Optional extra classes for the trigger. */
  className?: string
}

/**
 * Read the `NEXT_PUBLIC_I18N_ENABLE_NON_FR` flag at module scope. Vite/Next
 * inline `process.env.NEXT_PUBLIC_*` at build time so this is effectively a
 * compile-time constant — no perf cost per render.
 */
const NON_FR_ENABLED =
  process.env.NEXT_PUBLIC_I18N_ENABLE_NON_FR === "true"

export function LocaleSwitcher({
  variant = "compact",
  className,
}: LocaleSwitcherProps) {
  const locale = useLocale()
  const setLocale = useSetLocale()
  const t = useT()

  const handleSelect = (next: Locale) => {
    if (next === locale) return
    if (next !== DEFAULT_LOCALE && !NON_FR_ENABLED) return
    setLocale(next)
  }

  return (
    <TooltipProvider delayDuration={250}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t("localeSwitcher.currentLanguage", {
            language: LOCALE_LABELS[locale],
          })}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <Globe className="h-4 w-4" aria-hidden="true" />
          {variant === "full" && (
            <span>{LOCALE_LABELS[locale]}</span>
          )}
          {variant === "compact" && (
            <span className="hidden sm:inline uppercase tracking-wider text-xs">
              {locale}
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          <DropdownMenuLabel>{t("localeSwitcher.label")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SUPPORTED_LOCALES.map((code) => {
            const isActive = code === locale
            const isDisabled =
              code !== DEFAULT_LOCALE && !NON_FR_ENABLED
            const label = LOCALE_LABELS[code]

            // Wrap disabled items in a tooltip so the user understands WHY
            // it's greyed out (vs. a silent dead click).
            const item = (
              <DropdownMenuItem
                key={code}
                onSelect={(e) => {
                  if (isDisabled) {
                    e.preventDefault()
                    return
                  }
                  handleSelect(code)
                }}
                disabled={isDisabled}
                aria-checked={isActive}
                className={cn(
                  "flex items-center justify-between gap-3",
                  isDisabled && "opacity-50 cursor-not-allowed",
                )}
                data-testid={`locale-option-${code}`}
              >
                <span className="flex items-center gap-2">
                  {label}
                </span>
                {isActive && (
                  <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                )}
              </DropdownMenuItem>
            )

            if (!isDisabled) return item

            return (
              <Tooltip key={code}>
                <TooltipTrigger asChild>
                  <div>{item}</div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  {t("localeSwitcher.comingSoon")}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}
