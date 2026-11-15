import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, TABLE } from './supabase'

const SEED = [
  { nome: 'Cozinha', status: 'Planejando', notas: '', fotos_antes: [], fotos_hoje: [], ideias: [], itens: [], fotos_inspiracao: [] },
  { nome: 'Sala de Estar', status: 'Planejando', notas: '', fotos_antes: [], fotos_hoje: [], ideias: [], itens: [], fotos_inspiracao: [] },
  { nome: 'Quarto Principal', status: 'Planejando', notas: '', fotos_antes: [], fotos_hoje: [], ideias: [], itens: [], fotos_inspiracao: [] },
]

const arr = (v) => (Array.isArray(v) ? v : [])
const norm = (r) => ({
  ...r,
  nome: r.nome ?? '',
  status: r.status || 'Planejando',
  notas: r.notas ?? '',
  fotos_antes: arr(r.fotos_antes),
  fotos_hoje: arr(r.fotos_hoje),
  ideias: arr(r.ideias),
  itens: arr(r.itens),
  fotos_inspiracao: arr(r.fotos_inspiracao),
})
const byCreated = (a, b) => String(a.created_at || '').localeCompare(String(b.created_at || ''))

export function useComodos() {
  const [comodos, setComodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(0)
  const [error, setError] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [realtime, setRealtime] = useState('connecting')
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const seeding = useRef(false)

  const upsertLocal = useCallback((row) => {
    setComodos((prev) => {
      const n = norm(row)
      const exists = prev.some((c) => c.id === n.id)
      const next = exists ? prev.map((c) => (c.id === n.id ? n : c)) : [...prev, n]
      return next.sort(byCreated)
    })
  }, [])

  const load = useCallback(async () => {
    const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: true })
    if (error) {
      setLoadError(error.message)
      setLoading(false)
      return
    }
    setLoadError(null)
    if (data.length === 0 && !seeding.current) {
      seeding.current = true
      const { data: ins, error: e2 } = await supabase.from(TABLE).insert(SEED).select()
      if (e2) setLoadError(e2.message)
      else setComodos(ins.map(norm).sort(byCreated))
    } else {
      setComodos(data.map(norm))
    }
    setLoading(false)
  }, [])

  // Busca a linha completa (o payload do Realtime pode vir sem colunas grandes, como fotos em Base64)
  const refetchOne = useCallback(async (id) => {
    const { data } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle()
    if (data) upsertLocal(data)
  }, [upsertLocal])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('reforma-comodos-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = payload.old?.id
          if (id != null) setComodos((prev) => prev.filter((c) => c.id !== id))
        } else if (payload.new?.id != null) {
          refetchOne(payload.new.id)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtime('ok')
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtime('error')
        else if (status === 'CLOSED') setRealtime('connecting')
      })

    // Celular dormiu / voltou pra tela: recarrega tudo para garantir que nada se perdeu
    const onVisible = () => document.visibilityState === 'visible' && load()
    const onOnline = () => { setOnline(true); load() }
    const onOffline = () => setOnline(false)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [load, refetchOne])

  const track = useCallback(async (fn) => {
    setPending((n) => n + 1)
    try {
      const r = await fn()
      setError(null)
      return r
    } catch (e) {
      console.error(e)
      setError(e.message || 'Erro ao salvar')
      load() // ressincroniza com o banco
      throw e
    } finally {
      setPending((n) => n - 1)
    }
  }, [load])

  /** Atualiza campos simples (nome, status, notas) */
  const updateFields = useCallback((id, fields) => {
    setComodos((prev) => prev.map((c) => (c.id === id ? { ...c, ...fields } : c)))
    return track(async () => {
      const { error } = await supabase.from(TABLE).update(fields).eq('id', id)
      if (error) throw error
    })
  }, [track])

  /**
   * Altera um array JSON (fotos_antes, fotos_hoje, fotos_inspiracao, ideias, itens) de forma segura:
   * aplica na tela na hora, depois lê a versão mais recente do banco e aplica a mesma
   * alteração por cima — assim, se vocês dois mexerem ao mesmo tempo, nada se perde.
   */
  const mutateArray = useCallback((id, column, fn) => {
    setComodos((prev) => prev.map((c) => (c.id === id ? { ...c, [column]: fn(arr(c[column])) } : c)))
    return track(async () => {
      const { data, error } = await supabase.from(TABLE).select(column).eq('id', id).single()
      if (error) throw error
      const next = fn(arr(data[column]))
      const { error: e2 } = await supabase.from(TABLE).update({ [column]: next }).eq('id', id)
      if (e2) throw e2
    })
  }, [track])

  const addComodo = useCallback((nome, status = 'Planejando') =>
    track(async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .insert({ nome, status, notas: '', fotos_antes: [], fotos_hoje: [], ideias: [], itens: [], fotos_inspiracao: [] })
        .select()
        .single()
      if (error) throw error
      upsertLocal(data)
      return data
    }), [track, upsertLocal])

  const deleteComodo = useCallback((id) => {
    setComodos((prev) => prev.filter((c) => c.id !== id))
    return track(async () => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id)
      if (error) throw error
    })
  }, [track])

  let syncState = 'synced'
  if (!online) syncState = 'offline'
  else if (pending > 0) syncState = 'saving'
  else if (error) syncState = 'error'
  else if (realtime !== 'ok') syncState = 'connecting'

  return { comodos, loading, loadError, syncState, error, reload: load, updateFields, mutateArray, addComodo, deleteComodo }
}
