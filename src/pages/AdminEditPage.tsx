import * as React from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import {
  deleteEvolucao,
  getEvolucao,
  updateEvolucao,
} from "@/lib/evolucaoRepository"
import { downloadEvolucaoPdf, printEvolucaoPdf } from "@/lib/generateEvolucaoPdf"
import { validateEvolucao } from "@/lib/validateEvolucao"
import type { EvolucaoFormData } from "@/types/evolucao"

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

export function AdminEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [form, setForm] = React.useState<EvolucaoFormData | null>(null)
  const [notFound, setNotFound] = React.useState(false)
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof EvolucaoFormData, string>>
  >({})
  const [isSaving, setIsSaving] = React.useState(false)

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
      })
    })
  }, [id])

  function updateField<K extends keyof EvolucaoFormData>(
    field: K,
    value: EvolucaoFormData[K]
  ) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  function withValidation(action: (data: EvolucaoFormData) => void) {
    if (!form) return
    const nextErrors = validateEvolucao(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Preencha os campos obrigatórios antes de continuar.")
      return
    }
    action(form)
  }

  async function handleSave() {
    if (!id) return
    withValidation(async (data) => {
      setIsSaving(true)
      try {
        await updateEvolucao(id, data)
        toast.success("Evolução atualizada com sucesso.")
      } catch {
        toast.error("Não foi possível salvar as alterações.")
      } finally {
        setIsSaving(false)
      }
    })
  }

  async function handleDelete() {
    if (!id) return
    try {
      await deleteEvolucao(id)
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
          <EvolucaoFormFields form={form} errors={errors} onChange={updateField} />

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
            <Button variant="outline" onClick={() => withValidation(printEvolucaoPdf)}>
              Imprimir
            </Button>
            <Button variant="outline" onClick={() => withValidation(downloadEvolucaoPdf)}>
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
