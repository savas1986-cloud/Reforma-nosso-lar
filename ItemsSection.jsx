import { useMemo, useState } from 'react'
import { Package, Plus, Pencil, Trash2, X, Ruler, ShieldCheck, Wrench, ShoppingCart, Recycle, StickyNote } from 'lucide-react'
import { SectionCard, ConfirmDialog, ApprovalButton, ApprovalFilter, passaAprovacao, inputCls, btnPrimary, btnSecondary } from './ui'
import { uid, formatarBRL, parseValor, valorParaInput } from './utils'

export const ACOES = [
  { id: 'Manter', label: 'Manter', icon: ShieldCheck, cls: 'bg-oliva-50 text-oliva-700 ring-oliva-200', ativo: 'bg-oliva-600 text-white ring-oliva-600' },
  { id: 'Reformar', label: 'Reformar/Restaurar', icon: Wrench, cls: 'bg-amber-50 text-amber-800 ring-amber-200', ativo: 'bg-amber-500 text-white ring-amber-500' },
  { id: 'Trocar', label: 'Trocar/Comprar Novo', icon: ShoppingCart, cls: 'bg-terracota-50 text-terracota-700 ring-terracota-200', ativo: 'bg-terracota-600 text-white ring-terracota-600' },
  { id: 'Descartar', label: 'Descartar/Doar', icon: Recycle, cls: 'bg-stone-100 text-stone-600 ring-stone-200', ativo: 'bg-stone-600 text-white ring-stone-600' },
]
const ACAO = Object.fromEntries(ACOES.map((a) => [a.id, a]))
const ORDEM_ACAO = { Trocar: 0, Reformar: 1, Manter: 2, Descartar: 3 }
const SUGESTOES = ['Sofá', 'Piso', 'Luminária', 'Armário', 'Pintura da Parede', 'Cortina', 'Tapete', 'Bancada', 'Mesa', 'Porta']

export default function ItemsSection({ comodo, mutateArray }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [filtro, setFiltro] = useState('Todos')
  const [aprov, setAprov] = useState('Todos')
  const [delId, setDelId] = useState(null)

  const itens = comodo.itens
  const contagem = useMemo(() => {
    const c = { Todos: itens.length }
    ACOES.forEach((a) => (c[a.id] = itens.filter((i) => i.acao === a.id).length))
    return c
  }, [itens])

  const porAcao = itens.filter((i) => filtro === 'Todos' || i.acao === filtro)
  const contagemAprov = {
    Todos: porAcao.length,
    Aprovados: porAcao.filter((i) => i.aprovado).length,
    'Em análise': porAcao.filter((i) => !i.aprovado).length,
  }
  const lista = porAcao
    .filter((i) => passaAprovacao(i, aprov))
    .sort(
      (a, b) =>
        (ORDEM_ACAO[a.acao] ?? 9) - (ORDEM_ACAO[b.acao] ?? 9) ||
        String(a.criado_em || '').localeCompare(String(b.criado_em || ''))
    )

  const mut = (fn) => mutateArray(comodo.id, 'itens', fn).catch(() => {})

  const adicionar = (dados) => {
    mut((arr) => [...arr, { id: uid(), ...dados, aprovado: false, criado_em: new Date().toISOString() }])
    setFormOpen(false)
  }
  const salvarEdicao = (id, dados) => {
    mut((arr) => arr.map((i) => (i.id === id ? { ...i, ...dados } : i)))
    setEditId(null)
  }
  const alternarAprovacao = (id) => mut((arr) => arr.map((i) => (i.id === id ? { ...i, aprovado: !i.aprovado } : i)))
  const excluir = () => {
    const id = delId
    setDelId(null)
    mut((arr) => arr.filter((i) => i.id !== id))
  }

  return (
    <SectionCard icon={Package} title="Itens & Medidas" subtitle={itens.length ? `${itens.length} ${itens.length === 1 ? 'item' : 'itens'} no inventário` : 'O que fica, o que sai, o que entra'}>
      {formOpen ? (
        <ItemForm onCancel={() => setFormOpen(false)} onSave={adicionar} />
      ) : (
        <button onClick={() => { setFormOpen(true); setEditId(null) }} className={`${btnPrimary} mb-4 w-full`}>
          <Plus className="h-5 w-5" /> Novo item
        </button>
      )}

      {itens.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {[{ id: 'Todos', label: 'Todos' }, ...ACOES].map((a) => (
              <button
                key={a.id}
                onClick={() => setFiltro(a.id)}
                className={`inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold ring-1 transition ${
                  filtro === a.id ? a.ativo || 'bg-stone-800 text-white ring-stone-800' : 'bg-white text-stone-600 ring-stone-200'
                }`}
              >
                {a.icon && <a.icon className="h-4 w-4" />}
                {a.id === 'Todos' ? 'Todos' : a.id}
                <span className="opacity-70">{contagem[a.id]}</span>
              </button>
            ))}
          </div>
          <ApprovalFilter value={aprov} onChange={setAprov} counts={contagemAprov} />
        </div>
      )}

      {itens.length === 0 && !formOpen && (
        <div className="rounded-2xl border border-dashed border-stone-200 py-10 text-center text-stone-400">
          <Package className="mx-auto mb-2 h-8 w-8" />
          <p className="font-semibold">Nenhum item ainda.</p>
          <p className="text-sm">Comecem listando o que já existe no cômodo.</p>
        </div>
      )}
      {itens.length > 0 && lista.length === 0 && <p className="py-6 text-center text-sm font-semibold text-stone-400">Nenhum item neste filtro.</p>}

      <ul className="space-y-2.5">
        {lista.map((i) =>
          editId === i.id ? (
            <li key={i.id}>
              <ItemForm inicial={i} onCancel={() => setEditId(null)} onSave={(d) => salvarEdicao(i.id, d)} />
            </li>
          ) : (
            <ItemCard
              key={i.id}
              item={i}
              onApprove={() => alternarAprovacao(i.id)}
              onEdit={() => { setEditId(i.id); setFormOpen(false) }}
              onDelete={() => setDelId(i.id)}
            />
          )
        )}
      </ul>

      <ConfirmDialog open={!!delId} title="Excluir item?" message="Este item será removido para vocês dois." onCancel={() => setDelId(null)} onConfirm={excluir} />
    </SectionCard>
  )
}

function ItemCard({ item, onApprove, onEdit, onDelete }) {
  const a = ACAO[item.acao] || ACAO.Manter
  const temValor = item.valor_estimado != null || item.valor_gasto != null
  return (
    <li className="rounded-2xl bg-white p-3 ring-1 ring-stone-200">
      <div className="flex gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ${a.cls}`}>
          <a.icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold leading-snug text-stone-800">{item.nome}</p>
          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${a.cls}`}>{a.label}</span>
          {item.medidas && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-stone-600">
              <Ruler className="h-4 w-4 text-stone-400" /> {item.medidas}
            </p>
          )}
          {item.observacoes && (
            <p className="mt-1 flex items-start gap-1.5 whitespace-pre-line text-sm text-stone-500">
              <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" /> {item.observacoes}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button onClick={onEdit} className="grid h-9 w-9 place-items-center rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Editar item">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-xl text-stone-400 hover:bg-terracota-50 hover:text-terracota-700" aria-label="Excluir item">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {temValor && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-creme px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">Estimado</p>
            <p className="font-extrabold text-stone-700">{item.valor_estimado != null ? formatarBRL(item.valor_estimado) : '—'}</p>
          </div>
          <div className="rounded-xl bg-creme px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">Gasto real</p>
            <p className={`font-extrabold ${item.valor_gasto != null && item.valor_estimado != null && item.valor_gasto > item.valor_estimado ? 'text-terracota-700' : 'text-oliva-700'}`}>
              {item.valor_gasto != null ? formatarBRL(item.valor_gasto) : '—'}
            </p>
          </div>
        </div>
      )}

      <div className="mt-3">
        <ApprovalButton aprovado={item.aprovado} onToggle={onApprove} />
      </div>
    </li>
  )
}

function ItemForm({ inicial, onSave, onCancel }) {
  const [nome, setNome] = useState(inicial?.nome || '')
  const [acao, setAcao] = useState(inicial?.acao || 'Trocar')
  const [medidas, setMedidas] = useState(inicial?.medidas || '')
  const [observacoes, setObservacoes] = useState(inicial?.observacoes || '')
  const [estimado, setEstimado] = useState(valorParaInput(inicial?.valor_estimado))
  const [gasto, setGasto] = useState(valorParaInput(inicial?.valor_gasto))

  const salvar = (e) => {
    e.preventDefault()
    if (!nome.trim()) return
    onSave({
      nome: nome.trim(),
      acao,
      medidas: medidas.trim(),
      observacoes: observacoes.trim(),
      valor_estimado: parseValor(estimado),
      valor_gasto: parseValor(gasto),
    })
  }

  return (
    <form onSubmit={salvar} className="mb-4 space-y-3 rounded-2xl bg-creme p-3 ring-1 ring-stone-200 sm:p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-stone-700">{inicial ? 'Editar item' : 'Novo item'}</h3>
        <button type="button" onClick={onCancel} className="rounded-full p-2 text-stone-400 hover:bg-stone-200" aria-label="Cancelar">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div>
        <input autoFocus className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do item (ex.: Sofá)" />
        {!inicial && (
          <div className="no-scrollbar -mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
            {SUGESTOES.map((s) => (
              <button type="button" key={s} onClick={() => setNome(s)} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-stone-600 ring-1 ring-stone-200">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-sm font-bold text-stone-700">O que fazer com ele?</p>
        <div className="grid grid-cols-2 gap-2">
          {ACOES.map((a) => (
            <button
              type="button"
              key={a.id}
              onClick={() => setAcao(a.id)}
              className={`inline-flex min-h-[46px] items-center gap-2 rounded-xl px-3 text-left text-sm font-bold ring-1 transition ${acao === a.id ? a.ativo : 'bg-white text-stone-600 ring-stone-200'}`}
            >
              <a.icon className="h-4 w-4 shrink-0" /> {a.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-stone-700">
          <Ruler className="h-4 w-4" /> Medidas / Dimensões
        </label>
        <input className={inputCls} value={medidas} onChange={(e) => setMedidas(e.target.value)} placeholder="Ex.: 2,20m x 0,90m" />
      </div>

      <textarea className={`${inputCls} min-h-[72px] resize-y`} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações (cor, marca, estado, onde comprar...)" />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1.5 block text-sm font-bold text-stone-700">Valor estimado</label>
          <MoneyInput value={estimado} onChange={setEstimado} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold text-stone-700">Valor real gasto</label>
          <MoneyInput value={gasto} onChange={setGasto} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <button type="button" className={btnSecondary} onClick={onCancel}>Cancelar</button>
        <button type="submit" disabled={!nome.trim()} className={btnPrimary}>{inicial ? 'Salvar' : 'Adicionar'}</button>
      </div>
    </form>
  )
}

export function MoneyInput({ value, onChange, placeholder = '0,00' }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-400">R$</span>
      <input
        className={`${inputCls} pl-10`}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        placeholder={placeholder}
      />
    </div>
  )
}
