import { useMemo, useState } from 'react'
import {
  Lightbulb, Plus, Check, Pencil, Trash2, ExternalLink, X,
  Paintbrush, Armchair, Lamp, Hammer, Flower2,
} from 'lucide-react'
import { SectionCard, ConfirmDialog, inputCls, btnPrimary, btnSecondary } from './ui'
import { uid, normalizarLink } from './utils'

export const CATEGORIAS = [
  { nome: 'Pintura', icon: Paintbrush },
  { nome: 'Móveis', icon: Armchair },
  { nome: 'Iluminação', icon: Lamp },
  { nome: 'Estrutura', icon: Hammer },
  { nome: 'Decoração', icon: Flower2 },
]
const CAT_ICON = Object.fromEntries(CATEGORIAS.map((c) => [c.nome, c.icon]))

const PRIORIDADES = ['Alta', 'Média', 'Baixa']
const PRIO_STYLE = {
  Alta: 'bg-terracota-50 text-terracota-700 ring-terracota-200',
  Média: 'bg-amber-50 text-amber-800 ring-amber-200',
  Baixa: 'bg-stone-100 text-stone-600 ring-stone-200',
}
const PRIO_ORDER = { Alta: 0, Média: 1, Baixa: 2 }

const FILTROS = ['Todas', 'Pendentes', 'Feitas']

export default function IdeasSection({ comodo, mutateArray }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [filtro, setFiltro] = useState('Todas')
  const [delId, setDelId] = useState(null)

  const ideias = comodo.ideias
  const feitas = ideias.filter((i) => i.feita).length
  const contagem = { Todas: ideias.length, Pendentes: ideias.length - feitas, Feitas: feitas }

  const lista = useMemo(() => {
    const f = ideias.filter((i) => (filtro === 'Pendentes' ? !i.feita : filtro === 'Feitas' ? i.feita : true))
    return f.sort(
      (a, b) =>
        Number(!!a.feita) - Number(!!b.feita) ||
        (PRIO_ORDER[a.prioridade] ?? 1) - (PRIO_ORDER[b.prioridade] ?? 1) ||
        String(b.criada_em || '').localeCompare(String(a.criada_em || ''))
    )
  }, [ideias, filtro])

  const mut = (fn) => mutateArray(comodo.id, 'ideias', fn).catch(() => {})

  const adicionar = (dados) => {
    const ideia = { id: uid(), ...dados, feita: false, criada_em: new Date().toISOString() }
    mut((arr) => [...arr, ideia])
    setFormOpen(false)
  }
  const salvarEdicao = (id, dados) => {
    mut((arr) => arr.map((i) => (i.id === id ? { ...i, ...dados } : i)))
    setEditId(null)
  }
  const alternar = (id) => mut((arr) => arr.map((i) => (i.id === id ? { ...i, feita: !i.feita } : i)))
  const excluir = () => {
    const id = delId
    setDelId(null)
    mut((arr) => arr.filter((i) => i.id !== id))
  }

  return (
    <SectionCard
      icon={Lightbulb}
      title="Sugestões e Ideias"
      subtitle={ideias.length ? `${feitas} de ${ideias.length} concluídas` : 'O que vamos fazer aqui?'}
    >
      {formOpen ? (
        <IdeaForm onCancel={() => setFormOpen(false)} onSave={adicionar} />
      ) : (
        <button onClick={() => { setFormOpen(true); setEditId(null) }} className={`${btnPrimary} mb-4 w-full !bg-terracota-600 hover:!bg-terracota-700`}>
          <Plus className="h-5 w-5" /> Nova ideia
        </button>
      )}

      {ideias.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-stone-100 p-1">
          {FILTROS.map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`min-h-[40px] rounded-xl text-sm font-bold transition ${filtro === f ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
            >
              {f} <span className="text-stone-400">{contagem[f]}</span>
            </button>
          ))}
        </div>
      )}

      {ideias.length === 0 && !formOpen && (
        <div className="rounded-2xl border border-dashed border-stone-200 py-10 text-center text-stone-400">
          <Lightbulb className="mx-auto mb-2 h-8 w-8" />
          <p className="font-semibold">Nenhuma ideia ainda.</p>
          <p className="text-sm">Que tal começar pela cor das paredes?</p>
        </div>
      )}

      {ideias.length > 0 && lista.length === 0 && (
        <p className="py-6 text-center text-sm font-semibold text-stone-400">
          {filtro === 'Feitas' ? 'Nada concluído ainda — bora! 💪' : 'Tudo feito por aqui! 🎉'}
        </p>
      )}

      <ul className="space-y-2.5">
        {lista.map((i) =>
          editId === i.id ? (
            <li key={i.id}>
              <IdeaForm inicial={i} onCancel={() => setEditId(null)} onSave={(d) => salvarEdicao(i.id, d)} />
            </li>
          ) : (
            <IdeaItem
              key={i.id}
              ideia={i}
              onToggle={() => alternar(i.id)}
              onEdit={() => { setEditId(i.id); setFormOpen(false) }}
              onDelete={() => setDelId(i.id)}
            />
          )
        )}
      </ul>

      <ConfirmDialog
        open={!!delId}
        title="Excluir ideia?"
        message="Essa ideia será removida para vocês dois."
        onCancel={() => setDelId(null)}
        onConfirm={excluir}
      />
    </SectionCard>
  )
}

function IdeaItem({ ideia, onToggle, onEdit, onDelete }) {
  const Icon = CAT_ICON[ideia.categoria] || Lightbulb
  return (
    <li className={`rounded-2xl p-3 ring-1 transition ${ideia.feita ? 'bg-stone-50 ring-stone-100' : 'bg-white ring-stone-200'}`}>
      <div className="flex gap-3">
        <button
          onClick={onToggle}
          aria-label={ideia.feita ? 'Marcar como pendente' : 'Marcar como feita'}
          className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition active:scale-90 ${ideia.feita ? 'border-oliva-600 bg-oliva-600 text-white' : 'border-stone-300 bg-white text-transparent hover:border-oliva-400'}`}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </button>

        <div className="min-w-0 flex-1">
          <p className={`font-bold leading-snug ${ideia.feita ? 'text-stone-400 line-through' : 'text-stone-800'}`}>{ideia.titulo}</p>
          {ideia.descricao && (
            <p className={`mt-0.5 whitespace-pre-line text-sm ${ideia.feita ? 'text-stone-400' : 'text-stone-600'}`}>{ideia.descricao}</p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {ideia.categoria && (
              <span className="inline-flex items-center gap-1 rounded-full bg-oliva-50 px-2 py-0.5 text-xs font-bold text-oliva-700">
                <Icon className="h-3.5 w-3.5" /> {ideia.categoria}
              </span>
            )}
            {ideia.prioridade && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${PRIO_STYLE[ideia.prioridade] || PRIO_STYLE.Média}`}>
                {ideia.prioridade}
              </span>
            )}
            {ideia.link && (
              <a href={ideia.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700 hover:bg-sky-100">
                <ExternalLink className="h-3.5 w-3.5" /> Abrir link
              </a>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          <button onClick={onEdit} className="grid h-9 w-9 place-items-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Editar">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-xl text-stone-400 hover:bg-terracota-50 hover:text-terracota-700" aria-label="Excluir">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  )
}

function IdeaForm({ inicial, onSave, onCancel }) {
  const [titulo, setTitulo] = useState(inicial?.titulo || '')
  const [descricao, setDescricao] = useState(inicial?.descricao || '')
  const [categoria, setCategoria] = useState(inicial?.categoria || 'Decoração')
  const [prioridade, setPrioridade] = useState(inicial?.prioridade || 'Média')
  const [link, setLink] = useState(inicial?.link || '')

  const salvar = (e) => {
    e.preventDefault()
    if (!titulo.trim()) return
    onSave({ titulo: titulo.trim(), descricao: descricao.trim(), categoria, prioridade, link: normalizarLink(link) })
  }

  return (
    <form onSubmit={salvar} className="mb-4 space-y-3 rounded-2xl bg-creme p-3 ring-1 ring-stone-200 sm:p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-stone-700">{inicial ? 'Editar ideia' : 'Nova ideia'}</h3>
        <button type="button" onClick={onCancel} className="rounded-full p-2 text-stone-400 hover:bg-stone-200" aria-label="Cancelar">
          <X className="h-5 w-5" />
        </button>
      </div>

      <input autoFocus className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título (ex.: Pintar parede de verde-sálvia)" />
      <textarea className={`${inputCls} min-h-[88px] resize-y`} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes, medidas, marca da tinta..." />

      <div>
        <p className="mb-1.5 text-sm font-bold text-stone-700">Categoria</p>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {CATEGORIAS.map(({ nome, icon: Icon }) => (
            <button
              type="button"
              key={nome}
              onClick={() => setCategoria(nome)}
              className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold ring-1 transition ${categoria === nome ? 'bg-oliva-600 text-white ring-oliva-600' : 'bg-white text-stone-600 ring-stone-200'}`}
            >
              <Icon className="h-4 w-4" /> {nome}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-bold text-stone-700">Prioridade</p>
        <div className="grid grid-cols-3 gap-2">
          {PRIORIDADES.map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => setPrioridade(p)}
              className={`min-h-[40px] rounded-xl text-sm font-bold ring-1 transition ${prioridade === p ? PRIO_STYLE[p] + ' ring-2' : 'bg-white text-stone-500 ring-stone-200'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <input type="text" inputMode="url" autoCapitalize="none" className={inputCls} value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link de referência (opcional)" />

      <div className="grid grid-cols-2 gap-3 pt-1">
        <button type="button" className={btnSecondary} onClick={onCancel}>Cancelar</button>
        <button type="submit" disabled={!titulo.trim()} className={btnPrimary}>{inicial ? 'Salvar' : 'Adicionar'}</button>
      </div>
    </form>
  )
}
