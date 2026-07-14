export interface EvolucaoFormData {
  data: string
  paciente: string
  medicoResponsavel: string
  plantonista: string
  cirurgia: string
  evolucao: string
  conduta: string
  observacoes: string
}

export interface EvolucaoRecord extends EvolucaoFormData {
  id: string
  createdAt: number
  updatedAt: number
  createdBy: string | null
}

export const EMPTY_EVOLUCAO_FORM: EvolucaoFormData = {
  data: "",
  paciente: "",
  medicoResponsavel: "",
  plantonista: "Dra. Alba Paredes",
  cirurgia: "",
  evolucao: "",
  conduta: "",
  observacoes: "",
}
