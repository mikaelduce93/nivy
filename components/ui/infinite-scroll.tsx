'use client'

/**
 * TEENS PARTY MOROCCO - Infinite Scroll Component
 * ===============================================
 * 
 * Composant pour gérer le scroll infini avec React Query useInfiniteQuery
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InfiniteScrollProps {
  /** Fonction pour charger la page suivante */
  fetchNextPage: () => void
  /** Indique s'il y a une page suivante */
  hasNextPage: boolean
  /** Indique si une page est en cours de chargement */
  isFetchingNextPage: boolean
  /** Contenu à afficher */
  children: ReactNode
  /** Afficher un bouton "Charger plus" au lieu du scroll automatique */
  showLoadMoreButton?: boolean
  /** Callback quand le scroll atteint le bas */
  onLoadMore?: () => void
  /** Désactiver le scroll automatique */
  disabled?: boolean
}

/**
 * Composant Infinite Scroll
 * 
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useEventsInfinite()
 * 
 * return (
 *   <InfiniteScroll
 *     fetchNextPage={fetchNextPage}
 *     hasNextPage={hasNextPage}
 *     isFetchingNextPage={isFetchingNextPage}
 *   >
 *     {data?.pages.map((page) => (
 *       page.data.map(event => <EventCard key={event.id} event={event} />)
 *     ))}
 *   </InfiniteScroll>
 * )
 * ```
 */
export function InfiniteScroll({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  children,
  showLoadMoreButton = false,
  onLoadMore,
  disabled = false,
}: InfiniteScrollProps) {
  const observerTarget = useRef<HTMLDivElement>(null)
  const loadMoreButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (disabled || showLoadMoreButton || !hasNextPage || isFetchingNextPage) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
          onLoadMore?.()
        }
      },
      {
        root: null,
        rootMargin: '100px', // Déclencher 100px avant d'atteindre le bas
        threshold: 0.1,
      }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, disabled, showLoadMoreButton, onLoadMore])

  return (
    <>
      {children}
      
      {/* Zone de déclenchement pour le scroll automatique */}
      {!showLoadMoreButton && !disabled && (
        <div ref={observerTarget} className="h-4" />
      )}
      
      {/* Bouton "Charger plus" */}
      {showLoadMoreButton && hasNextPage && (
        <div className="flex justify-center mt-6">
          <Button
            ref={loadMoreButtonRef}
            onClick={() => {
              fetchNextPage()
              onLoadMore?.()
            }}
            disabled={isFetchingNextPage}
            variant="outline"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chargement...
              </>
            ) : (
              'Charger plus'
            )}
          </Button>
        </div>
      )}
      
      {/* Indicateur de chargement */}
      {isFetchingNextPage && !showLoadMoreButton && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      )}
    </>
  )
}

