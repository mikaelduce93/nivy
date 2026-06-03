"use client"

import * as React from "react"
import { OTPInput, type SlotProps } from "input-otp"

import { cn } from "@/lib/utils"

export interface OtpCellsProps
  extends Omit<
    React.ComponentProps<typeof OTPInput>,
    "render" | "children" | "maxLength"
  > {
  /** Nombre de cases (défaut 6). */
  length?: number
}

/**
 * OtpCells — code OTP charte : cases **46×56** indépendantes, bordure 2px ink,
 * focus rose + ombre sticker, case remplie = fond ink. Remplace le pattern
 * shadcn « cases collées » de `input-otp.tsx`.
 */
export function OtpCells({
  length = 6,
  containerClassName,
  className,
  ...props
}: OtpCellsProps) {
  return (
    <OTPInput
      maxLength={length}
      containerClassName={cn(
        "flex items-center justify-center gap-2 has-disabled:opacity-50",
        containerClassName,
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
      render={({ slots }) => (
        <>
          {slots.map((slot, i) => (
            <OtpCell key={i} {...slot} />
          ))}
        </>
      )}
    />
  )
}

function OtpCell({ char, isActive, hasFakeCaret }: SlotProps) {
  return (
    <div
      data-active={isActive || undefined}
      className={cn(
        "relative grid h-[56px] w-[46px] place-items-center rounded-[10px] border-2 font-display text-[26px] font-extrabold transition-all",
        char !== null
          ? "border-ink bg-ink text-paper"
          : "border-line bg-white text-ink",
        isActive && "border-pink shadow-stkr-pink motion-safe:scale-105",
      )}
    >
      {char}
      {hasFakeCaret ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-7 w-px animate-caret-blink bg-ink duration-1000" />
        </div>
      ) : null}
    </div>
  )
}

export default OtpCells
