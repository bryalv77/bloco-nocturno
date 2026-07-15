import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { useDoctores } from "@/hooks/useDoctores"
import { MAX_EVOLUCAO_PHOTOS, type EvolucaoFormData } from "@/types/evolucao"
import type { PhotoEntry } from "@/lib/evolucaoPhotos"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { DoctorCombobox } from "@/components/evolucao/DoctorCombobox"
import { EvolucaoPhotosField } from "@/components/evolucao/EvolucaoPhotosField"

interface EvolucaoFormFieldsProps {
  form: EvolucaoFormData
  errors: Partial<Record<keyof EvolucaoFormData, string>>
  onChange: <K extends keyof EvolucaoFormData>(
    field: K,
    value: EvolucaoFormData[K]
  ) => void
  photos: PhotoEntry[]
  onAddPhotos: (files: File[]) => void
  onRemovePhoto: (id: string) => void
  onRetryPhoto: (id: string) => void
  photosDisabled?: boolean
}

function isoDateToDate(iso: string): Date | undefined {
  if (!iso) return undefined
  const [year, month, day] = iso.split("-").map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function dateToIsoDate(date: Date | undefined): string {
  if (!date) return ""
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function EvolucaoFormFields({
  form,
  errors,
  onChange,
  photos,
  onAddPhotos,
  onRemovePhoto,
  onRetryPhoto,
  photosDisabled = false,
}: EvolucaoFormFieldsProps) {
  const selectedDate = React.useMemo(
    () => isoDateToDate(form.data),
    [form.data]
  )
  const doctors = useDoctores()

  return (
    <FieldGroup>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!errors.data}>
          <FieldLabel htmlFor="data">Data</FieldLabel>
          <FieldContent>
            <Popover>
              <PopoverTrigger
                render={(props) => (
                  <Button
                    {...props}
                    id="data"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.data && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="size-4" />
                    {form.data ? (
                      format(selectedDate ?? new Date(), "PPP", {
                        locale: ptBR,
                      })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                )}
              />
              <PopoverContent
                className="w-auto p-0"
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => onChange("data", dateToIsoDate(date))}
                  locale={ptBR}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
            <FieldError>{errors.data}</FieldError>
          </FieldContent>
        </Field>

        <Field data-invalid={!!errors.paciente}>
          <FieldLabel htmlFor="paciente">Paciente</FieldLabel>
          <FieldContent>
            <Input
              id="paciente"
              value={form.paciente}
              onChange={(event) => onChange("paciente", event.target.value)}
              placeholder="Nome completo do paciente"
            />
            <FieldError>{errors.paciente}</FieldError>
          </FieldContent>
        </Field>

        <Field data-invalid={!!errors.medicoResponsavel}>
          <FieldLabel htmlFor="medicoResponsavel">
            Médico Responsável
          </FieldLabel>
          <FieldContent>
            <DoctorCombobox
              id="medicoResponsavel"
              value={form.medicoResponsavel}
              onChange={(value) => onChange("medicoResponsavel", value)}
              doctors={doctors}
              placeholder="Selecione ou digite um nome"
              aria-invalid={!!errors.medicoResponsavel}
            />
            <FieldError>{errors.medicoResponsavel}</FieldError>
          </FieldContent>
        </Field>

        <Field data-invalid={!!errors.plantonista}>
          <FieldLabel htmlFor="plantonista">Plantonista</FieldLabel>
          <FieldContent>
            <DoctorCombobox
              id="plantonista"
              value={form.plantonista}
              onChange={(value) => onChange("plantonista", value)}
              doctors={doctors}
              placeholder="Selecione ou digite um nome"
              aria-invalid={!!errors.plantonista}
            />
            <FieldError>{errors.plantonista}</FieldError>
          </FieldContent>
        </Field>

        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="cirurgia">Cirurgia</FieldLabel>
          <FieldContent>
            <Input
              id="cirurgia"
              value={form.cirurgia}
              onChange={(event) => onChange("cirurgia", event.target.value)}
              placeholder="Procedimento(s) realizado(s)"
            />
          </FieldContent>
        </Field>
      </div>

      <Field data-invalid={!!errors.evolucao}>
        <FieldLabel htmlFor="evolucao">Evolução</FieldLabel>
        <FieldContent>
          <Textarea
            id="evolucao"
            rows={6}
            value={form.evolucao}
            onChange={(event) => onChange("evolucao", event.target.value)}
            placeholder="Descreva o estado clínico do paciente durante o plantão"
          />
          <FieldError>{errors.evolucao}</FieldError>
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="conduta">Conduta</FieldLabel>
        <FieldContent>
          <Textarea
            id="conduta"
            rows={5}
            value={form.conduta}
            onChange={(event) => onChange("conduta", event.target.value)}
            placeholder={"Uma conduta por linha, ex.:\nManter analgesia conforme prescrição."}
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor="observacoes">Observações</FieldLabel>
        <FieldContent>
          <Textarea
            id="observacoes"
            rows={4}
            value={form.observacoes}
            onChange={(event) =>
              onChange("observacoes", event.target.value)
            }
          />
        </FieldContent>
      </Field>

      <EvolucaoPhotosField
        entries={photos}
        maxPhotos={MAX_EVOLUCAO_PHOTOS}
        disabled={photosDisabled}
        onAdd={onAddPhotos}
        onRemove={onRemovePhoto}
        onRetry={onRetryPhoto}
      />
    </FieldGroup>
  )
}
