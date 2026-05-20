import express from 'express'
import multer from 'multer'
import PDFDocument from 'pdfkit'
import { transcrever } from './transcricao.js'
import { gerarAta } from './ata.js'
import { getDb } from './db.js'

export const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
})

router.post('/processar', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo de áudio enviado.' })
    const tipo = req.body.tipo || 'daily'
    console.log(`\n📥 Áudio recebido: ${(req.file.size / 1024).toFixed(1)}KB | tipo: ${tipo}`)
    console.log('🎙️  Transcrevendo...')
    const transcricao = await transcrever(req.file.buffer, req.file.mimetype)
    console.log(`✅ Transcrição: ${transcricao.length} caracteres`)
    console.log('🤖 Gerando ATA...')
    const ata = await gerarAta(transcricao, tipo)
    console.log('✅ ATA gerada')
    const hoje = new Date().toLocaleDateString('pt-BR')
    const participantes = ata.participantes?.join(', ') || ''
    const db = getDb()
    const stmt = db.prepare(`INSERT INTO dailys (data, transcricao, ata, participantes, tipo) VALUES (?, ?, ?, ?, ?)`)
    const result = stmt.run(hoje, transcricao, JSON.stringify(ata), participantes, tipo)
    res.json({ id: result.lastInsertRowid, transcricao, ata })
  } catch (err) {
    console.error('❌ Erro:', err.message)
    res.status(500).json({ erro: err.message })
  }
})

router.get('/historico', (req, res) => {
  try {
    const { tipo } = req.query
    const db = getDb()
    const query = `
      SELECT id, data, participantes, criado_em, tipo,
             json_extract(ata, '$.resumo') as resumo
      FROM dailys
      ${tipo ? 'WHERE tipo = ?' : ''}
      ORDER BY id DESC LIMIT 30
    `
    const rows = tipo ? db.prepare(query).all(tipo) : db.prepare(query).all()
    res.json(rows)
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

router.get('/historico/:id', (req, res) => {
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM dailys WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ erro: 'Reunião não encontrada.' })
    res.json({ ...row, ata: JSON.parse(row.ata) })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

router.put('/historico/:id', (req, res) => {
  try {
    const { ata } = req.body
    const db = getDb()
    db.prepare('UPDATE dailys SET ata = ? WHERE id = ?').run(JSON.stringify(ata), req.params.id)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

router.delete('/historico/:id', (req, res) => {
  try {
    const db = getDb()
    db.prepare('DELETE FROM dailys WHERE id = ?').run(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

router.get('/historico/:id/download/:formato', (req, res) => {
  try {
    const { formato } = req.params
    const db = getDb()
    const row = db.prepare('SELECT * FROM dailys WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ erro: 'Reunião não encontrada.' })
    const ata = JSON.parse(row.ata)

    if (formato === 'md') {
      const md = gerarMarkdown(ata, row)
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="ata-${row.id}.md"`)
      return res.send(md)
    }

    if (formato === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="ata-${row.id}.pdf"`)
      gerarPDF(ata, row, res)
      return
    }

    res.status(400).json({ erro: 'Formato inválido. Use md ou pdf.' })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

function noNull(v) { return (!v || v === 'null') ? '' : v }
function isNull(v) { return !v || v === 'null' }

function gerarMarkdown(ata, row) {
  const linhas = []
  const tipo = row.tipo || 'geral'

  if (tipo === 'daily') {
    linhas.push(`# Daily — ${noNull(ata.data) || row.data}`)
    if (ata.hora) linhas.push(`**Horário:** ${ata.hora}`)
    if (ata.participantes?.length) linhas.push(`**Participantes:** ${ata.participantes.filter(p => !isNull(p)).join(', ')}`)
    linhas.push('')
    linhas.push('## Resumo')
    linhas.push(noNull(ata.resumo))
    linhas.push('')

    if (ata.pessoas?.length) {
      linhas.push('## O que foi feito ontem?')
      linhas.push('')
      ata.pessoas.filter(p => !isNull(p.nome)).forEach(p => {
        linhas.push(`**${p.nome}:** ${noNull(p.feito) || '—'}`)
      })
      linhas.push('')
      linhas.push('## O que será feito hoje?')
      linhas.push('')
      ata.pessoas.filter(p => !isNull(p.nome)).forEach(p => {
        linhas.push(`**${p.nome}:** ${noNull(p.farA) || '—'}`)
      })
      linhas.push('')
      const comImpedimento = ata.pessoas.filter(p => !isNull(p.nome) && !isNull(p.impedimentos))
      if (comImpedimento.length) {
        linhas.push('## Impedimentos')
        linhas.push('')
        comImpedimento.forEach(p => linhas.push(`**${p.nome}:** ${p.impedimentos}`))
        linhas.push('')
      }
    }
  } else {
    const titulo = noNull(ata.titulo) || `Reunião — ${noNull(ata.data) || row.data}`
    linhas.push(`# ${titulo}`)
    linhas.push('')
    if (ata.hora) linhas.push(`**Horário:** ${ata.hora}`)
    linhas.push(`**Data:** ${noNull(ata.data) || row.data}`)
    if (ata.participantes?.length) linhas.push(`**Participantes:** ${ata.participantes.filter(p => !isNull(p)).join(', ')}`)
    linhas.push('')
    linhas.push('## Resumo')
    linhas.push(noNull(ata.resumo))
    linhas.push('')

    if (ata.pauta?.length) {
      linhas.push('## Pauta')
      ata.pauta.filter(i => !isNull(i)).forEach((item, i) => linhas.push(`${i + 1}. ${item}`))
      linhas.push('')
    }

    if (ata.discussoes?.length) {
      linhas.push('## Discussões')
      linhas.push('')
      ata.discussoes.filter(d => !isNull(d.topico)).forEach((d, i) => {
        linhas.push(`### ${i + 1}. ${d.topico}`)
        linhas.push(noNull(d.detalhes))
        linhas.push('')
      })
    }

    if (ata.projetos?.length) {
      linhas.push('## Projetos')
      linhas.push('')
      ata.projetos.filter(p => !isNull(p.nome)).forEach(p => {
        linhas.push(`### ${p.nome}`)
        linhas.push(`**Status:** ${noNull(p.status) || '—'}`)
        if (!isNull(p.destaques)) linhas.push(`**Destaques:** ${p.destaques}`)
        linhas.push('')
      })
    }
  }

  if (ata.decisoes?.filter(d => !isNull(d)).length) {
    linhas.push('## Decisões')
    ata.decisoes.filter(d => !isNull(d)).forEach(d => linhas.push(`- ${d}`))
    linhas.push('')
  }

  if (ata.acoes?.filter(a => !isNull(a.tarefa)).length) {
    linhas.push('## Ações')
    ata.acoes.filter(a => !isNull(a.tarefa)).forEach(a => {
      const prazo = !isNull(a.prazo) ? ` _(${a.prazo})_` : ''
      linhas.push(`- **${a.responsavel || 'Time'}:** ${a.tarefa}${prazo}`)
    })
    linhas.push('')
  }

  if (ata.bloqueios?.filter(b => !isNull(b)).length) {
    linhas.push('## Bloqueios')
    ata.bloqueios.filter(b => !isNull(b)).forEach(b => linhas.push(`- ${b}`))
    linhas.push('')
  }

  if (ata.riscos?.filter(r => !isNull(r)).length) {
    linhas.push('## Riscos')
    ata.riscos.filter(r => !isNull(r)).forEach(r => linhas.push(`- ${r}`))
    linhas.push('')
  }

  if (!isNull(ata.observacoes)) {
    linhas.push('## Observações')
    linhas.push(ata.observacoes)
    linhas.push('')
  }

  if (!isNull(ata.proximaReuniao)) {
    linhas.push('---')
    linhas.push(`**Próxima reunião:** ${ata.proximaReuniao}`)
  }

  return linhas.join('\n')
}

function gerarPDF(ata, row, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' })
  doc.pipe(res)

  const ROSA = '#d4457a'
  const CINZA = '#6b6560'
  const ESCURO = '#18150f'
  const BORDA = '#e0ddd9'

  const tipo = row.tipo || 'geral'

  function titulo(texto) {
    doc.moveDown(0.5)
    doc.fontSize(18).font('Helvetica-Bold').fillColor(ESCURO).text(texto)
    doc.moveDown(0.3)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(BORDA).lineWidth(1).stroke()
    doc.moveDown(0.5)
  }

  function secao(texto) {
    doc.moveDown(0.8)
    doc.fontSize(11).font('Helvetica-Bold').fillColor(ROSA).text(texto.toUpperCase())
    doc.moveDown(0.3)
  }

  function corpo(texto) {
    doc.fontSize(10).font('Helvetica').fillColor(CINZA).text(noNull(texto) || '—', { lineGap: 3 })
  }

  function item(label, valor) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor(ESCURO).text(`${label}: `, { continued: true })
    doc.font('Helvetica').fillColor(CINZA).text(noNull(valor) || '—')
  }

  function bullet(texto) {
    doc.fontSize(10).font('Helvetica').fillColor(CINZA).text(`• ${noNull(texto)}`, { indent: 10, lineGap: 2 })
  }

  // Cabeçalho
  doc.fontSize(22).font('Helvetica-Bold').fillColor(ROSA).text('scriva.', { align: 'right' })
  doc.moveDown(0.5)

  if (tipo === 'daily') {
    titulo(`Daily — ${noNull(ata.data) || row.data}`)
    if (ata.hora) item('Horário', ata.hora)
    if (ata.participantes?.length) item('Participantes', ata.participantes.filter(p => !isNull(p)).join(', '))
    doc.moveDown(0.5)

    secao('Resumo')
    corpo(ata.resumo)

    if (ata.pessoas?.filter(p => !isNull(p.nome)).length) {
      secao('O que foi feito ontem?')
      ata.pessoas.filter(p => !isNull(p.nome)).forEach(p => {
        doc.fontSize(10).font('Helvetica-Bold').fillColor(ESCURO).text(`${p.nome}: `, { continued: true })
        doc.font('Helvetica').fillColor(CINZA).text(noNull(p.feito) || '—', { lineGap: 2 })
      })

      secao('O que será feito hoje?')
      ata.pessoas.filter(p => !isNull(p.nome)).forEach(p => {
        doc.fontSize(10).font('Helvetica-Bold').fillColor(ESCURO).text(`${p.nome}: `, { continued: true })
        doc.font('Helvetica').fillColor(CINZA).text(noNull(p.farA) || '—', { lineGap: 2 })
      })

      const comImpedimento = ata.pessoas.filter(p => !isNull(p.nome) && !isNull(p.impedimentos))
      if (comImpedimento.length) {
        secao('Impedimentos')
        comImpedimento.forEach(p => {
          doc.fontSize(10).font('Helvetica-Bold').fillColor(ESCURO).text(`${p.nome}: `, { continued: true })
          doc.font('Helvetica').fillColor(CINZA).text(p.impedimentos, { lineGap: 2 })
        })
      }
    }
  } else {
    const tituloDoc = noNull(ata.titulo) || `Reunião — ${noNull(ata.data) || row.data}`
    titulo(tituloDoc)
    if (ata.hora) item('Horário', ata.hora)
    item('Data', noNull(ata.data) || row.data)
    if (ata.participantes?.length) item('Participantes', ata.participantes.filter(p => !isNull(p)).join(', '))
    doc.moveDown(0.5)

    secao('Resumo')
    corpo(ata.resumo)

    if (ata.pauta?.filter(i => !isNull(i)).length) {
      secao('Pauta')
      ata.pauta.filter(i => !isNull(i)).forEach((item, i) => bullet(`${i + 1}. ${item}`))
    }

    if (ata.discussoes?.filter(d => !isNull(d.topico)).length) {
      secao('Discussões')
      ata.discussoes.filter(d => !isNull(d.topico)).forEach((d, i) => {
        doc.moveDown(0.3)
        doc.fontSize(10).font('Helvetica-Bold').fillColor(ESCURO).text(`${i + 1}. ${d.topico}`)
        corpo(d.detalhes)
      })
    }

    if (ata.projetos?.filter(p => !isNull(p.nome)).length) {
      secao('Projetos')
      ata.projetos.filter(p => !isNull(p.nome)).forEach(p => {
        doc.fontSize(10).font('Helvetica-Bold').fillColor(ESCURO).text(p.nome)
        if (!isNull(p.status)) corpo(`Status: ${p.status}`)
        if (!isNull(p.destaques)) corpo(`Destaques: ${p.destaques}`)
        doc.moveDown(0.3)
      })
    }
  }

  if (ata.decisoes?.filter(d => !isNull(d)).length) {
    secao('Decisões')
    ata.decisoes.filter(d => !isNull(d)).forEach(d => bullet(d))
  }

  if (ata.acoes?.filter(a => !isNull(a.tarefa)).length) {
    secao('Ações')
    ata.acoes.filter(a => !isNull(a.tarefa)).forEach(a => {
      const prazo = !isNull(a.prazo) ? ` (${a.prazo})` : ''
      bullet(`${a.responsavel || 'Time'}: ${a.tarefa}${prazo}`)
    })
  }

  if (ata.bloqueios?.filter(b => !isNull(b)).length) {
    secao('Bloqueios')
    ata.bloqueios.filter(b => !isNull(b)).forEach(b => bullet(b))
  }

  if (ata.riscos?.filter(r => !isNull(r)).length) {
    secao('Riscos')
    ata.riscos.filter(r => !isNull(r)).forEach(r => bullet(r))
  }

  if (!isNull(ata.observacoes)) {
    secao('Observações')
    corpo(ata.observacoes)
  }

  if (!isNull(ata.proximaReuniao)) {
    doc.moveDown(1)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(BORDA).lineWidth(1).stroke()
    doc.moveDown(0.5)
    item('Próxima reunião', ata.proximaReuniao)
  }

  doc.end()
}