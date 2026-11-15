import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Se algo quebrar, mostra o erro na tela em vez de deixar tudo em branco
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 520, margin: '40px auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Ops, algo deu errado 😕</h1>
        <p style={{ color: '#57534e', marginBottom: 12 }}>Tire um print desta tela e mande para o Claude:</p>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f4', padding: 12, borderRadius: 12, fontSize: 12 }}>
          {String(this.state.error?.stack || this.state.error)}
        </pre>
        <button
          onClick={() => window.location.reload()}
          style={{ marginTop: 16, padding: '12px 20px', borderRadius: 14, background: '#556B2F', color: '#fff', fontWeight: 700, border: 0 }}
        >
          Recarregar
        </button>
      </div>
    )
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
