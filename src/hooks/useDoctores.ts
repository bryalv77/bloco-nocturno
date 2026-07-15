import * as React from "react"

import {
  subscribeDoctores,
  type DoctorEntry,
} from "@/lib/doctoresRepository"

export function useDoctores(): DoctorEntry[] {
  const [doctors, setDoctors] = React.useState<DoctorEntry[]>([])

  React.useEffect(() => {
    return subscribeDoctores(setDoctors)
  }, [])

  return doctors
}
