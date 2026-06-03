"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FieldInput } from "@/components/ui/field-input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createPartnerSupportTicket } from "./actions"

export function NewTicketForm() {
  const [isPending, startTransition] = useTransition()
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const router = useRouter()

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set("subject", subject)
    fd.set("body", body)
    startTransition(async () => {
      const res = await createPartnerSupportTicket(fd)
      if (res.ok) {
        toast.success("Demande envoyée", {
          description: "Notre équipe vous répondra dans les plus brefs délais.",
        })
        setSubject("")
        setBody("")
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FieldInput
        label="Sujet"
        required
        minLength={3}
        maxLength={200}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Ex : problème de scanner"
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ticket-body" className="eyebrow tracking-[0.16em]">
          Message
        </label>
        <Textarea
          id="ticket-body"
          required
          minLength={10}
          maxLength={5000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Raconte ton souci ou ta question…"
          className="min-h-[150px] focus-visible:border-ink focus-visible:ring-0"
        />
      </div>
      <Button type="submit" variant="pink" disabled={isPending} className="w-full">
        {isPending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            Envoi…
          </>
        ) : (
          "Envoyer la demande"
        )}
      </Button>
    </form>
  )
}
