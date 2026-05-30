'use client'

// ----------------------------------------------------------------------
// Wave 2 TICKET-029 — Strip mock from <UniversalScanner>
//
// The original component embedded hard-coded "Youssef Benali", "Sarah K.",
// "Karim M." mock responses inside `handleScan`. The canonical scanner
// flow now lives at `app/partner/scanner/page.tsx`, which calls the real
// `/api/partner/verify-card` endpoint.
//
// To keep the dashboard CTA card unchanged (and avoid a second, divergent
// scanner UI), this component is now a thin link to the live scanner
// page. The dialog + html5-qrcode + mock branches have been removed.
// ----------------------------------------------------------------------

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { QrCode } from "lucide-react"

export function UniversalScanner() {
  return (
    <Button
      asChild
      size="lg"
      className="w-full h-24 text-xl font-bold bg-gradient-to-r from-teal to-teal hover:from-teal hover:to-teal shadow-xl shadow-teal/20 rounded-2xl flex flex-col gap-2"
    >
      <Link href="/partner/scanner">
        <QrCode className="w-8 h-8" />
        SCANNER UN CLIENT
      </Link>
    </Button>
  )
}
