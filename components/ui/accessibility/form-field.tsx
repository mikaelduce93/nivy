'use client'

/**
 * TEENS PARTY MOROCCO - Accessible Form Field Component
 * =====================================================
 *
 * Composant de champ de formulaire accessible avec label,
 * description, et messages d'erreur correctement liés.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { generateFormFieldIds } from '@/lib/accessibility'
import { AlertCircle, HelpCircle } from 'lucide-react'

/* ==========================================================================
   TYPES
   ========================================================================== */

interface FormFieldContextValue {
  ids: ReturnType<typeof generateFormFieldIds>
  error?: string
  disabled?: boolean
  required?: boolean
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

function useFormField() {
  const context = React.useContext(FormFieldContext)
  if (!context) {
    throw new Error('useFormField must be used within a FormField')
  }
  return context
}

/* ==========================================================================
   FORM FIELD WRAPPER
   ========================================================================== */

interface FormFieldProps {
  /** Field name (used for ID generation) */
  name: string
  /** Error message */
  error?: string
  /** Is field disabled */
  disabled?: boolean
  /** Is field required */
  required?: boolean
  /** Children */
  children: React.ReactNode
  /** Additional className */
  className?: string
}

export function FormField({
  name,
  error,
  disabled,
  required,
  children,
  className,
}: FormFieldProps) {
  const ids = React.useMemo(() => generateFormFieldIds(name), [name])

  return (
    <FormFieldContext.Provider value={{ ids, error, disabled, required }}>
      <div className={cn('space-y-2', className)} role="group">
        {children}
      </div>
    </FormFieldContext.Provider>
  )
}

/* ==========================================================================
   FORM LABEL
   ========================================================================== */

interface FormLabelProps {
  children: React.ReactNode
  className?: string
  /** Show optional indicator */
  showOptional?: boolean
}

export function FormLabel({ children, className, showOptional }: FormLabelProps) {
  const { ids, required } = useFormField()

  return (
    <Label
      id={ids.label}
      htmlFor={ids.input}
      className={cn('flex items-center gap-1', className)}
    >
      {children}
      {required && (
        <span className="text-destructive" aria-hidden="true">*</span>
      )}
      {!required && showOptional && (
        <span className="text-muted-foreground text-xs">(optionnel)</span>
      )}
    </Label>
  )
}

/* ==========================================================================
   FORM DESCRIPTION
   ========================================================================== */

interface FormDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function FormDescription({ children, className }: FormDescriptionProps) {
  const { ids } = useFormField()

  return (
    <p
      id={ids.description}
      className={cn('text-sm text-muted-foreground flex items-start gap-1.5', className)}
    >
      <HelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

/* ==========================================================================
   FORM ERROR
   ========================================================================== */

interface FormErrorProps {
  className?: string
  /** Override error from context */
  error?: string
}

export function FormError({ className, error: errorOverride }: FormErrorProps) {
  const { ids, error: contextError } = useFormField()
  const error = errorOverride ?? contextError

  if (!error) return null

  return (
    <p
      id={ids.error}
      role="alert"
      aria-live="polite"
      className={cn('text-sm text-destructive flex items-start gap-1.5', className)}
    >
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </p>
  )
}

/* ==========================================================================
   FORM INPUT
   ========================================================================== */

interface FormInputProps extends Omit<React.ComponentProps<typeof Input>, 'id' | 'aria-describedby' | 'aria-invalid'> {
  /** Additional className */
  className?: string
}

export function FormInput({ className, ...props }: FormInputProps) {
  const { ids, error, disabled, required } = useFormField()

  // Build aria-describedby
  const describedBy = [
    ids.description,
    error ? ids.error : undefined,
  ].filter(Boolean).join(' ') || undefined

  return (
    <Input
      id={ids.input}
      aria-describedby={describedBy}
      aria-invalid={!!error}
      aria-required={required}
      disabled={disabled}
      className={cn(
        error && 'border-destructive focus-visible:ring-destructive',
        className
      )}
      {...props}
    />
  )
}

/* ==========================================================================
   FORM TEXTAREA
   ========================================================================== */

interface FormTextareaProps extends Omit<React.ComponentProps<typeof Textarea>, 'id' | 'aria-describedby' | 'aria-invalid'> {
  className?: string
}

export function FormTextarea({ className, ...props }: FormTextareaProps) {
  const { ids, error, disabled, required } = useFormField()

  const describedBy = [
    ids.description,
    error ? ids.error : undefined,
  ].filter(Boolean).join(' ') || undefined

  return (
    <Textarea
      id={ids.input}
      aria-describedby={describedBy}
      aria-invalid={!!error}
      aria-required={required}
      disabled={disabled}
      className={cn(
        error && 'border-destructive focus-visible:ring-destructive',
        className
      )}
      {...props}
    />
  )
}

/* ==========================================================================
   COMPLETE FORM FIELD (all-in-one)
   ========================================================================== */

interface CompleteFormFieldProps {
  /** Field name */
  name: string
  /** Label text */
  label: string
  /** Description/help text */
  description?: string
  /** Error message */
  error?: string
  /** Is required */
  required?: boolean
  /** Is disabled */
  disabled?: boolean
  /** Show optional indicator */
  showOptional?: boolean
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea'
  /** Placeholder */
  placeholder?: string
  /** Value */
  value?: string
  /** Default value */
  defaultValue?: string
  /** Change handler */
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  /** Blur handler */
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  /** Additional input props */
  inputProps?: Record<string, unknown>
  /** Additional className */
  className?: string
}

export function CompleteFormField({
  name,
  label,
  description,
  error,
  required,
  disabled,
  showOptional,
  type = 'text',
  placeholder,
  value,
  defaultValue,
  onChange,
  onBlur,
  inputProps,
  className,
}: CompleteFormFieldProps) {
  return (
    <FormField
      name={name}
      error={error}
      required={required}
      disabled={disabled}
      className={className}
    >
      <FormLabel showOptional={showOptional}>{label}</FormLabel>
      {description && <FormDescription>{description}</FormDescription>}
      {type === 'textarea' ? (
        <FormTextarea
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onBlur={onBlur}
          {...inputProps}
        />
      ) : (
        <FormInput
          type={type}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onBlur={onBlur}
          {...inputProps}
        />
      )}
      <FormError />
    </FormField>
  )
}
