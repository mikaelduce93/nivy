# Teen Dashboard Components

> Complete component reference for the Teen Dashboard

## Dashboard Components

### Hero

**Location:** `components/teen/dashboard/hero.tsx`

The main dashboard hero section displaying user info, XP, and streak.

```tsx
import { Hero } from '@/components/teen/dashboard/hero'

<Hero
  variant="elite"
  user={userInfo}
  xpData={{
    total: 3450,
    level: 12,
    xpInLevel: 450,
    xpForNextLevel: 1000,
  }}
  currentStreak={7}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'standard' \| 'elite' \| 'legendary' | 'standard' | Visual variant based on user tier |
| user | UserRoleInfo | required | User data object |
| xpData | XPData | required | XP and level information |
| currentStreak | number | required | Current streak in days |
| className | string | - | Additional CSS class |

**Variants:**
- **standard** - Clean, minimal effects for base users
- **elite** - Subtle 3D effects and glow for mid-tier users
- **legendary** - Full premium effects for top users

---

### MobileBottomNav

**Location:** `components/teen/dashboard/mobile-nav.tsx`

Instagram-style floating bottom navigation for mobile devices.

```tsx
import { MobileBottomNav } from '@/components/teen/dashboard/mobile-nav'

<MobileBottomNav
  hiddenPaths={['/teen/chat']}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| extraItems | NavItem[] | [] | Additional nav items |
| hiddenPaths | string[] | ['/teen/chat', '/teen/quests'] | Paths where nav is hidden |
| className | string | - | Additional CSS class |

**Features:**
- Auto-hides on scroll down
- Shows on scroll up
- Animated active state
- Respects safe areas (iOS)

---

### DashboardErrorBoundary

**Location:** `components/teen/dashboard/dashboard-error-boundary.tsx`

Error boundary with graceful degradation for dashboard components.

```tsx
import { DashboardErrorBoundary } from '@/components/teen/dashboard/dashboard-error-boundary'

<DashboardErrorBoundary componentName="MapPreview" compact>
  <MapPreview />
</DashboardErrorBoundary>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| children | ReactNode | required | Components to wrap |
| componentName | string | - | Name for error logging |
| fallback | ReactNode | - | Custom fallback UI |
| onError | function | - | Error callback |
| compact | boolean | false | Use compact error UI |
| className | string | - | Additional CSS class |

**Error Types Detected:**
- Network errors (connection issues)
- Server errors (500s)
- Client errors (TypeErrors)
- Unknown errors

---

## UI Primitives

### Surface

**Location:** `components/ui/primitives/surface.tsx`

Base container component with elevation system.

```tsx
import { Surface, MotionSurface } from '@/components/ui/primitives'

// Static surface
<Surface elevation="raised" padding="lg" radius="xl">
  Content
</Surface>

// Animated surface
<MotionSurface 
  animate 
  hoverLift 
  tapScale
  variants={customVariants}
>
  Animated content
</MotionSurface>
```

**Elevations:**

| Elevation | Use Case |
|-----------|----------|
| base | Page background |
| subtle | Slightly raised areas |
| raised | Cards (default) |
| elevated | Hovered cards |
| overlay | Modals, overlays |
| glass | Glassmorphism effect |
| ghost | Transparent with border |

---

### Stack

**Location:** `components/ui/primitives/stack.tsx`

Flexbox layout abstraction.

```tsx
import { Stack, HStack, VStack, Spacer, Divider } from '@/components/ui/primitives'

<VStack gap="md" align="center">
  <Header />
  <Spacer />
  <Footer />
</VStack>

<HStack gap="lg" justify="between" responsive>
  <Left />
  <Divider orientation="vertical" />
  <Right />
</HStack>
```

---

### Grid

**Location:** `components/ui/primitives/grid.tsx`

CSS Grid layout abstraction.

```tsx
import { Grid, GridItem } from '@/components/ui/primitives'

<Grid columns="cards-md" gap="lg">
  {items.map(item => (
    <GridItem key={item.id} colSpan={2}>
      <Card />
    </GridItem>
  ))}
</Grid>
```

**Column Presets:**

| Preset | Description |
|--------|-------------|
| cards-sm | 1 → 2 → 3 columns |
| cards-md | 1 → 2 → 4 columns |
| cards-lg | 2 → 3 → 6 columns |
| bento | 4 → 8 → 12 columns |
| dashboard | Sidebar + content |
| content-sidebar | Content + sidebar |

---

### Text

**Location:** `components/ui/primitives/text.tsx`

Typography component with design token scale.

```tsx
import { Text, Heading, Label, Code } from '@/components/ui/primitives'

<Heading level={1}>Page Title</Heading>
<Text size="lg" color="secondary" leading="relaxed">
  Lead paragraph with relaxed line height.
</Text>
<Label required>Email Address</Label>
<Code>const x = 1</Code>
```

**Heading Defaults:**

| Level | Size | Weight |
|-------|------|--------|
| h1 | 5xl | bold |
| h2 | 4xl | bold |
| h3 | 3xl | semibold |
| h4 | 2xl | semibold |
| h5 | xl | medium |
| h6 | lg | medium |

---

### Icon

**Location:** `components/ui/primitives/icon.tsx`

Consistent icon wrapper with accessibility.

```tsx
import { Icon, CircleIcon, IconButtonContainer } from '@/components/ui/primitives'
import { Home, Settings } from 'lucide-react'

// Basic icon
<Icon icon={Home} size="md" color="primary" />

// Accessible icon
<Icon icon={Settings} label="Open settings" />

// Decorative icon
<Icon icon={Home} decorative />

// With circle background
<CircleIcon icon={Home} size="lg" bg="lavender" />

// Clickable icon
<IconButtonContainer aria-label="Settings">
  <Icon icon={Settings} size="md" />
</IconButtonContainer>
```

---

## Effect Components

### ParticleSystemV2

**Location:** `components/ui/effects/particle-system-v2.tsx`

Canvas-based high-performance particle system.

```tsx
import { ParticleSystemV2, FloatingParticles, RisingSparks, PALETTES } from '@/components/ui/effects/particle-system-v2'

// Full control
<ParticleSystemV2
  count={20}
  colors={PALETTES.lavender}
  speed="medium"
  direction="up"
  glow
  glowIntensity={10}
/>

// Presets
<FloatingParticles count={15} colors={PALETTES.gold} />
<RisingSparks count={8} intensity="high" />
```

**Features:**
- Canvas API for 100x fewer DOM elements
- Adaptive particle count based on device
- Viewport-aware (pauses when not visible)
- Respects prefers-reduced-motion
- Memory-efficient

---

## Skeleton Components

**Location:** `components/ui/skeletons/dashboard-skeletons.tsx`

Loading skeletons for dashboard components.

```tsx
import {
  Skeleton,
  HeroSkeleton,
  BentoCardSkeleton,
  PriorityMissionSkeleton,
  QuickAccessSkeleton,
  OnlineFriendsSkeleton,
  CrewHubSkeleton,
  MapPreviewSkeleton,
  SocialFeedSkeleton,
  ProfileQuestSkeleton,
  DashboardSkeleton,
} from '@/components/ui/skeletons'

<Suspense fallback={<HeroSkeleton />}>
  <Hero />
</Suspense>

// Full dashboard loading
<DashboardSkeleton />
```

---

## Empty States

**Location:** `components/ui/states/empty-state.tsx`

Premium empty state with animations.

```tsx
import { EmptyState } from '@/components/ui/states'

<EmptyState
  preset="friends"
  size="large"
  action={{
    label: 'Inviter des amis',
    href: '/invite',
  }}
  secondaryAction={{
    label: 'Explorer',
    onClick: () => {},
    variant: 'outline',
  }}
/>
```

**Presets:**
- events, tickets, users, clubs
- notifications, search, documents
- favorites, reviews, cart
- inbox, files, photos, messages

---

## Action Button

**Location:** `components/ui/action-button.tsx`

Unified action button with variants.

```tsx
import { ActionButton } from '@/components/ui/action-button'

<ActionButton
  href="/teen/shop"
  icon="zap"
  label="Shop XP"
  variant="bubble"
  size="md"
  color="bg-gen-z-lavender"
  badge={3}
/>
```

**Variants:**
- **bubble** - Large circular with glow
- **card** - Rectangular card style
- **inline** - Horizontal inline style

---

## Hooks Reference

### useKeyboardNav

Keyboard navigation for interactive elements.

```tsx
import { useKeyboardNav } from '@/lib/hooks'

const { handleKeyDown, keyboardProps } = useKeyboardNav({
  onEnter: true,
  onSpace: true,
  onEscape: () => closeModal(),
})

<div
  {...keyboardProps}
  onKeyDown={(e) => handleKeyDown(e, handleAction)}
  onClick={handleAction}
>
```

### useTouchOptimized

Touch-first interactions with swipe detection.

```tsx
import { useTouchOptimized } from '@/lib/hooks'

const { isTouchDevice, touchProps, swipeDirection } = useTouchOptimized(
  { swipeThreshold: 50, hapticFeedback: true },
  (direction) => console.log('Swiped:', direction),
  () => console.log('Long press!')
)

<div {...touchProps}>
  Swipeable content
</div>
```

### useReducedMotion

Respect user's motion preferences.

```tsx
import { useReducedMotion } from '@/lib/hooks'

const { 
  prefersReducedMotion,
  showParticles,
  show3DEffects,
  getTransition,
  getVariants,
} = useReducedMotion()

{showParticles && <ParticleSystem />}

<motion.div transition={getTransition({ duration: 0.3 })}>
```

### useDebouncedHover

Debounced hover state for performance.

```tsx
import { useDebouncedHover } from '@/lib/design-system'

const { isHovered, hoverProps } = useDebouncedHover(50)

<div {...hoverProps}>
  {isHovered && <Tooltip />}
</div>
```

### useInView

Viewport intersection detection.

```tsx
import { useInView } from '@/lib/design-system'

const { ref, inView } = useInView({
  threshold: 0.1,
  triggerOnce: true,
})

<div ref={ref}>
  {inView && <AnimatedContent />}
</div>
```

### useDevicePerformance

Device capability detection.

```tsx
import { useDevicePerformance } from '@/lib/design-system'

const { 
  level,           // 'low' | 'medium' | 'high'
  isMobile,
  isLowEnd,
  maxParticles,
  enableHeavyEffects,
} = useDevicePerformance()
```

---

## Code Splitting

**Location:** `components/teen/dashboard/lazy-components.tsx`

Lazy-loaded heavy components.

```tsx
import {
  LazySocialFeed,
  LazyTeenMapWrapper,
  LazyMarketplaceOverlay,
  LazyMapPreview,
  LazyAICompanion,
  LazyParticleSystem,
  LazyFloatingParticles,
  LazyRisingSparks,
  Lazy3DCard,
  LazyEliteCursor,
} from '@/components/teen/dashboard/lazy-components'

<Suspense fallback={<MapPreviewSkeleton />}>
  <LazyMapPreview userId={userId} />
</Suspense>
```

---

## Migration Guide

### From Old Hero Components

Replace:
```tsx
// Old
import { TeenHero } from '@/components/teen/dashboard/teen-hero'
import { EliteHero } from '@/components/teen/dashboard/elite-hero'

// New
import { Hero } from '@/components/teen/dashboard/hero'

<Hero 
  variant="elite" 
  user={user} 
  xpData={xpData} 
  currentStreak={streak} 
/>
```

### From Old Action Buttons

Replace:
```tsx
// Old
import { ActionBubble } from '@/components/teen/dashboard/action-bubble'
import { HyperActionButton } from '@/components/teen/dashboard/hyper-action-button'

// New
import { ActionButton } from '@/components/ui/action-button'

<ActionButton 
  variant="bubble" 
  icon="zap" 
  label="Shop" 
  href="/shop" 
/>
```

### From DOM Particles to Canvas

Replace:
```tsx
// Old (DOM-based, slow)
import { FloatingParticles } from '@/components/ui/effects/particle-system'

// New (Canvas-based, fast)
import { FloatingParticles } from '@/components/ui/effects/particle-system-v2'
// or
import { LazyFloatingParticles } from '@/components/teen/dashboard/lazy-components'
```
