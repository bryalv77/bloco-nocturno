import { jsPDF } from "jspdf"

import type { EvolucaoFormData } from "@/types/evolucao"

import interRegularUrl from "/fonts/inter-static/Inter-Regular.ttf?url"
import interMediumUrl from "/fonts/inter-static/Inter-Medium.ttf?url"
import interSemiboldUrl from "/fonts/inter-static/Inter-SemiBold.ttf?url"
import interBoldUrl from "/fonts/inter-static/Inter-Bold.ttf?url"

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN_X = 20
const HEADER_BOTTOM = 30
const FOOTER_TOP = PAGE_HEIGHT - 20
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2
const BODY_LINE_HEIGHT = 5
const SECTION_GAP = 7
const PARAGRAPH_GAP = 2.5

interface PhotoSlot {
  dataUrl: string
  width: number
  height: number
}

function fitInside(
  srcW: number,
  srcH: number,
  boxW: number,
  boxH: number,
  padding: number
): { drawX: number; drawY: number; drawW: number; drawH: number } {
  const maxW = boxW - padding * 2
  const maxH = boxH - padding * 2
  if (srcW <= 0 || srcH <= 0) {
    return { drawX: padding, drawY: padding, drawW: maxW, drawH: maxH }
  }
  const ratio = srcW / srcH
  let drawW = maxW
  let drawH = drawW / ratio
  if (drawH > maxH) {
    drawH = maxH
    drawW = drawH * ratio
  }
  const drawX = (boxW - drawW) / 2
  const drawY = (boxH - drawH) / 2
  return { drawX, drawY, drawW, drawH }
}

async function loadPhotoSlot(url: string): Promise<PhotoSlot | null> {
  try {
    const res = await fetch(url, { mode: "cors" })
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error("Falha ao ler a imagem."))
      reader.readAsDataURL(blob)
    })
    const dims = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const img = new Image()
        img.onload = () =>
          resolve({ width: img.naturalWidth, height: img.naturalHeight })
        img.onerror = () => reject(new Error("Falha ao decodificar a imagem."))
        img.src = dataUrl
      }
    )
    return { dataUrl, ...dims }
  } catch {
    return null
  }
}

const FONT_NAME = "Inter"

const FONT_WEIGHTS = [
  { style: "normal", file: "Inter-Regular.ttf", url: interRegularUrl },
  { style: "medium", file: "Inter-Medium.ttf", url: interMediumUrl },
  { style: "semibold", file: "Inter-SemiBold.ttf", url: interSemiboldUrl },
  { style: "bold", file: "Inter-Bold.ttf", url: interBoldUrl },
] as const

const INK: readonly [number, number, number] = [25, 25, 25]
const BODY: readonly [number, number, number] = [55, 55, 55]
const MUTED: readonly [number, number, number] = [110, 110, 110]
const RULE: readonly [number, number, number] = [60, 60, 60]
const RULE_MID: readonly [number, number, number] = [180, 180, 180]
const RULE_SOFT: readonly [number, number, number] = [222, 222, 222]
const TINT: readonly [number, number, number] = [247, 247, 247]

type FontStyle = "normal" | "medium" | "semibold" | "bold"

let fontCache: Map<FontStyle, string> | null = null

async function arrayBufferToBase64(buf: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buf)
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(
      ...Array.from(bytes.subarray(i, i + chunk))
    )
  }
  return btoa(binary)
}

async function loadInterFonts(): Promise<Map<FontStyle, string>> {
  if (fontCache) return fontCache
  const results = await Promise.all(
    FONT_WEIGHTS.map(async ({ style, file, url }) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`)
      const buf = await res.arrayBuffer()
      const base64 = await arrayBufferToBase64(buf)
      return [style, base64] as const
    })
  )
  fontCache = new Map(results)
  return fontCache
}

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

type Color = readonly [number, number, number]

class PdfCursor {
  doc: jsPDF
  y: number
  pageNumber: number

  constructor(doc: jsPDF) {
    this.doc = doc
    this.y = HEADER_BOTTOM
    this.pageNumber = 1
  }

  text(c: Color) {
    this.doc.setTextColor(c[0], c[1], c[2])
  }
  draw(c: Color) {
    this.doc.setDrawColor(c[0], c[1], c[2])
  }
  fill(c: Color) {
    this.doc.setFillColor(c[0], c[1], c[2])
  }

  setFont(weight: "normal" | "medium" | "semibold" | "bold", size: number) {
    this.doc.setFont(FONT_NAME, weight)
    this.doc.setFontSize(size)
  }

  ensureSpace(height: number) {
    if (this.y + height > FOOTER_TOP) {
      this.addNewPage()
    }
  }

  addNewPage() {
    this.doc.addPage()
    this.pageNumber += 1
    this.y = HEADER_BOTTOM
    this.drawPageFrame()
    this.drawFooter()
  }

  drawPageFrame() {
    this.draw(RULE)
    this.doc.setLineWidth(0.5)
    this.doc.line(MARGIN_X, 13, PAGE_WIDTH - MARGIN_X, 13)

    this.setFont("bold", 7.5)
    this.text(MUTED)
    this.doc.text("", MARGIN_X, 18.5)
    this.doc.text("PLANTÃO  NOTURNO", PAGE_WIDTH - MARGIN_X, 18.5, {
      align: "right",
    })

    this.draw(RULE_SOFT)
    this.doc.setLineWidth(0.2)
    this.doc.line(MARGIN_X, 21.5, PAGE_WIDTH - MARGIN_X, 21.5)
  }

  drawFooter() {
    this.draw(RULE_SOFT)
    this.doc.setLineWidth(0.2)
    this.doc.line(MARGIN_X, FOOTER_TOP, PAGE_WIDTH - MARGIN_X, FOOTER_TOP)

    this.setFont("normal", 7.5)
    this.text(MUTED)
    this.doc.text(
      "Documento interno · Evolução de plantão",
      MARGIN_X,
      FOOTER_TOP + 4.5
    )
    this.doc.text(
      `Página ${this.pageNumber}`,
      PAGE_WIDTH / 2,
      FOOTER_TOP + 4.5,
      { align: "center" }
    )
    this.doc.text("Confidencial", PAGE_WIDTH - MARGIN_X, FOOTER_TOP + 4.5, {
      align: "right",
    })
  }

  drawTitle(text: string, subtitle?: string) {
    this.ensureSpace(20)
    this.setFont("bold", 18)
    this.text(INK)
    this.doc.text(text, PAGE_WIDTH / 2, this.y, { align: "center" })
    this.y += 6

    if (subtitle) {
      this.setFont("normal", 8.5)
      this.text(MUTED)
      const sub = subtitle.toUpperCase()
      this.doc.text(sub, PAGE_WIDTH / 2, this.y, { align: "center" })
      this.y += 6
    } else {
      this.y += 2
    }
  }

  drawMetadataBox(rows: Array<{ label: string; value: string }>) {
    if (rows.length === 0) return

    const labelColWidth = 42
    const valueColX = MARGIN_X + labelColWidth + 4
    const rowHeight = 7.4
    const padY = 5
    const boxHeight = rows.length * rowHeight + padY * 2

    this.ensureSpace(boxHeight + 4)

    const boxX = MARGIN_X
    const boxY = this.y
    this.fill(TINT)
    this.doc.rect(boxX, boxY, CONTENT_WIDTH, boxHeight, "F")
    this.draw(RULE_SOFT)
    this.doc.setLineWidth(0.25)
    this.doc.rect(boxX, boxY, CONTENT_WIDTH, boxHeight)

    this.draw(RULE_SOFT)
    this.doc.setLineWidth(0.2)
    this.doc.line(
      boxX + labelColWidth + 2,
      boxY + padY - 1.5,
      boxX + labelColWidth + 2,
      boxY + boxHeight - padY + 1.5
    )

    rows.forEach((row, i) => {
      const rowMidY = boxY + padY + i * rowHeight + rowHeight / 2 + 2.2

      this.setFont("bold", 7.5)
      this.text(MUTED)
      this.doc.text(row.label.toUpperCase(), boxX + 4, rowMidY)

      this.setFont("normal", 10.5)
      this.text(INK)
      const display = row.value || "—"
      const truncated = this.doc.splitTextToSize(display, CONTENT_WIDTH - labelColWidth - 10)
      this.doc.text(String(truncated[0] ?? ""), valueColX, rowMidY)

      if (i < rows.length - 1) {
        this.draw(RULE_SOFT)
        this.doc.setLineWidth(0.15)
        this.doc.line(
          boxX + 2,
          boxY + padY + (i + 1) * rowHeight,
          boxX + CONTENT_WIDTH - 2,
          boxY + padY + (i + 1) * rowHeight
        )
      }
    })

    this.y += boxHeight + SECTION_GAP
  }

  drawSectionHeading(text: string) {
    this.ensureSpace(12)
    this.setFont("bold", 9.5)
    this.text(INK)
    this.doc.text(text.toUpperCase(), MARGIN_X, this.y)
    this.y += 5
  }

  drawParagraph(text: string) {
    this.setFont("normal", 10.5)
    this.text(BODY)
    const lines = this.doc.splitTextToSize(text, CONTENT_WIDTH)
    for (const line of lines) {
      this.ensureSpace(BODY_LINE_HEIGHT)
      this.doc.text(line, MARGIN_X, this.y)
      this.y += BODY_LINE_HEIGHT
    }
    this.y += PARAGRAPH_GAP
  }

  drawBulletList(items: string[]) {
    this.setFont("normal", 10.5)
    this.text(BODY)
    const bulletIndent = 6
    const wrapWidth = CONTENT_WIDTH - bulletIndent
    for (const item of items) {
      const lines: string[] = this.doc.splitTextToSize(item, wrapWidth)
      lines.forEach((line: string, idx: number) => {
        this.ensureSpace(BODY_LINE_HEIGHT)
        if (idx === 0) {
          this.text(MUTED)
          this.doc.text("—", MARGIN_X + 1.5, this.y)
        }
        this.text(BODY)
        this.doc.text(line, MARGIN_X + bulletIndent, this.y)
        this.y += BODY_LINE_HEIGHT
      })
    }
    this.y += PARAGRAPH_GAP
  }

  drawSignatureBlock() {
    this.ensureSpace(28)
    this.y += 8

    this.draw(RULE_MID)
    this.doc.setLineWidth(0.3)
    const lineWidth = 70
    const lineX = PAGE_WIDTH - MARGIN_X - lineWidth
    this.doc.line(lineX, this.y, lineX + lineWidth, this.y)
    this.y += 4.5

    this.setFont("regular", 8.5)
    this.text(MUTED)
    this.doc.text(
      "Assinatura do plantonista",
      lineX + lineWidth / 2,
      this.y,
      { align: "center" }
    )
  }

  drawPhotoGrid(photos: PhotoSlot[]) {
    if (photos.length === 0) return

    const cols = 2
    const rows = Math.ceil(photos.length / cols)
    const gap = 3
    const availableWidth = CONTENT_WIDTH - gap * (cols - 1)
    const cellW = availableWidth / cols
    const cellH = 32

    const totalHeight = rows * cellH + (rows - 1) * gap
    this.ensureSpace(totalHeight + 12)
    this.drawSectionHeading("Fotos")

    this.draw(RULE_SOFT)
    this.doc.setLineWidth(0.25)

    photos.slice(0, 4).forEach((photo, index) => {
      const r = Math.floor(index / cols)
      const c = index % cols
      const x = MARGIN_X + c * (cellW + gap)
      const y = this.y + r * (cellH + gap)

      this.doc.rect(x, y, cellW, cellH)

      const { drawX, drawY, drawW, drawH } = fitInside(
        photo.width,
        photo.height,
        cellW,
        cellH,
        1.5
      )
      this.doc.addImage(
        photo.dataUrl,
        "JPEG",
        x + drawX,
        y + drawY,
        drawW,
        drawH
      )
    })

    this.y += totalHeight
  }
}

export async function buildEvolucaoPdf(
  data: EvolucaoFormData
): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "mm", format: "a4" })

  const fonts = await loadInterFonts()
  for (const { style, file } of FONT_WEIGHTS) {
    const base64 = fonts.get(style)
    if (!base64) continue
    doc.addFileToVFS(file, base64)
    doc.addFont(file, FONT_NAME, style)
  }

  const cursor = new PdfCursor(doc)
  cursor.drawPageFrame()
  cursor.drawFooter()

  cursor.drawTitle(
    "Evolução – Plantão Noturno"
  )

  const metaRows: Array<{ label: string; value: string }> = []
  if (data.data) metaRows.push({ label: "Data", value: formatDisplayDate(data.data) })
  if (data.paciente) metaRows.push({ label: "Paciente", value: data.paciente })
  if (data.medicoResponsavel)
    metaRows.push({ label: "Médico responsável", value: data.medicoResponsavel })
  if (data.plantonista) metaRows.push({ label: "Plantonista", value: data.plantonista })
  if (data.cirurgia) metaRows.push({ label: "Cirurgia", value: data.cirurgia })
  cursor.drawMetadataBox(metaRows)

  if (data.evolucao) {
    cursor.drawSectionHeading("Evolução")
    cursor.drawParagraph(data.evolucao)
  }

  const condutaItems = nonEmptyLines(data.conduta)
  if (condutaItems.length > 0) {
    cursor.drawSectionHeading("Conduta")
    cursor.drawBulletList(condutaItems)
  }

  if (data.observacoes) {
    cursor.drawSectionHeading("Observações")
    cursor.drawParagraph(data.observacoes)
  }

  const fotosUrls = (data.fotos ?? []).slice(0, 4)
  if (fotosUrls.length > 0) {
    const slots = (
      await Promise.all(fotosUrls.map(loadPhotoSlot))
    ).filter((slot): slot is PhotoSlot => slot !== null)
    if (slots.length > 0) {
      cursor.drawPhotoGrid(slots)
    }
  }

  if (data.plantonista) {
    cursor.drawSignatureBlock()
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

export async function downloadEvolucaoPdf(data: EvolucaoFormData): Promise<void> {
  const doc = await buildEvolucaoPdf(data)
  doc.save(evolucaoFileName(data))
}

export async function printEvolucaoPdf(data: EvolucaoFormData): Promise<void> {
  const doc = await buildEvolucaoPdf(data)
  doc.autoPrint()
  const blobUrl = doc.output("bloburl")
  window.open(blobUrl.href, "_blank")
}
