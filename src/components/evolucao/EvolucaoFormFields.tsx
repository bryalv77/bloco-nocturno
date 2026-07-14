import type { EvolucaoFormData } from "@/types/evolucao"

import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface EvolucaoFormFieldsProps {
  form: EvolucaoFormData
  errors: Partial<Record<keyof EvolucaoFormData, string>>
  onChange: <K extends keyof EvolucaoFormData>(
    field: K,
    value: EvolucaoFormData[K]
  ) => void
}

export function EvolucaoFormFields({
  form,
  errors,
  onChange,
}: EvolucaoFormFieldsProps) {
  return (
    <FieldGroup>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={!!errors.data}>
          <FieldLabel htmlFor="data">Data</FieldLabel>
          <FieldContent>
            <Input
              id="data"
              type="date"
              value={form.data}
              onChange={(event) => onChange("data", event.target.value)}
            />
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
            <Input
              id="medicoResponsavel"
              value={form.medicoResponsavel}
              onChange={(event) =>
                onChange("medicoResponsavel", event.target.value)
              }
              placeholder="Dr(a). Nome"
            />
            <FieldError>{errors.medicoResponsavel}</FieldError>
          </FieldContent>
        </Field>

        <Field data-invalid={!!errors.plantonista}>
          <FieldLabel htmlFor="plantonista">Plantonista</FieldLabel>
          <FieldContent>
            <Input
              id="plantonista"
              value={form.plantonista}
              onChange={(event) =>
                onChange("plantonista", event.target.value)
              }
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
    </FieldGroup>
  )
}
