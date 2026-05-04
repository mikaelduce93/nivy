'use client'

/**
 * TEENS PARTY MOROCCO - Secure Form Components
 * ============================================
 *
 * Composants de formulaire sécurisés avec:
 * - Validation Zod intégrée
 * - Protection anti double-submit
 * - États de chargement
 * - Messages d'erreur accessibles
 */

import * as React from 'react'
import { useFormContext, FormProvider, UseFormReturn, FieldValues, Path, Controller } from 'react-hook-form'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, CheckCircle2, Info } from 'lucide-react'
import { useSecureForm, SecureFormState, UseSecureFormOptions } from '@/lib/hooks/use-secure-form'
import type { VariantProps } from 'class-variance-authority'

/* ==========================================================================
   TYPES
   ========================================================================== */

interface SecureFormContextValue {
  state: SecureFormState
  isDisabled: boolean
}

const SecureFormContext = React.createContext<SecureFormContextValue | null>(null)

function useSecureFormContext() {
  const context = React.useContext(SecureFormContext)
  if (!context) {
    throw new Error('useSecureFormContext must be used within a SecureForm')
  }
  return context
}

/* ==========================================================================
   SECURE FORM WRAPPER
   ========================================================================== */

interface SecureFormProps<TSchema extends z.ZodSchema> {
  /** Options du hook useSecureForm */
  formOptions: UseSecureFormOptions<TSchema>
  /** Action à exécuter au submit */
  action: (data: z.infer<TSchema>) => Promise<{ success: boolean; error?: string } | void>
  /** Children */
  children: React.ReactNode | ((form: UseFormReturn<z.infer<TSchema>>, state: SecureFormState) => React.ReactNode)
  /** ClassName */
  className?: string
  /** ID du formulaire */
  id?: string
}

export function SecureForm<TSchema extends z.ZodSchema>({
  formOptions,
  action,
  children,
  className,
  id,
}: SecureFormProps<TSchema>) {
  const { form, state, handleSecureSubmit } = useSecureForm(formOptions)

  return (
    <SecureFormContext.Provider value={{ state, isDisabled: state.isSubmitting || state.isLocked }}>
      <FormProvider {...form}>
        <form
          id={id}
          onSubmit={handleSecureSubmit(action)}
          className={cn('space-y-4', className)}
          noValidate
        >
          {typeof children === 'function' ? children(form, state) : children}
        </form>
      </FormProvider>
    </SecureFormContext.Provider>
  )
}

/* ==========================================================================
   FORM FIELD
   ========================================================================== */

interface FormFieldProps {
  /** Nom du champ */
  name: string
  /** Label */
  label: string
  /** Description/aide */
  description?: string
  /** Type d'input */
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'url' | 'date' | 'textarea'
  /** Placeholder */
  placeholder?: string
  /** Requis */
  required?: boolean
  /** Désactivé */
  disabled?: boolean
  /** Autocomplete */
  autoComplete?: string
  /** ClassName du wrapper */
  className?: string
  /** Rows pour textarea */
  rows?: number
  /** Min pour number */
  min?: number
  /** Max pour number */
  max?: number
  /** Pattern */
  pattern?: string
}

export function FormField({
  name,
  label,
  description,
  type = 'text',
  placeholder,
  required,
  disabled,
  autoComplete,
  className,
  rows = 4,
  min,
  max,
  pattern,
}: FormFieldProps) {
  const { register, formState: { errors } } = useFormContext()
  const { isDisabled } = useSecureFormContext()
  const error = errors[name]
  const errorMessage = error?.message as string | undefined

  const inputId = `field-${name}`
  const descriptionId = `${inputId}-description`
  const errorId = `${inputId}-error`

  const inputProps = {
    id: inputId,
    placeholder,
    disabled: disabled || isDisabled,
    autoComplete,
    'aria-invalid': !!error,
    'aria-describedby': [description && descriptionId, error && errorId].filter(Boolean).join(' ') || undefined,
    ...register(name),
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={inputId} className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive" aria-hidden="true">*</span>}
      </Label>

      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" aria-hidden="true" />
          {description}
        </p>
      )}

      {type === 'textarea' ? (
        <Textarea
          {...inputProps}
          rows={rows}
          className={cn(error && 'border-destructive focus-visible:ring-destructive')}
        />
      ) : (
        <Input
          {...inputProps}
          type={type}
          min={min}
          max={max}
          pattern={pattern}
          className={cn(error && 'border-destructive focus-visible:ring-destructive')}
        />
      )}

      {errorMessage && (
        <p id={errorId} role="alert" className="text-sm text-destructive flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          {errorMessage}
        </p>
      )}
    </div>
  )
}

/* ==========================================================================
   CONTROLLED FIELD (pour composants personnalisés)
   ========================================================================== */

interface ControlledFieldProps<T extends FieldValues> {
  name: Path<T>
  label: string
  description?: string
  required?: boolean
  className?: string
  children: (field: {
    value: unknown
    onChange: (value: unknown) => void
    onBlur: () => void
    disabled: boolean
    error?: string
  }) => React.ReactNode
}

export function ControlledField<T extends FieldValues>({
  name,
  label,
  description,
  required,
  className,
  children,
}: ControlledFieldProps<T>) {
  const { control, formState: { errors } } = useFormContext<T>()
  const { isDisabled } = useSecureFormContext()
  const error = errors[name]
  const errorMessage = error?.message as string | undefined

  const inputId = `field-${name}`
  const descriptionId = `${inputId}-description`
  const errorId = `${inputId}-error`

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={inputId} className="flex items-center gap-1">
        {label}
        {required && <span className="text-destructive" aria-hidden="true">*</span>}
      </Label>

      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" aria-hidden="true" />
          {description}
        </p>
      )}

      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <>
            {children({
              value: field.value,
              onChange: field.onChange,
              onBlur: field.onBlur,
              disabled: isDisabled,
              error: errorMessage,
            })}
          </>
        )}
      />

      {errorMessage && (
        <p id={errorId} role="alert" className="text-sm text-destructive flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          {errorMessage}
        </p>
      )}
    </div>
  )
}

/* ==========================================================================
   SUBMIT BUTTON
   ========================================================================== */

interface SubmitButtonProps extends Omit<React.ComponentProps<typeof Button>, 'type'> {
  /** Texte pendant le chargement */
  loadingText?: string
  /** Afficher l'icône de succès après submit */
  showSuccessIcon?: boolean
  /** Durée d'affichage du succès (ms) */
  successDuration?: number
}

export function SubmitButton({
  children,
  loadingText = 'Envoi en cours...',
  showSuccessIcon = true,
  successDuration = 2000,
  className,
  variant = 'default',
  size = 'default',
  disabled,
  ...props
}: SubmitButtonProps) {
  const { state } = useSecureFormContext()
  const [showSuccess, setShowSuccess] = React.useState(false)

  // Affiche le succès après une soumission réussie
  React.useEffect(() => {
    if (state.lastSubmitTime && showSuccessIcon) {
      setShowSuccess(true)
      const timeout = setTimeout(() => setShowSuccess(false), successDuration)
      return () => clearTimeout(timeout)
    }
  }, [state.lastSubmitTime, showSuccessIcon, successDuration])

  const isDisabled = disabled || state.isSubmitting || state.isLocked

  return (
    <Button
      type="submit"
      variant={showSuccess ? 'success' : variant}
      size={size}
      disabled={isDisabled}
      aria-busy={state.isSubmitting}
      className={cn('min-w-[120px]', className)}
      {...props}
    >
      {state.isSubmitting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          <span>{loadingText}</span>
        </>
      ) : showSuccess ? (
        <>
          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          <span>Envoyé !</span>
        </>
      ) : (
        children
      )}
    </Button>
  )
}

/* ==========================================================================
   GLOBAL ERROR
   ========================================================================== */

interface GlobalErrorProps {
  className?: string
}

export function GlobalError({ className }: GlobalErrorProps) {
  const { state } = useSecureFormContext()

  if (!state.globalError) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'rounded-lg border border-destructive/50 bg-destructive/10 p-4',
        'flex items-start gap-3 text-sm text-destructive',
        className
      )}
    >
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        <p className="font-medium">Une erreur est survenue</p>
        <p className="mt-1 text-destructive/80">{state.globalError}</p>
      </div>
    </div>
  )
}

/* ==========================================================================
   FORM SECTION
   ========================================================================== */

interface FormSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <fieldset className={cn('space-y-4 rounded-lg border p-4', className)}>
      <legend className="px-2 text-sm font-medium">{title}</legend>
      {description && (
        <p className="text-sm text-muted-foreground -mt-2">{description}</p>
      )}
      <div className="space-y-4">{children}</div>
    </fieldset>
  )
}

/* ==========================================================================
   FORM ACTIONS
   ========================================================================== */

interface FormActionsProps {
  children: React.ReactNode
  className?: string
  align?: 'left' | 'center' | 'right' | 'between'
}

export function FormActions({ children, className, align = 'right' }: FormActionsProps) {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  }

  return (
    <div className={cn('flex items-center gap-3 pt-4', alignClasses[align], className)}>
      {children}
    </div>
  )
}

/* ==========================================================================
   RESET BUTTON
   ========================================================================== */

interface ResetButtonProps extends Omit<React.ComponentProps<typeof Button>, 'type' | 'onClick'> {
  onReset?: () => void
}

export function ResetButton({ children = 'Réinitialiser', onReset, ...props }: ResetButtonProps) {
  const { reset } = useFormContext()
  const { state } = useSecureFormContext()

  const handleReset = () => {
    reset()
    onReset?.()
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleReset}
      disabled={state.isSubmitting}
      {...props}
    >
      {children}
    </Button>
  )
}

/* ==========================================================================
   EXPORTS
   ========================================================================== */

export {
  SecureFormContext,
  useSecureFormContext,
}
