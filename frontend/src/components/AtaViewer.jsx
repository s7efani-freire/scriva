import { useState, useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { atualizarAta } from '../services/api.js'

export default function AtaViewer({ ata: ataInicial, dailyId, readOnly = false }) {
  const [ata, setAta] = useState(ataInicial)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [alterado, setAlterado] = useState(false)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      alterado && currentLocation.pathname !== nextLocation.pathname
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
  const attArrayItem = (lista, i, valor) => {
    setAta(prev => ({ ...prev, [lista]: prev[lista].map((item, j) => j === i ? valor : item) })); marcar()
  }
  const attArrayObj = (lista, i, campo, valor) => {
    setAta(prev => ({ ...prev, [lista]: prev[lista].map((item, j) => j === i ? { ...item, [campo]: valor } : item) })); marcar()
  }

  function descartar() {
    if (!window.confirm('Descartar todas as alterações?')) return
    setAta(ataInicial); setAlterado(false); setSalvo(false)
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
  const projV = (ata.projetos || []).filter(p => !isNull(p.nome) || !isNull(p.status))
  const decV = (ata.decisoes || []).filter(d => !isNull(d))
  const bloqV = (ata.bloqueios || []).filter(b => !isNull(b))
  const acoesV = (ata.acoes || []).filter(a => !isNull(a.tarefa))
  const riscosV = (ata.riscos || []).filter(r => !isNull(r))
  const obsV = !isNull(ata.observacoes)

  return (
    <div className="flex flex-col gap-8 pb-10">


      <div className="bg-bg-card border border-brd rounded-2xl p-6 md:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-3.5 py-1.5 rounded-full">
            Resumo
          </span>
          {ata.data && <span className="font-mono text-sm text-tx-ter">{ata.data}</span>}
        </div>

        {readOnly ? (
          <p className="text-lg text-tx-main leading-relaxed">{noNull(ata.resumo)}</p>
        ) : (
          <textarea
            className="w-full bg-bg-page border border-brd rounded-xl text-tx-main text-lg leading-relaxed px-5 py-4 resize-y outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 font-sans transition-all shadow-inner"
            value={noNull(ata.resumo)}
            onChange={(e) => attCampo('resumo', e.target.value)}
            rows={4}
          />
        )}

        {ata.participantes?.length > 0 && !isNull(ata.participantes[0]) && (
          <div className="flex flex-wrap gap-2.5 mt-6">
            {ata.participantes.map((p, i) => !isNull(p) && (
              <span key={i} className="text-sm font-medium text-tx-sec bg-bg-page border border-brd px-4 py-1.5 rounded-full shadow-sm">
                {p}
              </span>
            ))}
          </div>
        )}
      </div>


      {pV.length > 0 && (
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-tx-ter mb-4">Por participante</p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {ata.pessoas.map((pessoa, i) => !isNull(pessoa.nome) && (
              <div key={i} className="bg-bg-card border border-brd rounded-xl p-6 flex flex-col gap-5 shadow-sm">
                <div className="flex items-center gap-3 pb-4 border-b border-brd text-lg font-bold text-tx-main">
                  <span className="w-2.5 h-2.5 bg-accent rounded-full shrink-0" />
                  {readOnly ? (
                    <span>{noNull(pessoa.nome)}</span>
                  ) : (
                    <input className="bg-transparent border-none outline-none font-bold text-lg w-full text-tx-main" value={noNull(pessoa.nome)} onChange={e => attArrayObj('pessoas', i, 'nome', e.target.value)} placeholder="Nome do participante" />
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-tx-ter">✓ Feito</label>
                  {readOnly ? <p className="text-base text-tx-sec leading-relaxed">{noNull(pessoa.feito) || '—'}</p> :
                    <textarea className="w-full bg-bg-page border border-brd rounded-lg text-tx-main text-base leading-relaxed px-4 py-3 resize-y outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all font-sans" value={noNull(pessoa.feito)} onChange={(e) => attArrayObj('pessoas', i, 'feito', e.target.value)} rows={3} placeholder="O que foi feito..." />}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-tx-ter">→ Vai fazer</label>
                  {readOnly ? <p className="text-base text-tx-sec leading-relaxed">{noNull(pessoa.farA) || '—'}</p> :
                    <textarea className="w-full bg-bg-page border border-brd rounded-lg text-tx-main text-base leading-relaxed px-4 py-3 resize-y outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all font-sans" value={noNull(pessoa.farA)} onChange={(e) => attArrayObj('pessoas', i, 'farA', e.target.value)} rows={3} placeholder="O que vai fazer..." />}
                </div>

                {(!readOnly || !isNull(pessoa.impedimentos)) && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-[#b87320]">⚠ Impedimento</label>
                    {readOnly ? <p className="text-base text-tx-sec leading-relaxed">{noNull(pessoa.impedimentos)}</p> :
                      <textarea className="w-full bg-[#fdfaf6] border border-[#e8d5c4] focus:border-[#b87320] focus:ring-1 focus:ring-[#b87320] rounded-lg text-tx-main text-base leading-relaxed px-4 py-3 resize-y outline-none transition-all font-sans" value={noNull(pessoa.impedimentos)} onChange={(e) => attArrayObj('pessoas', i, 'impedimentos', e.target.value)} rows={2} placeholder="Há algum impedimento?" />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


      {discV.length > 0 && (
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-tx-ter mb-4">Discussões</p>
          <div className="flex flex-col gap-4">
            {ata.discussoes.map((d, i) => (!isNull(d.topico) || !isNull(d.detalhes)) && (
              <div key={i} className="bg-bg-card border border-brd border-l-4 border-l-[#f0a0bc] rounded-xl p-6 shadow-sm">
                {readOnly ? (
                  <>
                    <div className="text-lg font-bold text-tx-main mb-2">{noNull(d.topico)}</div>
                    <div className="text-base text-tx-sec leading-relaxed">{noNull(d.detalhes)}</div>
                  </>
                ) : (
                  <div className="flex flex-col gap-4">
                    <input className="w-full bg-transparent border-b border-brd pb-2 text-tx-main text-lg font-bold outline-none focus:border-accent transition-colors" value={noNull(d.topico)} onChange={e => attArrayObj('discussoes', i, 'topico', e.target.value)} placeholder="Tópico da discussão" />
                    <textarea className="w-full bg-bg-page border border-brd rounded-lg text-tx-main text-base leading-relaxed px-4 py-3 resize-y outline-none focus:border-accent/50 focus:ring-1 font-sans" value={noNull(d.detalhes)} onChange={e => attArrayObj('discussoes', i, 'detalhes', e.target.value)} rows={3} placeholder="Detalhes da discussão..." />
                  </div>
                )}
                {d.responsavel && !isNull(d.responsavel) && (
                  <span className="inline-block mt-4 text-sm font-medium text-tx-sec bg-bg-page border border-brd px-3 py-1 rounded-full">{d.responsavel}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


      {projV.length > 0 && (
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-tx-ter mb-4">Projetos</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {ata.projetos.map((p, i) => (!isNull(p.nome) || !isNull(p.status)) && (
              <div key={i} className="bg-bg-card border border-brd border-l-4 border-l-accent rounded-xl p-5 shadow-sm flex flex-col gap-3">
                {readOnly ? (
                  <>
                    <div className="text-lg font-bold text-tx-main">{noNull(p.nome)}</div>
                    <div className="text-base text-tx-sec leading-relaxed">{noNull(p.status)}</div>
                    {!isNull(p.destaques) && <div className="text-base text-tx-sec leading-relaxed">{noNull(p.destaques)}</div>}
                  </>
                ) : (
                  <>
                    <input className="w-full bg-transparent border-b border-brd pb-2 text-tx-main text-lg font-bold outline-none focus:border-accent" value={noNull(p.nome)} onChange={e => attArrayObj('projetos', i, 'nome', e.target.value)} placeholder="Nome do Projeto" />
                    <input className="w-full bg-bg-page border border-brd rounded-lg text-tx-main text-base px-4 py-2.5 outline-none focus:border-accent/50" value={noNull(p.status)} onChange={e => attArrayObj('projetos', i, 'status', e.target.value)} placeholder="Status do projeto" />
                    <textarea className="w-full bg-bg-page border border-brd rounded-lg text-tx-main text-base leading-relaxed px-4 py-3 outline-none focus:border-accent/50 font-sans" value={noNull(p.destaques)} onChange={e => attArrayObj('projetos', i, 'destaques', e.target.value)} rows={2} placeholder="Destaques / Atualizações" />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


      {decV.length > 0 && (
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-tx-ter mb-4">Decisões</p>
          <div className="bg-bg-card border border-brd rounded-xl overflow-hidden shadow-sm flex flex-col">
            {ata.decisoes.map((d, i) => !isNull(d) && (
              <div key={i} className="flex items-start gap-4 px-5 py-4 border-b border-brd last:border-b-0">
                <span className="text-[10px] text-accent mt-1.5 shrink-0">◆</span>
                {readOnly ? <span className="text-base text-tx-main leading-relaxed">{noNull(d)}</span> :
                  <input className="flex-1 bg-transparent border-none text-tx-main text-base font-sans outline-none w-full" value={noNull(d)} onChange={(e) => attArrayItem('decisoes', i, e.target.value)} placeholder="Descreva a decisão..." />}
              </div>
            ))}
          </div>
        </div>
      )}


      {bloqV.length > 0 && (
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-tx-ter mb-4">Bloqueios</p>
          <div className="bg-bg-card border border-brd rounded-xl overflow-hidden shadow-sm flex flex-col">
            {ata.bloqueios.map((b, i) => !isNull(b) && (
              <div key={i} className="flex items-start gap-4 px-5 py-4 border-b border-brd last:border-b-0">
                <span className="text-[#b87320] mt-0.5 shrink-0">⚠</span>
                {readOnly ? <span className="text-base text-tx-main leading-relaxed">{noNull(b)}</span> :
                  <input className="flex-1 bg-transparent border-none text-tx-main text-base font-sans outline-none w-full" value={noNull(b)} onChange={(e) => attArrayItem('bloqueios', i, e.target.value)} placeholder="Descreva o bloqueio..." />}
              </div>
            ))}
          </div>
        </div>
      )}


      {acoesV.length > 0 && (
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-tx-ter mb-4">Ações</p>
          <div className="bg-bg-card border border-brd rounded-xl overflow-hidden shadow-sm flex flex-col">
            {ata.acoes.map((a, i) => !isNull(a.tarefa) && (
              <div key={i} className="flex flex-col md:flex-row md:items-center gap-4 px-5 py-4 border-b border-brd last:border-b-0">
                {readOnly ? (
                  <span className="w-fit text-xs font-bold text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-full whitespace-nowrap shrink-0">
                    {noNull(a.responsavel) || 'Time'}
                  </span>
                ) : (
                  <input className="w-fit md:w-32 bg-accent/10 border border-accent/20 rounded-full text-accent text-xs font-bold px-3 py-1.5 outline-none focus:bg-accent/20 text-center" value={noNull(a.responsavel)} onChange={e => attArrayObj('acoes', i, 'responsavel', e.target.value)} placeholder="Responsável" />
                )}

                {readOnly ? <span className="text-base text-tx-main flex-1 leading-relaxed">{noNull(a.tarefa)}</span> :
                  <input className="flex-1 bg-transparent border-none text-tx-main text-base font-sans outline-none min-w-[200px]" value={noNull(a.tarefa)} onChange={(e) => attArrayObj('acoes', i, 'tarefa', e.target.value)} placeholder="Descreva a tarefa..." />}

                {a.prazo && !isNull(a.prazo) && (
                  <span className="w-fit text-sm font-medium text-tx-sec bg-bg-page border border-brd px-4 py-1.5 rounded-full">{a.prazo}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


      {riscosV.length > 0 && (
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-tx-ter mb-4">Riscos</p>
          <div className="bg-bg-card border border-brd rounded-xl overflow-hidden shadow-sm flex flex-col">
            {ata.riscos.map((r, i) => !isNull(r) && (
              <div key={i} className="flex items-start gap-4 px-5 py-4 border-b border-brd last:border-b-0">
                <span className="text-error mt-0.5 shrink-0">▲</span>
                {readOnly ? <span className="text-base text-tx-main leading-relaxed">{noNull(r)}</span> :
                  <input className="flex-1 bg-transparent border-none text-tx-main text-base font-sans outline-none w-full" value={noNull(r)} onChange={(e) => attArrayItem('riscos', i, e.target.value)} placeholder="Descreva o risco..." />}
              </div>
            ))}
          </div>
        </div>
      )}


      {obsV && (
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-tx-ter mb-4">Observações</p>
          <div className="bg-bg-card border border-brd rounded-xl shadow-sm p-2">
            {readOnly ? (
              <p className="p-4 text-base text-tx-main leading-relaxed">{noNull(ata.observacoes)}</p>
            ) : (
              <textarea
                className="w-full bg-transparent border-none text-tx-main text-base leading-relaxed px-4 py-3 resize-y outline-none font-sans"
                value={noNull(ata.observacoes)}
                onChange={(e) => attCampo('observacoes', e.target.value)}
                rows={3}
                placeholder="Adicione observações gerais..."
              />
            )}
          </div>
        </div>
      )}


      {!readOnly && dailyId && (
        <div className="flex flex-wrap items-center justify-end gap-4 pt-6 mt-4 sticky bottom-6 z-10">
          {salvo && <span className="text-base text-[#3a7a52] font-semibold bg-bg-page px-4 py-2 rounded-lg border border-[#e0ddd9]">✓ Alterações salvas</span>}

          {alterado && (
            <button onClick={descartar} className="bg-bg-card border border-[#cec9c5] text-tx-sec hover:bg-bg-page text-base font-semibold py-2.5 px-6 rounded-xl transition-colors shadow-sm">
              Descartar
            </button>
          )}
          <button
            type="button"
            onClick={() => window.location.href = '/'}
            className="bg-white border border-[#cec9c5] text-tx-sec hover:bg-bg-page text-base font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm hover:border-[#b4aeaa]"
          >
            Fechar
          </button>
          <button
            onClick={salvar}
            disabled={salvando || !alterado}
            className={`text-base font-semibold py-2.5 px-8 rounded-xl transition-all shadow-sm ${alterado
              ? 'bg-accent hover:bg-accent-hover text-white shadow-md hover:-translate-y-0.5'
              : 'bg-brd text-tx-ter cursor-not-allowed'
              }`}
          >
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>

        </div>
      )}
    </div>
  )
}