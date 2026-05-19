import { useState, useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { atualizarAta } from '../services/api.js'

const S = {
  card: { background: '#fff', border: '1px solid #e0ddd9', borderRadius: '14px', padding: '22px 26px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  badge: { fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#d4457a', background: 'rgba(212,69,122,0.07)', border: '1px solid rgba(212,69,122,0.2)', padding: '3px 10px', borderRadius: '100px' },
  sectionTitle: { fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#a09890', marginBottom: '8px' },
  tag: { fontSize: '11px', fontWeight: 500, color: '#6b6560', background: '#eeeceb', border: '1px solid #e0ddd9', padding: '3px 10px', borderRadius: '100px' },
  personCard: { background: '#fff', border: '1px solid #e0ddd9', borderRadius: '10px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  label: { fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#a09890' },
  textarea: { width: '100%', background: '#eeeceb', border: '1px solid #e0ddd9', borderRadius: '6px', color: '#18150f', fontSize: '13px', lineHeight: 1.6, padding: '8px 10px', resize: 'vertical', outline: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif" },
  listCard: { background: '#fff', border: '1px solid #e0ddd9', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  listItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px', fontSize: '13px', color: '#6b6560', borderBottom: '1px solid #e0ddd9' },
  inputLine: { flex: 1, background: 'transparent', border: 'none', color: '#18150f', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none' },
}

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

  function marcar() { setAlterado(true); setSalvo(false) }
  function atualizarPessoa(i, campo, valor) { setAta({ ...ata, pessoas: ata.pessoas.map((p, j) => j === i ? { ...p, [campo]: valor } : p) }); marcar() }
  function atualizarDecisao(i, valor) { setAta({ ...ata, decisoes: ata.decisoes.map((d, j) => j === i ? valor : d) }); marcar() }
  function atualizarAcao(i, campo, valor) { setAta({ ...ata, acoes: ata.acoes.map((a, j) => j === i ? { ...a, [campo]: valor } : a) }); marcar() }

  function descartar() {
    if (!window.confirm('Descartar todas as alterações?')) return
    setAta(ataInicial); setAlterado(false); setSalvo(false)
  }

  async function salvar() {
    if (!dailyId) return
    try { setSalvando(true); await atualizarAta(dailyId, ata); setSalvo(true); setAlterado(false) }
    catch (err) { console.error(err) }
    finally { setSalvando(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Resumo */}
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={S.badge}>Resumo</span>
          {ata.data && <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#a09890' }}>{ata.data}</span>}
        </div>
        <p style={{ fontSize: '14px', color: '#18150f', lineHeight: 1.75 }}>{ata.resumo}</p>
        {ata.participantes?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '14px' }}>
            {ata.participantes.map((p, i) => <span key={i} style={S.tag}>{p}</span>)}
          </div>
        )}
      </div>

      {/* Por pessoa */}
      {ata.pessoas?.length > 0 && (
        <div>
          <p style={S.sectionTitle}>Por participante</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {ata.pessoas.map((pessoa, i) => (
              <div key={i} style={S.personCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px', borderBottom: '1px solid #e0ddd9', fontSize: '13px', fontWeight: 700, color: '#18150f' }}>
                  <span style={{ width: '7px', height: '7px', background: '#d4457a', borderRadius: '50%', flexShrink: 0 }} />
                  {pessoa.nome}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={S.label}>✓ Feito</label>
                  {readOnly ? <p style={{ fontSize: '13px', color: '#6b6560', lineHeight: 1.6 }}>{pessoa.feito || '—'}</p> :
                    <textarea style={S.textarea} value={pessoa.feito || ''} onChange={(e) => atualizarPessoa(i, 'feito', e.target.value)} rows={3} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={S.label}>→ Vai fazer</label>
                  {readOnly ? <p style={{ fontSize: '13px', color: '#6b6560', lineHeight: 1.6 }}>{pessoa.farA || '—'}</p> :
                    <textarea style={S.textarea} value={pessoa.farA || ''} onChange={(e) => atualizarPessoa(i, 'farA', e.target.value)} rows={3} />}
                </div>
                {pessoa.impedimentos && pessoa.impedimentos !== 'null' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ ...S.label, color: '#b87320' }}>⚠ Impedimento</label>
                    {readOnly ? <p style={{ fontSize: '13px', color: '#6b6560', lineHeight: 1.6 }}>{pessoa.impedimentos}</p> :
                      <textarea style={{ ...S.textarea, borderColor: 'rgba(184,115,32,0.3)' }} value={pessoa.impedimentos} onChange={(e) => atualizarPessoa(i, 'impedimentos', e.target.value)} rows={2} />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discussões */}
      {ata.discussoes?.length > 0 && (
        <div>
          <p style={S.sectionTitle}>Discussões</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ata.discussoes.map((d, i) => (
              <div key={i} style={{ ...S.card, borderLeft: '3px solid #f0a0bc', padding: '14px 18px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#18150f', marginBottom: '4px' }}>{d.topico}</div>
                <div style={{ fontSize: '13px', color: '#6b6560', lineHeight: 1.65 }}>{d.detalhes}</div>
                {d.responsavel && <span style={{ ...S.tag, marginTop: '8px', display: 'inline-block' }}>{d.responsavel}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projetos */}
      {ata.projetos?.length > 0 && (
        <div>
          <p style={S.sectionTitle}>Projetos</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
            {ata.projetos.map((p, i) => (
              <div key={i} style={{ ...S.card, borderLeft: '3px solid #d4457a', padding: '14px 16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#18150f' }}>{p.nome}</div>
                <div style={{ fontSize: '13px', color: '#6b6560', lineHeight: 1.5, marginTop: '4px' }}>{p.status}</div>
                {p.destaques && <div style={{ fontSize: '13px', color: '#6b6560', lineHeight: 1.5, marginTop: '4px' }}>{p.destaques}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decisões */}
      {ata.decisoes?.length > 0 && (
        <div>
          <p style={S.sectionTitle}>Decisões</p>
          <div style={S.listCard}>
            {ata.decisoes.map((d, i) => (
              <div key={i} style={{ ...S.listItem, borderBottom: i < ata.decisoes.length - 1 ? '1px solid #e0ddd9' : 'none' }}>
                <span style={{ fontSize: '6px', color: '#d4457a', flexShrink: 0 }}>◆</span>
                {readOnly ? <span>{d}</span> :
                  <input style={S.inputLine} value={d} onChange={(e) => atualizarDecisao(i, e.target.value)} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bloqueios */}
      {ata.bloqueios?.length > 0 && (
        <div>
          <p style={S.sectionTitle}>Bloqueios</p>
          <div style={S.listCard}>
            {ata.bloqueios.map((b, i) => (
              <div key={i} style={{ ...S.listItem, borderBottom: i < ata.bloqueios.length - 1 ? '1px solid #e0ddd9' : 'none' }}>
                <span style={{ color: '#b87320', flexShrink: 0 }}>⚠</span><span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações */}
      {ata.acoes?.length > 0 && (
        <div>
          <p style={S.sectionTitle}>Ações</p>
          <div style={S.listCard}>
            {ata.acoes.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderBottom: i < ata.acoes.length - 1 ? '1px solid #e0ddd9' : 'none', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#d4457a', background: 'rgba(212,69,122,0.07)', border: '1px solid rgba(212,69,122,0.2)', padding: '2px 8px', borderRadius: '100px', whiteSpace: 'nowrap', flexShrink: 0 }}>{a.responsavel || 'Time'}</span>
                {readOnly ? <span style={{ fontSize: '13px', color: '#6b6560', flex: 1 }}>{a.tarefa}</span> :
                  <input style={{ ...S.inputLine, flex: 1 }} value={a.tarefa} onChange={(e) => atualizarAcao(i, 'tarefa', e.target.value)} />}
                {a.prazo && <span style={S.tag}>{a.prazo}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Riscos */}
      {ata.riscos?.length > 0 && (
        <div>
          <p style={S.sectionTitle}>Riscos</p>
          <div style={S.listCard}>
            {ata.riscos.map((r, i) => (
              <div key={i} style={{ ...S.listItem, borderBottom: i < ata.riscos.length - 1 ? '1px solid #e0ddd9' : 'none' }}>
                <span style={{ color: '#c94040', flexShrink: 0 }}>▲</span><span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Observações */}
      {ata.observacoes && ata.observacoes !== 'null' && (
        <div>
          <p style={S.sectionTitle}>Observações</p>
          <div style={S.listCard}>
            <p style={{ padding: '14px 16px', fontSize: '13px', color: '#6b6560', lineHeight: 1.7 }}>{ata.observacoes}</p>
          </div>
        </div>
      )}

      {/* Salvar */}
      {!readOnly && dailyId && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '4px' }}>
          {salvo && <span style={{ fontSize: '12px', color: '#3a7a52', fontWeight: 600 }}>✓ Alterações salvas</span>}
          {alterado && (
            <button onClick={descartar} style={{ background: '#fff', border: '1px solid #cec9c5', color: '#6b6560', fontSize: '13px', fontWeight: 500, padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s' }}>
              Descartar
            </button>
          )}
          <button onClick={salvar} disabled={salvando || !alterado} style={{ background: alterado ? '#d4457a' : '#e0ddd9', color: alterado ? '#fff' : '#a09890', fontSize: '13px', fontWeight: 600, padding: '8px 20px', borderRadius: '8px', cursor: alterado ? 'pointer' : 'not-allowed', border: 'none', transition: 'all 0.15s' }}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      )}
    </div>
  )
}