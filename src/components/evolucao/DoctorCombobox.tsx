import * as React from "react"
import { PlusIcon, StethoscopeIcon } from "lucide-react"
import { toast } from "sonner"

import { addDoctor, type DoctorEntry } from "@/lib/doctoresRepository"

import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { cn } from "@/lib/utils"

const ADD_PREFIX = "__add__:"

interface DoctorComboboxProps {
  id?: string
  value: string
  onChange: (value: string) => void
  doctors: DoctorEntry[]
  placeholder?: string
  className?: string
  "aria-invalid"?: boolean
}

function stripAddPrefix(item: string): string {
  return item.startsWith(ADD_PREFIX) ? item.slice(ADD_PREFIX.length) : item
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

export function DoctorCombobox({
  id,
  value,
  onChange,
  doctors,
  placeholder,
  className,
  "aria-invalid": ariaInvalid,
}: DoctorComboboxProps) {
  const trimmedValue = value.trim()
  const hasExactMatch = doctors.some(
    (doctor) => normalizeName(doctor.name) === normalizeName(trimmedValue)
  )
  const canAdd = trimmedValue.length > 0 && !hasExactMatch

  const items = React.useMemo(() => {
    const names = doctors.map((doctor) => doctor.name)
    return canAdd ? [`${ADD_PREFIX}${trimmedValue}`, ...names] : names
  }, [doctors, canAdd, trimmedValue])

  const itemToString = React.useCallback((item: string) => stripAddPrefix(item), [])

  const [isAdding, setIsAdding] = React.useState(false)

  function handleValueChange(next: string | null) {
    if (next === null || next === "") {
      onChange("")
      return
    }
    if (next.startsWith(ADD_PREFIX)) {
      if (isAdding) return
      const newName = stripAddPrefix(next).trim()
      if (!newName) return
      setIsAdding(true)
      addDoctor(newName)
        .then((entry) => {
          onChange(entry.name)
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error
              ? error.message
              : "Não foi possível adicionar o médico."
          toast.error(message)
        })
        .finally(() => {
          setIsAdding(false)
        })
      return
    }
    onChange(next)
  }

  return (
    <Combobox
      items={items}
      value={value}
      onValueChange={handleValueChange}
      inputValue={value}
      onInputValueChange={(next) => onChange(next)}
      itemToStringLabel={itemToString}
      itemToStringValue={itemToString}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder}
        aria-invalid={ariaInvalid}
        className={cn("w-full", className)}
      />
      <ComboboxContent>
        <ComboboxList>
          {(item: string) => {
            if (item.startsWith(ADD_PREFIX)) {
              const newName = stripAddPrefix(item)
              return (
                <ComboboxItem value={item}>
                  <PlusIcon className="size-4 text-muted-foreground" />
                  <span>
                    Adicionar <strong>"{newName}"</strong> como novo médico
                  </span>
                </ComboboxItem>
              )
            }
            return (
              <ComboboxItem value={item}>
                <StethoscopeIcon className="size-4 text-muted-foreground" />
                <span>{item}</span>
              </ComboboxItem>
            )
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
