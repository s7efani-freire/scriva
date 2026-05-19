import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { buscarDaily } from '../services/api.js'
import AtaViewer from '../components/AtaViewer.jsx'
import styles from './DetalheDaily.module.css'

export default function DetalheDaily() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [daily, setDaily] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarDaily(id).then(setDaily).catch(() => navigate('/historico')).finally(() => setCarregando(false))
  }, [id])

  if (carregando) return <div className={styles.page}><div className={styles.loading}><div className={styles.spinner} /></div></div>
  if (!daily) return null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to="/historico" className={styles.voltar}>← Histórico</Link>
        <div>
          <h1 className={styles.title}>Daily — {daily.data}</h1>
          <p className={styles.subtitle}>Registrada às {new Date(daily.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
      <AtaViewer ata={daily.ata} dailyId={daily.id} />
    </div>
  )
}
