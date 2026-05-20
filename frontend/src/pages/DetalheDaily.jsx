import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { buscarDaily, downloadAta } from '../services/api.js'
import AtaViewer from '../components/AtaViewer.jsx'

export default function DetalheDaily() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [daily, setDaily] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarDaily(id)
      .then(setDaily)
      .catch(() => navigate('/historico'))
      .finally(() => setCarregando(false))
  }, [id])

  if (carregando) return (
    <div className="flex justify-center pt-20">
      <div className="w-6 h-6 border-2 border-brd border-t-accent rounded-full animate-spin" />
    </div>
  )

  if (!daily) return null

  return (
    <div className="p-6 md:p-10">
      <div className="mb-7 pb-6 border-b border-brd flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link to="/historico" className="text-xs text-tx-ter hover:text-accent font-medium transition-colors inline-flex items-center gap-1 mb-3">
            ← Histórico
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-tx-main">
            {daily.tipo ? daily.tipo.charAt(0).toUpperCase() + daily.tipo.slice(1) : 'Daily'} — {daily.data}
          </h1>
          <p className="text-xs text-tx-ter font-mono mt-2">
            Registrada às {new Date(daily.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => downloadAta(daily.id, 'md')}
            className="flex items-center gap-1.5 text-sm font-semibold text-tx-sec bg-bg-page border border-brd hover:border-accent/40 hover:text-accent px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Baixar .md
          </button>
          <button
            onClick={() => downloadAta(daily.id, 'pdf')}
            className="flex items-center gap-1.5 text-sm font-semibold text-tx-sec bg-bg-page border border-brd hover:border-accent/40 hover:text-accent px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Baixar PDF
          </button>
        </div>
      </div>
      <AtaViewer ata={daily.ata} dailyId={daily.id} readOnly />
    </div>
  )
}