'use client'

/* ==========================================================================
   GRID PRIMITIVE - CSS Grid layout abstraction
   
   Provides responsive grid layouts with design token integration.
   ========================================================================== */

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Column count options
 */
const columnsStyles = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
  9: 'grid-cols-9',
  10: 'grid-cols-10',
  11: 'grid-cols-11',
  12: 'grid-cols-12',
  none: 'grid-cols-none',
  auto: 'grid-cols-[repeat(auto-fit,minmax(0,1fr))]',
  'auto-fill': 'grid-cols-[repeat(auto-fill,minmax(var(--min-col-width,200px),1fr))]',
  'auto-fit': 'grid-cols-[repeat(auto-fit,minmax(var(--min-col-width,200px),1fr))]',
} as const

/**
 * Gap scale from design tokens
 */
const gapStyles = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
  '2xl': 'gap-12',
  '3xl': 'gap-16',
} as const

/**
 * Responsive column presets
 */
const responsivePresets = {
  /** 1 on mobile, 2 on tablet, 3 on desktop */
  'cards-sm': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  /** 1 on mobile, 2 on tablet, 4 on desktop */
  'cards-md': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  /** 2 on mobile, 3 on tablet, 6 on desktop */
  'cards-lg': 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  /** Bento-style: varies */
  bento: 'grid-cols-4 md:grid-cols-8 lg:grid-cols-12',
  /** Dashboard sidebar + content */
  dashboard: 'grid-cols-1 lg:grid-cols-[280px_1fr]',
  /** Content + sidebar */
  'content-sidebar': 'grid-cols-1 lg:grid-cols-[1fr_320px]',
} as const

export type GridColumns = keyof typeof columnsStyles
export type GridGap = keyof typeof gapStyles
export type GridPreset = keyof typeof responsivePresets

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of columns or preset */
  columns?: GridColumns | GridPreset
  /** Gap between items */
  gap?: GridGap
  /** Gap between rows (if different from columns) */
  rowGap?: GridGap
  /** Gap between columns (if different from rows) */
  colGap?: GridGap
  /** Align items on cross axis */
  alignItems?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  /** Justify items on main axis */
  justifyItems?: 'start' | 'center' | 'end' | 'stretch'
  /** Minimum column width for auto-fill/auto-fit */
  minColWidth?: string
  /** Render as different element */
  as?: 'div' | 'section' | 'ul' | 'ol'
  /** Auto-fill remaining space with dense packing */
  dense?: boolean
}

/**
 * Grid - CSS Grid layout primitive
 * 
 * @example
 * ```tsx
 * // Simple 3-column grid
 * <Grid columns={3} gap="lg">
 *   <GridItem />
 *   <GridItem />
 *   <GridItem />
 * </Grid>
 * 
 * // Responsive preset
 * <Grid columns="cards-md" gap="lg">
 *   {items.map(item => <Card key={item.id} />)}
 * </Grid>
 * 
 * // Auto-fill with minimum width
 * <Grid columns="auto-fill" minColWidth="280px" gap="md">
 *   {items.map(item => <Card key={item.id} />)}
 * </Grid>
 * ```
 */
export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  (
    {
      columns = 12,
      gap = 'md',
      rowGap,
      colGap,
      alignItems,
      justifyItems,
      minColWidth,
      as: Component = 'div',
      dense = false,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    // Check if columns is a preset
    const isPreset = columns in responsivePresets
    const columnsClass = isPreset 
      ? responsivePresets[columns as GridPreset]
      : columnsStyles[columns as GridColumns]
    
    // Alignment classes
    const alignClass = alignItems && {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
      baseline: 'items-baseline',
    }[alignItems]
    
    const justifyClass = justifyItems && {
      start: 'justify-items-start',
      center: 'justify-items-center',
      end: 'justify-items-end',
      stretch: 'justify-items-stretch',
    }[justifyItems]
    
    return (
      <Component
        ref={ref}
        className={cn(
          'grid',
          columnsClass,
          
          // Gap
          !rowGap && !colGap && gapStyles[gap],
          rowGap && `gap-y-${rowGap === 'none' ? '0' : rowGap === 'xs' ? '1' : rowGap === 'sm' ? '2' : rowGap === 'md' ? '4' : rowGap === 'lg' ? '6' : rowGap === 'xl' ? '8' : '12'}`,
          colGap && `gap-x-${colGap === 'none' ? '0' : colGap === 'xs' ? '1' : colGap === 'sm' ? '2' : colGap === 'md' ? '4' : colGap === 'lg' ? '6' : colGap === 'xl' ? '8' : '12'}`,
          
          // Alignment
          alignClass,
          justifyClass,
          
          // Dense packing
          dense && 'grid-flow-dense',
          
          className
        )}
        style={{
          ...style,
          '--min-col-width': minColWidth,
        } as React.CSSProperties}
        {...props}
      >
        {children}
      </Component>
    )
  }
)
Grid.displayName = 'Grid'

/**
 * Grid Item - Child component with span controls
 */
export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Column span */
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'full'
  /** Row span */
  rowSpan?: 1 | 2 | 3 | 4 | 5 | 6
  /** Column start position */
  colStart?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'auto'
  /** Row start position */
  rowStart?: 1 | 2 | 3 | 4 | 5 | 6 | 'auto'
  /** Responsive column span (mobile, tablet, desktop) */
  responsiveSpan?: {
    base?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
}

export const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  (
    {
      colSpan,
      rowSpan,
      colStart,
      rowStart,
      responsiveSpan,
      className,
      children,
      ...props
    },
    ref
  ) => {
    // Build responsive span classes
    const responsiveClasses = responsiveSpan ? [
      responsiveSpan.base && `col-span-${responsiveSpan.base}`,
      responsiveSpan.sm && `sm:col-span-${responsiveSpan.sm}`,
      responsiveSpan.md && `md:col-span-${responsiveSpan.md}`,
      responsiveSpan.lg && `lg:col-span-${responsiveSpan.lg}`,
      responsiveSpan.xl && `xl:col-span-${responsiveSpan.xl}`,
    ].filter(Boolean) : []
    
    return (
      <div
        ref={ref}
        className={cn(
          // Column span
          colSpan === 'full' 
            ? 'col-span-full'
            : colSpan && `col-span-${colSpan}`,
          
          // Row span
          rowSpan && `row-span-${rowSpan}`,
          
          // Start positions
          colStart && colStart !== 'auto' && `col-start-${colStart}`,
          rowStart && rowStart !== 'auto' && `row-start-${rowStart}`,
          
          // Responsive spans
          ...responsiveClasses,
          
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
GridItem.displayName = 'GridItem'

export default Grid
