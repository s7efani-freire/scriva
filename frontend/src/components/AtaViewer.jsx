import { useState } from 'react'
import { atualizarAta } from '../services/api.js'
import styles from './AtaViewer.module.css'

export default function AtaViewer({ ata: ataInicial, dailyId, readOnly = false }) {
  const [ata, setAta] = useState(ataInicial)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  function atualizarPessoa(index, campo, valor) {
    setAta({ ...ata, pessoas: ata.pessoas.map((p, i) => i === index ? { ...p, [campo]: valor } : p) })
    setSalvo(false)
  }
  function atualizarDecisao(index, valor) {
    setAta({ ...ata, decisoes: ata.decisoes.map((d, i) => i === index ? valor : d) })
    setSalvo(false)
  }
  function atualizarAcao(index, campo, valor) {
    setAta({ ...ata, acoes: ata.acoes.map((a, i) => i === index ? { ...a, [campo]: valor } : a) })
    setSalvo(false)
  }

  async function salvar() {
    if (!dailyId) return
    try {
      setSalvando(true)
      await atualizarAta(dailyId, ata)
      setSalvo(true)
    } catch (err) {
      console.error(err)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className={styles.container}>
      {/* Resumo */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.badge}>Resumo</span>
          {ata.data && <span className={styles.data}>{ata.data}</span>}
        </div>
        <p className={styles.resumoTexto}>{ata.resumo}</p>
        {ata.participantes?.length > 0 && (
          <div className={styles.participantes}>
            {ata.participantes.map((p, i) => <span key={i} className={styles.tag}>{p}</span>)}
          </div>
        )}
      </div>

      {/* Daily: por pessoa */}
      {ata.pessoas?.length > 0 && (
        <div className={styles.secao}>
          <h3 className={styles.secaoTitulo}>Por participante</h3>
          <div className={styles.pessoasGrid}>
            {ata.pessoas.map((pessoa, i) => (
              <div key={i} className={styles.pessoaCard}>
                <div className={styles.pessoaNome}>{pessoa.nome}</div>
                <div className={styles.pessoaCampo}>
                  <label className={styles.campoLabel}>✓ Feito</label>
                  {readOnly ? <p className={styles.campoTexto}>{pessoa.feito || '—'}</p> :
                    <textarea className={styles.textarea} value={pessoa.feito || ''} onChange={(e) => atualizarPessoa(i, 'feito', e.target.value)} rows={3} />}
                </div>
                <div className={styles.pessoaCampo}>
                  <label className={styles.campoLabel}>→ Vai fazer</label>
                  {readOnly ? <p className={styles.campoTexto}>{pessoa.farA || '—'}</p> :
                    <textarea className={styles.textarea} value={pessoa.farA || ''} onChange={(e) => atualizarPessoa(i, 'farA', e.target.value)} rows={3} />}
                </div>
                {pessoa.impedimentos && (
                  <div className={styles.pessoaCampo}>
                    <label className={`${styles.campoLabel} ${styles.bloqueio}`}>⚠ Impedimento</label>
                    {readOnly ? <p className={styles.campoTexto}>{pessoa.impedimentos}</p> :
                      <textarea className={`${styles.textarea} ${styles.textareaRed}`} value={pessoa.impedimentos} onChange={(e) => atualizarPessoa(i, 'impedimentos', e.target.value)} rows={2} />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projeto / Geral: discussões */}
      {ata.discussoes?.length > 0 && (
        <div className={styles.secao}>
          <h3 className={styles.secaoTitulo}>Discussões</h3>
          <div className={styles.discussoesLista}>
            {ata.discussoes.map((d, i) => (
              <div key={i} className={styles.discussaoCard}>
                <div className={styles.discussaoTopico}>{d.topico}</div>
                <div className={styles.discussaoDetalhe}>{d.detalhes}</div>
                {d.responsavel && <span className={styles.tag}>{d.responsavel}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alinhamento: projetos */}
      {ata.projetos?.length > 0 && (
        <div className={styles.secao}>
          <h3 className={styles.secaoTitulo}>Projetos</h3>
          <div className={styles.projetosGrid}>
            {ata.projetos.map((p, i) => (
              <div key={i} className={styles.projetoCard}>
                <div className={styles.projetoNome}>{p.nome}</div>
                <div className={styles.projetoStatus}>{p.status}</div>
                {p.destaques && <div className={styles.campoTexto}>{p.destaques}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decisões */}
      {ata.decisoes?.length > 0 && (
        <div className={styles.secao}>
          <h3 className={styles.secaoTitulo}>Decisões</h3>
          <div className={styles.listaCard}>
            {ata.decisoes.map((d, i) => (
              <div key={i} className={styles.listaItem}>
                <span className={styles.listaIcone}>◆</span>
                {readOnly ? <span>{d}</span> :
                  <input className={styles.inputLinha} value={d} onChange={(e) => atualizarDecisao(i, e.target.value)} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bloqueios (alinhamento) */}
      {ata.bloqueios?.length > 0 && (
        <div className={styles.secao}>
          <h3 className={styles.secaoTitulo}>Bloqueios</h3>
          <div className={styles.listaCard}>
            {ata.bloqueios.map((b, i) => (
              <div key={i} className={styles.listaItem}>
                <span className={styles.listaIcone} style={{ color: 'var(--amber)' }}>⚠</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações */}
      {ata.acoes?.length > 0 && (
        <div className={styles.secao}>
          <h3 className={styles.secaoTitulo}>Ações</h3>
          <div className={styles.listaCard}>
            {ata.acoes.map((a, i) => (
              <div key={i} className={styles.acaoItem}>
                <span className={styles.acaoResponsavel}>{a.responsavel || 'Time'}</span>
                {readOnly ? <span className={styles.acaoTarefa}>{a.tarefa}</span> :
                  <input className={styles.inputLinha} value={a.tarefa} onChange={(e) => atualizarAcao(i, 'tarefa', e.target.value)} />}
                {a.prazo && <span className={styles.tag} style={{ fontSize: '11px' }}>{a.prazo}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Riscos */}
      {ata.riscos?.length > 0 && (
        <div className={styles.secao}>
          <h3 className={styles.secaoTitulo}>Riscos</h3>
          <div className={styles.listaCard}>
            {ata.riscos.map((r, i) => (
              <div key={i} className={styles.listaItem}>
                <span className={styles.listaIcone} style={{ color: 'var(--red)' }}>▲</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Observações */}
      {ata.observacoes && (
        <div className={styles.secao}>
          <h3 className={styles.secaoTitulo}>Observações</h3>
          <div className={styles.listaCard}>
            <p className={styles.obsTexto}>{ata.observacoes}</p>
          </div>
        </div>
      )}

      {!readOnly && dailyId && (
        <div className={styles.salvarArea}>
          {salvo && <span className={styles.salvoMsg}>✓ Alterações salvas</span>}
          <button className={styles.btnSalvar} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      )}
    </div>
  )
}