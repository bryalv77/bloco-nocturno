import {
  get,
  onValue,
  push,
  ref,
  remove,
  set,
  type Unsubscribe,
} from "firebase/database"

import { database } from "@/lib/firebase"

const DOCTORES_PATH = "doctores"

function doctoresRef() {
  return ref(database, DOCTORES_PATH)
}

function doctorRef(key: string) {
  return ref(database, `${DOCTORES_PATH}/${key}`)
}

export interface DoctorEntry {
  key: string
  name: string
}

function normalizeDoctors(value: unknown): DoctorEntry[] {
  if (!value) return []

  if (Array.isArray(value)) {
    return value
      .map((name, index) => {
        if (typeof name !== "string") return null
        const trimmed = name.trim()
        if (!trimmed) return null
        return { key: String(index), name: trimmed }
      })
      .filter((entry): entry is DoctorEntry => entry !== null)
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, name]) => {
        if (typeof name !== "string") return null
        const trimmed = name.trim()
        if (!trimmed) return null
        return { key, name: trimmed }
      })
      .filter((entry): entry is DoctorEntry => entry !== null)
  }

  return []
}

export function subscribeDoctores(
  onChange: (doctors: DoctorEntry[]) => void
): Unsubscribe {
  return onValue(doctoresRef(), (snapshot) => {
    onChange(normalizeDoctors(snapshot.val()))
  })
}

export async function fetchDoctores(): Promise<DoctorEntry[]> {
  const snapshot = await get(doctoresRef())
  return normalizeDoctors(snapshot.val())
}

export async function addDoctor(name: string): Promise<DoctorEntry> {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error("Informe o nome do médico.")
  }

  const newRef = push(doctoresRef())
  await set(newRef, trimmed)
  if (!newRef.key) {
    throw new Error("Falha ao gerar identificador do médico.")
  }
  return { key: newRef.key, name: trimmed }
}

export async function updateDoctorName(
  key: string,
  name: string
): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error("Informe o nome do médico.")
  }
  await set(doctorRef(key), trimmed)
}

export async function deleteDoctor(key: string): Promise<void> {
  await remove(doctorRef(key))
}
