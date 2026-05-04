"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ESignatureForm } from "@/components/e-signature-form"
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, FileText, Loader2 } from 'lucide-react'
import Link from "next/link"

export default function AjouterDocumentPage() {
  const [documentType, setDocumentType] = useState("")
  const [childId, setChildId] = useState("")
  const [description, setDescription] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [signatureUrl, setSignatureUrl] = useState("")
  const [cinUrl, setCinUrl] = useState("")
  const [children, setChildren] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const loadChildren = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase.from("children").select("*").eq("parent_id", user.id)
      setChildren(data || [])
    }
    loadChildren()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("Le fichier ne doit pas dépasser 10 Mo")
        return
      }
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Vous devez être connecté")

      if (documentType === 'authorization' && !signatureUrl) {
        throw new Error("La signature électronique est obligatoire pour les autorisations parentales")
      }

      if (!file) throw new Error("Veuillez sélectionner un fichier")

      // Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop()
      const fileName = `${user.id}/${childId || "general"}-${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage.from("documents").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) throw uploadError

      // Get file URL
      const { data: urlData } = supabase.storage.from("documents").getPublicUrl(fileName)

      // Save document metadata
      const { error: insertError } = await supabase.from("documents").insert({
        parent_id: user.id,
        child_id: childId || null,
        document_type: documentType,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        description: description || null,
        expiry_date: expiryDate || null,
        signature_url: signatureUrl || null,
        cin_url: cinUrl || null,
      })

      if (insertError) throw insertError

      router.push("/profile/documents")
    } catch (err: any) {
      console.error("[v0] Document upload error:", err)
      setError(err.message || "Une erreur est survenue")
    } finally {
      setIsLoading(false)
    }
  }

  const documentTypeLabels = [
    { value: "medical", label: "Certificat médical" },
    { value: "identity", label: "Pièce d'identité" },
    { value: "vaccination", label: "Carnet de vaccination" },
    { value: "authorization", label: "Autorisation parentale" },
    { value: "insurance", label: "Attestation d'assurance" },
    { value: "other", label: "Autre document" },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto">
          <Button asChild variant="ghost" className="mb-6 text-cyan-400 hover:text-cyan-300">
            <Link href="/profile/documents">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Link>
          </Button>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Ajouter un document</CardTitle>
              <CardDescription>Téléchargez un document important pour votre enfant</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="documentType">Type de document *</Label>
                    <Select value={documentType} onValueChange={setDocumentType} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypeLabels.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="child">Enfant concerné</Label>
                    <Select value={childId} onValueChange={setChildId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un enfant (optionnel)" />
                      </SelectTrigger>
                      <SelectContent>
                        {children.map((child) => (
                          <SelectItem key={child.id} value={child.id}>
                            {child.prenom} {child.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {documentType === 'authorization' && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
                      <h3 className="text-lg font-bold text-white mb-4">Signature électronique parentale *</h3>
                      <p className="text-sm text-purple-300 mb-4">
                        L'autorisation parentale nécessite une signature électronique et une copie de votre CIN pour être valide juridiquement.
                      </p>
                      <ESignatureForm 
                        childId={childId || ''}
                        onComplete={(signatureData) => {
                          setSignatureUrl(signatureData.signature_url || '')
                          setCinUrl(signatureData.cin_url || '')
                        }} 
                      />
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="file">Fichier *</Label>
                    <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center hover:border-cyan-500 transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 bg-transparent"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {file ? "Changer le fichier" : "Sélectionner un fichier"}
                      </Button>
                      {file && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-white">
                          <FileText className="w-4 h-4 text-cyan-400" />
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-zinc-500">({(file.size / 1024 / 1024).toFixed(2)} Mo)</span>
                        </div>
                      )}
                      <p className="text-xs text-zinc-500 mt-2">PDF, JPG, PNG, DOC. Max 10 Mo.</p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Description du document (optionnel)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="expiryDate">Date d'expiration</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                    <p className="text-xs text-zinc-500">Optionnel - pour les documents avec date d'expiration</p>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white border-0"
                    disabled={isLoading || !file || !documentType || (documentType === 'authorization' && !signatureUrl)}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Upload en cours...
                      </>
                    ) : (
                      "Ajouter le document"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
