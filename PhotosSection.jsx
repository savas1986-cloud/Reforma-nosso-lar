import { useRef, useState } from 'react'
import { Camera, Plus, Trash2, Columns2, ChevronLeft, ChevronRight, Loader2, CalendarDays, ImageOff } from 'lucide-react'
import { Modal, ConfirmDialog, SectionCard, inputCls, btnPrimary, btnSecondary } from './ui'
import { compressImage } from '../lib/image'
import { uid, hoje, formatarData, ordenarFotos } from '../lib/utils'

const BLOCOS = [
  { column: 'fotos_antes', title: 'Como Era (Antes)', tone: 'terracota' },
  { column: 'fotos_hoje', title: 'Como Está Hoje', tone: 'oliva' },
]

export default function PhotosSection({ comodo, mutateArray }) {
  const [novaFoto, setNovaFoto] = useState(null) // { column, src }
  const [processando, setProcessando] = useState(null) // column
  const [viewer, setViewer] = useState(null) // { column, foto }
  const [confirmDel, setConfirmDel] = useState(false)
  const [comparar, setComparar] = useState(false)
  const [erro, setErro] = useState('')

  const handleFile = async (column, file) => {
    if (!file) return
    setErro('')
    setProcessando(column)
    try {
      const src = await compressImage(file, 800, 0.7)
      setNovaFoto({ column, src })
    } catch (e) {
      setErro(e.message || 'Não foi possível processar a foto.')
    } finally {
      setProcessando(null)
    }
  }

  const salvarFoto = ({ legenda, data }) => {
    const { column, src } = novaFoto
    const foto = { id: uid(), src, legenda: legenda.trim(), data, criada_em: new Date().toISOString() }
    setNovaFoto(null)
    mutateArray(comodo.id, column, (arr) => [...arr, foto]).catch(() => {})
  }

  const excluirFoto = () => {
    const { column, foto } = viewer
    setConfirmDel(false)
    setViewer(null)
    mutateArray(comodo.id, column, (arr) => arr.filter((f) => f.id !== foto.id)).catch(() => {})
  }

  const podeComparar = comodo.fotos_antes.length > 0 && comodo.fotos_hoje.length > 0

  return (
    <SectionCard
      icon={Camera}
      title="Fotos: Antes vs. Hoje"
      subtitle="Registrem a transformação"
    >
      {podeComparar && (
        <button onClick={() => setComparar(true)} className={`${btnSecondary} mb-4 w-full !text-oliva-700 !ring-oliva-200 bg-oliva-50/50`}>
          <Columns2 className="h-5 w-5" /> Comparar Antes e Hoje
        </button>
      )}

      {erro && <p className="mb-3 rounded-xl bg-terracota-50 px-4 py-3 text-sm font-semibold text-terracota-700">{erro}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {BLOCOS.map((b) => (
          <PhotoBlock
            key={b.column}
            {...b}
            fotos={ordenarFotos(comodo[b.column])}
            processando={processando === b.column}
            onFile={(f) => handleFile(b.column, f)}
            onOpen={(foto) => setViewer({ column: b.column, foto })}
          />
        ))}
      </div>

      <AddPhotoModal novaFoto={novaFoto} onClose={() => setNovaFoto(null)} onSave={salvarFoto} />

      {/* Foto ampliada */}
      <Modal open={!!viewer} onClose={() => setViewer(null)} title={viewer?.column === 'fotos_antes' ? 'Como Era (Antes)' : 'Como Está Hoje'} wide dark>
        {viewer && (
          <div>
            <img src={viewer.foto.src} alt={viewer.foto.legenda || 'Foto'} className="mx-auto max-h-[62vh] w-auto rounded-2xl object-contain" />
            <div className="mt-4 flex items-end justify-between gap-3">
              <div className="min-w-0">
                {viewer.foto.legenda && <p className="font-bold">{viewer.foto.legenda}</p>}
                {viewer.foto.data && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/60">
                    <CalendarDays className="h-4 w-4" /> {formatarData(viewer.foto.data)}
                  </p>
                )}
              </div>
              <button onClick={() => setConfirmDel(true)} className="inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-2xl bg-terracota-600 px-4 font-bold text-white active:scale-95">
                <Trash2 className="h-5 w-5" /> Excluir
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmDel}
        title="Excluir foto?"
        message="A foto será removida para vocês dois. Essa ação não pode ser desfeita."
        onCancel={() => setConfirmDel(false)}
        onConfirm={excluirFoto}
      />

      <CompareModal open={comparar} onClose={() => setComparar(false)} antes={ordenarFotos(comodo.fotos_antes)} hojeFotos={ordenarFotos(comodo.fotos_hoje)} />
    </SectionCard>
  )
}

function PhotoBlock({ title, tone, fotos, processando, onFile, onOpen }) {
  const inputRef = useRef(null)
  const dot = tone === 'oliva' ? 'bg-oliva-600' : 'bg-terracota-600'

  return (
    <div className="rounded-2xl bg-creme p-3 ring-1 ring-stone-100">
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="flex items-center gap-2 font-extrabold text-stone-700">
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} /> {title}
        </h3>
        <span className="text-xs font-bold text-stone-400">{fotos.length} {fotos.length === 1 ? 'foto' : 'fotos'}</span>
      </div>

      {fotos.length === 0 ? (
        <div className="mb-3 flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-stone-200 bg-white py-8 text-stone-400">
          <ImageOff className="h-7 w-7" />
          <span className="text-sm font-semibold">Nenhuma foto ainda</span>
        </div>
      ) : (
        <div className="mb-3 grid grid-cols-3 gap-2">
          {fotos.map((f) => (
            <button key={f.id} onClick={() => onOpen(f)} className="group relative aspect-square overflow-hidden rounded-xl bg-stone-200">
              <img src={f.src} alt={f.legenda || ''} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
              {f.data && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-4 text-[10px] font-bold text-white">
                  {formatarData(f.data)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <button onClick={() => inputRef.current?.click()} disabled={processando} className={`${btnSecondary} w-full`}>
        {processando ? <><Loader2 className="h-5 w-5 animate-spin" /> Otimizando foto...</> : <><Plus className="h-5 w-5" /> Adicionar Foto</>}
      </button>
    </div>
  )
}

function AddPhotoModal({ novaFoto, onClose, onSave }) {
  const [legenda, setLegenda] = useState('')
  const [data, setData] = useState(hoje())

  const fechar = () => {
    setLegenda('')
    setData(hoje())
    onClose()
  }
  const salvar = (e) => {
    e.preventDefault()
    onSave({ legenda, data: data || hoje() })
    setLegenda('')
    setData(hoje())
  }

  return (
    <Modal open={!!novaFoto} onClose={fechar} title={novaFoto?.column === 'fotos_antes' ? 'Foto de antes' : 'Foto de hoje'}>
      {novaFoto && (
        <form onSubmit={salvar} className="space-y-4">
          <img src={novaFoto.src} alt="Pré-visualização" className="max-h-72 w-full rounded-2xl bg-stone-100 object-contain" />
          <div>
            <label className="mb-1.5 block text-sm font-bold text-stone-700">Legenda</label>
            <input className={inputCls} value={legenda} onChange={(e) => setLegenda(e.target.value)} placeholder="Ex.: Parede da pia" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-stone-700">Data</label>
            <input type="date" className={inputCls} value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className={btnSecondary} onClick={fechar}>Cancelar</button>
            <button type="submit" className={btnPrimary}>Salvar foto</button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function CompareModal({ open, onClose, antes, hojeFotos }) {
  const [ia, setIa] = useState(0) // primeira foto de antes
  const [ih, setIh] = useState(null) // null = mais recente de hoje

  const idxA = Math.min(ia, antes.length - 1)
  const idxH = ih === null ? hojeFotos.length - 1 : Math.min(ih, hojeFotos.length - 1)

  return (
    <Modal open={open} onClose={onClose} title="Antes × Hoje" wide>
      {antes.length > 0 && hojeFotos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <CompareSide
            label="Antes"
            tone="terracota"
            fotos={antes}
            idx={idxA}
            setIdx={setIa}
          />
          <CompareSide
            label="Hoje"
            tone="oliva"
            fotos={hojeFotos}
            idx={idxH}
            setIdx={setIh}
          />
        </div>
      )}
      <p className="mt-4 text-center text-xs text-stone-400">Use as setas para escolher qual foto comparar de cada lado.</p>
    </Modal>
  )
}

function CompareSide({ label, tone, fotos, idx, setIdx }) {
  const f = fotos[idx]
  const badge = tone === 'oliva' ? 'bg-oliva-600' : 'bg-terracota-600'
  const prev = () => setIdx((idx - 1 + fotos.length) % fotos.length)
  const next = () => setIdx((idx + 1) % fotos.length)
  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-stone-100">
        <img src={f.src} alt={f.legenda || label} className="aspect-[3/4] w-full object-cover sm:aspect-[4/3]" />
        <span className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-extrabold text-white ${badge}`}>{label}</span>
        {fotos.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow active:scale-90" aria-label="Foto anterior">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={next} className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 shadow active:scale-90" aria-label="Próxima foto">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
      <div className="mt-2 px-1">
        <p className="truncate text-sm font-bold text-stone-700">{f.legenda || '—'}</p>
        <p className="text-xs text-stone-400">
          {formatarData(f.data)} {fotos.length > 1 && `· ${idx + 1}/${fotos.length}`}
        </p>
      </div>
    </div>
  )
}
