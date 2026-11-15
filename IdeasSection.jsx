import { useMemo, useState } from 'react'
import {
  Lightbulb, Plus, Check, Pencil, Trash2, ExternalLink, X, Sparkles, Loader2, RefreshCw, ShoppingBag, Info, Search, Palette, ImageOff,
  Paintbrush, Armchair, Lamp, Hammer, Flower2,
} from 'lucide-react'
import { SectionCard, ConfirmDialog, Modal, ApprovalButton, ApprovalFilter, passaAprovacao, inputCls, btnPrimary, btnSecondary } from './ui'
import { MoneyInput } from './ItemsSection'
import { uid, normalizarLink, formatarBRL, parseValor, valorParaInput, identificarLoja } from './utils'
import { gerarSugestoes, gerarImagemIdeia, termoPadrao, linkPinterest, linkGoogleImagens } from './ai'
import { useGeminiKey } from './settings.jsx'

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
  const [aprov, setAprov] = useState('Todos')
  const [delId, setDelId] = useState(null)

  const ideias = comodo.ideias
  const feitas = ideias.filter((i) => i.feita).length
  const contagem = { Todas: ideias.length, Pendentes: ideias.length - feitas, Feitas: feitas }

  const porStatus = ideias.filter((i) => (filtro === 'Pendentes' ? !i.feita : filtro === 'Feitas' ? i.feita : true))
  const contagemAprov = {
    Todos: porStatus.length,
    Aprovados: porStatus.filter((i) => i.aprovado).length,
    'Em análise': porStatus.filter((i) => !i.aprovado).length,
  }

  const lista = useMemo(
    () =>
      porStatus
        .filter((i) => passaAprovacao(i, aprov))
        .sort(
          (a, b) =>
            Number(!!a.feita) - Number(!!b.feita) ||
            (PRIO_ORDER[a.prioridade] ?? 1) - (PRIO_ORDER[b.prioridade] ?? 1) ||
            String(b.criada_em || '').localeCompare(String(a.criada_em || ''))
        ),
    [porStatus, aprov]
  )

  const mut = (fn) => mutateArray(comodo.id, 'ideias', fn).catch(() => {})

  const adicionar = (dados) => {
    const ideia = { id: uid(), ...dados, feita: false, aprovado: false, criada_em: new Date().toISOString() }
    mut((arr) => [...arr, ideia])
    setFormOpen(false)
  }
  const salvarEdicao = (id, dados) => {
    mut((arr) => arr.map((i) => (i.id === id ? { ...i, ...dados } : i)))
    setEditId(null)
  }
  const alternar = (id) => mut((arr) => arr.map((i) => (i.id === id ? { ...i, feita: !i.feita } : i)))
  const alternarAprovacao = (id) => mut((arr) => arr.map((i) => (i.id === id ? { ...i, aprovado: !i.aprovado } : i)))
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
      <AIAssistant comodo={comodo} onSalvar={(s) => adicionar({ ...s, link: '', preco: null, origem: 'ia' })} />

      {formOpen ? (
        <IdeaForm onCancel={() => setFormOpen(false)} onSave={adicionar} />
      ) : (
        <button onClick={() => { setFormOpen(true); setEditId(null) }} className={`${btnPrimary} mb-4 w-full`}>
          <Plus className="h-5 w-5" /> Nova ideia
        </button>
      )}

      {ideias.length > 0 && (
        <div className="mb-4 space-y-2">
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-stone-100 p-1">
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
          <ApprovalFilter value={aprov} onChange={setAprov} counts={contagemAprov} />
        </div>
      )}

      {ideias.length === 0 && !formOpen && (
        <div className="rounded-2xl border border-dashed border-stone-200 py-10 text-center text-stone-400">
          <Lightbulb className="mx-auto mb-2 h-8 w-8" />
          <p className="font-semibold">Nenhuma ideia ainda.</p>
          <p className="text-sm">Que tal pedir sugestões para a IA? ✨</p>
        </div>
      )}

      {ideias.length > 0 && lista.length === 0 && (
        <p className="py-6 text-center text-sm font-semibold text-stone-400">Nenhuma ideia neste filtro.</p>
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
              nomeComodo={comodo.nome}
              onToggle={() => alternar(i.id)}
              onApprove={() => alternarAprovacao(i.id)}
              onEdit={() => { setEditId(i.id); setFormOpen(false) }}
              onDelete={() => setDelId(i.id)}
            />
          )
        )}
      </ul>

      <ConfirmDialog open={!!delId} title="Excluir ideia?" message="Essa ideia será removida para vocês dois." onCancel={() => setDelId(null)} onConfirm={excluir} />
    </SectionCard>
  )
}

// ------------------------------------------------------------- Consultor de IA

function AIAssistant({ comodo, onSalvar }) {
  const key = useGeminiKey()
  const [estado, setEstado] = useState('fechado') // fechado | carregando | pronto
  const [res, setRes] = useState(null)
  const [salvas, setSalvas] = useState({})
  const [imagens, setImagens] = useState({}) // idx -> { estado, src, msg }

  const gerar = async () => {
    setEstado('carregando')
    setSalvas({})
    setImagens({})
    const r = await gerarSugestoes(comodo)
    setRes(r)
    setEstado('pronto')
  }

  const gerarImagem = async (idx, sugestao) => {
    setImagens((m) => ({ ...m, [idx]: { estado: 'carregando' } }))
    try {
      const src = await gerarImagemIdeia(comodo, sugestao)
      setImagens((m) => ({ ...m, [idx]: { estado: 'ok', src } }))
    } catch (e) {
      setImagens((m) => ({ ...m, [idx]: { estado: 'erro', msg: e.message } }))
    }
  }

  if (estado === 'fechado') {
    return (
      <button
        onClick={gerar}
        className="mb-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-terracota-600 to-oliva-600 px-5 font-extrabold text-white shadow-md shadow-terracota-600/20 transition active:scale-[.98]"
      >
        <Sparkles className="h-5 w-5" /> Gerar Sugestões com IA
      </button>
    )
  }

  return (
    <div className="mb-4 rounded-2xl bg-gradient-to-br from-terracota-50 via-white to-oliva-50 p-3 ring-1 ring-terracota-100 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-extrabold text-stone-800">
          <Sparkles className="h-5 w-5 text-terracota-600" /> Consultor de Reforma
        </p>
        <button onClick={() => setEstado('fechado')} className="rounded-full p-2 text-stone-400 hover:bg-white" aria-label="Fechar sugestões">
          <X className="h-5 w-5" />
        </button>
      </div>

      {estado === 'carregando' ? (
        <div className="flex flex-col items-center gap-2 py-8 text-stone-500">
          <Loader2 className="h-7 w-7 animate-spin text-terracota-600" />
          <p className="text-sm font-semibold">Pensando em ideias para {comodo.nome || 'o cômodo'}...</p>
        </div>
      ) : (
        <>
          {res?.erro && (
            <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              <Info className="mt-0.5 h-4 w-4 shrink-0" /> {res.erro} Mostrando o assistente offline.
            </p>
          )}
          {res?.fonte === 'local' && !res?.erro && !key && (
            <p className="mb-3 flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-stone-500 ring-1 ring-stone-100">
              <Info className="mt-0.5 h-4 w-4 shrink-0" /> Assistente com boas práticas de arquitetura. Para sugestões personalizadas, configure a chave do Gemini na engrenagem ⚙️ da tela inicial.
            </p>
          )}
          <ul className="space-y-2">
            {res?.sugestoes.map((s, idx) => {
              const Icon = CAT_ICON[s.categoria] || Lightbulb
              return (
                <li key={idx} className="rounded-2xl bg-white p-3 shadow-suave">
                  <p className="font-bold leading-snug text-stone-800">{s.titulo}</p>
                  <p className="mt-1 text-sm text-stone-600">{s.descricao}</p>
                  <VisualTools
                    termo={s.termo_busca_visual}
                    imagem={imagens[idx]}
                    temChave={!!key}
                    onGerarImagem={() => gerarImagem(idx, s)}
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-oliva-50 px-2 py-0.5 text-xs font-bold text-oliva-700">
                        <Icon className="h-3.5 w-3.5" /> {s.categoria}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${PRIO_STYLE[s.prioridade]}`}>{s.prioridade}</span>
                    </div>
                    <button
                      disabled={salvas[idx]}
                      onClick={() => {
                        const img = imagens[idx]?.estado === 'ok' ? imagens[idx].src : undefined
                        onSalvar(img ? { ...s, imagem: img } : s)
                        setSalvas((m) => ({ ...m, [idx]: true }))
                      }}
                      className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-full px-3.5 text-sm font-bold transition active:scale-95 ${
                        salvas[idx] ? 'bg-oliva-50 text-oliva-700' : 'bg-oliva-600 text-white hover:bg-oliva-700'
                      }`}
                    >
                      {salvas[idx] ? <><Check className="h-4 w-4" /> Salva</> : <><Plus className="h-4 w-4" /> Salvar nas Nossas Ideias</>}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          <button onClick={gerar} className={`${btnSecondary} mt-3 w-full`}>
            <RefreshCw className="h-4 w-4" /> Gerar outras sugestões
          </button>
          <p className="mt-2 text-center text-[11px] text-stone-400">
            {res?.fonte === 'gemini' ? 'Gerado com Google Gemini' : 'Assistente offline do app'} · usa o nome, as notas e os itens a reformar/trocar
          </p>
        </>
      )}
    </div>
  )
}

// ------------------------------------------------------------- Busca visual + imagem da IA

function BotaoBuscaVisual({ termo, compacto = false }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${compacto ? '' : 'mt-3'}`}>
      <a
        href={linkPinterest(termo)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-terracota-50 px-3.5 text-sm font-bold text-terracota-700 ring-1 ring-terracota-200 transition hover:bg-terracota-100 active:scale-95"
      >
        <Search className="h-4 w-4" /> Ver Inspirações Visuais
      </a>
      <a
        href={linkGoogleImagens(termo)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-bold text-stone-500 underline-offset-2 hover:underline"
      >
        ou no Google Imagens
      </a>
    </div>
  )
}

function VisualTools({ termo, imagem, temChave, onGerarImagem }) {
  return (
    <div>
      <BotaoBuscaVisual termo={termo} />

      {imagem?.estado === 'ok' ? (
        <div className="mt-3 overflow-hidden rounded-xl bg-stone-100">
          <img src={imagem.src} alt="Exemplo visual gerado pela IA" className="aspect-[4/3] w-full object-cover" />
          <p className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-stone-500">
            <Sparkles className="h-3 w-3" /> Imagem ilustrativa gerada por IA
          </p>
        </div>
      ) : imagem?.estado === 'carregando' ? (
        <div className="mt-3 flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-oliva-50 to-terracota-50 text-stone-500">
          <Loader2 className="h-7 w-7 animate-spin text-terracota-600" />
          <p className="text-sm font-semibold">Desenhando a ideia... (pode levar uns segundos)</p>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={onGerarImagem}
            disabled={!temChave}
            className="mt-2 inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-bold text-oliva-700 ring-1 ring-oliva-200 transition hover:bg-oliva-50 active:scale-95 disabled:opacity-50"
          >
            <Palette className="h-4 w-4" /> {imagem?.estado === 'erro' ? 'Tentar gerar de novo' : 'Gerar Exemplo Visual (IA)'}
          </button>
          {!temChave && <p className="mt-1 text-xs text-stone-400">Para gerar imagens, configure a chave do Gemini na engrenagem ⚙️.</p>}
          {imagem?.estado === 'erro' && (
            <p className="mt-2 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              <ImageOff className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{imagem.msg} Enquanto isso, toque em <b>"Ver Inspirações Visuais"</b> para ver fotos reais dessa ideia 😉</span>
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ------------------------------------------------------------- Ideia

function LinkCard({ ideia }) {
  const loja = identificarLoja(ideia.link)
  return (
    <div className="mt-2.5 overflow-hidden rounded-2xl bg-creme ring-1 ring-stone-200">
      <div className="flex items-center gap-3 p-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-stone-100">
          {loja.host ? (
            <img
              src={`https://www.google.com/s2/favicons?domain=${loja.host}&sz=64`}
              alt=""
              className="h-6 w-6"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          ) : (
            <ShoppingBag className="h-5 w-5 text-stone-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-stone-400">{loja.nome}</p>
          <p className="truncate text-sm font-bold text-stone-700">{ideia.titulo}</p>
          {ideia.preco != null && <p className="text-sm font-extrabold text-oliva-700">≈ {formatarBRL(ideia.preco)}</p>}
        </div>
      </div>
      <a
        href={ideia.link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-[44px] items-center justify-center gap-2 border-t border-stone-200 bg-white text-sm font-extrabold text-terracota-700 hover:bg-terracota-50"
      >
        <ExternalLink className="h-4 w-4" /> Abrir Link Externo
      </a>
    </div>
  )
}

function IdeaItem({ ideia, nomeComodo, onToggle, onApprove, onEdit, onDelete }) {
  const Icon = CAT_ICON[ideia.categoria] || Lightbulb
  const [ampliar, setAmpliar] = useState(false)
  const termo = ideia.termo_busca_visual || termoPadrao(nomeComodo, ideia.titulo)
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
          <p className={`font-bold leading-snug ${ideia.feita ? 'text-stone-400 line-through' : 'text-stone-800'}`}>
            {ideia.titulo}
            {ideia.origem === 'ia' && <Sparkles className="ml-1.5 inline h-3.5 w-3.5 text-terracota-500" aria-label="Sugestão da IA" />}
          </p>
          {ideia.descricao && <p className={`mt-0.5 whitespace-pre-line text-sm ${ideia.feita ? 'text-stone-400' : 'text-stone-600'}`}>{ideia.descricao}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {ideia.categoria && (
              <span className="inline-flex items-center gap-1 rounded-full bg-oliva-50 px-2 py-0.5 text-xs font-bold text-oliva-700">
                <Icon className="h-3.5 w-3.5" /> {ideia.categoria}
              </span>
            )}
            {ideia.prioridade && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${PRIO_STYLE[ideia.prioridade] || PRIO_STYLE.Média}`}>{ideia.prioridade}</span>
            )}
            {!ideia.link && ideia.preco != null && (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-600">≈ {formatarBRL(ideia.preco)}</span>
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

      {ideia.imagem && (
        <button onClick={() => setAmpliar(true)} className="mt-2.5 block w-full overflow-hidden rounded-xl bg-stone-100">
          <img src={ideia.imagem} alt={`Exemplo visual: ${ideia.titulo}`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
        </button>
      )}

      {ideia.link && <LinkCard ideia={ideia} />}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ApprovalButton aprovado={ideia.aprovado} onToggle={onApprove} />
        <BotaoBuscaVisual termo={termo} compacto />
      </div>

      <Modal open={ampliar} onClose={() => setAmpliar(false)} title={ideia.titulo} wide dark>
        <img src={ideia.imagem} alt={ideia.titulo} className="mx-auto max-h-[70vh] w-auto rounded-2xl object-contain" />
        <p className="mt-3 flex items-center gap-1.5 text-xs text-white/60">
          <Sparkles className="h-3.5 w-3.5" /> Imagem ilustrativa gerada por IA
        </p>
      </Modal>
    </li>
  )
}

function IdeaForm({ inicial, onSave, onCancel }) {
  const [titulo, setTitulo] = useState(inicial?.titulo || '')
  const [descricao, setDescricao] = useState(inicial?.descricao || '')
  const [categoria, setCategoria] = useState(inicial?.categoria || 'Decoração')
  const [prioridade, setPrioridade] = useState(inicial?.prioridade || 'Média')
  const [link, setLink] = useState(inicial?.link || '')
  const [preco, setPreco] = useState(valorParaInput(inicial?.preco))

  const salvar = (e) => {
    e.preventDefault()
    if (!titulo.trim()) return
    onSave({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      categoria,
      prioridade,
      link: normalizarLink(link),
      preco: parseValor(preco),
    })
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

      <div>
        <p className="mb-1.5 text-sm font-bold text-stone-700">Link da loja ou referência (opcional)</p>
        <input
          type="text"
          inputMode="url"
          autoCapitalize="none"
          className={inputCls}
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Cole aqui: Pinterest, Leroy Merlin, Tok&Stok..."
        />
      </div>

      <div>
        <p className="mb-1.5 text-sm font-bold text-stone-700">Preço estimado (opcional)</p>
        <MoneyInput value={preco} onChange={setPreco} />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <button type="button" className={btnSecondary} onClick={onCancel}>Cancelar</button>
        <button type="submit" disabled={!titulo.trim()} className={btnPrimary}>{inicial ? 'Salvar' : 'Adicionar'}</button>
      </div>
    </form>
  )
}
