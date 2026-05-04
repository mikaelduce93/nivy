/**
 * TEENS PARTY MOROCCO - ARIA Utilities
 * ====================================
 *
 * Utilitaires pour la gestion des attributs ARIA et l'accessibilité.
 */

/* ==========================================================================
   TYPES
   ========================================================================== */

export type AriaLive = 'off' | 'polite' | 'assertive'
export type AriaRole =
  | 'alert' | 'alertdialog' | 'application' | 'article' | 'banner'
  | 'button' | 'cell' | 'checkbox' | 'columnheader' | 'combobox'
  | 'complementary' | 'contentinfo' | 'definition' | 'dialog' | 'directory'
  | 'document' | 'feed' | 'figure' | 'form' | 'grid' | 'gridcell'
  | 'group' | 'heading' | 'img' | 'link' | 'list' | 'listbox'
  | 'listitem' | 'log' | 'main' | 'marquee' | 'math' | 'menu'
  | 'menubar' | 'menuitem' | 'menuitemcheckbox' | 'menuitemradio' | 'navigation'
  | 'none' | 'note' | 'option' | 'presentation' | 'progressbar' | 'radio'
  | 'radiogroup' | 'region' | 'row' | 'rowgroup' | 'rowheader'
  | 'scrollbar' | 'search' | 'searchbox' | 'separator' | 'slider'
  | 'spinbutton' | 'status' | 'switch' | 'tab' | 'table' | 'tablist'
  | 'tabpanel' | 'term' | 'textbox' | 'timer' | 'toolbar' | 'tooltip'
  | 'tree' | 'treegrid' | 'treeitem'

/* ==========================================================================
   ARIA ATTRIBUTES BUILDERS
   ========================================================================== */

/**
 * Build ARIA attributes for a button
 */
export function ariaButton(options: {
  label?: string
  describedBy?: string
  expanded?: boolean
  pressed?: boolean
  disabled?: boolean
  hasPopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
  controls?: string
}) {
  return {
    'aria-label': options.label,
    'aria-describedby': options.describedBy,
    'aria-expanded': options.expanded,
    'aria-pressed': options.pressed,
    'aria-disabled': options.disabled,
    'aria-haspopup': options.hasPopup,
    'aria-controls': options.controls,
  }
}

/**
 * Build ARIA attributes for an input field
 */
export function ariaInput(options: {
  label?: string
  describedBy?: string
  errorMessage?: string
  invalid?: boolean
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  placeholder?: string
}) {
  const describedBy = [
    options.describedBy,
    options.errorMessage ? `${options.describedBy || 'input'}-error` : undefined,
  ].filter(Boolean).join(' ') || undefined

  return {
    'aria-label': options.label,
    'aria-describedby': describedBy,
    'aria-invalid': options.invalid,
    'aria-required': options.required,
    'aria-disabled': options.disabled,
    'aria-readonly': options.readonly,
    'aria-placeholder': options.placeholder,
  }
}

/**
 * Build ARIA attributes for a dialog/modal
 */
export function ariaDialog(options: {
  label?: string
  labelledBy?: string
  describedBy?: string
  modal?: boolean
}) {
  return {
    role: 'dialog' as const,
    'aria-label': options.label,
    'aria-labelledby': options.labelledBy,
    'aria-describedby': options.describedBy,
    'aria-modal': options.modal ?? true,
  }
}

/**
 * Build ARIA attributes for a list
 */
export function ariaList(options: {
  label?: string
  multiSelectable?: boolean
  orientation?: 'horizontal' | 'vertical'
}) {
  return {
    role: 'listbox' as const,
    'aria-label': options.label,
    'aria-multiselectable': options.multiSelectable,
    'aria-orientation': options.orientation,
  }
}

/**
 * Build ARIA attributes for a list item
 */
export function ariaListItem(options: {
  selected?: boolean
  disabled?: boolean
  posInSet?: number
  setSize?: number
}) {
  return {
    role: 'option' as const,
    'aria-selected': options.selected,
    'aria-disabled': options.disabled,
    'aria-posinset': options.posInSet,
    'aria-setsize': options.setSize,
  }
}

/**
 * Build ARIA attributes for tabs
 */
export function ariaTabs(options: {
  label?: string
  orientation?: 'horizontal' | 'vertical'
}) {
  return {
    role: 'tablist' as const,
    'aria-label': options.label,
    'aria-orientation': options.orientation ?? 'horizontal',
  }
}

/**
 * Build ARIA attributes for a tab
 */
export function ariaTab(options: {
  selected?: boolean
  controls?: string
  disabled?: boolean
}) {
  return {
    role: 'tab' as const,
    'aria-selected': options.selected,
    'aria-controls': options.controls,
    'aria-disabled': options.disabled,
    tabIndex: options.selected ? 0 : -1,
  }
}

/**
 * Build ARIA attributes for a tab panel
 */
export function ariaTabPanel(options: {
  labelledBy?: string
  hidden?: boolean
}) {
  return {
    role: 'tabpanel' as const,
    'aria-labelledby': options.labelledBy,
    hidden: options.hidden,
    tabIndex: 0,
  }
}

/**
 * Build ARIA attributes for a progress indicator
 */
export function ariaProgress(options: {
  label?: string
  valueNow?: number
  valueMin?: number
  valueMax?: number
  valueText?: string
}) {
  return {
    role: 'progressbar' as const,
    'aria-label': options.label,
    'aria-valuenow': options.valueNow,
    'aria-valuemin': options.valueMin ?? 0,
    'aria-valuemax': options.valueMax ?? 100,
    'aria-valuetext': options.valueText,
  }
}

/**
 * Build ARIA attributes for alerts/notifications
 */
export function ariaAlert(options: {
  live?: AriaLive
  atomic?: boolean
  relevant?: 'additions' | 'removals' | 'text' | 'all'
}) {
  return {
    role: 'alert' as const,
    'aria-live': options.live ?? 'polite',
    'aria-atomic': options.atomic ?? true,
    'aria-relevant': options.relevant,
  }
}

/**
 * Build ARIA attributes for a navigation region
 */
export function ariaNavigation(options: {
  label: string
}) {
  return {
    role: 'navigation' as const,
    'aria-label': options.label,
  }
}

/**
 * Build ARIA attributes for a search region
 */
export function ariaSearch(options: {
  label?: string
}) {
  return {
    role: 'search' as const,
    'aria-label': options.label ?? 'Recherche',
  }
}

/**
 * Build ARIA attributes for a main content region
 */
export function ariaMain(options?: {
  label?: string
}) {
  return {
    role: 'main' as const,
    'aria-label': options?.label,
  }
}

/* ==========================================================================
   SCREEN READER UTILITIES
   ========================================================================== */

/**
 * Visually hide element but keep it accessible to screen readers
 */
export const srOnlyStyles = {
  position: 'absolute' as const,
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap' as const,
  border: '0',
}

/**
 * CSS class for screen reader only content
 */
export const srOnlyClass = 'sr-only'

/* ==========================================================================
   ID GENERATION
   ========================================================================== */

let idCounter = 0

/**
 * Generate a unique ID for ARIA attributes
 */
export function generateAriaId(prefix = 'aria'): string {
  idCounter += 1
  return `${prefix}-${idCounter}`
}

/**
 * Generate related IDs for form fields
 */
export function generateFormFieldIds(name: string) {
  const base = `field-${name}`
  return {
    input: `${base}-input`,
    label: `${base}-label`,
    description: `${base}-description`,
    error: `${base}-error`,
  }
}

/* ==========================================================================
   FOCUS MANAGEMENT
   ========================================================================== */

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ')

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
}

/**
 * Trap focus within a container (for modals)
 */
export function trapFocus(container: HTMLElement) {
  const focusableElements = getFocusableElements(container)
  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement?.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement?.focus()
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown)

  // Focus first element
  firstElement?.focus()

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

/* ==========================================================================
   KEYBOARD NAVIGATION HELPERS
   ========================================================================== */

/**
 * Handle arrow key navigation for lists
 */
export function handleArrowNavigation(
  event: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both'
    loop?: boolean
    onSelect?: (index: number) => void
  } = {}
): number {
  const { orientation = 'vertical', loop = true, onSelect } = options

  let newIndex = currentIndex
  const lastIndex = items.length - 1

  const isVertical = orientation === 'vertical' || orientation === 'both'
  const isHorizontal = orientation === 'horizontal' || orientation === 'both'

  switch (event.key) {
    case 'ArrowUp':
      if (isVertical) {
        event.preventDefault()
        newIndex = currentIndex > 0 ? currentIndex - 1 : (loop ? lastIndex : 0)
      }
      break
    case 'ArrowDown':
      if (isVertical) {
        event.preventDefault()
        newIndex = currentIndex < lastIndex ? currentIndex + 1 : (loop ? 0 : lastIndex)
      }
      break
    case 'ArrowLeft':
      if (isHorizontal) {
        event.preventDefault()
        newIndex = currentIndex > 0 ? currentIndex - 1 : (loop ? lastIndex : 0)
      }
      break
    case 'ArrowRight':
      if (isHorizontal) {
        event.preventDefault()
        newIndex = currentIndex < lastIndex ? currentIndex + 1 : (loop ? 0 : lastIndex)
      }
      break
    case 'Home':
      event.preventDefault()
      newIndex = 0
      break
    case 'End':
      event.preventDefault()
      newIndex = lastIndex
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      onSelect?.(currentIndex)
      break
  }

  if (newIndex !== currentIndex) {
    items[newIndex]?.focus()
  }

  return newIndex
}

/* ==========================================================================
   ANNOUNCEMENTS
   ========================================================================== */

let announcerElement: HTMLElement | null = null

/**
 * Announce a message to screen readers
 */
export function announce(message: string, priority: AriaLive = 'polite') {
  // Create announcer element if it doesn't exist
  if (!announcerElement && typeof document !== 'undefined') {
    announcerElement = document.createElement('div')
    announcerElement.setAttribute('aria-live', priority)
    announcerElement.setAttribute('aria-atomic', 'true')
    announcerElement.setAttribute('class', 'sr-only')
    Object.assign(announcerElement.style, srOnlyStyles)
    document.body.appendChild(announcerElement)
  }

  if (announcerElement) {
    // Update live region priority
    announcerElement.setAttribute('aria-live', priority)

    // Clear and set message (needed for re-announcement)
    announcerElement.textContent = ''
    setTimeout(() => {
      if (announcerElement) {
        announcerElement.textContent = message
      }
    }, 100)
  }
}

/**
 * Announce an error message (assertive)
 */
export function announceError(message: string) {
  announce(message, 'assertive')
}

/**
 * Announce a success message (polite)
 */
export function announceSuccess(message: string) {
  announce(message, 'polite')
}
