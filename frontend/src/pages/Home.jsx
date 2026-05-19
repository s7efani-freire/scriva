import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGravacao } from '../hooks/useGravacao.js'
import { processarAudio } from '../services/api.js'
import AtaViewer from '../components/AtaViewer.jsx'
import styles from './Home.module.css'

const TIPOS_INFO = {
  daily:       { label: 'Daily',              icon: '◷', cor: '#d4457a' },
  projeto:     { label: 'Reunião de Projeto', icon: '◈', cor: '#3a6ea8' },
  alinhamento: { label: 'Alinhamento',        icon: '◎', cor: '#3a8a5a' },
  geral:       { label: 'Reunião Geral',      icon: '◇', cor: '#c47d2a' },
}

const BARRAS = 32

export default function Home() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tipo = searchParams.get('tipo') || 'daily'
  const tipoInfo = TIPOS_INFO[tipo] || TIPOS_INFO.daily

  const { estado, setEstado, tempoGravacao, volume, erro, iniciarGravacao, pausarGravacao, retormarGravacao, pararGravacao, resetar } = useGravacao()
  const [resultado, setResultado] = useState(null)
  const [progresso, setProgresso] = useState(0)
  const [erroApi, setErroApi] = useState(null)
  const [transcricaoAoVivo, setTranscricaoAoVivo] = useState('Ouvindo...')
  const [barras, setBarras] = useState(() => Array(BARRAS).fill(0.1))

  useEffect(() => {
    if (estado !== 'gravando') { setBarras(Array(BARRAS).fill(0.1)); return }
    const id = setInterval(() => {
      setBarras(Array.from({ length: BARRAS }, (_, i) => {
        const center = BARRAS / 2
        const dist = Math.abs(i - center) / center
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
    const id = setInterval(() => { i++; setTranscricaoAoVivo(frases[i % frases.length]) }, 2500)
    return () => clearInterval(id)
  }, [estado])

  useEffect(() => { if (estado === 'idle') { resetar(); setResultado(null) } }, [tipo])

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

  function handleNova() {
    resetar(); setResultado(null); setProgresso(0); setErroApi(null)
  }

  const emGravacao = estado === 'gravando' || estado === 'pausado'

  if (estado === 'pronto' && resultado) {
    return (
      <div className={styles.resultadoPage}>
        <div className={styles.resultadoHeader}>
          <div>
            <div className={styles.tipoTag} style={{ '--cor': tipoInfo.cor }}>
              <span>{tipoInfo.icon}</span><span>{tipoInfo.label}</span>
            </div>
            <h2 className={styles.resultadoTitle}>ATA gerada</h2>
            <p className={styles.resultadoSub}>Revise e edite os campos antes de salvar</p>
          </div>
          <div className={styles.resultadoAcoes}>
            
            <button className={styles.btnNovaGravacao} onClick={handleNova}>Nova gravação</button>
          </div>
        </div>
        <AtaViewer ata={resultado.ata} dailyId={resultado.id} />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Header full-width */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.tipoTag} style={{ '--cor': tipoInfo.cor }}>
            <span>{tipoInfo.icon}</span><span>{tipoInfo.label}</span>
          </div>
          <h1 className={styles.title}>
            {estado === 'idle' ? 'Pronto para gravar' :
             estado === 'gravando' ? 'Gravando...' :
             estado === 'pausado' ? 'Pausado' :
             estado === 'processando' ? 'Processando...' : 'Erro'}
          </h1>
          <p className={styles.subtitle}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Coluna esquerda — visualizador */}
      <div className={styles.colunaEsquerda}>
        <div className={styles.visualizador}>
          <div className={styles.ondas}>
            {barras.map((h, i) => (
              <div key={i} className={styles.barra} style={{
                height: `${h * 100}%`,
                opacity: estado === 'gravando' ? 0.6 + h * 0.4 : 0.15,
                background: estado === 'gravando' ? 'var(--accent)' : 'var(--border2)',
                transition: estado === 'gravando' ? 'height 0.08s ease' : 'all 0.4s ease',
              }} />
            ))}
          </div>

          {emGravacao && (
            <div className={styles.transcricaoVivo}>
              <span className={styles.tvDot} style={{ background: estado === 'pausado' ? 'var(--amber)' : 'var(--accent)' }} />
              <span className={styles.tvTexto}>{estado === 'pausado' ? 'Gravação pausada' : transcricaoAoVivo}</span>
              {estado === 'gravando' && <span className={styles.cursor} />}
            </div>
          )}
        </div>

        {emGravacao && (
          <div className={styles.timerArea}>
            <span className={styles.timer}>{tempoGravacao}</span>
            {estado === 'pausado' && <span className={styles.pausadoTag}>PAUSADO</span>}
          </div>
        )}
      </div>

      {/* Coluna direita — controles */}
      <div className={styles.colunaDireita}>
        {estado === 'idle' && (
          <>
            <p className={styles.hint}>
              Peça para cada participante dizer o nome antes de falar para a ATA identificar automaticamente quem disse o quê.
            </p>
            <button className={styles.btnGravar} onClick={iniciarGravacao}>
              <span className={styles.btnGravarDot} />
              Iniciar gravação
            </button>
          </>
        )}

        {emGravacao && (
          <div className={styles.botoesGravacao}>
            <p className={styles.hint}>
              {estado === 'gravando'
                ? 'Clique em pausar para interromper momentaneamente sem encerrar a gravação.'
                : 'Gravação pausada. Retome quando quiser ou finalize para gerar a ATA.'}
            </p>
            <div className={styles.botoesLinha}>
              {estado === 'gravando' ? (
                <button className={styles.btnPausar} onClick={pausarGravacao}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <rect x="1" y="1" width="4" height="10" rx="1"/>
                    <rect x="7" y="1" width="4" height="10" rx="1"/>
                  </svg>
                  Pausar
                </button>
              ) : (
                <button className={styles.btnRetomar} onClick={retormarGravacao}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M2 1l9 5-9 5V1z"/>
                  </svg>
                  Retomar
                </button>
              )}
              <button className={styles.btnParar} onClick={handleParar}>
                <span className={styles.stopIcon} />
                Parar e gerar ATA
              </button>
            </div>
            <button className={styles.btnCancelar} onClick={handleNova}>Cancelar gravação</button>
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
            <button className={styles.btnGravar} onClick={handleNova}>Tentar novamente</button>
          </div>
        )}
      </div>
    </div>
  )
}