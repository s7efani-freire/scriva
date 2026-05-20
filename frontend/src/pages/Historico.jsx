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
      <div className="w-7 h-7 border-2 border-brd border-t-accent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex items-end justify-between mb-8 pb-6 border-b border-brd">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-tx-main md:text-4xl">Histórico</h1>
          <p className="text-base text-tx-ter mt-1.5 font-medium">
            {dailys.length === 1 ? '1 reunião registrada' : `${dailys.length} reuniões registradas`}
          </p>
        </div>
      </div>

      {dailys.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-tx-ter">
          <p className="text-base">Nenhuma reunião registrada ainda.</p>
          <Link to="/" className="text-base text-accent font-semibold hover:opacity-70 transition-opacity">
            Gravar primeira reunião →
          </Link>
        </div>
      ) : (
        /* Grid responsivo com excelente tamanho de visualização */
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {dailys.map((d) => (
            <Link
              to={`/historico/${d.id}`}
              key={d.id}
              className="flex flex-col gap-4 bg-bg-card border border-brd rounded-2xl p-6 shadow-sm hover:border-accent/40 hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-accent font-semibold">{d.data}</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-tx-ter bg-bg-page border border-brd px-2.5 py-0.5 rounded-full">
                    {TIPO_LABELS[d.tipo] || d.tipo}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs md:text-sm text-tx-ter">
                    {new Date(d.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={(e) => handleDeletar(d.id, e)}
                    className="text-tx-ter hover:text-error p-1 rounded transition-colors"
                    title="Deletar"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </div>

              <p className="text-sm md:text-base text-tx-sec leading-relaxed line-clamp-3">
                {d.resumo || 'Sem resumo'}
              </p>

              {d.participantes && d.participantes !== 'null' && (
                <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                  {d.participantes.split(', ').map((p, i) => (
                    <span key={i} className="text-xs text-tx-ter bg-bg-page border border-brd px-3 py-1 rounded-full shadow-inner">
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}