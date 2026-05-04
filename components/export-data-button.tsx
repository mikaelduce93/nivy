"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ExportDataButtonProps {
  data: any[]
  filename: string
  label?: string
}

export function ExportDataButton({ data, filename, label = "Exporter" }: ExportDataButtonProps) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      alert("Aucune donnée à exporter")
      return
    }

    // Convert data to CSV
    const headers = Object.keys(data[0]).join(",")
    const rows = data.map((item) => Object.values(item).join(","))
    const csv = [headers, ...rows].join("\n")

    // Create blob and download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Button onClick={handleExport} variant="outline" className="bg-transparent border-zinc-800">
      <Download className="w-4 h-4 mr-2" />
      {label}
    </Button>
  )
}
