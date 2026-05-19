import express from 'express'
import multer from 'multer'
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
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhum arquivo de áudio enviado.' })
    }

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
    const stmt = db.prepare(`
      INSERT INTO dailys (data, transcricao, ata, participantes, tipo)
      VALUES (?, ?, ?, ?, ?)
    `)
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
    let query = `
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