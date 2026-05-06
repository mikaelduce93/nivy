/**
 * Polymorphic component type helpers
 * ==================================
 *
 * Type building blocks for components that accept an `as` prop to render as
 * any HTML element while keeping correct prop typing. Pattern adapted from
 * the React TypeScript Cheatsheet:
 * https://react-typescript-cheatsheet.netlify.app/docs/advanced/patterns_by_usecase/#polymorphic-components-eg-with-as-props
 */

import type * as React from 'react'

/** The `as` prop itself. */
export type AsProp<C extends React.ElementType> = { as?: C }

/** Keys we are about to consume on the polymorphic component. */
export type PropsToOmit<C extends React.ElementType, P> = keyof (AsProp<C> & P)

/**
 * Props for a polymorphic component (without ref). Combines:
 * - the component's own props (`Props`)
 * - the `as` prop
 * - all props of the rendered element type, minus collisions
 */
export type PolymorphicComponentProp<
  C extends React.ElementType,
  Props = Record<string, never>,
> = React.PropsWithChildren<Props & AsProp<C>> &
  Omit<React.ComponentPropsWithoutRef<C>, PropsToOmit<C, Props>>

/** The ref type of the rendered element. */
export type PolymorphicRef<C extends React.ElementType> =
  React.ComponentPropsWithRef<C>['ref']

/** Polymorphic component props *with* the inferred ref. */
export type PolymorphicComponentPropWithRef<
  C extends React.ElementType,
  Props = Record<string, never>,
> = PolymorphicComponentProp<C, Props> & { ref?: PolymorphicRef<C> }
