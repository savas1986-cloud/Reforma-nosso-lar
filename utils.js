export const uid = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID?.()) ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const hoje = () => {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export const formatarData = (iso) => {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export const normalizarLink = (link) => {
  const l = (link || '').trim()
  if (!l) return ''
  return /^https?:\/\//i.test(l) ? l : `https://${l}`
}

// Ordena fotos por data (e depois por momento de envio)
export const ordenarFotos = (fotos = []) =>
  [...fotos].sort((a, b) =>
    (a.data || '').localeCompare(b.data || '') || (a.criada_em || '').localeCompare(b.criada_em || ''))

export const fotoMaisRecente = (fotos = []) => {
  const o = ordenarFotos(fotos)
  return o[o.length - 1]
}
