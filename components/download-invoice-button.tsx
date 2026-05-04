"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileText, Download, Loader2, Printer } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DownloadInvoiceButtonProps {
  bookingId: string
  variant?: "default" | "outline" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  showLabel?: boolean
}

export function DownloadInvoiceButton({
  bookingId,
  variant = "outline",
  size = "sm",
  className,
  showLabel = true
}: DownloadInvoiceButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDownload = async (format: "print" | "html") => {
    setIsLoading(true)
    try {
      const url = `/api/invoices/${bookingId}${format === "html" ? "?format=html" : ""}`

      // Open in new window for print/download
      const printWindow = window.open(url, "_blank", "width=800,height=600")

      if (printWindow) {
        // For HTML format, just view
        if (format === "html") {
          printWindow.focus()
        }
        // For print, the page will auto-trigger print dialog
      }
    } catch (error) {
      console.error("Error downloading invoice:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {showLabel && <span className="ml-2">Facture</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleDownload("print")}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimer / PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload("html")}>
          <Download className="h-4 w-4 mr-2" />
          Voir en ligne
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Simple button version without dropdown
export function PrintInvoiceButton({
  bookingId,
  variant = "outline",
  size = "sm",
  className,
  children
}: DownloadInvoiceButtonProps & { children?: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)

  const handlePrint = async () => {
    setIsLoading(true)
    try {
      const url = `/api/invoices/${bookingId}`
      window.open(url, "_blank", "width=800,height=600")
    } catch (error) {
      console.error("Error printing invoice:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handlePrint}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      {children || <span className="ml-2">Telecharger facture</span>}
    </Button>
  )
}
