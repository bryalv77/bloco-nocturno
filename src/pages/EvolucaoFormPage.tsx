import * as React from "react"
import { DownloadIcon, MoonStarIcon, PrinterIcon, SaveIcon } from "lucide-react"
import { push, ref, serverTimestamp, update } from "firebase/database"
import { toast } from "sonner"

import { useAuth } from "@/contexts/AuthContext"
import { database } from "@/lib/firebase"
import {
  createUploadingPhotoEntry,
  deleteEvolucaoPhotoByUrl,
  startEvolucaoPhotoUpload,
  type PhotoEntry,
  type PhotoUploadHandle,
} from "@/lib/evolucaoPhotos"
import { downloadEvolucaoPdf, printEvolucaoPdf } from "@/lib/generateEvolucaoPdf"
import { validateEvolucao } from "@/lib/validateEvolucao"
import {
  EMPTY_EVOLUCAO_FORM,
  MAX_EVOLUCAO_PHOTOS,
  type EvolucaoFormData,
} from "@/types/evolucao"

import { EvolucaoFormFields } from "@/components/evolucao/EvolucaoFormFields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

function getTodayIsoDate(): string {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, "0")
  const dd = String(today.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function EvolucaoFormPage() {
  const { user } = useAuth()
  const [evolucaoId] = React.useState(
    () => push(ref(database, "evolucoes")).key as string
  )
  const [form, setForm] = React.useState<EvolucaoFormData>(() => ({
    ...EMPTY_EVOLUCAO_FORM,
    data: getTodayIsoDate(),
  }))
  const [photos, setPhotos] = React.useState<PhotoEntry[]>([])
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof EvolucaoFormData, string>>
  >({})
  const [isSaving, setIsSaving] = React.useState(false)
  const [isPrinting, setIsPrinting] = React.useState(false)
  const [isDownloading, setIsDownloading] = React.useState(false)

  const photosRef = React.useRef<PhotoEntry[]>([])
  photosRef.current = photos
  const uploadHandlesRef = React.useRef(new Map<string, PhotoUploadHandle>())

  React.useEffect(() => {
    const handles = uploadHandlesRef.current
    return () => {
      photosRef.current.forEach((entry) => {
        if (entry.kind !== "uploaded") URL.revokeObjectURL(entry.previewUrl)
      })
      handles.forEach((handle) => handle.cancel())
    }
  }, [])

  function uploadPhotoEntry(id: string, file: File) {
    const handle = startEvolucaoPhotoUpload(file, evolucaoId, (fraction) => {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === id && p.kind === "uploading" ? { ...p, progress: fraction } : p
        )
      )
    })
    uploadHandlesRef.current.set(id, handle)

    handle.promise
      .then(({ url }) => {
        setPhotos((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p
            if (p.kind !== "uploaded") URL.revokeObjectURL(p.previewUrl)
            return { id, kind: "uploaded", url }
          })
        )
      })
      .catch((error: Error) => {
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === id && p.kind === "uploading"
              ? { id, kind: "error", file: p.file, previewUrl: p.previewUrl, message: error.message }
              : p
          )
        )
      })
      .finally(() => {
        uploadHandlesRef.current.delete(id)
      })
  }

  function updateField<K extends keyof EvolucaoFormData>(
    field: K,
    value: EvolucaoFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function addPhotos(files: File[]) {
    setPhotos((prev) => {
      const remaining = MAX_EVOLUCAO_PHOTOS - prev.length
      if (remaining <= 0) return prev
      const accepted = files.slice(0, remaining)
      const entries = accepted.map(createUploadingPhotoEntry)
      entries.forEach((entry) => {
        if (entry.kind === "uploading") uploadPhotoEntry(entry.id, entry.file)
      })
      return [...prev, ...entries]
    })
  }

  function retryPhoto(id: string) {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== id || p.kind !== "error") return p
        uploadPhotoEntry(id, p.file)
        return { id, kind: "uploading", file: p.file, previewUrl: p.previewUrl, progress: 0 }
      })
    )
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const entry = prev.find((p) => p.id === id)
      if (entry && entry.kind !== "uploaded") {
        uploadHandlesRef.current.get(id)?.cancel()
        uploadHandlesRef.current.delete(id)
        URL.revokeObjectURL(entry.previewUrl)
      } else if (entry) {
        deleteEvolucaoPhotoByUrl(entry.url).catch(() => undefined)
      }
      return prev.filter((p) => p.id !== id)
    })
  }

  function withValidation(
    action: (data: EvolucaoFormData) => void | Promise<void>
  ): Promise<void> | void {
    const nextErrors = validateEvolucao(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Preencha os campos obrigatórios antes de continuar.")
      return
    }
    return action(form)
  }

  function getPhotoUrls(): string[] {
    return photos
      .filter(
        (p): p is Extract<PhotoEntry, { kind: "uploaded" }> =>
          p.kind === "uploaded"
      )
      .map((p) => p.url)
  }

  function photosStillUploading(): boolean {
    return photos.some((p) => p.kind === "uploading")
  }

  function photosHaveError(): boolean {
    return photos.some((p) => p.kind === "error")
  }

  async function handleSave() {
    await withValidation(async (data) => {
      if (photosStillUploading()) {
        toast.error("Aguarde o envio das fotos para salvar.")
        return
      }
      if (photosHaveError()) {
        toast.error("Remova ou tente novamente as fotos com erro antes de salvar.")
        return
      }
      setIsSaving(true)
      try {
        await update(ref(database, `evolucoes/${evolucaoId}`), {
          ...data,
          fotos: getPhotoUrls(),
          createdBy: user?.uid ?? null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        toast.success("Evolução salva com sucesso.")
      } catch {
        toast.error("Não foi possível salvar a evolução. Tente novamente.")
      } finally {
        setIsSaving(false)
      }
    })
  }

  async function handleDownload() {
    await withValidation(async (data) => {
      setIsDownloading(true)
      try {
        await downloadEvolucaoPdf({ ...data, fotos: getPhotoUrls() })
      } catch {
        toast.error("Não foi possível gerar o PDF. Tente novamente.")
      } finally {
        setIsDownloading(false)
      }
    })
  }

  async function handlePrint() {
    await withValidation(async (data) => {
      setIsPrinting(true)
      try {
        await printEvolucaoPdf({ ...data, fotos: getPhotoUrls() })
      } catch {
        toast.error("Não foi possível abrir a impressão. Tente novamente.")
      } finally {
        setIsPrinting(false)
      }
    })
  }

  return (
    <div className="min-h-[calc(100svh-(--spacing(16)))] w-full bg-purple-100 px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <Card className="border-purple-200/70 shadow-lg shadow-purple-900/5">
          <CardHeader className="border-b border-purple-200/60 bg-gradient-to-br from-purple-50 via-white to-purple-50">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-600 text-white shadow-sm">
                <MoonStarIcon className="size-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-purple-950">
                  Evolução Plantão Noturno
                </CardTitle>
                <CardDescription className="text-purple-700/70">
                  Registre o acompanhamento clínico do paciente durante o
                  plantão.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <EvolucaoFormFields
              form={form}
              errors={errors}
              onChange={updateField}
              photos={photos}
              onAddPhotos={addPhotos}
              onRemovePhoto={removePhoto}
              onRetryPhoto={retryPhoto}
              photosDisabled={isSaving}
            />

            <div className="mt-8 flex flex-wrap justify-end gap-2 border-t border-purple-100 pt-6">
              <Button variant="outline" onClick={handlePrint} disabled={isPrinting}>
                {isPrinting ? <Spinner /> : <PrinterIcon data-icon="inline-start" />}
                {isPrinting ? "Preparando..." : "Imprimir"}
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Spinner />
                ) : (
                  <DownloadIcon data-icon="inline-start" />
                )}
                {isDownloading ? "Gerando..." : "Baixar PDF"}
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                {isSaving ? <Spinner /> : <SaveIcon data-icon="inline-start" />}
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
