import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { buscarHistorico, deletarDaily } from '../services/api.js'

const TIPO_LABELS = {
  daily: 'Daily', projeto: 'Projeto', alinhamento: 'Alinhamento', geral: 'Geral',
}

export default function Historico() {
  const [dailys, setDailys] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarHistorico().then(setDailys).finally(() => setCarregando(false))
  }, [])

  async function handleDeletar(id, e) {
    e.preventDefault()
    if (!confirm('Deletar esta reunião?')) return
    await deletarDaily(id)
    setDailys((prev) => prev.filter((d) => d.id !== id))
  }

  if (carregando) return (
    <div className="flex justify-center pt-20">
      <div className="w-6 h-6 border-2 border-[#e0ddd9] border-t-[#d4457a] rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div className="p-10">
      <div className="flex items-end justify-between mb-7 pb-6 border-b border-[#e0ddd9]">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Histórico</h1>
          <p className="text-sm text-[#a09890] mt-1">{dailys.length} reunião{dailys.length !== 1 ? 'ões' : ''} registrada{dailys.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {dailys.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-[#a09890]">
          <p className="text-sm">Nenhuma reunião registrada ainda.</p>
          <Link to="/" className="text-sm text-[#d4457a] font-medium hover:opacity-70 transition-opacity">Gravar primeira reunião →</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {dailys.map((d) => (
            <Link to={`/historico/${d.id}`} key={d.id} className="flex items-start justify-between gap-4 bg-white border border-[#e0ddd9] rounded-xl px-5 py-4 shadow-sm hover:border-pink-200 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#d4457a] font-medium">{d.data}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-[#a09890] bg-[#eeeceb] border border-[#e0ddd9] px-2 py-0.5 rounded-full">{TIPO_LABELS[d.tipo] || d.tipo}</span>
                </div>
                <p className="text-sm text-[#6b6560] leading-relaxed line-clamp-2">{d.resumo || 'Sem resumo'}</p>
                {d.participantes && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {d.participantes.split(', ').map((p, i) => (
                      <span key={i} className="text-[10px] text-[#a09890] bg-[#f5f4f2] border border-[#e0ddd9] px-2 py-0.5 rounded-full">{p}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className="font-mono text-xs text-[#a09890]">
                  {new Date(d.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  onClick={(e) => handleDeletar(d.id, e)}
                  className="text-[#a09890] hover:text-[#c94040] p-1 rounded transition-colors"
                  title="Deletar"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}