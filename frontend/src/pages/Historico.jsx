import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { buscarHistorico, deletarDaily } from '../services/api.js'
import styles from './Historico.module.css'

const TIPO_LABELS = {
  daily: 'Daily',
  projeto: 'Projeto',
  alinhamento: 'Alinhamento',
  geral: 'Geral',
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

  if (carregando) return <div className={styles.page}><div className={styles.loading}><div className={styles.spinner} /></div></div>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Histórico</h1>
        <p className={styles.subtitle}>{dailys.length} reunião{dailys.length !== 1 ? 'ões' : ''} registrada{dailys.length !== 1 ? 's' : ''}</p>
      </div>
      {dailys.length === 0 ? (
        <div className={styles.vazio}>
          <p>Nenhuma reunião registrada ainda.</p>
          <Link to="/" className={styles.linkNova}>Gravar primeira reunião →</Link>
        </div>
      ) : (
        <div className={styles.lista}>
          {dailys.map((d) => (
            <Link to={`/historico/${d.id}`} key={d.id} className={styles.card}>
              <div className={styles.cardLeft}>
                <div className={styles.cardMeta}>
                  <span className={styles.cardData}>{d.data}</span>
                  <span className={styles.tipoBadge}>{TIPO_LABELS[d.tipo] || d.tipo}</span>
                </div>
                <p className={styles.cardResumo}>{d.resumo || 'Sem resumo'}</p>
                {d.participantes && (
                  <div className={styles.cardParticipantes}>
                    {d.participantes.split(', ').map((p, i) => <span key={i} className={styles.tag}>{p}</span>)}
                  </div>
                )}
              </div>
              <div className={styles.cardRight}>
                <span className={styles.cardHora}>{new Date(d.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                <button className={styles.btnDeletar} onClick={(e) => handleDeletar(d.id, e)} title="Deletar">
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