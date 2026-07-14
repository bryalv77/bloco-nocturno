import * as React from "react"
import { toast } from "sonner"

import { useAuth } from "@/contexts/AuthContext"
import { createEvolucao } from "@/lib/evolucaoRepository"
import { downloadEvolucaoPdf, printEvolucaoPdf } from "@/lib/generateEvolucaoPdf"
import { validateEvolucao } from "@/lib/validateEvolucao"
import { EMPTY_EVOLUCAO_FORM, type EvolucaoFormData } from "@/types/evolucao"

import { EvolucaoFormFields } from "@/components/evolucao/EvolucaoFormFields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function EvolucaoFormPage() {
  const { user } = useAuth()
  const [form, setForm] = React.useState<EvolucaoFormData>(EMPTY_EVOLUCAO_FORM)
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof EvolucaoFormData, string>>
  >({})
  const [isSaving, setIsSaving] = React.useState(false)

  function updateField<K extends keyof EvolucaoFormData>(
    field: K,
    value: EvolucaoFormData[K]
  ) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function withValidation(action: (data: EvolucaoFormData) => void) {
    const nextErrors = validateEvolucao(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Preencha os campos obrigatórios antes de continuar.")
      return
    }
    action(form)
  }

  async function handleSave() {
    withValidation(async (data) => {
      setIsSaving(true)
      try {
        await createEvolucao(data, user?.uid ?? null)
        toast.success("Evolução salva com sucesso.")
      } catch {
        toast.error("Não foi possível salvar a evolução. Tente novamente.")
      } finally {
        setIsSaving(false)
      }
    })
  }

  function handleDownload() {
    withValidation((data) => downloadEvolucaoPdf(data))
  }

  function handlePrint() {
    withValidation((data) => printEvolucaoPdf(data))
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Evolução Plantão Noturno</CardTitle>
        </CardHeader>
        <CardContent>
          <EvolucaoFormFields form={form} errors={errors} onChange={updateField} />

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={handlePrint}>
              Imprimir
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              Baixar PDF
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
