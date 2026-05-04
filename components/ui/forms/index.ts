/**
 * TEENS PARTY MOROCCO - Secure Forms Module
 * =========================================
 *
 * Export central pour les composants de formulaire sécurisés.
 *
 * @example
 * ```tsx
 * import {
 *   SecureForm,
 *   FormField,
 *   SubmitButton,
 *   GlobalError,
 *   FormActions
 * } from '@/components/ui/forms'
 * ```
 */

export {
  // Main form wrapper
  SecureForm,

  // Field components
  FormField,
  ControlledField,

  // Buttons
  SubmitButton,
  ResetButton,

  // Layout
  FormSection,
  FormActions,

  // Error display
  GlobalError,

  // Context
  SecureFormContext,
  useSecureFormContext,
} from './secure-form'
