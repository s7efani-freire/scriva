import { NavLink, useLocation } from 'react-router-dom'
import styles from './Layout.module.css'

const TIPOS = [
  { slug: 'daily', label: 'Daily', icon: '◷', desc: 'Standup diário' },
  { slug: 'projeto', label: 'Reunião de Projeto', icon: '◈', desc: 'Projeto específico' },
  { slug: 'alinhamento', label: 'Alinhamento', icon: '◎', desc: 'Múltiplos projetos' },
  { slug: 'geral', label: 'Reunião Geral', icon: '◇', desc: 'Reunião avulsa' },
]

export default function Layout({ children }) {
  const location = useLocation()

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>S</span>
          <span className={styles.logoText}>scriva</span>
        </div>

        <div className={styles.navSection}>
          <span className={styles.navLabel}>Nova gravação</span>
          <nav className={styles.nav}>
            {TIPOS.map((t) => (
              <NavLink
                key={t.slug}
                to={`/?tipo=${t.slug}`}
                className={() =>
                  location.pathname === '/' && location.search === `?tipo=${t.slug}`
                    ? `${styles.link} ${styles.active}`
                    : styles.link
                }
              >
                <span className={styles.linkIcon}>{t.icon}</span>
                <span className={styles.linkInfo}>
                  <span className={styles.linkLabel}>{t.label}</span>
                  <span className={styles.linkDesc}>{t.desc}</span>
                </span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className={styles.navSection}>
          <span className={styles.navLabel}>Registros</span>
          <nav className={styles.nav}>
            <NavLink
              to="/historico"
              className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}
            >
              <span className={styles.linkIcon}>≡</span>
              <span className={styles.linkInfo}>
                <span className={styles.linkLabel}>Histórico</span>
                <span className={styles.linkDesc}>Todas as reuniões</span>
              </span>
            </NavLink>
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.footerBadge}>
            <span className={styles.footerDot} />
            <span>Groq · Whisper · LLaMA</span>
          </div>
          <span className={styles.version}>v1.1</span>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  )
}