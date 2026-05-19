import { NavLink, useLocation } from 'react-router-dom'

const TIPOS = [
  { slug: 'daily',       label: 'Daily',              icon: '◷', desc: 'Standup diário' },
  { slug: 'projeto',     label: 'Reunião de Projeto',  icon: '◈', desc: 'Projeto específico' },
  { slug: 'alinhamento', label: 'Alinhamento',         icon: '◎', desc: 'Múltiplos projetos' },
  { slug: 'geral',       label: 'Reunião Geral',       icon: '◇', desc: 'Reunião avulsa' },
]

export default function Layout({ children }) {
  const location = useLocation()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <aside style={{
        width: '220px', minWidth: '220px', background: '#fff',
        borderRight: '1px solid #e0ddd9', display: 'flex', flexDirection: 'column',
        padding: '20px 12px', gap: '24px'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 6px' }}>
          <div style={{
            width: '28px', height: '28px', background: '#d4457a', color: '#fff',
            fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center',
            justifyContent: 'center', borderRadius: '7px', flexShrink: 0
          }}>S</div>
          <span style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.3px', color: '#18150f' }}>scriva</span>
        </div>

        {/* Nova gravação */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#a09890', padding: '0 8px', marginBottom: '4px', display: 'block' }}>Nova gravação</span>
          {TIPOS.map((t) => {
            const isActive = location.pathname === '/' && location.search === `?tipo=${t.slug}`
            return (
              <NavLink key={t.slug} to={`/?tipo=${t.slug}`} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                borderRadius: '6px', border: '1px solid',
                borderColor: isActive ? 'rgba(212,69,122,0.2)' : 'transparent',
                background: isActive ? 'rgba(212,69,122,0.06)' : 'transparent',
                color: isActive ? '#d4457a' : '#6b6560',
                textDecoration: 'none', transition: 'all 0.12s'
              }}>
                <span style={{ fontSize: '13px', width: '18px', textAlign: 'center', flexShrink: 0 }}>{t.icon}</span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</span>
                  <span style={{ fontSize: '10px', color: isActive ? 'rgba(212,69,122,0.5)' : '#a09890', lineHeight: 1.2 }}>{t.desc}</span>
                </span>
              </NavLink>
            )
          })}
        </div>

        {/* Registros */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#a09890', padding: '0 8px', marginBottom: '4px', display: 'block' }}>Registros</span>
          <NavLink to="/historico" style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
            borderRadius: '6px', border: '1px solid',
            borderColor: isActive ? 'rgba(212,69,122,0.2)' : 'transparent',
            background: isActive ? 'rgba(212,69,122,0.06)' : 'transparent',
            color: isActive ? '#d4457a' : '#6b6560',
            textDecoration: 'none', transition: 'all 0.12s'
          })}>
            <span style={{ fontSize: '13px', width: '18px', textAlign: 'center' }}>≡</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, lineHeight: 1.2 }}>Histórico</span>
              <span style={{ fontSize: '10px', color: '#a09890', lineHeight: 1.2 }}>Todas as reuniões</span>
            </span>
          </NavLink>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #e0ddd9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 6px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#3a7a52', animation: 'pulse 2s ease-in-out infinite', flexShrink: 0 }} />
            <span style={{ fontSize: '9px', color: '#a09890' }}>Groq · Whisper · LLaMA</span>
          </div>
          <span style={{ fontSize: '9px', color: '#a09890', fontFamily: 'monospace' }}>v1.1</span>
        </div>
      </aside>

      <main style={{ flex: 1, overflowY: 'auto', background: '#f5f4f2' }}>
        {children}
      </main>
    </div>
  )
}