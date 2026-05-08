'use client'

/* ============================================================================
   <ResponsiveModal> — TICKET-046 + TICKET-028 (UX-Sprint Wave 1)
   ----------------------------------------------------------------------------
   A single modal primitive that resolves to:
     • Centered Radix Dialog with backdrop blur on >= md (768px)
     • Vaul bottom-sheet (drag-to-dismiss, snap-aware, safe-area padded)
       on  < md
   The caller writes the same JSX in both cases; viewport detection is
   internal and SSR-safe.

   Why a new component (vs reusing <BottomSheet> / <Dialog>):
     • <BottomSheet> exists but its public API is sheet-shaped. We want the
       symmetric Dialog-shaped contract for confirms / forms / pickers.
     • <Dialog> exists and stays untouched (additive policy, do NOT migrate
       existing callers in this ticket).

   Public API (compound):

     <ResponsiveModal open={open} onOpenChange={setOpen}>
       <ResponsiveModal.Header>
         <ResponsiveModal.Title>Title</ResponsiveModal.Title>
         <ResponsiveModal.Description>Sub</ResponsiveModal.Description>
       </ResponsiveModal.Header>
       <ResponsiveModal.Body>...</ResponsiveModal.Body>
       <ResponsiveModal.Footer>
         <Button variant="ghost">Cancel</Button>
         <Button>Confirm</Button>
       </ResponsiveModal.Footer>
     </ResponsiveModal>

   Mobile gestures (Vaul-native):
     • drag-down on the handle / non-scroll content → dismiss with momentum
     • swipe past 50 % of height → close; otherwise spring back
     • overlay tap → close (unless `dismissible={false}`)
     • Esc → close (Radix on desktop, Vaul on mobile)

   Accessibility:
     • Focus trap (Radix + Vaul both implement)
     • Body-scroll-lock (Radix + Vaul both implement)
     • Esc to close
     • Title/Description wired to aria-labelledby / aria-describedby
   ========================================================================= */

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Drawer as DrawerPrimitive } from 'vaul'
import { XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/* ─── viewport hook (SSR-safe) ────────────────────────────────────────────── */

const MOBILE_BREAKPOINT_PX = 768 // Tailwind `md`

function useIsMobile(breakpoint = MOBILE_BREAKPOINT_PX) {
  // Default `false` on SSR; first paint on mobile then re-renders to `true`.
  // We accept this — alternative (suspending) would block hydration.
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [breakpoint])
  return isMobile
}

/* ─── context (so slots know which surface they render in) ────────────────── */

type Variant = 'dialog' | 'sheet'
const VariantCtx = React.createContext<Variant>('dialog')
const useVariant = () => React.useContext(VariantCtx)

/* ─── root ─────────────────────────────────────────────────────────────────── */

export interface ResponsiveModalProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Force a variant regardless of viewport. Useful for storybook / tests. */
  forceVariant?: Variant
  /** Whether the modal can be dismissed by overlay click / drag / Esc. */
  dismissible?: boolean
  /** Whether the close (X) button is shown on the desktop variant. */
  showCloseButton?: boolean
  /** Extra className on the inner surface (Dialog content / Drawer content). */
  className?: string
  /** Optional vaul snap points (mobile only). */
  snapPoints?: (number | string)[]
  children?: React.ReactNode
}

const SHARED_OVERLAY = cn(
  'fixed inset-0 z-50 bg-black/40 backdrop-blur-md',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
)

function ResponsiveModalRoot({
  open,
  defaultOpen,
  onOpenChange,
  forceVariant,
  dismissible = true,
  showCloseButton = true,
  className,
  snapPoints,
  children,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile()
  const variant: Variant = forceVariant ?? (isMobile ? 'sheet' : 'dialog')

  if (variant === 'sheet') {
    return (
      <VariantCtx.Provider value="sheet">
        <DrawerPrimitive.Root
          open={open}
          defaultOpen={defaultOpen}
          onOpenChange={onOpenChange}
          dismissible={dismissible}
          snapPoints={snapPoints}
        >
          <DrawerPrimitive.Portal>
            <DrawerPrimitive.Overlay className={SHARED_OVERLAY} />
            <DrawerPrimitive.Content
              className={cn(
                // base layout
                'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[92vh] flex-col',
                // surface
                'rounded-t-3xl border-t border-border/60 bg-background outline-none',
                'shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.35)]',
                // iOS home indicator
                'pb-[env(safe-area-inset-bottom)]',
                className,
              )}
            >
              {/* drag handle (vaul drives the gesture from the whole content) */}
              <div
                aria-hidden="true"
                className="mx-auto mt-3 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/40"
              />
              {children}
            </DrawerPrimitive.Content>
          </DrawerPrimitive.Portal>
        </DrawerPrimitive.Root>
      </VariantCtx.Provider>
    )
  }

  // Desktop: Radix Dialog, fade+scale animation
  return (
    <VariantCtx.Provider value="dialog">
      <DialogPrimitive.Root
        open={open}
        defaultOpen={defaultOpen}
        onOpenChange={onOpenChange}
        modal
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className={SHARED_OVERLAY} />
          <DialogPrimitive.Content
            onEscapeKeyDown={dismissible ? undefined : (e) => e.preventDefault()}
            onPointerDownOutside={
              dismissible ? undefined : (e) => e.preventDefault()
            }
            className={cn(
              'fixed left-1/2 top-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border bg-background p-0 shadow-2xl outline-none',
              'sm:max-w-lg',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
              'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
              'data-[state=open]:slide-in-from-bottom-2',
              'duration-200',
              className,
            )}
          >
            {children}
            {showCloseButton && dismissible && (
              <DialogPrimitive.Close
                className={cn(
                  'absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground opacity-70 transition hover:opacity-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  'disabled:pointer-events-none',
                )}
              >
                <XIcon className="size-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </VariantCtx.Provider>
  )
}

/* ─── slots ────────────────────────────────────────────────────────────────── */

function Header({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const v = useVariant()
  return (
    <div
      data-slot="responsive-modal-header"
      className={cn(
        'flex flex-col gap-1.5',
        v === 'sheet'
          ? 'px-5 pt-2 pb-3 text-left'
          : 'px-6 pt-6 pb-2 text-left',
        className,
      )}
      {...props}
    />
  )
}

type TitleProps = React.HTMLAttributes<HTMLHeadingElement>

function Title({ className, ...props }: TitleProps) {
  const v = useVariant()
  const Cmp =
    v === 'sheet' ? DrawerPrimitive.Title : DialogPrimitive.Title
  return (
    <Cmp
      data-slot="responsive-modal-title"
      className={cn(
        'text-lg font-semibold leading-tight text-foreground',
        className,
      )}
      {...(props as React.ComponentProps<typeof DialogPrimitive.Title>)}
    />
  )
}

type DescProps = React.HTMLAttributes<HTMLParagraphElement>

function Description({ className, ...props }: DescProps) {
  const v = useVariant()
  const Cmp =
    v === 'sheet'
      ? DrawerPrimitive.Description
      : DialogPrimitive.Description
  return (
    <Cmp
      data-slot="responsive-modal-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...(props as React.ComponentProps<typeof DialogPrimitive.Description>)}
    />
  )
}

function Body({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const v = useVariant()
  return (
    <div
      data-slot="responsive-modal-body"
      className={cn(
        'flex-1 overflow-y-auto',
        v === 'sheet' ? 'px-5 py-3' : 'px-6 py-3',
        className,
      )}
      {...props}
    />
  )
}

function Footer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const v = useVariant()
  return (
    <div
      data-slot="responsive-modal-footer"
      className={cn(
        v === 'sheet'
          ? 'mt-auto flex flex-col-reverse gap-2 border-t border-border/40 px-5 pt-3 pb-5'
          : 'flex flex-col-reverse gap-2 border-t border-border/40 px-6 py-4 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  )
}

/* ─── close (programmatic) ─────────────────────────────────────────────────── */

function Close({
  asChild,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  const v = useVariant()
  const Cmp = v === 'sheet' ? DrawerPrimitive.Close : DialogPrimitive.Close
  return (
    <Cmp
      asChild={asChild}
      {...(props as React.ComponentProps<typeof DialogPrimitive.Close>)}
    />
  )
}

/* ─── compound export ──────────────────────────────────────────────────────── */

type ResponsiveModalCompound = React.FC<ResponsiveModalProps> & {
  Header: typeof Header
  Title: typeof Title
  Description: typeof Description
  Body: typeof Body
  Footer: typeof Footer
  Close: typeof Close
}

const ResponsiveModal = ResponsiveModalRoot as ResponsiveModalCompound
ResponsiveModal.Header = Header
ResponsiveModal.Title = Title
ResponsiveModal.Description = Description
ResponsiveModal.Body = Body
ResponsiveModal.Footer = Footer
ResponsiveModal.Close = Close

export { ResponsiveModal }
export {
  Header as ResponsiveModalHeader,
  Title as ResponsiveModalTitle,
  Description as ResponsiveModalDescription,
  Body as ResponsiveModalBody,
  Footer as ResponsiveModalFooter,
  Close as ResponsiveModalClose,
}

export default ResponsiveModal
