"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { SelectContent, SelectGroup, SelectValue } from "@/components/ui/select"

/**
 * SelectStickerTrigger — trigger select au pattern carte sticker (bordure 2px
 * ink + ombre sticker + chevron ink), focus = hover-lift rose.
 */
export function SelectStickerTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-sticker-trigger"
      className={cn(
        "flex h-11 w-full items-center justify-between gap-2 rounded-xl border-2 border-ink bg-white px-3.5 text-sm font-medium text-ink shadow-stkr-sm outline-none transition-all",
        "focus-visible:-translate-x-0.5 focus-visible:-translate-y-0.5 focus-visible:shadow-stkr-pink",
        "data-[placeholder]:text-mute disabled:cursor-not-allowed disabled:opacity-50",
        "motion-reduce:translate-x-0 motion-reduce:translate-y-0",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 text-ink" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

/**
 * SelectStickerItem — option charte : surlignée/sélectionnée = fond ink +
 * texte paper (pattern « option active »).
 */
export function SelectStickerItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-sticker-item"
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none",
        "data-[highlighted]:bg-ink data-[highlighted]:text-paper",
        "data-[state=checked]:bg-ink data-[state=checked]:text-paper",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 grid size-4 place-items-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4" strokeWidth={3} />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

export interface SelectStickerProps {
  label?: string
  placeholder?: string
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  className?: string
  /** Liste de `<SelectStickerItem>`. */
  children: React.ReactNode
}

/**
 * SelectSticker — select complet charte (label mono + trigger sticker).
 * Le contenu/option restent gérés par Radix via `SelectStickerItem`.
 */
export function SelectSticker({
  label,
  placeholder,
  value,
  defaultValue,
  onValueChange,
  disabled,
  className,
  children,
}: SelectStickerProps) {
  const id = React.useId()
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <span id={`${id}-lbl`} className="eyebrow tracking-[0.16em]">
          {label}
        </span>
      ) : null}
      <SelectPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectStickerTrigger aria-labelledby={label ? `${id}-lbl` : undefined}>
          <SelectValue placeholder={placeholder} />
        </SelectStickerTrigger>
        <SelectContent>{children}</SelectContent>
      </SelectPrimitive.Root>
    </div>
  )
}

export { SelectGroup }
export default SelectSticker
