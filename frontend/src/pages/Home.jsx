import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGravacao } from '../hooks/useGravacao.js'
import { processarAudio } from '../services/api.js'
import AtaViewer from '../components/AtaViewer.jsx'

const TIPOS_INFO = {
  daily: { label: 'Daily', icon: '◷', color: '#d4457a', bg: 'rgba(212,69,122,0.07)', border: 'rgba(212,69,122,0.2)' },
  projeto: { label: 'Reunião de Projeto', icon: '◈', color: '#3a6ea8', bg: 'rgba(58,110,168,0.07)', border: 'rgba(58,110,168,0.2)' },
  alinhamento: { label: 'Alinhamento', icon: '◎', color: '#3a7a52', bg: 'rgba(58,122,82,0.07)', border: 'rgba(58,122,82,0.2)' },
  geral: { label: 'Reunião Geral', icon: '◇', color: '#b87320', bg: 'rgba(184,115,32,0.07)', border: 'rgba(184,115,32,0.2)' },
}

const BARRAS = 32

export default function Home() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tipo = searchParams.get('tipo') || 'daily'
  const ti = TIPOS_INFO[tipo] || TIPOS_INFO.daily

  const { estado, setEstado, tempoGravacao, volume, erro, iniciarGravacao, pausarGravacao, retormarGravacao, pararGravacao, resetar } = useGravacao()
  const [resultado, setResultado] = useState(null)
  const [progresso, setProgresso] = useState(0)
  const [erroApi, setErroApi] = useState(null)
  const [barras, setBarras] = useState(() => Array(BARRAS).fill(0.1))
  const [tvTexto, setTvTexto] = useState('Ouvindo...')

  useEffect(() => {
    if (estado !== 'gravando') { setBarras(Array(BARRAS).fill(0.1)); return }
    const id = setInterval(() => {
      setBarras(Array.from({ length: BARRAS }, (_, i) => {
        const dist = Math.abs(i - BARRAS / 2) / (BARRAS / 2)
        const base = (volume / 100) * (1 - dist * 0.4)
        return Math.max(0.08, Math.min(1, base + Math.random() * 0.25))
      }))
    }, 80)
    return () => clearInterval(id)
  }, [estado, volume])

  useEffect(() => {
    if (estado !== 'gravando') return
    const frases = ['Ouvindo...', 'Capturando áudio...', 'Gravando...']
    let i = 0
    const id = setInterval(() => { i++; setTvTexto(frases[i % frases.length]) }, 2500)
    return () => clearInterval(id)
  }, [estado])

  useEffect(() => { if (estado === 'idle') { resetar(); setResultado(null) } }, [tipo])

  async function handleParar() {
    const blob = await pararGravacao()
    if (!blob) return
    try {
      setErroApi(null)
      const data = await processarAudio(blob, tipo, setProgresso)
      setResultado(data); setEstado('pronto')
    } catch (err) {
      setErroApi(err.response?.data?.erro || 'Erro ao processar o áudio.')
      setEstado('erro')
    }
  }

  function handleNova() { resetar(); setResultado(null); setProgresso(0); setErroApi(null) }

  const emGravacao = estado === 'gravando' || estado === 'pausado'

  const TipoBadge = () => (
    <span
      className="inline-flex items-center gap-1.5 text-xs md:text-sm font-bold px-3 py-1.5 rounded-full shadow-sm"
      style={{ color: ti.color, background: ti.bg, border: `1px solid ${ti.border}` }}
    >
      {ti.icon} {ti.label}
    </span>
  )


  if (estado === 'pronto' && resultado) {
    return (
      <div className="p-6 md:p-10 max-w-7xl mx-auto animate-[fadeIn_0.3s_ease]">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-brd gap-4">
          <div className="flex flex-col gap-2 items-start">
            <TipoBadge />
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-tx-main">ATA gerada</h2>
            <p className="text-base text-tx-ter font-medium">Revise e edite os campos antes de salvar</p>
          </div>
          <button
            onClick={handleNova}
            className="bg-accent hover:bg-accent-hover text-white text-base font-semibold py-2.5 px-6 rounded-xl shadow-sm transition-all md:mt-2 hover:-translate-y-0.5"
          >
            Nova gravação
          </button>
        </div>
        <AtaViewer ata={resultado.ata} dailyId={resultado.id} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto">

      <div className="px-6 py-6 md:px-10 md:py-8 border-b border-brd bg-bg-card md:bg-transparent">
        <div className="mb-3"><TipoBadge /></div>
        <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-tx-main">
          {estado === 'idle' ? 'Pronto para gravar' :
            estado === 'gravando' ? 'Gravando...' :
              estado === 'pausado' ? 'Pausado' :
                estado === 'processando' ? 'Processando...' : 'Ocorreu um erro'}
        </h1>
        <p className="text-sm md:text-base text-tx-ter mt-1.5 font-medium capitalize">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0">

        <div className="flex-1 p-6 md:p-10 flex flex-col gap-6">

          <div className="flex-1 bg-bg-card border border-brd rounded-2xl p-6 md:p-8 flex flex-col gap-5 shadow-sm min-h-[220px]">
            <div className="flex items-center justify-center gap-[4px] fill-current flex-1">
              {barras.map((h, i) => (
                <div key={i} className="w-[4px] min-h-[4px] rounded-[2px]" style={{
                  height: `${h * 100}%`,
                  background: estado === 'gravando' ? 'var(--color-accent)' : '#cec9c5',
                  opacity: estado === 'gravando' ? 0.5 + h * 0.5 : 0.2,
                  transition: estado === 'gravando' ? 'height 0.08s ease' : 'all 0.4s ease',
                }} />
              ))}
            </div>

            {emGravacao && (
              <div className="flex items-center gap-2.5 bg-bg-page border border-brd rounded-xl py-3 px-5 mx-auto lg:mx-0 w-fit shadow-inner">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${estado === 'pausado' ? 'bg-[#b87320]' : 'bg-accent'}`} style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
                <span className="text-base text-tx-sec italic font-medium">
                  {estado === 'pausado' ? 'Gravação pausada' : tvTexto}
                </span>
                {estado === 'gravando' && (
                  <span className="w-[2px] h-[16px] bg-accent rounded-[1px]" style={{ animation: 'blink 1s step-end infinite' }} />
                )}
              </div>
            )}
          </div>

          {emGravacao && (
            <div className="flex items-center gap-4 justify-center lg:justify-start">
              <span className="font-mono text-5xl md:text-7xl font-light text-tx-main tracking-tighter leading-none">
                {tempoGravacao}
              </span>
              {estado === 'pausado' && (
                <span className="text-xs font-bold tracking-[1.5px] text-[#b87320] bg-[rgba(184,115,32,0.08)] border border-[rgba(184,115,32,0.2)] py-1.5 px-3.5 rounded-full shadow-sm">
                  PAUSADO
                </span>
              )}
            </div>
          )}
        </div>

        <div className="w-full lg:w-[360px] shrink-0 p-6 md:p-10 flex flex-col justify-center gap-6">

          {estado === 'idle' && (
            <>
              <p className="text-sm md:text-base text-tx-sec leading-relaxed bg-bg-card border border-brd border-l-4 border-l-[#f0a0bc] rounded-xl py-4 px-5 shadow-sm">
                Peça para cada participante dizer o nome antes de falar para a ATA identificar automaticamente quem disse o quê.
              </p>
              <button onClick={iniciarGravacao} className="flex items-center justify-center gap-3 bg-accent hover:bg-accent-hover text-white text-base font-bold py-4 px-8 rounded-full shadow-[0_4px_20px_rgba(212,69,122,0.25)] transition-all w-full lg:w-fit hover:-translate-y-0.5">
                <span className="w-2.5 h-2.5 bg-white/95 rounded-full animate-pulse" />
                Iniciar gravação
              </button>
            </>
          )}

          {emGravacao && (
            <div className="flex flex-col gap-5">
              <p className="text-sm md:text-base text-tx-sec leading-relaxed bg-bg-card border border-brd border-l-4 border-l-[#f0a0bc] rounded-xl py-4 px-5 shadow-sm">
                {estado === 'gravando'
                  ? 'Pausar não encerra a gravação — use para pequenas pausas.'
                  : 'Gravação pausada. Retome quando quiser ou finalize para gerar a ATA.'}
              </p>

              <div className="flex gap-2 w-full justify-center lg:justify-start">
                {estado === 'gravando' ? (
                  <button onClick={pausarGravacao} className="flex items-center gap-2 bg-bg-card border border-[#cec9c5] text-tx-sec hover:bg-bg-page text-base font-medium py-3 px-4 rounded-full transition-all flex-1 justify-center whitespace-nowrap shadow-sm">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor"><rect x="1" y="1" width="3" height="9" rx="1" /><rect x="7" y="1" width="3" height="9" rx="1" /></svg>
                    Pausar
                  </button>
                ) : (
                  <button onClick={retormarGravacao} className="flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 text-base font-semibold py-3 px-4 rounded-full transition-all flex-1 justify-center whitespace-nowrap shadow-sm">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor"><path d="M2 1l8 4.5-8 4.5V1z" /></svg>
                    Retomar
                  </button>
                )}
                <button onClick={handleParar} className="flex items-center gap-2 bg-tx-main hover:bg-black text-white text-base font-semibold py-3 px-4 rounded-full transition-all flex-1 justify-center whitespace-nowrap shadow-md">
                  <span className="w-2.5 h-2.5 bg-white rounded-[2px]" />
                  Parar e gerar
                </button>
              </div>

              <button onClick={handleNova} className="bg-transparent border-none text-tx-ter hover:text-tx-sec text-base text-center lg:text-left pt-2 transition-colors">
                Cancelar gravação
              </button>
            </div>
          )}

          {estado === 'processando' && (
            <div className="flex flex-col gap-3.5 bg-bg-card border border-brd rounded-xl p-5 shadow-sm">
              <div className="w-full h-[4px] bg-brd rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full min-w-[8px] transition-all duration-300 ease-out"
                  style={{ width: progresso < 100 ? `${progresso}%` : '100%' }}
                />
              </div>
              <p className="text-base font-medium text-tx-sec text-center lg:text-left">
                {progresso < 100 ? `Enviando áudio... ${progresso}%` : 'Gerando ATA com LLaMA...'}
              </p>
            </div>
          )}

          {estado === 'erro' && (
            <div className="flex flex-col gap-4 p-5 bg-error-bg border border-error-border rounded-xl shadow-sm">
              <p className="text-base text-error font-medium leading-relaxed">{erro || erroApi}</p>
              <button onClick={handleNova} className="bg-accent hover:bg-accent-hover text-white text-base font-bold py-3 px-6 rounded-full w-full transition-colors shadow-sm">
                Tentar novamente
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}