'use client'

import * as React from 'react'
import { useMemo } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'

function FieldSet({ className, ...props }: React.ComponentProps<'fieldset'>) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        'flex flex-col gap-6',
        'has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
        className,
      )}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = 'legend',
  ...props
}: React.ComponentProps<'legend'> & { variant?: 'legend' | 'label' }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        'mb-3 font-medium',
        'data-[variant=legend]:text-base',
        'data-[variant=label]:text-sm',
        className,
      )}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        'group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4',
        className,
      )}
      {...props}
    />
  )
}

const fieldVariants = cva(
  'group/field flex w-full gap-3 data-[invalid=true]:text-destructive',
  {
    variants: {
      orientation: {
        vertical: ['flex-col [&>*]:w-full [&>.sr-only]:w-auto'],
        horizontal: [
          'flex-row items-center',
          '[&>[data-slot=field-label]]:flex-auto',
          'has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
        ],
        responsive: [
          'flex-col [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:flex-row @md/field-group:items-center @md/field-group:[&>*]:w-auto',
          '@md/field-group:[&>[data-slot=field-label]]:flex-auto',
          '@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
        ],
      },
    },
    defaultVariants: {
      orientation: 'vertical',
    },
  },
)

function Field({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        'group/field-content flex flex-1 flex-col gap-1.5 leading-snug',
        className,
      )}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50',
        'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4',
        'has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary dark:has-data-[state=checked]:bg-primary/10',
        className,
      )}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        'flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        'text-muted-foreground text-sm leading-normal font-normal group-has-[[data-orientation=horizontal]]/field:text-balance',
        'last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5',
        '[&>a:hover]:text-primary [&>a]:underline [&>a]:underline-offset-4',
        className,
      )}
      {...props}
    />
  )
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        'relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2',
        className,
      )}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="bg-background text-muted-foreground relative mx-auto block w-fit px-2"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  )
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<'div'> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors) {
      return null
    }

    if (errors.length === 1 && errors[0]?.message) {
      return errors[0].message
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {errors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>,
        )}
      </ul>
    )
  }, [children, errors])

  if (!content) {
    return null
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn('text-destructive text-sm font-normal', className)}
      {...props}
    >
      {content}
    </div>
  )
}

// ============================================================================
// TICKET-004 — High-level <FormField> primitive
// ----------------------------------------------------------------------------
// Decision: ALL-IN-ONE PROPS API (not compound).
//   Rationale: 90 % of Nivy forms today are flat label/input/error triplets.
//   A single `<FormField label error helper required>` collapses ~10 lines
//   of boilerplate to one. Power users can still drop down to the lower-level
//   <Field>/<FieldLabel>/<FieldError> primitives above for custom layouts.
//
// Sub-component slots are exposed (FormField.Label, FormField.Helper,
// FormField.Error) for opt-in composition, but the props API is canonical.
// ============================================================================

export interface FormFieldProps {
  /** Visible label text (required for a11y). Use `srLabel` to hide visually. */
  label: React.ReactNode
  /** If true, label is visually hidden but read by screen readers. */
  srLabel?: boolean
  /** Helper text rendered below the control when there is no error. */
  helper?: React.ReactNode
  /** Error message — when truthy, switches the field to invalid state. */
  error?: React.ReactNode
  /** Render a green check + optional success message when truthy. */
  success?: boolean | React.ReactNode
  /** Marks the field required (asterisk + aria-required on the control). */
  required?: boolean
  /** Disables the wrapped control. */
  disabled?: boolean
  /** Async validation in progress — overlays a spinner on the control. */
  loading?: boolean
  /** Optional explicit id; otherwise auto-generated via React.useId. */
  id?: string
  /** Extra class on the outer wrapper. */
  className?: string
  /** The single form control (Input / Textarea / Select trigger / etc.). */
  children: React.ReactElement<{
    id?: string
    'aria-invalid'?: boolean
    'aria-describedby'?: string
    'aria-required'?: boolean
    disabled?: boolean
    required?: boolean
  }>
}

function FormField({
  label,
  srLabel,
  helper,
  error,
  success,
  required,
  disabled,
  loading,
  id: providedId,
  className,
  children,
}: FormFieldProps) {
  const autoId = React.useId()
  const id = providedId ?? `f-${autoId}`
  const helperId = `${id}-helper`
  const errorId = `${id}-error`

  const invalid = Boolean(error)
  const isSuccess = !invalid && Boolean(success)

  // Re-trigger shake animation on every new error message.
  const [shakeKey, setShakeKey] = React.useState(0)
  const lastErrorRef = React.useRef<React.ReactNode>(null)
  React.useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      setShakeKey((k) => k + 1)
    }
    lastErrorRef.current = error ?? null
  }, [error])

  const describedBy =
    [invalid ? errorId : null, helper ? helperId : null]
      .filter(Boolean)
      .join(' ') || undefined

  // Inject a11y + state props into the single child control.
  const control = React.cloneElement(children, {
    id,
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy,
    'aria-required': required || undefined,
    disabled: disabled ?? children.props.disabled,
    required: required ?? children.props.required,
  })

  return (
    <div
      data-slot="form-field"
      data-invalid={invalid || undefined}
      data-success={isSuccess || undefined}
      data-disabled={disabled || undefined}
      data-loading={loading || undefined}
      className={cn(
        'group/form-field flex w-full flex-col gap-1.5',
        disabled && 'opacity-60',
        className,
      )}
    >
      <Label
        htmlFor={id}
        data-slot="form-field-label"
        className={cn(
          'text-sm font-medium leading-none',
          srLabel && 'sr-only',
          invalid && 'text-destructive',
        )}
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive ml-0.5">
            *
          </span>
        ) : null}
      </Label>

      <div
        key={shakeKey}
        data-slot="form-field-control"
        className={cn(
          'relative w-full',
          // State rings — applied to descendant inputs/textareas/triggers
          invalid &&
            '[&_input]:border-destructive [&_textarea]:border-destructive [&_[data-slot=select-trigger]]:border-destructive [&_input]:ring-destructive/30 [&_textarea]:ring-destructive/30 [&_input:focus-visible]:ring-destructive/40 [&_textarea:focus-visible]:ring-destructive/40',
          isSuccess &&
            '[&_input]:border-success [&_textarea]:border-success [&_[data-slot=select-trigger]]:border-success [&_input:focus-visible]:ring-success/40',
          // Focus ring uses semantic primary token by default
          !invalid &&
            !isSuccess &&
            '[&_input:focus-visible]:ring-primary/40 [&_textarea:focus-visible]:ring-primary/40 [&_input:focus-visible]:border-ring',
          // Shake on error
          invalid && 'animate-field-shake',
        )}
      >
        {control}

        {/* State icon — right-aligned, non-interactive */}
        {(invalid || isSuccess) && !loading ? (
          <span
            aria-hidden="true"
            data-slot="form-field-state-icon"
            className={cn(
              'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2',
              invalid ? 'text-destructive' : 'text-success',
            )}
          >
            {invalid ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4 animate-scale-in" />
            )}
          </span>
        ) : null}

        {/* Loading overlay — async validation */}
        {loading ? (
          <span
            role="status"
            aria-label="Validating"
            data-slot="form-field-loading"
            className="bg-background/40 absolute inset-0 flex items-center justify-end rounded-md pr-3 backdrop-blur-[1px]"
          >
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </span>
        ) : null}
      </div>

      {invalid ? (
        <p
          id={errorId}
          role="alert"
          data-slot="form-field-error"
          className="text-destructive flex items-start gap-1 text-xs leading-snug"
        >
          {error}
        </p>
      ) : helper ? (
        <p
          id={helperId}
          data-slot="form-field-helper"
          className="text-muted-foreground text-xs leading-snug"
        >
          {helper}
        </p>
      ) : isSuccess && typeof success !== 'boolean' ? (
        <p
          data-slot="form-field-success"
          className="text-success text-xs leading-snug"
        >
          {success}
        </p>
      ) : null}
    </div>
  )
}

// Compound sub-components — opt-in for custom composition.
function FormFieldLabel({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<typeof Label> & { required?: boolean }) {
  return (
    <Label
      data-slot="form-field-label"
      className={cn('text-sm font-medium leading-none', className)}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden="true" className="text-destructive ml-0.5">
          *
        </span>
      ) : null}
    </Label>
  )
}

function FormFieldHelper({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="form-field-helper"
      className={cn('text-muted-foreground text-xs leading-snug', className)}
      {...props}
    />
  )
}

function FormFieldError({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      role="alert"
      data-slot="form-field-error"
      className={cn(
        'text-destructive flex items-start gap-1 text-xs leading-snug',
        className,
      )}
      {...props}
    />
  )
}

// Attach compound slots to FormField for `<FormField.Label>` style usage.
const FormFieldNamespace = Object.assign(FormField, {
  Label: FormFieldLabel,
  Helper: FormFieldHelper,
  Error: FormFieldError,
})

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
  // High-level TICKET-004 API
  FormFieldNamespace as FormField,
  FormFieldLabel,
  FormFieldHelper,
  FormFieldError,
}
// Re-export the high-level API as `Field` for ticket-spec ergonomics.
// NOTE: shadcn's lower-level `Field` is still exported under that name.
// For new forms prefer `FormField`. Both coexist to keep back-compat.
export { Input }
