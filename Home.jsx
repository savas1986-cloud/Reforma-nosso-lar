import { useState } from 'react'
import { Plus, Lightbulb, CheckCircle2, LayoutGrid, Home as HomeIcon, Camera } from 'lucide-react'
import { StatusBadge, SyncBadge, iconeDoComodo, Modal, inputCls, btnPrimary, STATUS, STATUS_STYLE } from './ui'
import { fotoMaisRecente } from '../lib/utils'

const SUGESTOES = ['Banheiro', 'Lavanderia', 'Varanda', 'Escritório', 'Quarto de Hóspedes', 'Área Externa']

export default function Home({ comodos, loading, syncState, onRetry, onOpen, onAdd }) {
  const [addOpen, setAddOpen] = useState(false)

  const totalIdeias = comodos.reduce((s, c) => s + c.ideias.length, 0)
  const feitas = comodos.reduce((s, c) => s + c.ideias.filter((i) => i.feita).length, 0)
  const pendentes = totalIdeias - feitas
  const progresso = totalIdeias ? Math.round((feitas / totalIdeias) * 100) : 0

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
      <header className="mb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-oliva-600 text-white shadow-sm">
              <HomeIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="whitespace-nowrap text-[1.4rem] font-extrabold leading-tight tracking-tight text-stone-800 sm:text-2xl">Nossa Reforma</h1>
              <p className="truncate text-sm text-stone-500">Um cantinho de cada vez 🌿</p>
            </div>
          </div>
          <div className="shrink-0"><SyncBadge state={syncState} onRetry={onRetry} /></div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <Stat icon={LayoutGrid} value={comodos.length} label="Cômodos" tone="stone" />
          <Stat icon={Lightbulb} value={pendentes} label="Ideias pendentes" tone="terracota" />
          <Stat icon={CheckCircle2} value={feitas} label="Ideias feitas" tone="oliva" />
        </div>

        {totalIdeias > 0 && (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-suave">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-bold text-stone-700">Progresso das ideias</span>
              <span className="font-bold text-oliva-700">{progresso}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-oliva-600 transition-all duration-500" style={{ width: `${progresso}%` }} />
            </div>
          </div>
        )}
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-60 animate-pulse rounded-3xl bg-white shadow-suave" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
          {comodos.map((c) => (
            <RoomCard key={c.id} comodo={c} onClick={() => onOpen(c.id)} />
          ))}
          <button
            onClick={() => setAddOpen(true)}
            className="flex min-h-[15rem] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-oliva-200 bg-oliva-50/40 text-oliva-700 transition hover:border-oliva-300 hover:bg-oliva-50 active:scale-[.99]"
          >
            <div className="grid h-14 w-14 place-items-center rounded-full bg-white shadow-suave">
              <Plus className="h-7 w-7" />
            </div>
            <span className="font-extrabold">Adicionar Espaço</span>
          </button>
        </div>
      )}

      {/* Botão flutuante no celular */}
      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-30 inline-flex items-center gap-2 rounded-full bg-terracota-600 px-5 py-4 font-extrabold text-white shadow-lg shadow-terracota-600/30 transition active:scale-95 sm:hidden"
      >
        <Plus className="h-5 w-5" /> Espaço
      </button>

      <AddRoomModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={async (nome, status) => {
          setAddOpen(false)
          await onAdd(nome, status)
        }}
      />
    </div>
  )
}

function Stat({ icon: Icon, value, label, tone }) {
  const tones = {
    stone: 'bg-stone-100 text-stone-700',
    terracota: 'bg-terracota-50 text-terracota-700',
    oliva: 'bg-oliva-50 text-oliva-700',
  }
  return (
    <div className="rounded-2xl bg-white p-3 shadow-suave sm:p-4">
      <div className={`mb-2 grid h-8 w-8 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-2xl font-extrabold leading-none text-stone-800">{value}</div>
      <div className="mt-1 text-xs font-semibold leading-tight text-stone-500">{label}</div>
    </div>
  )
}

function RoomCard({ comodo, onClick }) {
  const foto = fotoMaisRecente(comodo.fotos_hoje)
  const Icon = iconeDoComodo(comodo.nome)
  const total = comodo.ideias.length
  const feitas = comodo.ideias.filter((i) => i.feita).length
  const nFotos = comodo.fotos_antes.length + comodo.fotos_hoje.length

  return (
    <button
      onClick={onClick}
      className="group overflow-hidden rounded-3xl bg-white text-left shadow-suave transition hover:-translate-y-0.5 hover:shadow-lg active:scale-[.99]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-oliva-50">
        {foto ? (
          <img src={foto.src} alt={comodo.nome} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-oliva-50 to-terracota-50/60">
            <Icon className="h-14 w-14 text-oliva-600/70" strokeWidth={1.5} />
            <span className="text-xs font-semibold text-oliva-700/60">Sem foto de hoje ainda</span>
          </div>
        )}
        <StatusBadge status={comodo.status} className="absolute left-3 top-3 bg-white/95 backdrop-blur" />
        {nFotos > 0 && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
            <Camera className="h-3.5 w-3.5" /> {nFotos}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="truncate text-lg font-extrabold text-stone-800">{comodo.nome || 'Sem nome'}</h3>
        <div className="mt-1.5 flex items-center gap-2 text-sm text-stone-500">
          <Lightbulb className="h-4 w-4 text-terracota-600" />
          {total === 0 ? 'Nenhuma ideia ainda' : (
            <span>
              <b className="text-stone-700">{total}</b> {total === 1 ? 'ideia' : 'ideias'} · <b className="text-oliva-700">{feitas}</b> {feitas === 1 ? 'feita' : 'feitas'}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

function AddRoomModal({ open, onClose, onSave }) {
  const [nome, setNome] = useState('')
  const [status, setStatus] = useState('Planejando')

  const salvar = (e) => {
    e.preventDefault()
    if (!nome.trim()) return
    onSave(nome.trim(), status)
    setNome('')
    setStatus('Planejando')
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo espaço">
      <form onSubmit={salvar} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-bold text-stone-700">Nome do cômodo</label>
          <input autoFocus className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Banheiro Social" />
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
            {SUGESTOES.map((s) => (
              <button type="button" key={s} onClick={() => setNome(s)} className="shrink-0 rounded-full bg-stone-100 px-3 py-1.5 text-sm font-semibold text-stone-600 hover:bg-stone-200">
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-bold text-stone-700">Status</label>
          <div className="grid grid-cols-3 gap-2">
            {STATUS.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setStatus(s)}
                className={`min-h-[44px] rounded-xl px-2 text-sm font-bold ring-1 transition ${status === s ? STATUS_STYLE[s] + ' ring-2' : 'bg-white text-stone-500 ring-stone-200'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={!nome.trim()} className={`${btnPrimary} w-full`}>
          <Plus className="h-5 w-5" /> Adicionar espaço
        </button>
      </form>
    </Modal>
  )
}
