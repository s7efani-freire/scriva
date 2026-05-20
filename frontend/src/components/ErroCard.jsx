const ICONES = {
  429: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  401: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  default: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  )
}

export default function ErroCard({ mensagem, onTentar }) {
  const isRateLimit = mensagem?.includes('Limite') || mensagem?.includes('limite')
  const isAuth = mensagem?.includes('API') || mensagem?.includes('chave')
  const tipo = isAuth ? 401 : isRateLimit ? 429 : 'default'

  const titulo = isRateLimit
    ? 'Limite atingido'
    : isAuth
    ? 'Erro de autenticação'
    : 'Algo deu errado'

  return (
    <div className="flex flex-col items-center gap-5 p-6 md:p-8 bg-bg-card border border-brd rounded-2xl shadow-sm max-w-md w-full text-center">
      <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center text-error">
        {ICONES[tipo]}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-base md:text-lg font-bold text-tx-main">{titulo}</h3>
        <p className="text-sm md:text-base text-tx-sec leading-relaxed">{mensagem}</p>
      </div>

      {onTentar && (
        <button
          onClick={onTentar}
          className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm w-full"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}