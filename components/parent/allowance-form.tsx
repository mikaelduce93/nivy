"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { CheckCircle2, Loader2 } from "lucide-react"
import {
  FormField,
  FormLabel,
  FormError,
} from "@/components/ui/accessibility/form-field"
import { FormKeyboardAware } from "@/lib/hooks/use-keyboard-aware"
import { scrollToFirstError } from "@/lib/forms/scroll-to-error"

interface Teen {
  id: string
  name: string
}

type AllowanceErrors = {
  teenId?: string
  amount?: string
  dayOfWeek?: string
  dayOfMonth?: string
  conditionThreshold?: string
}

function validateAllowance(values: {
  teenId: string
  amount: number
  cadence: string
  dayOfWeek: number
  dayOfMonth: number
  conditional: boolean
  conditionThreshold: number
}): AllowanceErrors {
  const errors: AllowanceErrors = {}
  if (!values.teenId) errors.teenId = "Sélectionne un ado."
  if (!Number.isFinite(values.amount) || values.amount < 1)
    errors.amount = "Le montant doit être au moins 1 DH."
  else if (values.amount > 10000)
    errors.amount = "Le montant ne peut dépasser 10 000 DH."

  if (values.cadence === "weekly" || values.cadence === "biweekly") {
    if (
      !Number.isInteger(values.dayOfWeek) ||
      values.dayOfWeek < 0 ||
      values.dayOfWeek > 6
    )
      errors.dayOfWeek = "Doit être entre 0 (Dim) et 6 (Sam)."
  }
  if (values.cadence === "monthly") {
    if (
      !Number.isInteger(values.dayOfMonth) ||
      values.dayOfMonth < 1 ||
      values.dayOfMonth > 28
    )
      errors.dayOfMonth = "Doit être entre 1 et 28."
  }
  if (values.conditional) {
    if (
      !Number.isFinite(values.conditionThreshold) ||
      values.conditionThreshold < 1
    )
      errors.conditionThreshold = "Le seuil doit être au moins 1."
  }
  return errors
}

export function AllowanceForm({ teens }: { teens: Teen[] }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  const [teenId, setTeenId] = useState(teens[0]?.id ?? "")
  const [amount, setAmount] = useState(20)
  const [cadence, setCadence] = useState("weekly")
  const [dayOfWeek, setDayOfWeek] = useState(5) // Friday
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [conditional, setConditional] = useState(false)
  const [conditionThreshold, setConditionThreshold] = useState(5)
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const [errors, setErrors] = useState<AllowanceErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  // Auto-focus first meaningful field on mount
  useEffect(() => {
    if (teens.length === 0) return
    amountRef.current?.focus()
    amountRef.current?.select?.()
  }, [teens.length])

  // Re-validate touched fields when they change
  useEffect(() => {
    if (Object.keys(touched).length === 0) return
    const next = validateAllowance({
      teenId,
      amount,
      cadence,
      dayOfWeek,
      dayOfMonth,
      conditional,
      conditionThreshold,
    })
    setErrors((prev) => {
      const filtered: AllowanceErrors = {}
      for (const key of Object.keys(next) as (keyof AllowanceErrors)[]) {
        if (touched[key]) filtered[key] = next[key]
      }
      return { ...prev, ...filtered }
    })
  }, [
    teenId,
    amount,
    cadence,
    dayOfWeek,
    dayOfMonth,
    conditional,
    conditionThreshold,
    touched,
  ])

  const markTouched = (field: keyof AllowanceErrors) =>
    setTouched((prev) => ({ ...prev, [field]: true }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    setTouched({
      teenId: true,
      amount: true,
      dayOfWeek: true,
      dayOfMonth: true,
      conditionThreshold: true,
    })
    const v = validateAllowance({
      teenId,
      amount,
      cadence,
      dayOfWeek,
      dayOfMonth,
      conditional,
      conditionThreshold,
    })
    setErrors(v)
    if (Object.values(v).some(Boolean)) {
      scrollToFirstError(formRef.current, v)
      return
    }

    setBusy(true)
    const cadence_config: Record<string, number> = { hour: 9 }
    if (cadence === "weekly" || cadence === "biweekly") {
      cadence_config.day_of_week = dayOfWeek
    } else if (cadence === "monthly") {
      cadence_config.day_of_month = dayOfMonth
    }

    try {
      const res = await fetch("/api/parent/allowances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teenId,
          amount_dh: amount,
          cadence,
          cadence_config,
          conditional,
          condition_type: conditional ? "streak_min" : undefined,
          condition_threshold: conditional ? conditionThreshold : undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        setServerError(json.error ?? "Erreur")
        setBusy(false)
        // Scroll to top-level error banner
        window.requestAnimationFrame(() => {
          formRef.current
            ?.querySelector<HTMLElement>('[data-form-server-error="true"]')
            ?.scrollIntoView({ behavior: "smooth", block: "center" })
        })
        return
      }
      setSuccess(true)
      window.setTimeout(() => {
        router.push("/parent/allowances")
        router.refresh()
      }, 650)
    } catch (err) {
      setServerError((err as Error).message ?? "Erreur réseau")
      setBusy(false)
    }
  }

  if (teens.length === 0) {
    return (
      <div className="text-muted-foreground">
        Aucun ado lié à ton compte. Lie d&apos;abord un ado.
      </div>
    )
  }

  return (
    <FormKeyboardAware ref={formRef} onSubmit={submit} className="space-y-4">
      <FormField name="teenId" required error={touched.teenId ? errors.teenId : undefined}>
        <FormLabel>Ado</FormLabel>
        <Select
          value={teenId}
          onValueChange={(v) => {
            setTeenId(v)
            markTouched("teenId")
          }}
        >
          <SelectTrigger
            aria-invalid={!!(touched.teenId && errors.teenId)}
            onBlur={() => markTouched("teenId")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teens.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormError />
      </FormField>

      <FormField name="amount" required error={touched.amount ? errors.amount : undefined}>
        <FormLabel>Montant (DH)</FormLabel>
        <Input
          ref={amountRef}
          name="amount"
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          onBlur={() => markTouched("amount")}
          aria-invalid={!!(touched.amount && errors.amount)}
        />
        <FormError />
      </FormField>

      <div>
        <Label>Cadence</Label>
        <Select value={cadence} onValueChange={setCadence}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Hebdomadaire</SelectItem>
            <SelectItem value="biweekly">Bimensuelle</SelectItem>
            <SelectItem value="monthly">Mensuelle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(cadence === "weekly" || cadence === "biweekly") && (
        <FormField
          name="dayOfWeek"
          error={touched.dayOfWeek ? errors.dayOfWeek : undefined}
        >
          <FormLabel>Jour de la semaine (0=Dim, 5=Vendredi)</FormLabel>
          <Input
            name="dayOfWeek"
            type="number"
            min={0}
            max={6}
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            onBlur={() => markTouched("dayOfWeek")}
            aria-invalid={!!(touched.dayOfWeek && errors.dayOfWeek)}
          />
          <FormError />
        </FormField>
      )}

      {cadence === "monthly" && (
        <FormField
          name="dayOfMonth"
          error={touched.dayOfMonth ? errors.dayOfMonth : undefined}
        >
          <FormLabel>Jour du mois (1..28)</FormLabel>
          <Input
            name="dayOfMonth"
            type="number"
            min={1}
            max={28}
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(Number(e.target.value))}
            onBlur={() => markTouched("dayOfMonth")}
            aria-invalid={!!(touched.dayOfMonth && errors.dayOfMonth)}
          />
          <FormError />
        </FormField>
      )}

      <div className="flex items-center gap-3">
        <Switch checked={conditional} onCheckedChange={setConditional} />
        <Label>Conditionnel (streak minimum)</Label>
      </div>

      {conditional && (
        <FormField
          name="conditionThreshold"
          error={
            touched.conditionThreshold ? errors.conditionThreshold : undefined
          }
        >
          <FormLabel>Seuil de streak</FormLabel>
          <Input
            name="conditionThreshold"
            type="number"
            min={1}
            value={conditionThreshold}
            onChange={(e) => setConditionThreshold(Number(e.target.value))}
            onBlur={() => markTouched("conditionThreshold")}
            aria-invalid={
              !!(touched.conditionThreshold && errors.conditionThreshold)
            }
          />
          <FormError />
        </FormField>
      )}

      {serverError && (
        <p
          data-form-server-error="true"
          role="alert"
          className="text-destructive text-sm"
        >
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={busy || success} aria-busy={busy}>
        {success ? (
          <>
            <CheckCircle2
              className="h-5 w-5 mr-2 animate-in zoom-in-50 duration-300"
              aria-hidden="true"
            />
            Créée !
          </>
        ) : busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
            Création...
          </>
        ) : (
          "Créer l'allowance"
        )}
      </Button>
    </FormKeyboardAware>
  )
}
