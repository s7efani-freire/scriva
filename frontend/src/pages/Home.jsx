import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGravacao } from '../hooks/useGravacao.js'
import { processarAudio } from '../services/api.js'
import AtaViewer from '../components/AtaViewer.jsx'

const TIPOS_INFO = {
  daily:       { label: 'Daily',              icon: '◷', color: '#d4457a', bg: 'rgba(212,69,122,0.07)', border: 'rgba(212,69,122,0.2)' },
  projeto:     { label: 'Reunião de Projeto', icon: '◈', color: '#3a6ea8', bg: 'rgba(58,110,168,0.07)', border: 'rgba(58,110,168,0.2)' },
  alinhamento: { label: 'Alinhamento',        icon: '◎', color: '#3a7a52', bg: 'rgba(58,122,82,0.07)',  border: 'rgba(58,122,82,0.2)' },
  geral:       { label: 'Reunião Geral',      icon: '◇', color: '#b87320', bg: 'rgba(184,115,32,0.07)', border: 'rgba(184,115,32,0.2)' },
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
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      fontSize: '11px', fontWeight: 700, color: ti.color,
      background: ti.bg, border: `1px solid ${ti.border}`,
      padding: '3px 10px', borderRadius: '100px'
    }}>
      {ti.icon} {ti.label}
    </span>
  )

  // Tela de resultado
  if (estado === 'pronto' && resultado) {
    return (
      <div style={{ padding: '40px 48px', animation: 'fadeIn 0.3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #e0ddd9', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <TipoBadge />
            <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px' }}>ATA gerada</h2>
            <p style={{ fontSize: '12px', color: '#a09890' }}>Revise e edite os campos antes de salvar</p>
          </div>
          <button onClick={handleNova} style={{
            background: '#d4457a', color: '#fff', fontSize: '13px', fontWeight: 600,
            padding: '9px 20px', borderRadius: '8px', cursor: 'pointer', border: 'none',
            marginTop: '8px', transition: 'background 0.15s'
          }}>Nova gravação</button>
        </div>
        <AtaViewer ata={resultado.ata} dailyId={resultado.id} />
      </div>
    )
  }

  // Tela de gravação — duas colunas
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ padding: '32px 40px 24px', borderBottom: '1px solid #e0ddd9', background: '#fff' }}>
        <div style={{ marginBottom: '10px' }}><TipoBadge /></div>
        <h1 style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.6px', color: '#18150f' }}>
          {estado === 'idle' ? 'Pronto para gravar' :
           estado === 'gravando' ? 'Gravando...' :
           estado === 'pausado' ? 'Pausado' :
           estado === 'processando' ? 'Processando...' : 'Ocorreu um erro'}
        </h1>
        <p style={{ fontSize: '13px', color: '#a09890', marginTop: '4px', textTransform: 'capitalize' }}>
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Corpo — duas colunas */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Coluna esquerda — visualizador */}
        <div style={{ flex: 1, padding: '32px', borderRight: '1px solid #e0ddd9', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card ondas */}
          <div style={{
            flex: 1, background: '#fff', border: '1px solid #e0ddd9', borderRadius: '16px',
            padding: '28px 24px 20px', display: 'flex', flexDirection: 'column', gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)', minHeight: '180px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', flex: 1 }}>
              {barras.map((h, i) => (
                <div key={i} style={{
                  width: '3px', height: `${h * 100}%`, minHeight: '3px', borderRadius: '2px',
                  background: estado === 'gravando' ? '#d4457a' : '#cec9c5',
                  opacity: estado === 'gravando' ? 0.5 + h * 0.5 : 0.15,
                  transition: estado === 'gravando' ? 'height 0.08s ease' : 'all 0.4s ease',
                }} />
              ))}
            </div>
            {emGravacao && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f5f4f2', borderRadius: '6px', padding: '10px 14px' }}>
                <span style={{
                  width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                  background: estado === 'pausado' ? '#b87320' : '#d4457a',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }} />
                <span style={{ fontSize: '13px', color: '#6b6560', fontStyle: 'italic' }}>
                  {estado === 'pausado' ? 'Gravação pausada' : tvTexto}
                </span>
                {estado === 'gravando' && (
                  <span style={{ width: '2px', height: '14px', background: '#d4457a', borderRadius: '1px', animation: 'blink 1s step-end infinite' }} />
                )}
              </div>
            )}
          </div>

          {/* Timer */}
          {emGravacao && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '52px', fontWeight: 300, color: '#18150f', letterSpacing: '-4px', lineHeight: 1 }}>
                {tempoGravacao}
              </span>
              {estado === 'pausado' && (
                <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: '#b87320', background: 'rgba(184,115,32,0.08)', border: '1px solid rgba(184,115,32,0.2)', padding: '4px 10px', borderRadius: '100px' }}>
                  PAUSADO
                </span>
              )}
            </div>
          )}
        </div>

        {/* Coluna direita — controles */}
        <div style={{ width: '320px', flexShrink: 0, padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>

          {estado === 'idle' && (
            <>
              <p style={{ fontSize: '13px', color: '#a09890', lineHeight: 1.7, background: '#fff', border: '1px solid #e0ddd9', borderLeft: '3px solid #f0a0bc', borderRadius: '8px', padding: '14px 16px' }}>
                Peça para cada participante dizer o nome antes de falar para a ATA identificar automaticamente quem disse o quê.
              </p>
              <button onClick={iniciarGravacao} style={{
                display: 'flex', alignItems: 'center', gap: '10px', background: '#d4457a', color: '#fff',
                fontSize: '14px', fontWeight: 600, padding: '13px 28px', borderRadius: '100px',
                cursor: 'pointer', border: 'none', width: 'fit-content',
                boxShadow: '0 4px 16px rgba(212,69,122,0.25)', transition: 'all 0.15s'
              }}>
                <span style={{ width: '8px', height: '8px', background: 'rgba(255,255,255,0.8)', borderRadius: '50%' }} />
                Iniciar gravação
              </button>
            </>
          )}

          {emGravacao && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: '#a09890', lineHeight: 1.7, background: '#fff', border: '1px solid #e0ddd9', borderLeft: '3px solid #f0a0bc', borderRadius: '8px', padding: '14px 16px' }}>
                {estado === 'gravando'
                  ? 'Pausar não encerra a gravação — use para pequenas pausas.'
                  : 'Gravação pausada. Retome quando quiser ou finalize para gerar a ATA.'}
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {estado === 'gravando' ? (
                  <button onClick={pausarGravacao} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: '#fff', border: '1px solid #cec9c5', color: '#6b6560', fontSize: '13px', fontWeight: 500, padding: '10px 20px', borderRadius: '100px', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor"><rect x="1" y="1" width="3" height="9" rx="1"/><rect x="7" y="1" width="3" height="9" rx="1"/></svg>
                    Pausar
                  </button>
                ) : (
                  <button onClick={retormarGravacao} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'rgba(212,69,122,0.07)', border: '1px solid rgba(212,69,122,0.2)', color: '#d4457a', fontSize: '13px', fontWeight: 600, padding: '10px 20px', borderRadius: '100px', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor"><path d="M2 1l8 4.5-8 4.5V1z"/></svg>
                    Retomar
                  </button>
                )}
                <button onClick={handleParar} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#18150f', color: '#fff', fontSize: '13px', fontWeight: 600, padding: '10px 20px', borderRadius: '100px', cursor: 'pointer', border: 'none', transition: 'opacity 0.15s' }}>
                  <span style={{ width: '10px', height: '10px', background: '#fff', borderRadius: '2px' }} />
                  Parar e gerar ATA
                </button>
              </div>
              <button onClick={handleNova} style={{ background: 'none', border: 'none', color: '#a09890', fontSize: '12px', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                Cancelar gravação
              </button>
            </div>
          )}

          {estado === 'processando' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ width: '100%', height: '3px', background: '#e0ddd9', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#d4457a', borderRadius: '2px', width: progresso < 100 ? `${progresso}%` : '100%', minWidth: '6px', transition: 'width 0.3s ease' }} />
              </div>
              <p style={{ fontSize: '13px', color: '#6b6560' }}>
                {progresso < 100 ? `Enviando áudio... ${progresso}%` : 'Gerando ATA com IA...'}
              </p>
            </div>
          )}

          {estado === 'erro' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'rgba(201,64,64,0.05)', border: '1px solid rgba(201,64,64,0.2)', borderRadius: '10px' }}>
              <p style={{ fontSize: '13px', color: '#c94040', lineHeight: 1.6 }}>{erro || erroApi}</p>
              <button onClick={handleNova} style={{ background: '#d4457a', color: '#fff', fontSize: '13px', fontWeight: 600, padding: '10px 20px', borderRadius: '100px', cursor: 'pointer', border: 'none', width: 'fit-content' }}>
                Tentar novamente
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}