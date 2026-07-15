const MAX_DIMENSION = 800
const JPEG_QUALITY = 0.6
const MIN_QUALITY = 0.4
const MAX_BYTES = 250 * 1024

export interface CompressedImage {
  blob: Blob
  width: number
  height: number
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Falha ao carregar a imagem."))
    }
    img.src = url
  })
}

function drawToCanvas(
  img: HTMLImageElement,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas não suportado neste navegador.")
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
  ctx.drawImage(img, 0, 0, width, height)
  return canvas
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Falha ao comprimir a imagem."))
          return
        }
        resolve(blob)
      },
      "image/jpeg",
      quality
    )
  })
}

function scaledDimensions(
  width: number,
  height: number,
  max: number
): { width: number; height: number } {
  if (width <= max && height <= max) return { width, height }
  const ratio = width >= height ? max / width : max / height
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

export async function compressImage(file: File): Promise<CompressedImage> {
  const img = await loadImage(file)
  const { width, height } = scaledDimensions(
    img.naturalWidth,
    img.naturalHeight,
    MAX_DIMENSION
  )
  const canvas = drawToCanvas(img, width, height)

  let quality = JPEG_QUALITY
  let blob = await canvasToBlob(canvas, quality)
  while (blob.size > MAX_BYTES && quality > MIN_QUALITY) {
    quality -= 0.1
    blob = await canvasToBlob(canvas, Math.max(quality, MIN_QUALITY))
  }

  if (blob.size > MAX_BYTES) {
    const smaller = scaledDimensions(width, height, Math.round(MAX_DIMENSION * 0.7))
    const smallerCanvas = drawToCanvas(img, smaller.width, smaller.height)
    blob = await canvasToBlob(smallerCanvas, MIN_QUALITY)
    return { blob, width: smaller.width, height: smaller.height }
  }

  return { blob, width, height }
}
