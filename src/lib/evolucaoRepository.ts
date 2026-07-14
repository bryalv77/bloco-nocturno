import {
  child,
  get,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  update,
  type Unsubscribe,
} from "firebase/database"

import { database } from "@/lib/firebase"
import type { EvolucaoFormData, EvolucaoRecord } from "@/types/evolucao"

const EVOLUCOES_PATH = "evolucoes"

function evolucoesRef() {
  return ref(database, EVOLUCOES_PATH)
}

export async function createEvolucao(
  data: EvolucaoFormData,
  createdBy: string | null
): Promise<string> {
  const newRef = push(evolucoesRef())
  await update(newRef, {
    ...data,
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  if (!newRef.key) {
    throw new Error("Falha ao gerar identificador do registro.")
  }
  return newRef.key
}

export async function updateEvolucao(
  id: string,
  data: EvolucaoFormData
): Promise<void> {
  await update(child(evolucoesRef(), id), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteEvolucao(id: string): Promise<void> {
  await remove(child(evolucoesRef(), id))
}

export async function getEvolucao(id: string): Promise<EvolucaoRecord | null> {
  const snapshot = await get(child(evolucoesRef(), id))
  if (!snapshot.exists()) return null
  return { id, ...(snapshot.val() as Omit<EvolucaoRecord, "id">) }
}

export function subscribeEvolucoes(
  onChange: (records: EvolucaoRecord[]) => void
): Unsubscribe {
  return onValue(evolucoesRef(), (snapshot) => {
    const value = snapshot.val() as Record<
      string,
      Omit<EvolucaoRecord, "id">
    > | null

    const records = value
      ? Object.entries(value).map(([id, record]) => ({ id, ...record }))
      : []

    records.sort((a, b) => b.createdAt - a.createdAt)
    onChange(records)
  })
}
