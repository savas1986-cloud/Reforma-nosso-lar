import { useEffect, useState } from 'react'
import { Settings, KeyRound, Eye, EyeOff, ExternalLink, Check, Loader2, AlertTriangle, Sparkles } from 'lucide-react'
import { Modal, inputCls, btnPrimary, btnSecondary } from './ui'

const STORAGE_KEY = 'nossa-reforma:gemini-key'
const EVENTO = 'nossa-reforma:gemini-key-changed'

export const getGeminiKey = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export const setGeminiKey = (valor) => {
  try {
    if (valor) localStorage.setItem(STORAGE_KEY, valor)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* navegador sem armazenamento: segue sem chave */
  }
  window.dispatchEvent(new Event(EVENTO))
}

export function useGeminiKey() {
  const [key, setKey] = useState(getGeminiKey)
  useEffect(() => {
    const atualizar = () => setKey(getGeminiKey())
    window.addEventListener(EVENTO, atualizar)
    window.addEventListener('storage', atualizar)
    return () => {
      window.removeEventListener(EVENTO, atualizar)
      window.removeEventListener('storage', atualizar)
    }
  }, [])
  return key
}

/** Testa a chave com uma chamada mínima ao Gemini */
async function testarChave(key) {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Responda apenas: OK' }] }],
      generationConfig: { maxOutputTokens: 5, thinkingConfig: { thinkingBudget: 0 } },
    }),
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j?.error?.message || `Erro ${res.status}`)
  }
}

/** Engrenagem discreta + janela de configurações */
export function SettingsButton({ className = '' }) {
  const [open, setOpen] = useState(false)
  const keySalva = useGeminiKey()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`relative grid h-10 w-10 place-items-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-700 ${className}`}
        aria-label="Configurações"
      >
        <Settings className="h-5 w-5" />
        {keySalva && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-oliva-600 ring-2 ring-creme" />}
      </button>
      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function SettingsModal({ open, onClose }) {
  const keySalva = useGeminiKey()
  const [valor, setValor] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [teste, setTeste] = useState(null) // null | 'testando' | 'ok' | {erro}

  useEffect(() => {
    if (open) {
      setValor(keySalva)
      setTeste(null)
      setMostrar(false)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = () => {
    setGeminiKey(valor.trim())
    onClose()
  }
  const remover = () => {
    setGeminiKey('')
    setValor('')
    setTeste(null)
  }
  const testar = async () => {
    setTeste('testando')
    try {
      await testarChave(valor.trim())
      setTeste('ok')
    } catch (e) {
      setTeste({ erro: e.message })
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Configurações">
      <div className="space-y-4">
        <div className="rounded-2xl bg-oliva-50/60 p-4 ring-1 ring-oliva-100">
          <p className="mb-1 flex items-center gap-2 font-extrabold text-stone-800">
            <Sparkles className="h-4 w-4 text-terracota-600" /> Consultor de Reforma com IA
          </p>
          <p className="text-sm text-stone-600">
            Cole uma chave gratuita do <b>Google Gemini</b> para receber sugestões personalizadas para cada cômodo. Sem chave, o app usa um assistente com boas práticas de arquitetura e decoração.
          </p>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-oliva-700 underline-offset-2 hover:underline"
          >
            Pegar chave grátis no Google AI Studio <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-bold text-stone-700">
            <KeyRound className="h-4 w-4" /> Chave da API do Gemini
          </label>
          <div className="relative">
            <input
              type={mostrar ? 'text' : 'password'}
              className={`${inputCls} pr-12 font-mono text-sm`}
              value={valor}
              onChange={(e) => {
                setValor(e.target.value)
                setTeste(null)
              }}
              placeholder="AIza..."
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setMostrar((m) => !m)}
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-stone-400 hover:bg-stone-100"
              aria-label={mostrar ? 'Esconder chave' : 'Mostrar chave'}
            >
              {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-stone-400">
            Fica salva só neste aparelho (cada celular configura a sua). Modelo usado: gemini-2.5-flash.
          </p>
        </div>

        {teste === 'ok' && (
          <p className="flex items-center gap-2 rounded-xl bg-oliva-50 px-3 py-2 text-sm font-bold text-oliva-700">
            <Check className="h-4 w-4" /> Chave funcionando!
          </p>
        )}
        {teste?.erro && (
          <p className="flex items-start gap-2 rounded-xl bg-terracota-50 px-3 py-2 text-sm font-semibold text-terracota-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {teste.erro}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button className={btnSecondary} onClick={testar} disabled={!valor.trim() || teste === 'testando'}>
            {teste === 'testando' ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Testar'}
          </button>
          <button className={btnPrimary} onClick={salvar}>
            Salvar
          </button>
        </div>
        {keySalva && (
          <button onClick={remover} className="w-full py-2 text-sm font-bold text-terracota-700 hover:underline">
            Remover chave deste aparelho
          </button>
        )}
      </div>
    </Modal>
  )
}
