# Teen Dashboard Design System

> Silicon Valley Grade UI/UX for Teens Party Morocco

## Overview

This design system provides a comprehensive set of tokens, components, and utilities for building a premium $300M+ quality teen dashboard experience.

## Design Tokens

### Spacing Scale

Location: `lib/design-system/tokens.ts`

```typescript
spacing: {
  xs: '0.25rem',    // 4px - Micro spacing
  sm: '0.5rem',     // 8px - Tight spacing
  md: '1rem',       // 16px - Default
  lg: '1.5rem',     // 24px - Section spacing
  xl: '2rem',       // 32px - Large sections
  '2xl': '3rem',    // 48px - Major divisions
  '3xl': '4rem',    // 64px - Page-level
}
```

**Usage:**
- Use `xs` for icon spacing, inline elements
- Use `sm` for compact UI, form fields
- Use `md` as default for most spacing
- Use `lg` for section margins
- Use `xl+` for major layout divisions

### Typography Scale

Major Third ratio (1.250) for optimal mobile readability:

```typescript
fontSize: {
  '2xs': '0.625rem',  // 10px - Badges
  xs: '0.6875rem',    // 11px - Captions
  sm: '0.8125rem',    // 13px - Labels
  base: '1rem',       // 16px - Body
  lg: '1.125rem',     // 18px - Lead text
  xl: '1.25rem',      // 20px - Small headings
  '2xl': '1.5rem',    // 24px - Section headings
  '3xl': '1.875rem',  // 30px - Major headings
  '4xl': '2.25rem',   // 36px - Page titles
  '5xl': '3rem',      // 48px - Hero headings
}
```

### Color System

Location: `lib/design-system/colors.ts`

#### Gen-Z Palette (OKLCH)

```typescript
lavender: 'oklch(0.75 0.15 290)'  // Primary brand
coral: 'oklch(0.70 0.20 25)'      // Energy, alerts
mint: 'oklch(0.85 0.15 160)'      // Success, sports
yellow: 'oklch(0.90 0.18 95)'     // Culture, highlights
grape: 'oklch(0.55 0.20 300)'     // Community
```

#### Semantic Colors

```typescript
semantic: {
  primary: lavender,
  success: mint,
  warning: yellow,
  danger: coral,
  
  surface: {
    base: 'oklch(0.08 0.015 290)',     // Page bg
    raised: 'oklch(0.13 0.020 290)',   // Cards
    overlay: 'oklch(0.18 0.025 290)',  // Modals
  },
  
  text: {
    primary: 'oklch(0.98 0 0)',        // 15.5:1 contrast
    secondary: 'oklch(0.78 0.02 290)', // 7.2:1 contrast
    tertiary: 'oklch(0.62 0.02 290)',  // 4.6:1 contrast
  },
}
```

### Animation Timing

Location: `lib/design-system/motion.ts`

```typescript
duration: {
  instant: 50,   // Immediate feedback
  faster: 100,   // Hover states
  fast: 150,     // Tooltips
  normal: 200,   // Standard transitions
  slow: 300,     // Modals
  slower: 400,   // Page transitions
}
```

#### Spring Presets

```typescript
springPresets: {
  gentle: { stiffness: 100, damping: 20 },
  default: { stiffness: 200, damping: 25 },
  snappy: { stiffness: 400, damping: 30 },
  bouncy: { stiffness: 300, damping: 15 },
}
```

### Z-Index Scale

```typescript
zIndex: {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  overlay: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
}
```

---

## Component Primitives

Location: `components/ui/primitives/`

### Surface

Base container with elevation system.

```tsx
import { Surface, MotionSurface } from '@/components/ui/primitives'

<Surface elevation="raised" padding="lg" radius="xl">
  Card content
</Surface>

<MotionSurface animate hoverLift tapScale>
  Animated card
</MotionSurface>
```

Props:
- `elevation`: 'base' | 'subtle' | 'raised' | 'elevated' | 'overlay' | 'glass' | 'ghost'
- `padding`: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
- `radius`: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
- `hoverable`: boolean
- `focusable`: boolean

### Stack

Flexbox layout abstraction.

```tsx
import { Stack, HStack, VStack, Spacer, Divider } from '@/components/ui/primitives'

<VStack gap="md" align="center">
  <Item />
  <Spacer />
  <Item />
</VStack>

<HStack gap="lg" justify="between" responsive>
  <Left />
  <Right />
</HStack>
```

Props:
- `direction`: 'row' | 'column' | 'row-reverse' | 'column-reverse'
- `gap`: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
- `align`: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
- `justify`: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
- `responsive`: boolean (column on mobile, row on desktop)

### Text

Typography component with design token scale.

```tsx
import { Text, Heading, Label, Code } from '@/components/ui/primitives'

<Heading level={1} size="4xl" weight="bold">
  Page Title
</Heading>

<Text size="base" color="secondary" leading="relaxed">
  Body text
</Text>

<Label required>Email</Label>
```

Props:
- `size`: '2xs' | 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'
- `weight`: 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black'
- `color`: 'primary' | 'secondary' | 'tertiary' | 'muted' | 'success' | 'warning' | 'danger' | 'lavender' | 'coral' | 'mint' | 'yellow'
- `truncate`: boolean
- `lineClamp`: 1 | 2 | 3 | 4 | 5 | 6

### Icon

Consistent icon wrapper.

```tsx
import { Icon, CircleIcon } from '@/components/ui/primitives'
import { Home } from 'lucide-react'

<Icon icon={Home} size="md" color="primary" label="Home" />

<CircleIcon icon={Home} size="lg" bg="lavender" />
```

---

## Motion System

Location: `lib/design-system/motion.ts`

### Card Variants

```tsx
import { cardVariants, cardMotion } from '@/lib/design-system'

<motion.div
  variants={cardVariants}
  initial="hidden"
  animate="visible"
  exit="exit"
>
  Card content
</motion.div>

<motion.div
  {...cardMotion.hover}
  {...cardMotion.tap}
>
  Interactive card
</motion.div>
```

### Stagger Animations

```tsx
import { staggerContainer, staggerItem } from '@/lib/design-system'

<motion.div variants={staggerContainer} initial="hidden" animate="visible">
  {items.map(item => (
    <motion.div key={item.id} variants={staggerItem}>
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

### Micro-interactions

```tsx
import { microInteractions } from '@/lib/design-system'

<motion.button {...microInteractions.buttonPress}>
  Click me
</motion.button>

<motion.div {...microInteractions.iconHover}>
  <Icon />
</motion.div>
```

---

## Performance Utilities

Location: `lib/design-system/performance.ts`

### Debounced Hover

```tsx
import { useDebouncedHover } from '@/lib/design-system'

const { isHovered, hoverProps } = useDebouncedHover(50)

<div {...hoverProps}>
  {isHovered && <Tooltip />}
</div>
```

### Throttled Mouse Position

```tsx
import { useThrottledMousePosition } from '@/lib/design-system'

const { position, mouseProps } = useThrottledMousePosition(16)

<div {...mouseProps} style={{ '--x': position.normalizedX }}>
  Spotlight effect
</div>
```

### In View Detection

```tsx
import { useInView } from '@/lib/design-system'

const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true })

<div ref={ref}>
  {inView && <LazyContent />}
</div>
```

### Device Performance

```tsx
import { useDevicePerformance } from '@/lib/design-system'

const { level, maxParticles, enableHeavyEffects } = useDevicePerformance()

{enableHeavyEffects && <ParticleSystem count={maxParticles} />}
```

---

## Accessibility

### Keyboard Navigation

Location: `lib/hooks/use-keyboard-nav.ts`

```tsx
import { useKeyboardNav, useAccessibleClick } from '@/lib/hooks'

// Option 1: Hook
const { handleKeyDown, keyboardProps } = useKeyboardNav()

<div
  {...keyboardProps}
  onKeyDown={(e) => handleKeyDown(e, handleAction)}
  onClick={handleAction}
>

// Option 2: Combined click handler
const clickProps = useAccessibleClick(handleAction)

<div {...clickProps}>
  Accessible clickable
</div>
```

### Focus Trap

```tsx
import { useFocusTrap } from '@/lib/hooks'

const { containerRef } = useFocusTrap(isOpen)

<div ref={containerRef}>
  <Modal />
</div>
```

### Reduced Motion

```tsx
import { useReducedMotion, usePrefersReducedMotion } from '@/lib/hooks'

// Full context
const { prefersReducedMotion, showParticles, getTransition } = useReducedMotion()

<motion.div transition={getTransition({ duration: 0.3 })}>
  {showParticles && <Particles />}
</motion.div>

// Simple hook
const reducedMotion = usePrefersReducedMotion()
```

---

## Responsive Design

### Breakpoints

Location: `lib/design-system/breakpoints.ts`

```typescript
breakpointValues: {
  xs: 375,   // Small phones
  sm: 640,   // Large phones
  md: 768,   // Tablets
  lg: 1024,  // Small laptops
  xl: 1280,  // Desktops
  '2xl': 1536, // Large desktops
}
```

### Touch Optimization

Location: `lib/hooks/use-touch-optimized.ts`

```tsx
import { useTouchOptimized, useTapFeedback } from '@/lib/hooks'

const { isTouchDevice, touchProps, swipeDirection } = useTouchOptimized({
  swipeThreshold: 50,
  hapticFeedback: true,
}, onSwipe, onLongPress)

<div {...touchProps}>
  Swipeable content
</div>
```

### Mobile Navigation

```tsx
import { MobileBottomNav } from '@/components/teen/dashboard/mobile-nav'

<MobileBottomNav />
// Automatically hidden on md+ screens
```

---

## Error Handling

### Error Boundaries

Location: `components/teen/dashboard/dashboard-error-boundary.tsx`

```tsx
import { DashboardErrorBoundary, withErrorBoundary } from '@/components/teen/dashboard/dashboard-error-boundary'

// Wrapper
<DashboardErrorBoundary componentName="MapPreview" compact>
  <MapPreview />
</DashboardErrorBoundary>

// HOC
const SafeMapPreview = withErrorBoundary(MapPreview, {
  componentName: 'MapPreview',
  compact: true,
})
```

### Loading Skeletons

Location: `components/ui/skeletons/dashboard-skeletons.tsx`

```tsx
import {
  HeroSkeleton,
  BentoCardSkeleton,
  PriorityMissionSkeleton,
  DashboardSkeleton,
} from '@/components/ui/skeletons'

<Suspense fallback={<HeroSkeleton />}>
  <Hero />
</Suspense>
```

### Empty States

```tsx
import { EmptyState } from '@/components/ui/states'

<EmptyState
  preset="friends"
  action={{ label: 'Inviter des amis', href: '/invite' }}
  secondaryAction={{ label: 'Explorer', href: '/explore' }}
/>
```

---

## Best Practices

### 1. Always Use Design Tokens

```tsx
// ❌ Bad
<div className="p-4 text-sm text-gray-500">

// ✅ Good
<Surface padding="md">
  <Text size="sm" color="tertiary">
```

### 2. Respect Reduced Motion

```tsx
// ❌ Bad
<motion.div animate={{ y: [0, -10, 0] }} />

// ✅ Good
const { showParticles } = useReducedMotion()
{showParticles && <motion.div animate={{ y: [0, -10, 0] }} />}
```

### 3. Ensure Keyboard Accessibility

```tsx
// ❌ Bad
<div onClick={handleClick}>

// ✅ Good
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
  aria-label="Description"
>
```

### 4. Use Semantic Colors

```tsx
// ❌ Bad
<div className="text-red-500">Error</div>

// ✅ Good
<Text color="danger">Error</Text>
```

### 5. Lazy Load Heavy Components

```tsx
// ❌ Bad
import { ParticleSystem } from '@/components/ui/effects/particle-system'

// ✅ Good
const LazyParticles = dynamic(() => import('@/components/ui/effects/particle-system-v2'), {
  ssr: false,
})
```

---

## File Structure

```
lib/
  design-system/
    tokens.ts        # Spacing, typography, timing, z-index
    colors.ts        # Color palette and semantic tokens
    motion.ts        # Animation presets and variants
    breakpoints.ts   # Responsive breakpoints
    performance.ts   # Performance utilities
    index.ts         # Central export

  hooks/
    use-keyboard-nav.ts     # Keyboard navigation
    use-touch-optimized.ts  # Touch interactions
    use-reduced-motion.ts   # Motion preferences
    index.ts                # Central export

components/
  ui/
    primitives/
      surface.tsx   # Container component
      stack.tsx     # Flexbox layouts
      grid.tsx      # CSS Grid layouts
      text.tsx      # Typography
      icon.tsx      # Icon wrapper
      index.ts      # Central export

    effects/
      particle-system-v2.tsx  # Canvas particles
      ...

    skeletons/
      dashboard-skeletons.tsx
      ...

  teen/
    dashboard/
      hero.tsx                    # Unified hero
      mobile-nav.tsx              # Bottom navigation
      dashboard-error-boundary.tsx
      ...
```

---

## Version

- **Design System Version:** 2.0.0
- **Last Updated:** January 2026
- **Compatibility:** Next.js 14+, React 18+, Tailwind CSS 3+
