import * as React from "react"
import { RotateCwIcon, Trash2Icon, UploadIcon } from "lucide-react"

import {
  getEntryUrl,
  type PhotoEntry,
} from "@/lib/evolucaoPhotos"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"

interface EvolucaoPhotosFieldProps {
  entries: PhotoEntry[]
  maxPhotos: number
  disabled?: boolean
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  onRetry: (id: string) => void
}

export function EvolucaoPhotosField({
  entries,
  maxPhotos,
  disabled = false,
  onAdd,
  onRemove,
  onRetry,
}: EvolucaoPhotosFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const remaining = Math.max(maxPhotos - entries.length, 0)

  function handleSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/")
    )
    if (files.length > 0) onAdd(files)
    event.target.value = ""
  }

  return (
    <Field>
      <FieldLabel>Fotos do informe</FieldLabel>
      <FieldContent>
        <p className="text-xs text-muted-foreground">
          Até {maxPhotos} fotos. 
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {entries.map((entry) => (
            <PhotoThumbnail
              key={entry.id}
              entry={entry}
              disabled={disabled}
              onRemove={() => onRemove(entry.id)}
              onRetry={() => onRetry(entry.id)}
            />
          ))}

          {remaining > 0 && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-purple-200 bg-white/60 text-purple-700 transition-colors",
                "hover:border-purple-400 hover:bg-purple-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              <UploadIcon className="size-5" />
              <span className="text-xs font-medium">
                Adicionar foto
              </span>
              <span className="text-[10px] text-muted-foreground">
                {remaining} restante{remaining === 1 ? "" : "s"}
              </span>
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleSelect}
          disabled={disabled || remaining === 0}
        />
      </FieldContent>
    </Field>
  )
}

interface PhotoThumbnailProps {
  entry: PhotoEntry
  disabled: boolean
  onRemove: () => void
  onRetry: () => void
}

function PhotoThumbnail({ entry, disabled, onRemove, onRetry }: PhotoThumbnailProps) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg border border-purple-200 bg-purple-50">
      <img
        src={getEntryUrl(entry)}
        alt="Foto do informe"
        className="h-full w-full object-cover"
      />

      {entry.kind === "uploading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-purple-950/50 text-white">
          <span className="text-[10px] font-medium">
            Enviando... {Math.round(entry.progress * 100)}%
          </span>
          <div className="h-1 w-3/4 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{ width: `${Math.round(entry.progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {entry.kind === "error" && (
        <button
          type="button"
          onClick={onRetry}
          disabled={disabled}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-950/60 px-1.5 text-center text-white disabled:cursor-not-allowed"
        >
          <RotateCwIcon className="size-4" />
          <span className="text-[10px] font-medium leading-tight">
            {entry.message}
          </span>
        </button>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <Button
        type="button"
        size="icon-xs"
        variant="destructive"
        onClick={onRemove}
        disabled={disabled}
        className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        aria-label="Remover foto"
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </div>
  )
}
