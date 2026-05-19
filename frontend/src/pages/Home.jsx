import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGravacao } from '../hooks/useGravacao.js'
import { processarAudio } from '../services/api.js'
import AtaViewer from '../components/AtaViewer.jsx'
import styles from './Home.module.css'

const TIPOS_INFO = {
  daily:       { label: 'Daily',               icon: '◷', cor: '#d4457a' },
  projeto:     { label: 'Reunião de Projeto',  icon: '◈', cor: '#3a6ea8' },
  alinhamento: { label: 'Alinhamento',         icon: '◎', cor: '#3a8a5a' },
  geral:       { label: 'Reunião Geral',       icon: '◇', cor: '#c47d2a' },
}

const BARRAS = 24

export default function Home() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tipo = searchParams.get('tipo') || 'daily'
  const tipoInfo = TIPOS_INFO[tipo] || TIPOS_INFO.daily

  const { estado, setEstado, tempoGravacao, volume, erro, iniciarGravacao, pausarGravacao, retormarGravacao, pararGravacao, resetar } = useGravacao()
  const [resultado, setResultado] = useState(null)
  const [progresso, setProgresso] = useState(0)
  const [erroApi, setErroApi] = useState(null)
  const [transcricaoAoVivo, setTranscricaoAoVivo] = useState('')
  const transcricaoRef = useRef(null)

  // Simula transcrição ao vivo mostrando placeholder enquanto grava
  useEffect(() => {
    if (estado === 'gravando') {
      const frases = [
        'Ouvindo...',
        'Capturando áudio...',
        'Gravando reunião...',
      ]
      let i = 0
      const interval = setInterval(() => {
        setTranscricaoAoVivo(frases[i % frases.length])
        i++
      }, 2000)
      return () => clearInterval(interval)
    }
    if (estado !== 'pausado') setTranscricaoAoVivo('')
  }, [estado])

  // Reset ao trocar de tipo
  useEffect(() => {
    if (estado === 'idle') {
      resetar()
      setResultado(null)
    }
  }, [tipo])

  async function handleParar() {
    const blob = await pararGravacao()
    if (!blob) return
    try {
      setErroApi(null)
      const data = await processarAudio(blob, tipo, setProgresso)
      setResultado(data)
      setEstado('pronto')
    } catch (err) {
      setErroApi(err.response?.data?.erro || 'Erro ao processar o áudio.')
      setEstado('erro')
    }
  }

  function handleNovaGravacao() {
    resetar()
    setResultado(null)
    setProgresso(0)
    setErroApi(null)
    setTranscricaoAoVivo('')
  }

  // Gera alturas das barras baseado no volume real
  function alturasBarra() {
    return Array.from({ length: BARRAS }, (_, i) => {
      if (estado !== 'gravando') return 0.15
      const center = BARRAS / 2
      const dist = Math.abs(i - center) / center
      const base = (volume / 100) * (1 - dist * 0.5)
      const noise = Math.random() * 0.3
      return Math.max(0.1, Math.min(1, base + noise))
    })
  }

  const [barras, setBarras] = useState(() => Array(BARRAS).fill(0.15))
  useEffect(() => {
    if (estado !== 'gravando') {
      setBarras(Array(BARRAS).fill(0.15))
      return
    }
    const id = setInterval(() => setBarras(alturasBarra()), 80)
    return () => clearInterval(id)
  }, [estado, volume])

  return (
    <div className={styles.page}>
      {estado !== 'pronto' && (
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.tipoTag} style={{ '--cor': tipoInfo.cor }}>
              <span>{tipoInfo.icon}</span>
              <span>{tipoInfo.label}</span>
            </div>
            <h1 className={styles.title}>
              {estado === 'idle' ? 'Pronto para gravar' :
               estado === 'gravando' ? 'Gravando...' :
               estado === 'pausado' ? 'Pausado' :
               estado === 'processando' ? 'Processando...' : 'Ocorreu um erro'}
            </h1>
            <p className={styles.subtitle}>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Visualizador de ondas */}
          <div className={styles.visualizador}>
            <div className={styles.ondas}>
              {barras.map((h, i) => (
                <div
                  key={i}
                  className={styles.barra}
                  style={{
                    height: `${h * 100}%`,
                    opacity: estado === 'gravando' ? 0.7 + h * 0.3 : 0.2,
                    background: estado === 'gravando' ? `var(--accent)` : 'var(--border2)',
                    transition: estado === 'gravando' ? 'height 0.08s ease, opacity 0.08s ease' : 'all 0.3s ease',
                  }}
                />
              ))}
            </div>

            {(estado === 'gravando' || estado === 'pausado') && (
              <div className={styles.transcricaoVivo} ref={transcricaoRef}>
                <span className={styles.tvDot} style={{ background: estado === 'pausado' ? 'var(--amber)' : 'var(--accent)' }} />
                <span className={styles.tvTexto}>
                  {estado === 'pausado' ? 'Gravação pausada' : transcricaoAoVivo}
                </span>
                {estado === 'gravando' && <span className={styles.cursor} />}
              </div>
            )}
          </div>

          {/* Timer */}
          {(estado === 'gravando' || estado === 'pausado') && (
            <div className={styles.timerArea}>
              <span className={styles.timer}>{tempoGravacao}</span>
              {estado === 'pausado' && <span className={styles.pausadoTag}>PAUSADO</span>}
            </div>
          )}

          {/* Controles */}
          <div className={styles.controles}>
            {estado === 'idle' && (
              <div className={styles.idleArea}>
                <p className={styles.hint}>
                  Peça para cada participante dizer o nome antes de falar para a ATA identificar automaticamente.
                </p>
                <button className={styles.btnGravar} onClick={iniciarGravacao}>
                  <span className={styles.btnGravarDot} />
                  Iniciar gravação
                </button>
              </div>
            )}

            {(estado === 'gravando' || estado === 'pausado') && (
              <div className={styles.botoesGravacao}>
                {estado === 'gravando' ? (
                  <button className={styles.btnPausar} onClick={pausarGravacao}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <rect x="2" y="1" width="4" height="12" rx="1"/>
                      <rect x="8" y="1" width="4" height="12" rx="1"/>
                    </svg>
                    Pausar
                  </button>
                ) : (
                  <button className={styles.btnRetomar} onClick={retormarGravacao}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                      <path d="M3 2l9 5-9 5V2z"/>
                    </svg>
                    Retomar
                  </button>
                )}
                <button className={styles.btnParar} onClick={handleParar}>
                  <span className={styles.stopIcon} />
                  Parar e gerar ATA
                </button>
                <button className={styles.btnCancelar} onClick={handleNovaGravacao}>Cancelar</button>
              </div>
            )}

            {estado === 'processando' && (
              <div className={styles.processando}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: progresso < 100 ? `${progresso}%` : '100%' }} />
                </div>
                <p className={styles.processandoLabel}>
                  {progresso < 100 ? `Enviando áudio... ${progresso}%` : 'Gerando ATA com IA...'}
                </p>
              </div>
            )}

            {estado === 'erro' && (
              <div className={styles.erroArea}>
                <p className={styles.erroMsg}>{erro || erroApi}</p>
                <button className={styles.btnGravar} onClick={handleNovaGravacao}>Tentar novamente</button>
              </div>
            )}
          </div>
        </div>
      )}

      {estado === 'pronto' && resultado && (
        <div className={styles.resultadoPage}>
          <div className={styles.resultadoHeader}>
            <div>
              <div className={styles.tipoTag} style={{ '--cor': tipoInfo.cor }}>
                <span>{tipoInfo.icon}</span>
                <span>{tipoInfo.label}</span>
              </div>
              <h2 className={styles.resultadoTitle}>ATA gerada</h2>
              <p className={styles.resultadoSub}>Revise e edite os campos antes de salvar</p>
            </div>
            <div className={styles.resultadoAcoes}>
              <button className={styles.btnSecundario} onClick={() => navigate(`/historico/${resultado.id}`)}>
                Ver página completa
              </button>
              <button className={styles.btnNovaGravacao} onClick={handleNovaGravacao}>
                Nova gravação
              </button>
            </div>
          </div>
          <AtaViewer ata={resultado.ata} dailyId={resultado.id} />
        </div>
      )}
    </div>
  )
}