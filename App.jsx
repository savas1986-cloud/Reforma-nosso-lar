import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useComodos } from './lib/useComodos'
import Home from './components/Home'
import RoomDetail from './components/RoomDetail'

export default function App() {
  const { comodos, loading, loadError, syncState, reload, updateFields, mutateArray, addComodo, deleteComodo } = useComodos()
  const [selectedId, setSelectedId] = useState(null)

  // Integra com o botão "voltar" do celular
  useEffect(() => {
    if (window.history.state?.comodoId != null) window.history.replaceState(null, '')
    const onPop = (e) => setSelectedId(e.state?.comodoId ?? null)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const abrir = useCallback((id) => {
    window.history.pushState({ comodoId: id }, '')
    setSelectedId(id)
    window.scrollTo(0, 0)
  }, [])

  const voltar = useCallback(() => {
    if (window.history.state?.comodoId != null) window.history.back()
    else setSelectedId(null)
  }, [])

  const selecionado = comodos.find((c) => c.id === selectedId)

  // Se o outro celular excluiu o cômodo aberto, volta pra tela inicial
  useEffect(() => {
    if (selectedId != null && !loading && !selecionado) voltar()
  }, [selectedId, selecionado, loading, voltar])

  if (loadError && comodos.length === 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-terracota-50 text-terracota-700">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-extrabold">Não consegui falar com o Supabase</h1>
        <p className="text-stone-600">Confira se a tabela <code className="rounded bg-stone-100 px-1">reforma_comodos</code> existe e se as políticas de acesso (RLS) permitem leitura e escrita.</p>
        <p className="rounded-xl bg-stone-100 px-3 py-2 font-mono text-xs text-stone-500">{loadError}</p>
        <button onClick={reload} className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-oliva-600 px-5 font-bold text-white">
          <RefreshCw className="h-5 w-5" /> Tentar de novo
        </button>
      </div>
    )
  }

  return selecionado ? (
    <RoomDetail
      key={selecionado.id}
      comodo={selecionado}
      syncState={syncState}
      onRetry={reload}
      onBack={voltar}
      updateFields={updateFields}
      mutateArray={mutateArray}
      deleteComodo={deleteComodo}
    />
  ) : (
    <Home
      comodos={comodos}
      loading={loading}
      syncState={syncState}
      onRetry={reload}
      onOpen={abrir}
      onAdd={async (nome, status) => {
        try {
          const novo = await addComodo(nome, status)
          if (novo?.id != null) abrir(novo.id)
        } catch {}
      }}
    />
  )
}
