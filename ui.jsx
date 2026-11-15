import { useEffect } from 'react'
import {
  X, Loader2, Check, CloudOff, AlertTriangle, RefreshCw,
  ChefHat, Sofa, BedDouble, Bath, WashingMachine, Trees, Laptop, Home, Baby, Car, Utensils, DoorOpen,
} from 'lucide-react'

export const STATUS = ['Planejando', 'Em Obra', 'Concluído']

export const STATUS_STYLE = {
  Planejando: 'bg-amber-50 text-amber-800 ring-amber-200',
  'Em Obra': 'bg-terracota-50 text-terracota-700 ring-terracota-200',
  Concluído: 'bg-oliva-50 text-oliva-700 ring-oliva-200',
}
export const STATUS_DOT = { Planejando: 'bg-amber-400', 'Em Obra': 'bg-terracota-600', Concluído: 'bg-oliva-600' }

export const inputCls =
  'w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-800 placeholder:text-stone-400 outline-none transition focus:border-oliva-400 focus:ring-4 focus:ring-oliva-100'

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-oliva-600 px-5 py-3 min-h-[48px] font-bold text-white shadow-sm transition hover:bg-oliva-700 active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none'
export const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 min-h-[48px] font-bold text-stone-700 ring-1 ring-stone-200 transition hover:bg-stone-50 active:scale-[.98] disabled:opacity-50'
export const btnDanger =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-terracota-600 px-5 py-3 min-h-[48px] font-bold text-white shadow-sm transition hover:bg-terracota-700 active:scale-[.98]'

export function StatusBadge({ status, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${STATUS_STYLE[status] || STATUS_STYLE.Planejando} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] || STATUS_DOT.Planejando}`} />
      {status}
    </span>
  )
}

export function iconeDoComodo(nome = '') {
  const n = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (/cozinha/.test(n)) return ChefHat
  if (/sala de jantar|jantar/.test(n)) return Utensils
  if (/sala|estar|living|tv/.test(n)) return Sofa
  if (/bebe|crianca|infantil/.test(n)) return Baby
  if (/quarto|suite|dormitorio/.test(n)) return BedDouble
  if (/banheiro|lavabo|wc/.test(n)) return Bath
  if (/lavanderia|area de servico/.test(n)) return WashingMachine
  if (/varanda|jardim|quintal|area externa|sacada|externa/.test(n)) return Trees
  if (/escritorio|home office|estudo/.test(n)) return Laptop
  if (/garagem/.test(n)) return Car
  if (/entrada|hall|corredor/.test(n)) return DoorOpen
  return Home
}

const SYNC = {
  synced: { icon: Check, text: 'Sincronizado', cls: 'text-oliva-700 bg-oliva-50' },
  saving: { icon: Loader2, text: 'Salvando...', cls: 'text-stone-600 bg-stone-100', spin: true },
  connecting: { icon: Loader2, text: 'Conectando...', cls: 'text-stone-500 bg-stone-100', spin: true },
  offline: { icon: CloudOff, text: 'Sem internet', cls: 'text-amber-800 bg-amber-50' },
  error: { icon: AlertTriangle, text: 'Erro ao salvar', cls: 'text-terracota-700 bg-terracota-50' },
}

export function SyncBadge({ state, onRetry }) {
  const s = SYNC[state] || SYNC.synced
  const Icon = s.icon
  const Tag = state === 'error' && onRetry ? 'button' : 'span'
  return (
    <Tag
      onClick={state === 'error' ? onRetry : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${s.cls}`}
      aria-live="polite"
    >
      <Icon className={`h-3.5 w-3.5 ${s.spin ? 'animate-spin' : ''}`} />
      {s.text}
      {state === 'error' && onRetry && <RefreshCw className="h-3 w-3" />}
    </Tag>
  )
}

export function Modal({ open, onClose, title, children, wide = false, dark = false }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-black/45 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full ${wide ? 'sm:max-w-4xl' : 'sm:max-w-md'} max-h-[94vh] animate-up overflow-y-auto rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl ${dark ? 'bg-stone-900 text-white' : 'bg-white'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title !== undefined && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className={`text-lg font-extrabold ${dark ? 'text-white' : 'text-stone-800'}`}>{title}</h2>
            <button
              onClick={onClose}
              className={`-mr-2 rounded-full p-2.5 ${dark ? 'hover:bg-white/10' : 'hover:bg-stone-100'}`}
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, message, confirmText = 'Excluir', onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="mb-6 text-stone-600">{message}</p>
      <div className="grid grid-cols-2 gap-3">
        <button className={btnSecondary} onClick={onCancel}>Cancelar</button>
        <button className={btnDanger} onClick={onConfirm}>{confirmText}</button>
      </div>
    </Modal>
  )
}

export function SectionCard({ icon: Icon, title, subtitle, action, children }) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-suave sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-oliva-50 text-oliva-700">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-extrabold leading-tight text-stone-800">{title}</h2>
            {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
