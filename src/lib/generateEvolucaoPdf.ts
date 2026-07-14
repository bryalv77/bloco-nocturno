import { jsPDF } from "jspdf"

import type { EvolucaoFormData } from "@/types/evolucao"

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN_X = 20
const MARGIN_TOP = 22
const MARGIN_BOTTOM = 22
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2
const LINE_HEIGHT = 5.6

function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return ""
  const [year, month, day] = isoDate.split("-")
  if (!year || !month || !day) return isoDate
  return `${day}/${month}/${year}`
}

function nonEmptyLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

class PdfCursor {
  doc: jsPDF
  y: number

  constructor(doc: jsPDF) {
    this.doc = doc
    this.y = MARGIN_TOP
  }

  ensureSpace(height: number) {
    if (this.y + height > PAGE_HEIGHT - MARGIN_BOTTOM) {
      this.doc.addPage()
      this.y = MARGIN_TOP
    }
  }

  addSpacing(height: number) {
    this.y += height
  }

  addHeading(text: string) {
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(11)
    this.ensureSpace(LINE_HEIGHT)
    this.doc.text(text, MARGIN_X, this.y)
    this.y += LINE_HEIGHT
  }

  addParagraph(text: string) {
    this.doc.setFont("helvetica", "normal")
    this.doc.setFontSize(11)
    const lines: string[] = this.doc.splitTextToSize(text, CONTENT_WIDTH)
    for (const line of lines) {
      this.ensureSpace(LINE_HEIGHT)
      this.doc.text(line, MARGIN_X, this.y)
      this.y += LINE_HEIGHT
    }
  }

  addBulletList(items: string[]) {
    this.doc.setFont("helvetica", "normal")
    this.doc.setFontSize(11)
    const bulletIndent = 6
    const wrapWidth = CONTENT_WIDTH - bulletIndent
    for (const item of items) {
      const lines: string[] = this.doc.splitTextToSize(item, wrapWidth)
      lines.forEach((line, index) => {
        this.ensureSpace(LINE_HEIGHT)
        if (index === 0) {
          this.doc.text("•", MARGIN_X, this.y)
        }
        this.doc.text(line, MARGIN_X + bulletIndent, this.y)
        this.y += LINE_HEIGHT
      })
    }
  }

  addKeyValueLine(label: string, value: string) {
    if (!value) return
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(11)
    this.ensureSpace(LINE_HEIGHT)
    this.doc.text(label, MARGIN_X, this.y)
    const labelWidth = this.doc.getTextWidth(label)
    this.doc.setFont("helvetica", "normal")
    this.doc.text(value, MARGIN_X + labelWidth + 2, this.y)
    this.y += LINE_HEIGHT
  }
}

export function buildEvolucaoPdf(data: EvolucaoFormData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const cursor = new PdfCursor(doc)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(15)
  doc.text("Evolução – Plantão Noturno", PAGE_WIDTH / 2, cursor.y, {
    align: "center",
  })
  cursor.addSpacing(10)

  cursor.addKeyValueLine("Data:", formatDisplayDate(data.data))
  cursor.addKeyValueLine("Paciente:", data.paciente)
  cursor.addKeyValueLine("Médico responsável:", data.medicoResponsavel)
  cursor.addKeyValueLine("Plantonista:", data.plantonista)
  cursor.addKeyValueLine("Cirurgia:", data.cirurgia)
  cursor.addSpacing(4)

  if (data.evolucao) {
    cursor.addHeading("Evolução:")
    cursor.addParagraph(data.evolucao)
    cursor.addSpacing(4)
  }

  const condutaItems = nonEmptyLines(data.conduta)
  if (condutaItems.length > 0) {
    cursor.addHeading("Conduta:")
    cursor.addBulletList(condutaItems)
    cursor.addSpacing(4)
  }

  if (data.observacoes) {
    cursor.addHeading("Observações:")
    cursor.addParagraph(data.observacoes)
  }

  return doc
}

function evolucaoFileName(data: EvolucaoFormData): string {
  const slug = (data.paciente || "paciente")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  const datePart = data.data || "sem-data"
  return `evolucao-plantao-noturno-${slug}-${datePart}.pdf`
}

export function downloadEvolucaoPdf(data: EvolucaoFormData): void {
  const doc = buildEvolucaoPdf(data)
  doc.save(evolucaoFileName(data))
}

export function printEvolucaoPdf(data: EvolucaoFormData): void {
  const doc = buildEvolucaoPdf(data)
  doc.autoPrint()
  const blobUrl = doc.output("bloburl")
  window.open(blobUrl.href, "_blank")
}
