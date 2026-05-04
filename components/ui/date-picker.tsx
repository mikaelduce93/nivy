"use client"

/**
 * Date Picker Component (Stub)
 * ============================
 * Placeholder for lazy-loaded date picker.
 * Can be replaced with a real date picker implementation (e.g., react-day-picker) later.
 */

import { forwardRef } from "react"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value?: Date | string
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ value, onChange, placeholder = "Sélectionner une date", className, disabled }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const dateValue = e.target.value
      if (dateValue) {
        onChange?.(new Date(dateValue))
      } else {
        onChange?.(undefined)
      }
    }

    const formattedValue = value
      ? typeof value === "string"
        ? value
        : value.toISOString().split("T")[0]
      : ""

    return (
      <input
        ref={ref}
        type="date"
        value={formattedValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white",
          "placeholder:text-zinc-500",
          "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      />
    )
  }
)

DatePicker.displayName = "DatePicker"

export default DatePicker
