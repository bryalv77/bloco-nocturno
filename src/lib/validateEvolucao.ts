import type { EvolucaoFormData } from "@/types/evolucao"

const REQUIRED_FIELDS: Array<keyof Omit<EvolucaoFormData, "fotos">> = [
  "data",
  "paciente",
  "medicoResponsavel",
  "plantonista",
  "evolucao",
]

export function validateEvolucao(
  form: EvolucaoFormData
): Partial<Record<keyof EvolucaoFormData, string>> {
  const errors: Partial<Record<keyof EvolucaoFormData, string>> = {}
  for (const field of REQUIRED_FIELDS) {
    if (!form[field].trim()) {
      errors[field] = "Campo obrigatório."
    }
  }
  return errors
}
