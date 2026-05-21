'use client'

import { useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type AvatarUploadProps = {
  currentUrl: string | null
  fallback: string
  onUploadSuccess: (url: string) => void
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
}

const sizeClasses = {
  sm: 'h-14 w-14',
  md: 'h-20 w-20',
  lg: 'h-24 w-24',
}

export function AvatarUpload({
  currentUrl,
  fallback,
  onUploadSuccess,
  size = 'md',
  readonly = false,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0]

    if (!file) return

    // preview
    const reader = new FileReader()

    reader.onload = () => {
      setPreview(reader.result as string)
    }

    reader.readAsDataURL(file)

    // upload
    setUploading(true)

    try {
      const form = new FormData()

      form.append('file', file)

      const res = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: form,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro no upload')
      }

      onUploadSuccess(data.url)

      toast.success('Foto atualizada!')
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Erro ao enviar foto'
      )

      setPreview(null)
    } finally {
      setUploading(false)

      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const displayUrl =
    preview || currentUrl || undefined

  return (
    <div className="relative inline-block">
      <Avatar
        className={`${sizeClasses[size]} border-4 border-accent/20`}
      >
        <AvatarImage
          src={displayUrl}
          alt="Foto de perfil"
        />

        <AvatarFallback className="text-xl bg-accent text-accent-foreground">
          {fallback}
        </AvatarFallback>
      </Avatar>

      {!readonly && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center shadow-md hover:bg-accent/80 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  )
}