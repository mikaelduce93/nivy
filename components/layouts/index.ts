/**
 * TEENS PARTY MOROCCO - Layout Components
 * ========================================
 *
 * Export centralisé des composants de layout.
 */

// Page structure components
export {
  PageWrapper,
  PageHeader,
  PageSection,
  Container,
  Grid,
  HeroSection,
  ContentWrapper,
  SidebarLayout,
} from './page-wrapper'

// Sidebar components
export { AdminSidebar } from './admin-sidebar'
// AppSidebar removed in Wave 5A — pointed at 7 forbidden URLs
// (/dashboard, /mes-reservations, /profile/*, /notifications, ...) and was
// only consumed by the dead `app/(dashboard)` route group, also removed.
