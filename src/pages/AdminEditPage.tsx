import * as React from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import {
  deleteEvolucao,
  getEvolucao,
  updateEvolucao,
} from "@/lib/evolucaoRepository"
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
  MAX_EVOLUCAO_PHOTOS,
  type EvolucaoFormData,
} from "@/types/evolucao"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { EvolucaoFormFields } from "@/components/evolucao/EvolucaoFormFields"

function generateEntryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function AdminEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [form, setForm] = React.useState<EvolucaoFormData | null>(null)
  const [photos, setPhotos] = React.useState<PhotoEntry[]>([])
  const [initialPhotos, setInitialPhotos] = React.useState<PhotoEntry[]>([])
  const [notFound, setNotFound] = React.useState(false)
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
    if (!id) return
    getEvolucao(id).then((record) => {
      if (!record) {
        setNotFound(true)
        return
      }
      setForm({
        data: record.data,
        paciente: record.paciente,
        medicoResponsavel: record.medicoResponsavel,
        plantonista: record.plantonista,
        cirurgia: record.cirurgia,
        evolucao: record.evolucao,
        conduta: record.conduta,
        observacoes: record.observacoes,
        fotos: record.fotos ?? [],
      })
      const initial: PhotoEntry[] = (record.fotos ?? []).map((url) => ({
        id: generateEntryId(),
        kind: "uploaded",
        url,
      }))
      setPhotos(initial)
      setInitialPhotos(initial)
    })
  }, [id])

  React.useEffect(() => {
    const handles = uploadHandlesRef.current
    return () => {
      photosRef.current.forEach((entry) => {
        if (entry.kind !== "uploaded") URL.revokeObjectURL(entry.previewUrl)
      })
      handles.forEach((handle) => handle.cancel())
    }
  }, [])

  function uploadPhotoEntry(photoId: string, file: File) {
    if (!id) return
    const handle = startEvolucaoPhotoUpload(file, id, (fraction) => {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId && p.kind === "uploading"
            ? { ...p, progress: fraction }
            : p
        )
      )
    })
    uploadHandlesRef.current.set(photoId, handle)

    handle.promise
      .then(({ url }) => {
        setPhotos((prev) =>
          prev.map((p) => {
            if (p.id !== photoId) return p
            if (p.kind !== "uploaded") URL.revokeObjectURL(p.previewUrl)
            return { id: photoId, kind: "uploaded", url }
          })
        )
      })
      .catch((error: Error) => {
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId && p.kind === "uploading"
              ? {
                  id: photoId,
                  kind: "error",
                  file: p.file,
                  previewUrl: p.previewUrl,
                  message: error.message,
                }
              : p
          )
        )
      })
      .finally(() => {
        uploadHandlesRef.current.delete(photoId)
      })
  }

  function updateField<K extends keyof EvolucaoFormData>(
    field: K,
    value: EvolucaoFormData[K]
  ) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev))
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

  function retryPhoto(photoId: string) {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== photoId || p.kind !== "error") return p
        uploadPhotoEntry(photoId, p.file)
        return {
          id: photoId,
          kind: "uploading",
          file: p.file,
          previewUrl: p.previewUrl,
          progress: 0,
        }
      })
    )
  }

  function removePhoto(photoId: string) {
    setPhotos((prev) => {
      const entry = prev.find((p) => p.id === photoId)
      if (entry && entry.kind !== "uploaded") {
        uploadHandlesRef.current.get(photoId)?.cancel()
        uploadHandlesRef.current.delete(photoId)
        URL.revokeObjectURL(entry.previewUrl)
      }
      return prev.filter((p) => p.id !== photoId)
    })
  }

  function withValidation(
    action: (data: EvolucaoFormData) => void | Promise<void>
  ): Promise<void> | void {
    if (!form) return
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
    if (!id) return
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
        const finalUrls = getPhotoUrls()

        await updateEvolucao(id, { ...data, fotos: finalUrls })

        const initialUrls = new Set(
          initialPhotos
            .filter(
              (p): p is Extract<PhotoEntry, { kind: "uploaded" }> =>
                p.kind === "uploaded"
            )
            .map((p) => p.url)
        )
        const removedUrls = [...initialUrls].filter(
          (url) => !finalUrls.includes(url)
        )
        await Promise.all(removedUrls.map(deleteEvolucaoPhotoByUrl))

        toast.success("Evolução atualizada com sucesso.")
      } catch {
        toast.error("Não foi possível salvar as alterações.")
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

  async function handleDelete() {
    if (!id) return
    try {
      const urls = initialPhotos
        .filter(
          (p): p is Extract<PhotoEntry, { kind: "uploaded" }> =>
            p.kind === "uploaded"
        )
        .map((p) => p.url)
      await deleteEvolucao(id)
      await Promise.all(
        urls.map((url) =>
          deleteEvolucaoPhotoByUrl(url).catch(() => undefined)
        )
      )
      toast.success("Registro excluído.")
      navigate("/admin", { replace: true })
    } catch {
      toast.error("Não foi possível excluir o registro.")
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Registro não encontrado.
        </p>
        <Button size="sm" render={<Link to="/admin" />}>
          Voltar para a lista
        </Button>
      </div>
    )
  }

  if (!form) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner className="size-6" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-xl">Editar evolução</CardTitle>
          <Button variant="ghost" size="sm" render={<Link to="/admin" />}>
            Voltar
          </Button>
        </CardHeader>
        <CardContent>
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

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" />}>
                Excluir
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir evolução?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={handleDelete}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={isPrinting}
            >
              {isPrinting ? <Spinner /> : "Imprimir"}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? <Spinner /> : "Baixar PDF"}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
