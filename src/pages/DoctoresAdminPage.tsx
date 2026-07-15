import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { useDoctores } from "@/hooks/useDoctores"
import {
  addDoctor,
  deleteDoctor,
  updateDoctorName,
  type DoctorEntry,
} from "@/lib/doctoresRepository"

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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function AddDoctorDialog({ onAdded }: { onAdded?: () => void }) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [error, setError] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  function reset() {
    setName("")
    setError("")
    setIsSaving(false)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Informe o nome do médico.")
      return
    }
    setIsSaving(true)
    setError("")
    try {
      await addDoctor(trimmed)
      toast.success("Médico adicionado.")
      onAdded?.()
      reset()
      setOpen(false)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível adicionar o médico."
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger render={<Button size="sm">Adicionar médico</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar médico</DialogTitle>
          <DialogDescription>
            Cadastre um novo médico para utilizar nos formulários de evolução.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor="new-doctor-name">Nome</FieldLabel>
              <FieldContent>
                <Input
                  id="new-doctor-name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    if (error) setError("")
                  }}
                  placeholder="Dr(a). Nome completo"
                  autoFocus
                />
                <FieldError>{error}</FieldError>
              </FieldContent>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditDoctorDialog({
  doctor,
  onUpdated,
}: {
  doctor: DoctorEntry
  onUpdated?: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState(doctor.name)
  const [error, setError] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setName(doctor.name)
      setError("")
    }
  }, [open, doctor.name])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Informe o nome do médico.")
      return
    }
    if (trimmed === doctor.name) {
      setOpen(false)
      return
    }
    setIsSaving(true)
    setError("")
    try {
      await updateDoctorName(doctor.key, trimmed)
      toast.success("Médico atualizado.")
      onUpdated?.()
      setOpen(false)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível atualizar o médico."
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        Editar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar médico</DialogTitle>
          <DialogDescription>
            Atualize o nome do médico selecionado.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor={`edit-doctor-${doctor.key}`}>Nome</FieldLabel>
              <FieldContent>
                <Input
                  id={`edit-doctor-${doctor.key}`}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    if (error) setError("")
                  }}
                  autoFocus
                />
                <FieldError>{error}</FieldError>
              </FieldContent>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDoctorDialog({
  doctor,
  onDeleted,
}: {
  doctor: DoctorEntry
  onDeleted?: () => void
}) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteDoctor(doctor.key)
      toast.success("Médico excluído.")
      onDeleted?.()
    } catch {
      toast.error("Não foi possível excluir o médico.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="sm" disabled={isDeleting} />
        }
      >
        Excluir
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir médico?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O médico{" "}
            <strong>{doctor.name}</strong> será removido da lista. Registros
            anteriores que usem este nome não serão alterados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function DoctoresAdminPage() {
  const doctors = useDoctores()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Médicos</CardTitle>
            <p className="text-sm text-muted-foreground">
              Gerencie a lista de médicos utilizados nos formulários de
              evolução.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" render={<Link to="/admin" />}>
              Voltar
            </Button>
            <AddDoctorDialog />
          </div>
        </CardHeader>
        <CardContent>
          {doctors.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum médico cadastrado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.map((doctor) => (
                  <TableRow key={doctor.key}>
                    <TableCell>{doctor.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <EditDoctorDialog doctor={doctor} />
                        <DeleteDoctorDialog doctor={doctor} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default DoctoresAdminPage
