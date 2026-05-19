import { NavLink } from 'react-router-dom'
import styles from './Layout.module.css'

export default function Layout({ children }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>◈</span>
          <span className={styles.logoText}>scriva</span>
        </div>
        <nav className={styles.nav}>
          <NavLink to="/" end className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
            </svg>
            Nova daily
          </NavLink>
          <NavLink to="/historico" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            Histórico
          </NavLink>
        </nav>
        <div className={styles.sidebarFooter}>
          <span className={styles.version}>v1.0</span>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
