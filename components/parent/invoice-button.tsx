"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Loader2 } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface InvoiceButtonProps {
  transactionId: string
  transactionType: "booking" | "topup"
}

export function InvoiceButton({ transactionId, transactionType }: InvoiceButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)
    try {
      const url = transactionType === "booking"
        ? `/api/invoices/${transactionId}`
        : `/api/invoices/topup/${transactionId}`

      // Open in new window for print
      window.open(url, "_blank", "width=800,height=600")
    } catch (error) {
      console.error("Error opening invoice:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            disabled={isLoading}
            className="h-9 w-9 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Telecharger la facture</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
