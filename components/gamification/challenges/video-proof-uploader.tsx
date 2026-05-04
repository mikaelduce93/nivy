'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Camera, X, Check, Loader2, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useSound } from '@/lib/hooks/use-sound'

interface VideoProofUploaderProps {
  challengeId: string
  onUploadComplete: (url: string) => void
}

export function VideoProofUploader({ challengeId, onUploadComplete }: VideoProofUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { play } = useSound()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate video type
    if (!selectedFile.type.startsWith('video/')) {
      toast.error('Format non supporté. Veuillez uploader une vidéo.')
      return
    }

    // Validate size (max 50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error('Vidéo trop volumineuse. Max 50MB.')
      return
    }

    setFile(selectedFile)
    setPreviewUrl(URL.createObjectURL(selectedFile))
    play('click')
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    play('whoosh')
    const supabase = createClient()
    const fileName = `${challengeId}/${Date.now()}-${file.name}`

    try {
      // Fake progress for UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 500)

      const { data, error } = await supabase.storage
        .from('challenge-proofs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      clearInterval(progressInterval)

      if (error) throw error

      setProgress(100)
      play('success')
      
      const { data: { publicUrl } } = supabase.storage
        .from('challenge-proofs')
        .getPublicUrl(fileName)

      // Save proof record in DB
      await supabase.from('challenge_proofs').insert({
        challenge_id: challengeId,
        video_url: publicUrl,
        user_id: (await supabase.auth.getUser()).data.user?.id
      })

      onUploadComplete(publicUrl)
      toast.success('Preuve envoyée ! Analyse en cours...')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error("Erreur lors de l'envoi de la vidéo")
      setProgress(0)
    } finally {
      setIsUploading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setPreviewUrl(null)
    setProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <AnimatePresence mode="wait">
        {!previewUrl ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-2 border-dashed border-zinc-700 rounded-2xl p-8 text-center hover:border-purple-500 transition-colors bg-zinc-900/50 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileSelect}
              capture="environment" // Prefer rear camera on mobile
            />
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-400">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-white font-bold mb-1">Prouve ton exploit !</h3>
            <p className="text-zinc-400 text-sm">Enregistre ou upload une vidéo (Max 10s)</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800"
          >
            <video 
              src={previewUrl} 
              className="w-full aspect-[9/16] object-cover" 
              controls 
              autoPlay 
              muted 
              loop 
            />
            
            {!isUploading && (
              <button
                onClick={clearFile}
                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-red-500/80 transition-colors backdrop-blur-md"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
              {isUploading ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-white font-medium">
                    <span>Envoi en cours...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2 bg-zinc-700" />
                </div>
              ) : (
                <Button 
                  onClick={handleUpload}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-purple-500/20"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Envoyer la preuve
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

