"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
      <div className="space-y-2">
        <Label className="text-zinc-300">Sujet</Label>
        <Input
          required
          minLength={3}
          maxLength={200}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Ex: Problème de scanner"
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-zinc-300">Message</Label>
        <Textarea
          required
          minLength={10}
          maxLength={5000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Décrivez votre problème ou question…"
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[150px]"
        />
      </div>
      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Envoi…
          </>
        ) : (
          "Envoyer la demande"
        )}
      </Button>
    </form>
  )
}
