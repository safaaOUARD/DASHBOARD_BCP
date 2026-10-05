import { useMemo, useState } from 'react'
import { assistantChat, downloadAssistantReport } from '../api'
import { useDateArret } from '../context/DateArretContext'
import './AssistantChat.css'

const INITIAL_MESSAGE = { role: 'assistant', text: 'Bonjour. Je peux analyser les KPI, comparer T0/T-1/N-1/arrêté annuel et préparer des rapports.' }

export default function AssistantChat({ utilisateur }) {
  const { dateArret } = useDateArret()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([INITIAL_MESSAGE])
  const [loading, setLoading] = useState(false)
  const sessionId = useMemo(() => `assistant-${utilisateur.id}`, [utilisateur.id])

  const send = async (event) => {
    event?.preventDefault()
    const value = message.trim()
    if (!value || loading) return
    setMessages((items) => [...items, { role: 'user', text: value }])
    setMessage('')
    setLoading(true)
    try {
      const result = await assistantChat({ message: value, context: { session_id: sessionId, date_t0: dateArret || null } })
      setMessages((items) => [...items, { role: 'assistant', text: result.message, data: result.data, context: result.context }])
    } catch (error) {
      setMessages((items) => [...items, { role: 'assistant', text: error?.response?.data?.detail || 'Une erreur est survenue lors de l’analyse.' }])
    } finally {
      setLoading(false)
    }
  }

  const generateReport = async (format, context) => {
    try {
      const blob = await downloadAssistantReport(format, { date_t0: context?.date_t0 || dateArret || null, metric: context?.metric || 'EAD_MAD', dashboard: context?.dashboard || null })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `rapport_bcp.${format === 'excel' ? 'xlsx' : format}`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      alert(error?.response?.data?.detail || 'Impossible de générer le rapport. Vérifiez votre permission d’export.')
    }
  }

  return (
    <section className={`assistant-chat${open ? ' assistant-chat--open' : ''}`} aria-label="BCP Intelligent Assistant">
      {open && <div className="assistant-chat__panel">
        <header><strong>BCP Intelligent Assistant</strong><button onClick={() => setOpen(false)} aria-label="Fermer">×</button></header>
        <div className="assistant-chat__messages">
          {messages.map((item, index) => <div className={`assistant-message assistant-message--${item.role}`} key={index}>
            <div>{item.text}</div>
            {item.data?.series && <div className="assistant-series">{item.data.series.map((value) => <span key={value.key}>{value.key}: {value.value} {value.unit}</span>)}</div>}
            {item.role === 'assistant' && item.context && utilisateur.peut_exporter && <div className="assistant-actions">
              <button onClick={() => generateReport('pdf', item.context)}>PDF</button>
              <button onClick={() => generateReport('pptx', item.context)}>PowerPoint</button>
              <button onClick={() => generateReport('excel', item.context)}>Excel</button>
            </div>}
          </div>)}
          {loading && <div className="assistant-message assistant-message--assistant">Analyse en cours…</div>}
        </div>
        <form onSubmit={send}><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ex. Analyse Bâloise au 30 juin 2026" /><button disabled={loading}>Envoyer</button></form>
      </div>}
      {!open && <button className="assistant-chat__launcher" onClick={() => setOpen(true)}>✦ Assistant BCP</button>}
    </section>
  )
}
