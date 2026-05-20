import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { buscarDaily } from '../services/api.js'
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
      <div className="mb-7 pb-6 border-b border-brd">
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

      <AtaViewer ata={daily.ata} dailyId={daily.id} />
    </div>
  )
}