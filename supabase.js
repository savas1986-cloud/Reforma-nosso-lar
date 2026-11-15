import { createClient } from '@supabase/supabase-js'

const FALLBACK_URL = 'https://dtqinybxluzsliozkjcn.supabase.co'
const FALLBACK_KEY = 'sb_publishable_OlR3b3RRFIe7x7fgAgINdw_zKdcZIBi'

// Limpa espaços, aspas e o sufixo /rest/v1/ que às vezes vêm junto nas variáveis da Vercel
const limpar = (v) => (typeof v === 'string' ? v.trim().replace(/^['"]|['"]$/g, '').trim() : '')

let url = limpar(import.meta.env.VITE_SUPABASE_URL).replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
let key = limpar(import.meta.env.VITE_SUPABASE_ANON_KEY)

try {
  if (!/^https:\/\/.+/.test(url)) throw new Error()
  new URL(url)
} catch {
  url = FALLBACK_URL
}
if (!key || key.length < 20) key = FALLBACK_KEY

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 10 } },
})

export const TABLE = 'reforma_comodos'
