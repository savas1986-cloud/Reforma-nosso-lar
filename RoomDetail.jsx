import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Trash2, NotebookPen } from 'lucide-react'
import { SyncBadge, ConfirmDialog, STATUS, STATUS_STYLE, STATUS_DOT, inputCls, iconeDoComodo } from './ui'
import PhotosSection from './PhotosSection'
import IdeasSection from './IdeasSection'

/** Campo com salvamento automático: digita à vontade, salva ~0,7s depois de parar (ou ao sair do campo). */
function useAutosave(serverValue, save, delay = 700) {
  const [draft, setDraft] = useState(serverValue ?? '')
  const focused = useRef(false)
  const timer = useRef(null)
  const draftRef = useRef(draft)
  const lastSaved = useRef(serverValue ?? '')
  const saveRef = useRef(save)
  saveRef.current = save

  // Recebe mudanças do outro celular — mas só se você não estiver digitando nesse campo
  useEffect(() => {
    lastSaved.current = serverValue ?? ''
    if (!focused.current && !timer.current) {
      setDraft(serverValue ?? '')
      draftRef.current = serverValue ?? ''
    }
  }, [serverValue])

  const flush = () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (draftRef.current !== lastSaved.current) {
      lastSaved.current = draftRef.current
      saveRef.current(draftRef.current)
    }
  }

  useEffect(() => () => flush(), []) // salva o que faltou ao sair da tela

  return {
    value: draft,
    onChange: (e) => {
      const v = e.target.value
      setDraft(v)
      draftRef.current = v
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, delay)
    },
    onFocus: () => { focused.current = true },
    onBlur: () => { focused.current = false; flush() },
  }
}

export default function RoomDetail({ comodo, syncState, onRetry, onBack, updateFields, mutateArray, deleteComodo }) {
  const [confirmDel, setConfirmDel] = useState(false)
  const nome = useAutosave(comodo.nome, (v) => updateFields(comodo.id, { nome: v.trim() || 'Sem nome' }).catch(() => {}))
  const notas = useAutosave(comodo.notas, (v) => updateFields(comodo.id, { notas: v }).catch(() => {}), 900)
  const Icon = iconeDoComodo(comodo.nome)

  return (
    <div className="mx-auto max-w-3xl pb-16">
      {/* Barra superior fixa */}
      <div className="sticky top-0 z-20 border-b border-stone-200/60 bg-creme/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <button onClick={onBack} className="-ml-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl px-3 font-bold text-stone-700 hover:bg-stone-100 active:scale-95">
            <ArrowLeft className="h-5 w-5" /> Voltar
          </button>
          <div className="flex items-center gap-1">
            <SyncBadge state={syncState} onRetry={onRetry} />
            <button onClick={() => setConfirmDel(true)} className="grid h-11 w-11 place-items-center rounded-2xl text-stone-400 hover:bg-terracota-50 hover:text-terracota-700" aria-label="Excluir cômodo">
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-4 pt-4 sm:px-6">
        {/* Dados do cômodo */}
        <section className="rounded-3xl bg-white p-4 shadow-suave sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-oliva-50 text-oliva-700">
              <Icon className="h-6 w-6" />
            </div>
            <input
              {...nome}
              className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2 py-1.5 text-2xl font-extrabold text-stone-800 outline-none transition hover:border-stone-200 focus:border-oliva-300 focus:bg-white focus:ring-4 focus:ring-oliva-100"
              aria-label="Nome do cômodo"
              placeholder="Nome do cômodo"
            />
          </div>

          <p className="mb-1.5 text-sm font-bold text-stone-700">Status</p>
          <div className="mb-5 grid grid-cols-3 gap-2">
            {STATUS.map((s) => (
              <button
                key={s}
                onClick={() => s !== comodo.status && updateFields(comodo.id, { status: s }).catch(() => {})}
                className={`inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl px-2 text-sm font-bold ring-1 transition active:scale-95 ${comodo.status === s ? STATUS_STYLE[s] + ' ring-2' : 'bg-white text-stone-500 ring-stone-200'}`}
              >
                <span className={`h-2 w-2 rounded-full ${comodo.status === s ? STATUS_DOT[s] : 'bg-stone-300'}`} />
                {s}
              </button>
            ))}
          </div>

          <label className="mb-1.5 flex items-center gap-2 text-sm font-bold text-stone-700">
            <NotebookPen className="h-4 w-4 text-oliva-600" /> Notas gerais
          </label>
          <textarea
            {...notas}
            className={`${inputCls} min-h-[110px] resize-y leading-relaxed`}
            placeholder="Medidas, orçamentos, contato do pedreiro, cores escolhidas..."
          />
          <p className="mt-1.5 text-xs text-stone-400">Salva sozinho enquanto vocês escrevem.</p>
        </section>

        <PhotosSection comodo={comodo} mutateArray={mutateArray} />
        <IdeasSection comodo={comodo} mutateArray={mutateArray} />
      </div>

      <ConfirmDialog
        open={confirmDel}
        title={`Excluir "${comodo.nome}"?`}
        message="Todas as fotos, notas e ideias deste cômodo serão apagadas para vocês dois. Essa ação não pode ser desfeita."
        confirmText="Excluir cômodo"
        onCancel={() => setConfirmDel(false)}
        onConfirm={() => {
          setConfirmDel(false)
          deleteComodo(comodo.id).catch(() => {})
          onBack()
        }}
      />
    </div>
  )
}
