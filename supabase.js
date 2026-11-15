import { createClient } from '@supabase/supabase-js'

// A URL do cliente é a raiz do projeto (sem /rest/v1/ — a biblioteca adiciona sozinha).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://dtqinybxluzsliozkjcn.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_OlR3b3RRFIe7x7fgAgINdw_zKdcZIBi'

export const supabase = createClient(SUPABASE_URL.replace(/\/rest\/v1\/?$/, ''), SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 10 } },
})

export const TABLE = 'reforma_comodos'
