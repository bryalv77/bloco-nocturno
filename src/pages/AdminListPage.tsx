import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { deleteEvolucao, subscribeEvolucoes } from "@/lib/evolucaoRepository"
import { downloadEvolucaoPdf } from "@/lib/generateEvolucaoPdf"
import type { EvolucaoRecord } from "@/types/evolucao"

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
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "—"
  const [year, month, day] = isoDate.split("-")
  if (!year || !month || !day) return isoDate
  return `${day}/${month}/${year}`
}

export function AdminListPage() {
  const [records, setRecords] = React.useState<EvolucaoRecord[] | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    return subscribeEvolucoes(setRecords)
  }, [])

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await deleteEvolucao(id)
      toast.success("Registro excluído.")
    } catch {
      toast.error("Não foi possível excluir o registro.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-medium text-foreground">
          Evoluções registradas
        </h1>
        <Button size="sm" render={<Link to="/" />}>
          Nova evolução
        </Button>
      </div>

      {records === null ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-6" />
        </div>
      ) : records.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Nenhuma evolução registrada ainda.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Médico Responsável</TableHead>
              <TableHead>Plantonista</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{formatDisplayDate(record.data)}</TableCell>
                <TableCell>{record.paciente}</TableCell>
                <TableCell>{record.medicoResponsavel}</TableCell>
                <TableCell>{record.plantonista}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      render={<Link to={`/admin/${record.id}`} />}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadEvolucaoPdf(record)}
                    >
                      PDF
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deletingId === record.id}
                          />
                        }
                      >
                        Excluir
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir evolução?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O registro de{" "}
                            {record.paciente} será excluído permanentemente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => handleDelete(record.id)}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
