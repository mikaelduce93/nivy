'use client'

/**
 * TEENS PARTY MOROCCO - Page Layout Components
 * =============================================
 *
 * Composants de structure pour garantir la cohérence visuelle
 * entre toutes les pages de l'application.
 *
 * Usage:
 * <PageWrapper>
 *   <PageHeader title="Titre" subtitle="Description" />
 *   <PageSection>Contenu</PageSection>
 * </PageWrapper>
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

/* ==========================================================================
   PAGE WRAPPER - Container principal de page
   ========================================================================== */

interface PageWrapperProps {
  children: React.ReactNode
  className?: string
  /** Remove default padding-top for navbar offset */
  noPadding?: boolean
  /** Background variant */
  background?: 'default' | 'muted' | 'gradient'
}

export function PageWrapper({
  children,
  className,
  noPadding = false,
  background = 'default',
}: PageWrapperProps) {
  const bgClasses = {
    default: 'bg-background',
    muted: 'bg-muted/30',
    gradient: 'bg-gradient-to-b from-background via-background to-muted/20',
  }

  return (
    <div
      className={cn(
        'min-h-screen',
        bgClasses[background],
        !noPadding && 'pt-20', // Offset for fixed navbar (h-16 + gap)
        className
      )}
    >
      {children}
    </div>
  )
}

/* ==========================================================================
   PAGE HEADER - En-tête de page avec titre et description
   ========================================================================== */

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
  /** Center the content */
  centered?: boolean
  /** Size variant */
  size?: 'default' | 'large' | 'hero'
  /** Show gradient text for title */
  gradient?: boolean
}

export function PageHeader({
  title,
  subtitle,
  children,
  className,
  centered = false,
  size = 'default',
  gradient = false,
}: PageHeaderProps) {
  const sizeClasses = {
    default: 'py-12 md:py-16',
    large: 'py-16 md:py-24',
    hero: 'py-24 md:py-32',
  }

  const titleClasses = {
    default: 'text-3xl md:text-4xl',
    large: 'text-4xl md:text-5xl',
    hero: 'text-4xl md:text-6xl',
  }

  return (
    <header
      className={cn(
        sizeClasses[size],
        centered && 'text-center',
        className
      )}
    >
      <Container>
        <h1
          className={cn(
            'font-bold tracking-tight',
            titleClasses[size],
            gradient ? 'text-gradient' : 'text-foreground'
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className={cn(
              'mt-4 text-muted-foreground',
              size === 'hero' ? 'text-lg md:text-xl max-w-2xl' : 'text-base md:text-lg max-w-xl',
              centered && 'mx-auto'
            )}
          >
            {subtitle}
          </p>
        )}
        {children && <div className="mt-6">{children}</div>}
      </Container>
    </header>
  )
}

/* ==========================================================================
   PAGE SECTION - Section de contenu
   ========================================================================== */

interface PageSectionProps {
  children: React.ReactNode
  className?: string
  /** Spacing variant */
  spacing?: 'none' | 'small' | 'default' | 'large'
  /** Background variant */
  background?: 'transparent' | 'muted' | 'card'
  /** ID for anchor links */
  id?: string
}

export function PageSection({
  children,
  className,
  spacing = 'default',
  background = 'transparent',
  id,
}: PageSectionProps) {
  const spacingClasses = {
    none: '',
    small: 'py-8 md:py-12',
    default: 'py-12 md:py-20',
    large: 'py-20 md:py-32',
  }

  const bgClasses = {
    transparent: '',
    muted: 'bg-muted/30',
    card: 'bg-card',
  }

  return (
    <section
      id={id}
      className={cn(
        spacingClasses[spacing],
        bgClasses[background],
        className
      )}
    >
      {children}
    </section>
  )
}

/* ==========================================================================
   CONTAINER - Container avec largeur max standardisée
   ========================================================================== */

interface ContainerProps {
  children: React.ReactNode
  className?: string
  /** Max width variant */
  size?: 'tight' | 'default' | 'wide' | 'full'
}

export function Container({
  children,
  className,
  size = 'default',
}: ContainerProps) {
  const sizeClasses = {
    tight: 'max-w-4xl',      // 896px - Articles, formulaires
    default: 'max-w-6xl',    // 1152px - Contenu standard
    wide: 'max-w-7xl',       // 1280px - Grilles, galleries
    full: 'max-w-none',      // Full width
  }

  return (
    <div
      className={cn(
        'mx-auto px-4 sm:px-6 lg:px-8',
        sizeClasses[size],
        className
      )}
    >
      {children}
    </div>
  )
}

/* ==========================================================================
   GRID - Grille responsive standardisée
   ========================================================================== */

interface GridProps {
  children: React.ReactNode
  className?: string
  /** Number of columns */
  cols?: 1 | 2 | 3 | 4 | 6
  /** Gap size */
  gap?: 'small' | 'default' | 'large'
}

export function Grid({
  children,
  className,
  cols = 3,
  gap = 'default',
}: GridProps) {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  }

  const gapClasses = {
    small: 'gap-4',
    default: 'gap-6',
    large: 'gap-8',
  }

  return (
    <div className={cn('grid', colClasses[cols], gapClasses[gap], className)}>
      {children}
    </div>
  )
}

/* ==========================================================================
   HERO SECTION - Section hero pour les landing pages
   ========================================================================== */

interface HeroSectionProps {
  children: React.ReactNode
  className?: string
  /** Background effects */
  effects?: boolean
  /** Min height */
  size?: 'default' | 'large' | 'full'
}

export function HeroSection({
  children,
  className,
  effects = true,
  size = 'default',
}: HeroSectionProps) {
  const sizeClasses = {
    default: 'min-h-[70vh]',
    large: 'min-h-[85vh]',
    full: 'min-h-screen',
  }

  return (
    <section
      className={cn(
        'relative flex items-center justify-center overflow-hidden',
        sizeClasses[size],
        effects && 'hero-gradient',
        className
      )}
    >
      {/* Background effects */}
      {effects && (
        <>
          <div className="absolute inset-0 bg-dots opacity-30 pointer-events-none" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow delay-1000 pointer-events-none" />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </section>
  )
}

/* ==========================================================================
   CONTENT WRAPPER - Wrapper pour contenu avec max-width prose
   ========================================================================== */

interface ContentWrapperProps {
  children: React.ReactNode
  className?: string
}

export function ContentWrapper({
  children,
  className,
}: ContentWrapperProps) {
  return (
    <div className={cn('prose prose-invert max-w-none', className)}>
      {children}
    </div>
  )
}

/* ==========================================================================
   SIDEBAR LAYOUT - Layout avec sidebar
   ========================================================================== */

interface SidebarLayoutProps {
  children: React.ReactNode
  sidebar: React.ReactNode
  className?: string
  /** Sidebar position */
  sidebarPosition?: 'left' | 'right'
}

export function SidebarLayout({
  children,
  sidebar,
  className,
  sidebarPosition = 'left',
}: SidebarLayoutProps) {
  return (
    <div
      className={cn(
        'flex flex-col lg:flex-row gap-8',
        sidebarPosition === 'right' && 'lg:flex-row-reverse',
        className
      )}
    >
      {/* Sidebar */}
      <aside className="lg:w-64 lg:flex-shrink-0">
        {sidebar}
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  )
}

