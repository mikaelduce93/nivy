/**
 * SHARE COMPONENTS
 * ================
 * Composants pour le partage social
 *
 * Composants:
 * - ShareModal: Modal de partage vers réseaux sociaux
 * - useShare: Hook pour faciliter le partage
 * - ShareCard: Générateur de cartes partageables
 * - ShareStats: Statistiques de partage
 * - ShareWidget: Widget compact pour dashboard
 *
 * Usage:
 * ```tsx
 * import {
 *   ShareModal,
 *   useShare,
 *   ShareCard,
 *   ShareStats,
 *   ShareWidget,
 * } from "@/components/share"
 *
 * // Utilisation du hook
 * const { openShare, ShareModal } = useShare()
 *
 * openShare({
 *   contentType: "achievement",
 *   contentId: "badge-123"
 * })
 * ```
 */

// Share Modal
export {
  ShareModal,
  useShare,
} from "./share-modal"

// Share Card
export {
  ShareCard,
  ShareStats,
  ShareWidget,
} from "./share-card"
