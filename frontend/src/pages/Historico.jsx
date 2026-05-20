import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { buscarHistorico, deletarDaily, downloadAta } from '../services/api.js'

const TIPO_LABELS = {
  daily: 'Daily', projeto: 'Projeto', alinhamento: 'Alinhamento', geral: 'Geral',
}

const IconeDownload = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

export default function Historico() {
  const navigate = useNavigate()
  const [dailys, setDailys] = useState([])
  const [todos, setTodos] = useState([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarHistorico().then(data => { setTodos(data); setDailys(data) }).finally(() => setCarregando(false))
  }, [])

  useEffect(() => {
    if (!busca.trim()) { setDailys(todos); return }
    const termo = busca.toLowerCase()
    setDailys(todos.filter(d =>
      d.resumo?.toLowerCase().includes(termo) ||
      d.participantes?.toLowerCase().includes(termo) ||
      d.data?.toLowerCase().includes(termo) ||
      TIPO_LABELS[d.tipo]?.toLowerCase().includes(termo)
    ))
  }, [busca, todos])

  async function handleDeletar(id, e) {
    e.stopPropagation()
    if (!confirm('Deletar esta reunião?')) return
    await deletarDaily(id)
    setTodos(prev => prev.filter(d => d.id !== id))
  }

  if (carregando) return (
    <div className="flex justify-center pt-20">
      <div className="w-7 h-7 border-2 border-brd border-t-accent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-6 border-b border-brd gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-tx-main md:text-4xl">Histórico</h1>
          <p className="text-base text-tx-ter mt-1.5 font-medium">
            {dailys.length === 1 ? '1 reunião registrada' : `${dailys.length} reuniões registradas`}
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-tx-ter" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar por palavra-chave..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-bg-card border border-brd rounded-xl pl-9 pr-4 py-2.5 text-sm text-tx-main outline-none focus:border-accent/50 transition-colors placeholder:text-tx-ter"
          />
          {busca && (
            <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-tx-ter hover:text-tx-main transition-colors text-lg leading-none">×</button>
          )}
        </div>
      </div>

      {dailys.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-tx-ter">
          <p className="text-base">{busca ? 'Nenhuma reunião encontrada.' : 'Nenhuma reunião registrada ainda.'}</p>
          {!busca && <button onClick={() => navigate('/')} className="text-base text-accent font-semibold hover:opacity-70 transition-opacity">Gravar primeira reunião →</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {dailys.map((d) => (
            <div
              key={d.id}
              onClick={() => navigate(`/historico/${d.id}`)}
              className="flex flex-col gap-4 bg-bg-card border border-brd rounded-2xl p-6 shadow-sm hover:border-accent/40 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-accent font-semibold">{d.data}</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-tx-ter bg-bg-page border border-brd px-2.5 py-0.5 rounded-full">
                    {TIPO_LABELS[d.tipo] || d.tipo}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xs text-tx-ter mr-1">
                    {new Date(d.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button onClick={e => { e.stopPropagation(); downloadAta(d.id, 'md') }} className="text-tx-ter hover:text-accent p-1.5 rounded-lg transition-colors" title="Baixar .md">
                    <IconeDownload />
                  </button>
                  <button onClick={e => { e.stopPropagation(); downloadAta(d.id, 'pdf') }} className="text-tx-ter hover:text-accent p-1.5 rounded-lg transition-colors text-xs font-bold" title="Baixar PDF">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </button>
                  <button onClick={e => handleDeletar(d.id, e)} className="text-tx-ter hover:text-error p-1.5 rounded-lg transition-colors" title="Deletar">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
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
                    <span key={i} className="text-xs text-tx-ter bg-bg-page border border-brd px-3 py-1 rounded-full shadow-inner">{p}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}