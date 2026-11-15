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

// ---------- Dinheiro ----------
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const formatarBRL = (n) => BRL.format(Number(n) || 0)

/** Converte "1.234,56", "1234.56", "R$ 300" etc. em número (ou null se vazio/inválido) */
export const parseValor = (v) => {
  if (v === '' || v == null) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  let s = String(v).replace(/R\$|\s/g, '')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  const n = parseFloat(s)
  return Number.isFinite(n) && n >= 0 ? n : null
}
export const valorParaInput = (n) => (n == null || n === '' ? '' : String(n).replace('.', ','))

export const somarOrcamento = (itens = []) =>
  itens.reduce(
    (acc, i) => ({
      estimado: acc.estimado + (Number(i.valor_estimado) || 0),
      gasto: acc.gasto + (Number(i.valor_gasto) || 0),
    }),
    { estimado: 0, gasto: 0 }
  )

// ---------- Links de lojas ----------
const LOJAS = [
  [/pinterest\.|pin\.it/, 'Pinterest'],
  [/leroymerlin/, 'Leroy Merlin'],
  [/tokstok/, 'Tok&Stok'],
  [/mercadolivre|mercadolibre|meli\.la/, 'Mercado Livre'],
  [/amazon\.|amzn\./, 'Amazon'],
  [/magazineluiza|magalu/, 'Magalu'],
  [/shopee/, 'Shopee'],
  [/mobly/, 'Mobly'],
  [/madeiramadeira/, 'MadeiraMadeira'],
  [/casasbahia/, 'Casas Bahia'],
  [/etna\./, 'Etna'],
  [/camicado/, 'Camicado'],
  [/westwing/, 'Westwing'],
  [/telhanorte/, 'Telhanorte'],
  [/cec\.com|c-e-c|cecnet/, 'C&C'],
  [/instagram\./, 'Instagram'],
  [/youtube\.|youtu\.be/, 'YouTube'],
  [/tiktok\./, 'TikTok'],
  [/aliexpress/, 'AliExpress'],
  [/shein/, 'Shein'],
]
export const identificarLoja = (url) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    const loja = LOJAS.find(([re]) => re.test(host))
    return { nome: loja ? loja[1] : host, host }
  } catch {
    return { nome: 'Link', host: '' }
  }
}
