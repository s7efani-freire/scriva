import { useState, useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { atualizarAta } from '../services/api.js'

export default function AtaViewer({ ata: ataInicial, dailyId, readOnly = false, onFechar }) {
  const [ata, setAta] = useState(ataInicial)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [alterado, setAlterado] = useState(false)
  const [fechando, setFechando] = useState(false)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      alterado && !fechando && currentLocation.pathname !== nextLocation.pathname
  )

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const ok = window.confirm('Você tem alterações não salvas. Deseja descartar e continuar?')
      if (ok) blocker.proceed()
      else blocker.reset()
    }
  }, [blocker.state])

  const marcar = () => { setAlterado(true); setSalvo(false) }

  const attCampo = (campo, valor) => {
    setAta(prev => ({ ...prev, [campo]: valor })); marcar()
  }
  const attArrayObj = (lista, i, campo, valor) => {
    setAta(prev => ({ ...prev, [lista]: prev[lista].map((item, j) => j === i ? { ...item, [campo]: valor } : item) })); marcar()
  }

  function descartar() {
    if (!window.confirm('Descartar todas as alterações?')) return
    setAta(ataInicial); setAlterado(false); setSalvo(false)
  }

  function fechar() {
    setFechando(true)
    setTimeout(() => onFechar?.(), 0)
  }

  async function salvar() {
    if (!dailyId) return
    try {
      setSalvando(true)
      await atualizarAta(dailyId, ata)
      setSalvo(true)
      setAlterado(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSalvando(false)
    }
  }

  const noNull = (v) => (!v || v === 'null' ? '' : v)
  const isNull = (v) => (!v || v === 'null')

  const pV = (ata.pessoas || []).filter(p => !isNull(p.nome))
  const discV = (ata.discussoes || []).filter(d => !isNull(d.topico) || !isNull(d.detalhes))
  const obsV = !isNull(ata.observacoes)

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-24">

      <div className="bg-bg-card border border-brd rounded-2xl p-4 md:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-full">
            Resumo
          </span>
          {ata.data && <span className="font-mono text-xs text-tx-ter">{ata.data}</span>}
        </div>

        {readOnly ? (
          <p className="text-base md:text-lg text-tx-main leading-relaxed break-words">{noNull(ata.resumo)}</p>
        ) : (
          <textarea
            className="w-full bg-bg-page border border-brd rounded-xl text-tx-main text-base md:text-lg leading-relaxed px-4 py-3 md:px-5 md:py-4 resize-y outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 font-sans transition-all min-h-[140px]"
            value={noNull(ata.resumo)}
            onChange={(e) => attCampo('resumo', e.target.value)}
            rows={5}
          />
        )}

        {ata.participantes?.length > 0 && !isNull(ata.participantes[0]) && (
          <div className="flex flex-wrap gap-2 mt-4 md:mt-6">
            {ata.participantes.map((p, i) => !isNull(p) && (
              <span key={i} className="text-xs md:text-sm font-medium text-tx-sec bg-bg-page border border-brd px-3 py-1 md:px-4 md:py-1.5 rounded-full shadow-sm">
                {p}
              </span>
            ))}
          </div>
        )}
      </div>

      {pV.length > 0 && (
        <div>
          <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-tx-ter mb-3">Por participante</p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5">
            {ata.pessoas.map((pessoa, i) => !isNull(pessoa.nome) && (
              <div key={i} className="bg-bg-card border border-brd rounded-xl p-4 md:p-6 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center gap-2.5 pb-3 border-b border-brd text-base md:text-lg font-bold text-tx-main">
                  <span className="w-2.5 h-2.5 bg-accent rounded-full shrink-0" />
                  {readOnly ? (
                    <span className="break-words w-full">{noNull(pessoa.nome)}</span>
                  ) : (
                    <input className="bg-transparent border-none outline-none font-bold text-base md:text-lg w-full text-tx-main" value={noNull(pessoa.nome)} onChange={e => attArrayObj('pessoas', i, 'nome', e.target.value)} placeholder="Nome" />
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-tx-ter">✓ Feito</label>
                  {readOnly ? <p className="text-sm md:text-base text-tx-sec leading-relaxed break-words">{noNull(pessoa.feito) || '—'}</p> :
                    <textarea className="w-full bg-bg-page border border-brd rounded-lg text-tx-main text-sm md:text-base leading-relaxed px-3 py-2 resize-y outline-none focus:border-accent/50 font-sans" value={noNull(pessoa.feito)} onChange={(e) => attArrayObj('pessoas', i, 'feito', e.target.value)} rows={3} />}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-tx-ter">→ Vai fazer</label>
                  {readOnly ? <p className="text-sm md:text-base text-tx-sec leading-relaxed break-words">{noNull(pessoa.farA) || '—'}</p> :
                    <textarea className="w-full bg-bg-page border border-brd rounded-lg text-tx-main text-sm md:text-base leading-relaxed px-3 py-2 resize-y outline-none focus:border-accent/50 font-sans" value={noNull(pessoa.farA)} onChange={(e) => attArrayObj('pessoas', i, 'farA', e.target.value)} rows={3} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {discV.length > 0 && (
        <div>
          <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-tx-ter mb-3">Discussões</p>
          <div className="flex flex-col gap-4">
            {ata.discussoes.map((d, i) => (!isNull(d.topico) || !isNull(d.detalhes)) && (
              <div key={i} className="bg-bg-card border border-brd border-l-4 border-l-[#f0a0bc] rounded-xl p-4 md:p-6 shadow-sm">
                {readOnly ? (
                  <>
                    <div className="text-base md:text-lg font-bold text-tx-main mb-2 break-words">{noNull(d.topico)}</div>
                    <div className="text-sm md:text-base text-tx-sec leading-relaxed break-words">{noNull(d.detalhes)}</div>
                  </>
                ) : (
                  <div className="flex flex-col gap-3">
                    <input className="w-full bg-transparent border-b border-brd pb-1 text-tx-main text-base md:text-lg font-bold outline-none focus:border-accent" value={noNull(d.topico)} onChange={e => attArrayObj('discussoes', i, 'topico', e.target.value)} placeholder="Tópico" />
                    <textarea className="w-full bg-bg-page border border-brd rounded-lg text-tx-main text-sm md:text-base leading-relaxed px-3 py-2.5 resize-y outline-none font-sans min-h-[100px]" value={noNull(d.detalhes)} onChange={e => attArrayObj('discussoes', i, 'detalhes', e.target.value)} rows={3} placeholder="Detalhes..." />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {obsV && (
        <div>
          <p className="text-xs md:text-sm font-bold uppercase tracking-wider text-tx-ter mb-3">Observações</p>
          <div className="bg-bg-card border border-brd rounded-xl shadow-sm p-3 md:p-4">
            {readOnly ? (
              <p className="text-sm md:text-base text-tx-main leading-relaxed break-words">{noNull(ata.observacoes)}</p>
            ) : (
              <textarea
                className="w-full bg-transparent border-none text-tx-main text-sm md:text-base leading-relaxed outline-none font-sans min-h-[80px]"
                value={noNull(ata.observacoes)}
                onChange={(e) => attCampo('observacoes', e.target.value)}
                rows={3}
              />
            )}
          </div>
        </div>
      )}

      {!readOnly && dailyId && (
        <div className="fixed md:sticky bottom-0 left-0 right-0 md:bottom-6 bg-bg-page/90 backdrop-blur-md p-4 md:p-0 border-t md:border-t-0 border-brd flex flex-col sm:flex-row items-center justify-end gap-3 z-30">
          {salvo && <span className="text-sm text-[#3a7a52] font-semibold bg-white/80 md:bg-transparent px-3 py-1 rounded-md border md:border-0 border-brd">✓ Alterações salvas</span>}

          <div className="flex gap-2 w-full sm:w-auto">
            {alterado && (
              <button onClick={descartar} className="bg-white border border-[#cec9c5] text-tx-sec hover:bg-bg-page text-sm md:text-base font-semibold py-2.5 px-5 rounded-xl transition-colors shadow-sm flex-1 sm:flex-none text-center">
                Descartar
              </button>
            )}

            <button
              onClick={salvar}
              disabled={salvando || !alterado}
              className={`text-sm md:text-base font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm flex-1 sm:flex-none text-center ${alterado ? 'bg-accent hover:bg-accent-hover text-white shadow-md' : 'bg-brd text-tx-ter cursor-not-allowed'}`}
            >
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </button>

            {onFechar && (
              <button
                type="button"
                onClick={fechar}
                className="bg-tx-main hover:bg-black text-white text-sm md:text-base font-semibold py-2.5 px-5 rounded-xl transition-all shadow-sm flex-1 sm:flex-none text-center whitespace-nowrap"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}