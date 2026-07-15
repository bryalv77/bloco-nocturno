import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable,
  type UploadTask,
} from "firebase/storage"

import { compressImage } from "@/lib/compressImage"
import { storage } from "@/lib/firebase"

const PHOTOS_FOLDER = "evolucoes"

function generatePhotoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export type PhotoEntry =
  | { id: string; kind: "uploaded"; url: string }
  | { id: string; kind: "uploading"; file: File; previewUrl: string; progress: number }
  | { id: string; kind: "error"; file: File; previewUrl: string; message: string }

export interface UploadedPhoto {
  url: string
  storagePath: string
}

export interface PhotoUploadHandle {
  promise: Promise<UploadedPhoto>
  cancel: () => void
}

function friendlyUploadError(error: unknown): string {
  const code = (error as { code?: string } | undefined)?.code
  if (code === "storage/canceled") return "Envio cancelado."
  if (code === "storage/unauthorized") return "Sem permissão para enviar a foto."
  return "Falha ao enviar a foto. Toque para tentar novamente."
}

export function startEvolucaoPhotoUpload(
  file: File,
  evolucaoId: string,
  onProgress: (fraction: number) => void
): PhotoUploadHandle {
  let uploadTask: UploadTask | null = null
  let canceled = false

  const promise = compressImage(file).then(({ blob }) => {
    if (canceled) throw Object.assign(new Error("canceled"), { code: "storage/canceled" })

    const photoId = generatePhotoId()
    const path = `${PHOTOS_FOLDER}/${evolucaoId}/${photoId}.jpg`
    const fileRef = storageRef(storage, path)

    return new Promise<UploadedPhoto>((resolve, reject) => {
      const task = uploadBytesResumable(fileRef, blob, { contentType: "image/jpeg" })
      uploadTask = task

      task.on(
        "state_changed",
        (snapshot) => {
          onProgress(snapshot.bytesTransferred / snapshot.totalBytes)
        },
        (error) => {
          reject(new Error(friendlyUploadError(error)))
        },
        () => {
          getDownloadURL(task.snapshot.ref)
            .then((url) => resolve({ url, storagePath: path }))
            .catch(reject)
        }
      )
    })
  })

  return {
    promise,
    cancel: () => {
      canceled = true
      uploadTask?.cancel()
    },
  }
}

function extractStoragePath(downloadUrl: string): string | null {
  try {
    const url = new URL(downloadUrl)
    const host = url.hostname
    if (!host.endsWith("firebasestorage.app") && !host.endsWith("googleapis.com")) {
      return null
    }
    const match = url.pathname.match(/\/o\/(.+)$/)
    if (!match) return null
    return decodeURIComponent(match[1])
  } catch {
    return null
  }
}

export async function deleteEvolucaoPhotoByUrl(
  downloadUrl: string
): Promise<void> {
  const path = extractStoragePath(downloadUrl)
  if (!path) return
  const fileRef = storageRef(storage, path)
  try {
    await deleteObject(fileRef)
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === "storage/object-not-found") return
    throw error
  }
}

export function createUploadingPhotoEntry(file: File): PhotoEntry {
  return {
    id: generatePhotoId(),
    kind: "uploading",
    file,
    previewUrl: URL.createObjectURL(file),
    progress: 0,
  }
}

export function getEntryUrl(entry: PhotoEntry): string {
  return entry.kind === "uploaded" ? entry.url : entry.previewUrl
}
