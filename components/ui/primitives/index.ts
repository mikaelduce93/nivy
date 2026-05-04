/* ==========================================================================
   PRIMITIVES - Low-level UI building blocks
   
   Import from '@/components/ui/primitives' in components.
   These are the atomic elements that compose all UI.
   ========================================================================== */

// Surface - Container with elevation
export {
  Surface,
  MotionSurface,
  type SurfaceProps,
  type MotionSurfaceProps,
  type SurfaceElevation,
  type SurfacePadding,
  type SurfaceRadius,
} from './surface'

// Stack - Flexbox layouts
export {
  Stack,
  HStack,
  VStack,
  Spacer,
  Divider,
  type StackProps,
  type HStackProps,
  type VStackProps,
  type SpacerProps,
  type DividerProps,
  type StackGap,
  type StackAlign,
  type StackJustify,
} from './stack'

// Grid - CSS Grid layouts
export {
  Grid,
  GridItem,
  type GridProps,
  type GridItemProps,
  type GridColumns,
  type GridGap,
  type GridPreset,
} from './grid'

// Text - Typography
export {
  Text,
  Heading,
  Label,
  Code,
  type TextProps,
  type HeadingProps,
  type LabelProps,
  type TextSize,
  type TextWeight,
  type TextColor,
  type TextLeading,
  type TextTracking,
  type TextAlign,
  type TextTransform,
} from './text'

// Icon - Icon wrapper
export {
  Icon,
  IconButtonContainer,
  CircleIcon,
  type IconProps,
  type IconButtonContainerProps,
  type CircleIconProps,
  type IconSize,
  type IconColor,
} from './icon'
