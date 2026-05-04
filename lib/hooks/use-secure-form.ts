'use client'

/**
 * TEENS PARTY MOROCCO - Secure Form Hook
 * ======================================
 *
 * Hook React Hook Form + Zod avec protections:
 * - Validation Zod stricte
 * - Anti double-submit
 * - Sanitisation automatique
 * - Gestion erreurs unifiée
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useForm, UseFormProps, UseFormReturn, FieldValues, Path, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { sanitizeFormData } from '@/lib/validation/sanitize'

/* ==========================================================================
   TYPES
   ========================================================================== */

export interface UseSecureFormOptions<TSchema extends z.ZodSchema> {
  /** Schéma Zod de validation */
  schema: TSchema
  /** Valeurs par défaut */
  defaultValues?: Partial<z.infer<TSchema>>
  /** Délai anti double-submit (ms) */
  submitDelay?: number
  /** Sanitiser les données avant submit */
  sanitize?: boolean
  /** Callback de succès */
  onSuccess?: (data: z.infer<TSchema>) => void | Promise<void>
  /** Callback d'erreur */
  onError?: (error: Error | string) => void
  /** Mode de validation */
  mode?: UseFormProps<z.infer<TSchema>>['mode']
  /** Reset après succès */
  resetOnSuccess?: boolean
}

export interface SecureFormState {
  /** Soumission en cours */
  isSubmitting: boolean
  /** Dernière erreur globale */
  globalError: string | null
  /** Nombre de tentatives */
  submitCount: number
  /** Dernière soumission réussie */
  lastSubmitTime: number | null
  /** Formulaire désactivé (double-submit protection) */
  isLocked: boolean
}

export interface UseSecureFormReturn<TSchema extends z.ZodSchema> {
  /** Instance React Hook Form */
  form: UseFormReturn<z.infer<TSchema>>
  /** État du formulaire sécurisé */
  state: SecureFormState
  /** Submit handler sécurisé */
  handleSecureSubmit: (
    action: (data: z.infer<TSchema>) => Promise<{ success: boolean; error?: string } | void>
  ) => (e?: React.BaseSyntheticEvent) => Promise<void>
  /** Reset le formulaire */
  reset: () => void
  /** Reset les erreurs */
  clearErrors: () => void
  /** Set erreur globale */
  setGlobalError: (error: string | null) => void
  /** Vérifie si un champ a une erreur */
  hasError: (field: Path<z.infer<TSchema>>) => boolean
  /** Récupère le message d'erreur d'un champ */
  getError: (field: Path<z.infer<TSchema>>) => string | undefined
}

/* ==========================================================================
   HOOK PRINCIPAL
   ========================================================================== */

export function useSecureForm<TSchema extends z.ZodSchema>(
  options: UseSecureFormOptions<TSchema>
): UseSecureFormReturn<TSchema> {
  const {
    schema,
    defaultValues,
    submitDelay = 1000,
    sanitize = true,
    onSuccess,
    onError,
    mode = 'onBlur',
    resetOnSuccess = false,
  } = options

  type FormData = z.infer<TSchema>

  // React Hook Form avec resolver Zod
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as UseFormProps<FormData>['defaultValues'],
    mode,
  })

  // État du formulaire sécurisé
  const [state, setState] = useState<SecureFormState>({
    isSubmitting: false,
    globalError: null,
    submitCount: 0,
    lastSubmitTime: null,
    isLocked: false,
  })

  // Ref pour éviter les soumissions multiples
  const submitLockRef = useRef(false)
  const lastSubmitRef = useRef<number>(0)

  // Unlock après délai
  useEffect(() => {
    if (state.isLocked) {
      const timeout = setTimeout(() => {
        setState((prev) => ({ ...prev, isLocked: false }))
        submitLockRef.current = false
      }, submitDelay)

      return () => clearTimeout(timeout)
    }
  }, [state.isLocked, submitDelay])

  /**
   * Handler de soumission sécurisé
   */
  const handleSecureSubmit = useCallback(
    (action: (data: FormData) => Promise<{ success: boolean; error?: string } | void>) => {
      const submitHandler: SubmitHandler<FormData> = async (data) => {
        // Protection double-submit
        const now = Date.now()
        if (submitLockRef.current || now - lastSubmitRef.current < submitDelay) {
          return
        }

        submitLockRef.current = true
        lastSubmitRef.current = now

        setState((prev) => ({
          ...prev,
          isSubmitting: true,
          globalError: null,
          isLocked: true,
        }))

        try {
          // Sanitise les données si activé
          const processedData = sanitize ? sanitizeFormData(data as Record<string, unknown>) as FormData : data

          // Appel de l'action
          const result = await action(processedData)

          // Gestion du résultat
          if (result && !result.success) {
            const errorMessage = result.error || 'Une erreur est survenue'
            setState((prev) => ({
              ...prev,
              isSubmitting: false,
              globalError: errorMessage,
              submitCount: prev.submitCount + 1,
            }))
            onError?.(errorMessage)
          } else {
            setState((prev) => ({
              ...prev,
              isSubmitting: false,
              submitCount: prev.submitCount + 1,
              lastSubmitTime: Date.now(),
            }))

            if (resetOnSuccess) {
              form.reset()
            }

            await onSuccess?.(processedData)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Une erreur inattendue est survenue'
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
            globalError: errorMessage,
            submitCount: prev.submitCount + 1,
          }))
          onError?.(error instanceof Error ? error : errorMessage)
        } finally {
          // Délai avant réactivation
          setTimeout(() => {
            submitLockRef.current = false
            setState((prev) => ({ ...prev, isLocked: false }))
          }, submitDelay)
        }
      }

      return form.handleSubmit(submitHandler)
    },
    [form, sanitize, submitDelay, onSuccess, onError, resetOnSuccess]
  )

  /**
   * Reset complet du formulaire
   */
  const reset = useCallback(() => {
    form.reset()
    setState({
      isSubmitting: false,
      globalError: null,
      submitCount: 0,
      lastSubmitTime: null,
      isLocked: false,
    })
    submitLockRef.current = false
  }, [form])

  /**
   * Clear toutes les erreurs
   */
  const clearErrors = useCallback(() => {
    form.clearErrors()
    setState((prev) => ({ ...prev, globalError: null }))
  }, [form])

  /**
   * Set erreur globale
   */
  const setGlobalError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, globalError: error }))
  }, [])

  /**
   * Vérifie si un champ a une erreur
   */
  const hasError = useCallback(
    (field: Path<FormData>): boolean => {
      return !!form.formState.errors[field]
    },
    [form.formState.errors]
  )

  /**
   * Récupère le message d'erreur d'un champ
   */
  const getError = useCallback(
    (field: Path<FormData>): string | undefined => {
      const error = form.formState.errors[field]
      return error?.message as string | undefined
    },
    [form.formState.errors]
  )

  return {
    form,
    state,
    handleSecureSubmit,
    reset,
    clearErrors,
    setGlobalError,
    hasError,
    getError,
  }
}

/* ==========================================================================
   HOOKS SPÉCIALISÉS
   ========================================================================== */

/**
 * Hook simplifié pour formulaires de contact/feedback
 */
export function useContactForm() {
  return useSecureForm({
    schema: z.object({
      name: z.string().min(2, 'Nom requis'),
      email: z.string().email('Email invalide'),
      message: z.string().min(10, 'Message trop court').max(2000),
    }),
    resetOnSuccess: true,
  })
}

/**
 * Hook pour formulaires de recherche (sans anti-spam strict)
 */
export function useSearchForm<T extends z.ZodSchema>(schema: T) {
  return useSecureForm({
    schema,
    submitDelay: 300,
    sanitize: true,
    mode: 'onChange',
  })
}

/* ==========================================================================
   EXPORTS UTILITAIRES
   ========================================================================== */

/**
 * Type helper pour les props de composant formulaire
 */
export type SecureFormProps<T extends z.ZodSchema> = {
  form: UseSecureFormReturn<T>['form']
  state: SecureFormState
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>
}

/**
 * Hook pour le bouton submit
 */
export function useSubmitButton(state: SecureFormState) {
  return {
    disabled: state.isSubmitting || state.isLocked,
    isLoading: state.isSubmitting,
    'aria-busy': state.isSubmitting,
  }
}
