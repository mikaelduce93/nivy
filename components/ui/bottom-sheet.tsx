"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/* ============================================================================
   BottomSheet — High-level wrapper around `vaul`'s Drawer
   ============================================================================

   Goals:
   - One opinionated API for mobile bottom sheets.
   - Configurable snap points (vaul native).
   - Drag-to-close with momentum (vaul native).
   - Safe-area aware (iOS home indicator) via the inner padding helper.
   - Two flavours:
       * `mobile-only`  — only renders the sheet on mobile, and falls back to a
                          centered Dialog on desktop.
       * `mobile-first` — always renders as a sheet (great for everything that
                          should *feel* native on phones first).

   Migration policy: existing Radix `Dialog` usages are NOT replaced here. New
   sheets / progressively-migrated screens should opt in to <BottomSheet>.

   ──────────────────────────────────────────────────────────────────────────
   Public API
   ──────────────────────────────────────────────────────────────────────────

   <BottomSheet
     open={open}
     onOpenChange={setOpen}
     mode="mobile-only"          // default; "mobile-first" forces the sheet
     snapPoints={[0.4, 0.9]}     // optional, vaul snap points
     dismissible                 // optional, default true
   >
     <BottomSheetHeader>
       <BottomSheetTitle>...</BottomSheetTitle>
       <BottomSheetDescription>...</BottomSheetDescription>
     </BottomSheetHeader>
     <BottomSheetBody>...</BottomSheetBody>
     <BottomSheetFooter>...</BottomSheetFooter>
   </BottomSheet>
*/

export type BottomSheetMode = "mobile-only" | "mobile-first"

export interface BottomSheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /**
   * `mobile-only` (default): renders as a bottom drawer on touch / narrow
   * viewports, but as a centered Dialog on desktop. Best for forms and
   * confirmations that already work fine in a modal.
   *
   * `mobile-first`: always a bottom sheet. Use for "phone-shaped" UIs
   * (action menus, scrollable lists, picker UIs).
   */
  mode?: BottomSheetMode
  /** Optional vaul snap points (numbers as % of viewport, or px strings). */
  snapPoints?: (number | string)[]
  /** Whether the sheet can be dismissed by drag / overlay click. Default true. */
  dismissible?: boolean
  /** Additional className for the sheet content surface. */
  className?: string
  children: React.ReactNode
}

/**
 * Hook to detect a mobile-class viewport. Tailwind `md` breakpoint is 768px.
 * SSR-safe: returns `false` on the server, then re-evaluates on mount.
 */
function useIsMobileViewport(query = "(max-width: 767px)") {
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia(query)
    const handler = () => setIsMobile(mq.matches)
    handler()
    mq.addEventListener?.("change", handler)
    return () => mq.removeEventListener?.("change", handler)
  }, [query])
  return isMobile
}

/* ─── Sheet primitives (vaul) ─────────────────────────────────────────────── */

function BottomSheetSurface({
  open,
  onOpenChange,
  snapPoints,
  dismissible = true,
  className,
  children,
}: BottomSheetProps) {
  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={snapPoints}
      dismissible={dismissible}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/50",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          )}
        />
        <DrawerPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[90vh] flex-col",
            "rounded-t-3xl border-t border-white/10 bg-background outline-none",
            // iOS safe area: keep content above the home indicator
            "pb-[env(safe-area-inset-bottom)]",
            className,
          )}
        >
          {/* Drag handle */}
          <div
            className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/40"
            aria-hidden="true"
          />
          {children}
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  )
}

/* ─── Public component ────────────────────────────────────────────────────── */

export function BottomSheet(props: BottomSheetProps) {
  const { mode = "mobile-only", open, onOpenChange, children, className } = props
  const isMobile = useIsMobileViewport()

  if (mode === "mobile-first" || isMobile) {
    return <BottomSheetSurface {...props}>{children}</BottomSheetSurface>
  }

  // Desktop fallback for `mobile-only`: a centered Dialog with a width cap.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-lg", className)}>{children}</DialogContent>
    </Dialog>
  )
}

/* ─── Slots ───────────────────────────────────────────────────────────────── */

export function BottomSheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1 px-5 pt-5 pb-2 text-center md:text-left", className)}
      {...props}
    />
  )
}

export function BottomSheetTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  // When inside a vaul Drawer, the Title primitive provides the a11y wiring.
  return (
    <DrawerPrimitive.Title
      className={cn("text-lg font-semibold text-foreground", className)}
      {...(props as React.ComponentProps<typeof DrawerPrimitive.Title>)}
    />
  )
}

export function BottomSheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <DrawerPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...(props as React.ComponentProps<typeof DrawerPrimitive.Description>)}
    />
  )
}

export function BottomSheetBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto px-5 py-3", className)}
      {...props}
    />
  )
}

export function BottomSheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-auto flex flex-col gap-2 px-5 pt-3 pb-5",
        "border-t border-border/40",
        className,
      )}
      {...props}
    />
  )
}

/* ─── Re-export Dialog parts for desktop fallback parity ──────────────────── */
// These let consumers structure the same JSX whether the mode resolves to
// a sheet or a Dialog.
export { DialogHeader as BottomSheetDialogHeader, DialogTitle as BottomSheetDialogTitle, DialogDescription as BottomSheetDialogDescription, DialogFooter as BottomSheetDialogFooter }

export default BottomSheet
