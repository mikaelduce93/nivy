'use client'

/* ==========================================================================
   Juicy toast wrapper

   Drop-in replacement for `import { toast } from 'sonner'` that adds:
     - Success / error / warning sounds
     - Light haptic feedback
   Both are gated by `prefers-reduced-motion` and the user mute setting,
   handled centrally by `playJuice` (lib/hooks/use-juice).

   Existing call sites can be migrated incrementally:
     - import { toast } from '@/lib/utils/toast'
     - toast.success('Yes!') / toast.error('Nope') / toast.info('FYI')

   The default export remains the raw Sonner toast for cases where the
   caller wants full control (custom JSX, persist, etc.).
   ========================================================================== */

import { toast as sonner } from 'sonner'
import { playJuice } from '@/lib/hooks/use-juice'

type SonnerOptions = Parameters<typeof sonner>[1]

export const toast = {
  success: (message: string, options?: SonnerOptions) => {
    playJuice('success')
    return sonner.success(message, options)
  },
  error: (message: string, options?: SonnerOptions) => {
    playJuice('error')
    return sonner.error(message, options)
  },
  warning: (message: string, options?: SonnerOptions) => {
    playJuice('warning')
    return sonner.warning(message, options)
  },
  info: (message: string, options?: SonnerOptions) => {
    // info is non-blocking; play a subtle notification (no haptic for spam-safety).
    playJuice('notification', { noHaptic: true })
    return sonner.info(message, options)
  },
  message: (message: string, options?: SonnerOptions) => sonner.message(message, options),
  loading: (message: string, options?: SonnerOptions) => sonner.loading(message, options),
  dismiss: (toastId?: string | number) => sonner.dismiss(toastId),
  promise: sonner.promise.bind(sonner),
  custom: sonner.custom.bind(sonner),
}

// Raw access for advanced cases.
export { sonner as rawToast }
