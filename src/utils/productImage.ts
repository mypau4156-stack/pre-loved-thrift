import type { GarmentImageFit } from '../data/mockData'

const MAX_IMAGE_DIMENSION = 720
const MAX_IMAGE_BYTES = 512 * 1024

export interface PreparedProductImage {
  dataUrl: string
  fit: GarmentImageFit
}

function isNearWhiteBackground(data: Uint8ClampedArray, offset: number) {
  const red = data[offset]
  const green = data[offset + 1]
  const blue = data[offset + 2]
  return red >= 220 && green >= 220 && blue >= 220 &&
    Math.max(red, green, blue) - Math.min(red, green, blue) <= 35
}

function neutralCornerBackground(imageData: ImageData) {
  const { data, width, height } = imageData
  const cornerOffsets = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + width - 1) * 4
  ]
  const corners = cornerOffsets
    .filter(offset => data[offset + 3] > 0)
    .map(offset => [data[offset], data[offset + 1], data[offset + 2]])
  if (corners.length < 3) return undefined

  const background = [0, 1, 2].map(channel =>
    Math.round(corners.reduce((sum, color) => sum + color[channel], 0) / corners.length)
  )
  const isNeutralMidtone = Math.min(...background) >= 80 &&
    Math.max(...background) <= 235 &&
    Math.max(...background) - Math.min(...background) <= 35
  const matchingCorners = corners.filter(color =>
    color.every((channel, index) => Math.abs(channel - background[index]) <= 24)
  )
  return isNeutralMidtone && matchingCorners.length >= 3 ? background : undefined
}

function removeEdgeBackground(imageData: ImageData) {
  const { data, width, height } = imageData
  const cornerBackground = neutralCornerBackground(imageData)
  const queue = new Int32Array(width * height)
  let head = 0
  let tail = 0

  const isBackground = (offset: number) => isNearWhiteBackground(data, offset) ||
    Boolean(cornerBackground && cornerBackground.every((channel, index) =>
      Math.abs(data[offset + index] - channel) <= 24
    ))

  const addBackgroundPixel = (index: number) => {
    const offset = index * 4
    if (data[offset + 3] === 0 || !isBackground(offset)) return
    data[offset + 3] = 0
    queue[tail++] = index
  }

  for (let x = 0; x < width; x += 1) {
    addBackgroundPixel(x)
    addBackgroundPixel((height - 1) * width + x)
  }
  for (let y = 1; y < height - 1; y += 1) {
    addBackgroundPixel(y * width)
    addBackgroundPixel(y * width + width - 1)
  }

  while (head < tail) {
    const index = queue[head++]
    const x = index % width
    if (x > 0) addBackgroundPixel(index - 1)
    if (x < width - 1) addBackgroundPixel(index + 1)
    if (index >= width) addBackgroundPixel(index - width)
    if (index < width * (height - 1)) addBackgroundPixel(index + width)
  }
}

function contentBounds(imageData: ImageData) {
  const { data, width, height } = imageData
  let left = width
  let top = height
  let right = -1
  let bottom = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] === 0) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  if (right < left || bottom < top) throw new Error('The image background could not be separated from the product.')
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

function waistBounds(imageData: ImageData, bounds: ReturnType<typeof contentBounds>) {
  const { data, width } = imageData
  const scanEnd = Math.min(bounds.top + bounds.height - 1, bounds.top + Math.max(2, Math.round(bounds.height * 0.08)))
  let bestLeft = bounds.left
  let bestRight = bounds.left + bounds.width - 1
  let bestY = bounds.top
  let bestWidth = 0

  for (let y = bounds.top; y <= scanEnd; y += 1) {
    let left = width
    let right = -1
    for (let x = bounds.left; x < bounds.left + bounds.width; x += 1) {
      if (data[(y * width + x) * 4 + 3] === 0) continue
      left = Math.min(left, x)
      right = Math.max(right, x)
    }
    if (right - left + 1 > bestWidth) {
      bestLeft = left
      bestRight = right
      bestY = y
      bestWidth = right - left + 1
    }
  }

  return { waistLeft: bestLeft, waistRight: bestRight + 1, waistY: bestY }
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Unable to prepare the product image.'))
    }
    reader.onerror = () => reject(new Error('Unable to prepare the product image.'))
    reader.readAsDataURL(blob)
  })
}

export async function prepareProductImage(file: Blob): Promise<PreparedProductImage> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('Unable to read this image. Please choose another file.')
  }

  try {
    let scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height))
    while (true) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('Image processing is unavailable in this browser.')

      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      removeEdgeBackground(imageData)
      const bounds = contentBounds(imageData)
      const waist = waistBounds(imageData, bounds)

      context.putImageData(imageData, 0, 0)
      const png = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!png) throw new Error('Unable to convert the product image to PNG.')
      if (png.size > MAX_IMAGE_BYTES) {
        scale *= 0.75
        if (scale < 0.1) throw new Error('The converted product image is too large to save.')
        continue
      }

      return {
        dataUrl: await readAsDataUrl(png),
        fit: {
          imageWidth: canvas.width,
          imageHeight: canvas.height,
          left: bounds.left,
          top: bounds.top,
          right: bounds.left + bounds.width,
          bottom: bounds.top + bounds.height,
          ...waist,
          contain: true,
          version: 7
        }
      }
    }
  } finally {
    bitmap.close()
  }
}

export async function prepareProductImageFromDataUrl(source: string): Promise<PreparedProductImage> {
  const response = await fetch(source)
  if (!response.ok) throw new Error('Unable to load the inventory product image.')
  return prepareProductImage(await response.blob())
}
