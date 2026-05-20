import { NavLink, useLocation } from 'react-router-dom'

const TIPOS = [
  { slug: 'daily', label: 'Daily', icon: '◷', desc: 'Standup diário' },
  { slug: 'projeto', label: 'Reunião de Projeto', icon: '◈', desc: 'Projeto específico' },
  { slug: 'alinhamento', label: 'Alinhamento', icon: '◎', desc: 'Múltiplos projetos' },
  { slug: 'geral', label: 'Reunião Geral', icon: '◇', desc: 'Reunião avulsa' },
]

export default function Layout({ children }) {
  const location = useLocation()

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">

      <aside className="w-full md:w-[260px] md:min-w-[260px] bg-bg-card border-b md:border-b-0 md:border-r border-brd flex flex-col p-4 md:p-6 gap-4 md:gap-6 shrink-0 z-10 shadow-sm md:shadow-none">

        <div className="flex items-center gap-2.5 px-2 shrink-0">
          <div className="w-8 h-8 bg-accent text-white text-base font-bold flex items-center justify-center rounded-lg shrink-0">
            S
          </div>
          <span className="text-xl font-bold tracking-tight text-tx-main">scriva</span>
        </div>

        <div className="flex md:flex-col gap-4 md:gap-5 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 hide-scrollbar shrink-0 md:h-full">

          <div className="flex flex-row md:flex-col gap-2 md:gap-1.5 shrink-0">
            <span className="hidden md:block text-xs font-bold uppercase tracking-[1.2px] text-tx-ter px-2 mb-1.5">
              Nova gravação
            </span>
            {TIPOS.map((t) => {
              const isActive = location.pathname === '/' && location.search === `?tipo=${t.slug}` || (location.pathname === '/' && !location.search && t.slug === 'daily')
              return (
                <NavLink key={t.slug} to={`/?tipo=${t.slug}`} className={`
                  flex items-center gap-2.5 p-2 md:p-3.5 rounded-xl border transition-all shrink-0
                  ${isActive
                    ? 'border-accent/20 bg-accent/10 text-accent font-semibold shadow-sm'
                    : 'border-transparent bg-transparent text-tx-sec hover:bg-bg-page'
                  }
                `}>
                  <span className="text-sm md:text-lg w-[18px] md:w-[20px] text-center shrink-0">{t.icon}</span>
                  <span className="flex flex-col gap-[1px] md:gap-[2px] min-w-0">
                    <span className="text-xs md:text-base leading-tight whitespace-nowrap overflow-hidden text-ellipsis">{t.label}</span>
                    <span className={`text-[10px] md:text-xs leading-tight hidden md:block ${isActive ? 'text-accent/50' : 'text-tx-ter'}`}>{t.desc}</span>
                  </span>
                </NavLink>
              )
            })}
          </div>

          <div className="flex flex-row md:flex-col gap-1.5 shrink-0 md:mt-4">
            <span className="hidden md:block text-xs font-bold uppercase tracking-[1.2px] text-tx-ter px-2 mb-1.5">
              Registros
            </span>
            <NavLink to="/historico" className={({ isActive }) => `
              flex items-center gap-2.5 p-2 md:p-3.5 rounded-xl border transition-all shrink-0
              ${isActive
                ? 'border-accent/20 bg-accent/10 text-accent font-semibold shadow-sm'
                : 'border-transparent bg-transparent text-tx-sec hover:bg-bg-page'
              }
            `}>
              <span className="text-sm md:text-lg w-[18px] md:w-[20px] text-center">≡</span>
              <span className="flex flex-col gap-[1px] md:gap-[2px]">
                <span className="text-xs md:text-base leading-tight">Histórico</span>
                <span className="text-[10px] md:text-xs text-tx-ter leading-tight hidden md:block">Todas as reuniões</span>
              </span>
            </NavLink>
          </div>
        </div>

        <div className="hidden md:flex mt-auto pt-4 border-t border-brd items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3a7a52] shrink-0" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
            <span className="text-[11px] text-tx-ter">Groq · Whisper</span>
          </div>
          <span className="text-[11px] text-tx-ter font-mono">v1.1</span>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-bg-page p-4 md:p-0">
        {children}
      </main>
    </div>
  )
}