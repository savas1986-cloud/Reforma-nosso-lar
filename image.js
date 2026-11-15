/**
 * Redimensiona uma foto para no máximo `maxWidth` px de largura e comprime em JPEG
 * usando HTML5 Canvas. Retorna uma string Base64 (data URL) pronta para salvar no JSON.
 */
export async function compressImage(file, maxWidth = 800, quality = 0.7) {
  if (!file || !file.type?.startsWith('image/')) throw new Error('Arquivo não é uma imagem.')
  const url = URL.createObjectURL(file)
  try {
    return await comprimirDeUrl(url, maxWidth, quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Mesma compressão, a partir de uma data URL (ex.: imagem gerada pela IA) */
export function compressDataUrl(dataUrl, maxWidth = 800, quality = 0.7) {
  return comprimirDeUrl(dataUrl, maxWidth, quality)
}

async function comprimirDeUrl(url, maxWidth, quality) {
  const img = await new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Não foi possível ler esta imagem.'))
    el.src = url
  })

  let width = img.naturalWidth
  let height = img.naturalHeight
  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width)
    width = maxWidth
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff' // fundo branco para PNGs com transparência
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, width, height)

  return canvas.toDataURL('image/jpeg', quality)
}
