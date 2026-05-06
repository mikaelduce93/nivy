"use client"

import * as React from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

/**
 * useLongPress — fires `callback` after the user holds a touch / pointer for
 * `delay` ms without significant movement. Pointer-events based so it works
 * for touch *and* mouse. Bind the returned handlers to any element.
 *
 * Example:
 *   const lp = useLongPress(() => setOpen(true))
 *   <div {...lp}>...</div>
 */
export function useLongPress(
  callback: () => void,
  options?: { delay?: number; moveTolerance?: number },
) {
  const { delay = 500, moveTolerance = 10 } = options ?? {}
  const timerRef = React.useRef<number | null>(null)
  const startRef = React.useRef<{ x: number; y: number } | null>(null)

  const clear = React.useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    startRef.current = null
  }, [])

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      // Only primary pointer button.
      if (e.button !== undefined && e.button !== 0) return
      startRef.current = { x: e.clientX, y: e.clientY }
      timerRef.current = window.setTimeout(() => {
        callback()
        timerRef.current = null
      }, delay)
    },
    [callback, delay],
  )

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current || timerRef.current == null) return
      const dx = e.clientX - startRef.current.x
      const dy = e.clientY - startRef.current.y
      if (Math.hypot(dx, dy) > moveTolerance) clear()
    },
    [clear, moveTolerance],
  )

  React.useEffect(() => () => clear(), [clear])

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    // Suppress the native iOS context menu / text selection on long touch.
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }
}

export interface LongPressMenuItem {
  id: string
  label: string
  icon?: LucideIcon
  onSelect: () => void
  variant?: "default" | "destructive"
  disabled?: boolean
}

export interface LongPressMenuProps {
  items: LongPressMenuItem[]
  /** Optional title shown at the top of the sheet. */
  title?: string
  /** Long-press duration in ms. Default 500. */
  delay?: number
  /** Disable the gesture (e.g. on desktop). */
  disabled?: boolean
  /** Wrap any element. The element receives the pointer handlers. */
  children: React.ReactElement
}

/**
 * LongPressMenu — wraps a single child element. On long-press it opens a
 * bottom drawer (vaul) listing the provided action items. Mobile-first
 * affordance: think iOS context menu / Material long-press.
 *
 * Example:
 *   <LongPressMenu items={[
 *     { id: "copy",  label: "Copier",   icon: Copy,   onSelect: handleCopy },
 *     { id: "share", label: "Partager", icon: Share2, onSelect: handleShare },
 *     { id: "delete",label: "Supprimer",icon: Trash2, onSelect: handleDelete, variant: "destructive" },
 *   ]}>
 *     <PostCard ... />
 *   </LongPressMenu>
 */
export function LongPressMenu({
  items,
  title,
  delay = 500,
  disabled = false,
  children,
}: LongPressMenuProps) {
  const [open, setOpen] = React.useState(false)

  const longPressHandlers = useLongPress(
    React.useCallback(() => {
      if (disabled) return
      setOpen(true)
    }, [disabled]),
    { delay },
  )

  // Compose handlers onto the single child so the consumer doesn't have to.
  const childWithHandlers = React.cloneElement(children, {
    ...longPressHandlers,
    // Preserve any handlers the child already declared.
    onPointerDown: (e: React.PointerEvent) => {
      // @ts-expect-error - react element children typing is loose
      children.props?.onPointerDown?.(e)
      longPressHandlers.onPointerDown(e)
    },
    onPointerUp: (e: React.PointerEvent) => {
      // @ts-expect-error - react element children typing is loose
      children.props?.onPointerUp?.(e)
      longPressHandlers.onPointerUp()
    },
  } as React.HTMLAttributes<HTMLElement>)

  return (
    <>
      {childWithHandlers}
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          {title && (
            <DrawerHeader>
              <DrawerTitle>{title}</DrawerTitle>
            </DrawerHeader>
          )}
          <div
            className="flex flex-col gap-1 p-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
            role="menu"
            aria-label={title ?? "Actions"}
          >
            {items.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  role="menuitem"
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return
                    item.onSelect()
                    setOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-base font-medium",
                    "min-h-touch transition-colors",
                    "hover:bg-muted active:bg-muted",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    item.variant === "destructive"
                      ? "text-destructive hover:bg-destructive/10"
                      : "text-foreground",
                  )}
                >
                  {Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />}
                  <span className="flex-1">{item.label}</span>
                </button>
              )
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}

export default LongPressMenu
