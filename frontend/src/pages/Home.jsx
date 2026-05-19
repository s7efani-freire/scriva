import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGravacao } from '../hooks/useGravacao.js'
import { processarAudio } from '../services/api.js'
import AtaViewer from '../components/AtaViewer.jsx'
import styles from './Home.module.css'

export default function Home() {
  const navigate = useNavigate()
  const { estado, setEstado, tempoGravacao, erro, iniciarGravacao, pararGravacao, resetar } = useGravacao()
  const [resultado, setResultado] = useState(null)
  const [progresso, setProgresso] = useState(0)
  const [erroApi, setErroApi] = useState(null)

  async function handleParar() {
    const blob = await pararGravacao()
    if (!blob) return
    try {
      setErroApi(null)
      const data = await processarAudio(blob, setProgresso)
      setResultado(data)
      setEstado('pronto')
    } catch (err) {
      setErroApi(err.response?.data?.erro || 'Erro ao processar o áudio.')
      setEstado('erro')
    }
  }

  function handleNovaDaily() {
    resetar()
    setResultado(null)
    setProgresso(0)
    setErroApi(null)
  }

  return (
    <div className={styles.page}>
      {estado !== 'pronto' && (
        <div className={styles.hero}>
          <div className={styles.header}>
            <h1 className={styles.title}>Daily de hoje</h1>
            <p className={styles.subtitle}>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className={styles.gravadorArea}>
            {estado === 'idle' && (
              <>
                <p className={styles.hint}>Peça para cada pessoa dizer o nome antes de falar para a ATA separar por participante.</p>
                <button className={styles.btnGravar} onClick={iniciarGravacao}>
                  <span className={styles.btnIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </span>
                  Iniciar gravação
                </button>
              </>
            )}
            {estado === 'gravando' && (
              <div className={styles.gravando}>
                <div className={styles.waveContainer}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className={styles.bar} style={{ animationDelay: `${i * 0.08}s` }} />
                  ))}
                </div>
                <div className={styles.timer}>{tempoGravacao}</div>
                <p className={styles.gravandoLabel}>Gravando...</p>
                <button className={styles.btnParar} onClick={handleParar}>
                  <span className={styles.stopIcon} />
                  Parar e gerar ATA
                </button>
              </div>
            )}
            {estado === 'processando' && (
              <div className={styles.processando}>
                <div className={styles.spinner} />
                <p className={styles.processandoLabel}>{progresso < 100 ? `Enviando áudio... ${progresso}%` : 'Gerando ATA com IA...'}</p>
                <p className={styles.processandoSub}>Isso leva alguns segundos</p>
              </div>
            )}
            {estado === 'erro' && (
              <div className={styles.erroArea}>
                <p className={styles.erroMsg}>{erro || erroApi}</p>
                <button className={styles.btnSecundario} onClick={handleNovaDaily}>Tentar novamente</button>
              </div>
            )}
          </div>
        </div>
      )}
      {estado === 'pronto' && resultado && (
        <div className={styles.resultadoArea}>
          <div className={styles.resultadoHeader}>
            <div>
              <h2 className={styles.resultadoTitle}>ATA gerada ✓</h2>
              <p className={styles.resultadoSub}>Revise e edite se necessário</p>
            </div>
            <div className={styles.resultadoAcoes}>
              <button className={styles.btnSecundario} onClick={() => navigate(`/historico/${resultado.id}`)}>Ver detalhes</button>
              <button className={styles.btnNovaDaily} onClick={handleNovaDaily}>Nova daily</button>
            </div>
          </div>
          <AtaViewer ata={resultado.ata} dailyId={resultado.id} />
        </div>
      )}
    </div>
  )
}
