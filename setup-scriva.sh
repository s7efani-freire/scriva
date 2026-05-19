#!/usr/bin/env bash
set -e

echo ""
echo "◈ Scriva — criando estrutura do projeto..."
echo ""

# Garante que estamos na raiz do projeto
cd "$(dirname "$0")"

# Estrutura de pastas
mkdir -p backend/src
mkdir -p frontend/src/components
mkdir -p frontend/src/pages
mkdir -p frontend/src/hooks
mkdir -p frontend/src/services

# ─── BACKEND ────────────────────────────────────────────────────────────────

cat > backend/package.json << 'ENDOFFILE'
{
  "name": "scriva-backend",
  "version": "1.0.0",
  "description": "Scriva backend - transcrição e geração de ATA",
  "main": "src/index.js",
  "type": "module",
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "groq-sdk": "^0.7.0",
    "multer": "^1.4.5-lts.1",
    "better-sqlite3": "^9.6.0"
  }
}
ENDOFFILE

cat > backend/.env.example << 'ENDOFFILE'
GROQ_API_KEY=sua_chave_aqui
PORT=3001
ENDOFFILE

cat > backend/src/index.js << 'ENDOFFILE'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { router } from './routes.js'
import { initDb } from './db.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use('/api', router)

initDb()

app.listen(PORT, () => {
  console.log(`\n🎙️  Scriva backend rodando em http://localhost:${PORT}\n`)
})
ENDOFFILE

cat > backend/src/db.js << 'ENDOFFILE'
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '../../scriva.db')

let db

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
  }
  return db
}

export function initDb() {
  const db = getDb()

  db.exec(`
    CREATE TABLE IF NOT EXISTS dailys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      transcricao TEXT NOT NULL,
      ata TEXT NOT NULL,
      participantes TEXT,
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `)

  console.log('✅ Banco de dados pronto')
}
ENDOFFILE

cat > backend/src/routes.js << 'ENDOFFILE'
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

    console.log(`\n📥 Áudio recebido: ${(req.file.size / 1024).toFixed(1)}KB`)

    console.log('🎙️  Transcrevendo...')
    const transcricao = await transcrever(req.file.buffer, req.file.mimetype)
    console.log(`✅ Transcrição: ${transcricao.length} caracteres`)

    console.log('🤖 Gerando ATA...')
    const ata = await gerarAta(transcricao)
    console.log('✅ ATA gerada')

    const hoje = new Date().toLocaleDateString('pt-BR')
    const participantes = ata.participantes?.join(', ') || ''

    const db = getDb()
    const stmt = db.prepare(`
      INSERT INTO dailys (data, transcricao, ata, participantes)
      VALUES (?, ?, ?, ?)
    `)
    const result = stmt.run(hoje, transcricao, JSON.stringify(ata), participantes)

    res.json({
      id: result.lastInsertRowid,
      transcricao,
      ata
    })
  } catch (err) {
    console.error('❌ Erro:', err.message)
    res.status(500).json({ erro: err.message })
  }
})

router.get('/historico', (req, res) => {
  try {
    const db = getDb()
    const rows = db.prepare(`
      SELECT id, data, participantes, criado_em,
             json_extract(ata, '$.resumo') as resumo
      FROM dailys
      ORDER BY id DESC
      LIMIT 30
    `).all()
    res.json(rows)
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

router.get('/historico/:id', (req, res) => {
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM dailys WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ erro: 'Daily não encontrada.' })
    res.json({ ...row, ata: JSON.parse(row.ata) })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

router.put('/historico/:id', (req, res) => {
  try {
    const { ata } = req.body
    const db = getDb()
    db.prepare('UPDATE dailys SET ata = ? WHERE id = ?')
      .run(JSON.stringify(ata), req.params.id)
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
ENDOFFILE

cat > backend/src/transcricao.js << 'ENDOFFILE'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export async function transcrever(buffer, mimetype) {
  const file = new File([buffer], 'audio.webm', { type: mimetype || 'audio/webm' })

  const resposta = await groq.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3-turbo',
    language: 'pt',
    response_format: 'text'
  })

  return resposta
}
ENDOFFILE

cat > backend/src/ata.js << 'ENDOFFILE'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const PROMPT_SISTEMA = `Você é um assistente especializado em reuniões de desenvolvimento ágil (daily standups).

Receberá a transcrição de uma daily e deve gerar uma ATA estruturada em JSON.

REGRAS IMPORTANTES:
- Se alguém disser o próprio nome antes de falar ("Aqui é o João..."), use esse nome para atribuir as falas
- Se não houver nomes explícitos, agrupe as informações sem atribuição por pessoa
- Extraia apenas o que foi realmente dito — não invente informações
- Seja conciso mas completo
- Responda APENAS com o JSON, sem texto antes ou depois, sem markdown, sem backticks

FORMATO DO JSON:
{
  "data": "data de hoje em DD/MM/YYYY",
  "resumo": "resumo geral da daily em 1-2 frases",
  "participantes": ["Nome1", "Nome2"],
  "pessoas": [
    {
      "nome": "Nome da pessoa (ou 'Participante 1' se não identificado)",
      "feito": "O que fez desde a última daily",
      "farA": "O que vai fazer hoje",
      "impedimentos": "Impedimentos ou bloqueios (null se não houver)"
    }
  ],
  "decisoes": ["decisão 1", "decisão 2"],
  "acoes": [
    {
      "responsavel": "Nome ou null",
      "tarefa": "descrição da tarefa"
    }
  ],
  "observacoes": "qualquer informação relevante que não se encaixe acima (null se não houver)"
}`

export async function gerarAta(transcricao) {
  const resposta = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: PROMPT_SISTEMA },
      { role: 'user', content: `Transcrição da daily:\n\n${transcricao}` }
    ],
    temperature: 0.2,
    max_tokens: 2000
  })

  const texto = resposta.choices[0].message.content.trim()

  try {
    return JSON.parse(texto)
  } catch {
    const limpo = texto.replace(/```json|```/g, '').trim()
    return JSON.parse(limpo)
  }
}
ENDOFFILE

# ─── FRONTEND ───────────────────────────────────────────────────────────────

cat > frontend/package.json << 'ENDOFFILE'
{
  "name": "scriva-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.7.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.2.12"
  }
}
ENDOFFILE

cat > frontend/vite.config.js << 'ENDOFFILE'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
ENDOFFILE

cat > frontend/index.html << 'ENDOFFILE'
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Scriva</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
ENDOFFILE

cat > frontend/src/main.jsx << 'ENDOFFILE'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
ENDOFFILE

cat > frontend/src/App.jsx << 'ENDOFFILE'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Historico from './pages/Historico.jsx'
import DetalheDaily from './pages/DetalheDaily.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/historico" element={<Historico />} />
        <Route path="/historico/:id" element={<DetalheDaily />} />
      </Routes>
    </Layout>
  )
}
ENDOFFILE

cat > frontend/src/index.css << 'ENDOFFILE'
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg: #0c0c0f;
  --bg2: #141418;
  --bg3: #1c1c22;
  --border: #2a2a34;
  --border2: #3a3a48;
  --text: #f0f0f5;
  --text2: #9090a8;
  --text3: #5a5a70;
  --accent: #7c6af7;
  --accent2: #a594f9;
  --accent-dim: rgba(124, 106, 247, 0.12);
  --accent-glow: rgba(124, 106, 247, 0.3);
  --red: #f76a6a;
  --green: #6af7a0;
  --amber: #f7c96a;
  --font: 'Syne', sans-serif;
  --mono: 'DM Mono', monospace;
  --radius: 12px;
  --radius-sm: 8px;
  --radius-lg: 20px;
}

html, body, #root { height: 100%; }

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; text-decoration: none; }
button { font-family: var(--font); cursor: pointer; border: none; outline: none; }
input, textarea { font-family: var(--font); }

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text3); }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes wave {
  0%   { transform: scaleY(0.3); }
  50%  { transform: scaleY(1); }
  100% { transform: scaleY(0.3); }
}
ENDOFFILE

cat > frontend/src/components/Layout.jsx << 'ENDOFFILE'
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
ENDOFFILE

cat > frontend/src/components/Layout.module.css << 'ENDOFFILE'
.shell { display: flex; height: 100vh; overflow: hidden; }
.sidebar { width: 220px; min-width: 220px; background: var(--bg2); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 28px 16px; gap: 32px; }
.logo { display: flex; align-items: center; gap: 10px; padding: 0 8px; }
.logoMark { font-size: 22px; color: var(--accent2); line-height: 1; }
.logoText { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: var(--text); }
.nav { display: flex; flex-direction: column; gap: 4px; }
.link { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: var(--radius-sm); color: var(--text2); font-size: 14px; font-weight: 500; transition: all 0.15s; }
.link:hover { background: var(--bg3); color: var(--text); }
.link.active { background: var(--accent-dim); color: var(--accent2); }
.sidebarFooter { margin-top: auto; padding: 0 8px; }
.version { font-size: 11px; color: var(--text3); font-family: var(--mono); }
.main { flex: 1; overflow-y: auto; background: var(--bg); }
ENDOFFILE

cat > frontend/src/hooks/useGravacao.js << 'ENDOFFILE'
import { useState, useRef, useCallback } from 'react'

export function useGravacao() {
  const [estado, setEstado] = useState('idle')
  const [tempoGravacao, setTempoGravacao] = useState(0)
  const [erro, setErro] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  const iniciarGravacao = useCallback(async () => {
    try {
      setErro(null)
      chunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      })
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(1000)
      setEstado('gravando')
      setTempoGravacao(0)
      timerRef.current = setInterval(() => { setTempoGravacao((t) => t + 1) }, 1000)
    } catch (err) {
      setErro('Não foi possível acessar o microfone. Verifique as permissões.')
      setEstado('erro')
    }
  }, [])

  const pararGravacao = useCallback(() => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current
      if (!mediaRecorder) return resolve(null)
      clearInterval(timerRef.current)
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        mediaRecorder.stream.getTracks().forEach((t) => t.stop())
        resolve(blob)
      }
      mediaRecorder.stop()
      setEstado('processando')
    })
  }, [])

  const resetar = useCallback(() => {
    clearInterval(timerRef.current)
    setEstado('idle')
    setTempoGravacao(0)
    setErro(null)
    chunksRef.current = []
  }, [])

  const formatarTempo = (segundos) => {
    const m = Math.floor(segundos / 60).toString().padStart(2, '0')
    const s = (segundos % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return { estado, setEstado, tempoGravacao: formatarTempo(tempoGravacao), erro, iniciarGravacao, pararGravacao, resetar }
}
ENDOFFILE

cat > frontend/src/services/api.js << 'ENDOFFILE'
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export async function processarAudio(audioBlob, onProgress) {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'daily.webm')
  const { data } = await api.post('/processar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => { if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100)) }
  })
  return data
}

export async function buscarHistorico() {
  const { data } = await api.get('/historico')
  return data
}

export async function buscarDaily(id) {
  const { data } = await api.get(`/historico/${id}`)
  return data
}

export async function atualizarAta(id, ata) {
  const { data } = await api.put(`/historico/${id}`, { ata })
  return data
}

export async function deletarDaily(id) {
  const { data } = await api.delete(`/historico/${id}`)
  return data
}
ENDOFFILE

cat > frontend/src/pages/Home.jsx << 'ENDOFFILE'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGravacao } from '../hooks/useGravacao.js'
import { processarAudio } from '../services/api.js'
import AtaViewer from '../components/AtaViewer.jsx'
import styles from './Home.module.css'

export default function Home() {
  const navigate = useNavigate()
  const { estado, setEstado, tempoGravacao, erro, iniciarGravacao, pararGravacao, resetar } = useGravacao()
  const [resultado, setResultado] = useState(null)
  const [progresso, setProgresso] = useState(0)
  const [erroApi, setErroApi] = useState(null)

  async function handleParar() {
    const blob = await pararGravacao()
    if (!blob) return
    try {
      setErroApi(null)
      const data = await processarAudio(blob, setProgresso)
      setResultado(data)
      setEstado('pronto')
    } catch (err) {
      setErroApi(err.response?.data?.erro || 'Erro ao processar o áudio.')
      setEstado('erro')
    }
  }

  function handleNovaDaily() {
    resetar()
    setResultado(null)
    setProgresso(0)
    setErroApi(null)
  }

  return (
    <div className={styles.page}>
      {estado !== 'pronto' && (
        <div className={styles.hero}>
          <div className={styles.header}>
            <h1 className={styles.title}>Daily de hoje</h1>
            <p className={styles.subtitle}>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className={styles.gravadorArea}>
            {estado === 'idle' && (
              <>
                <p className={styles.hint}>Peça para cada pessoa dizer o nome antes de falar para a ATA separar por participante.</p>
                <button className={styles.btnGravar} onClick={iniciarGravacao}>
                  <span className={styles.btnIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </span>
                  Iniciar gravação
                </button>
              </>
            )}
            {estado === 'gravando' && (
              <div className={styles.gravando}>
                <div className={styles.waveContainer}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className={styles.bar} style={{ animationDelay: `${i * 0.08}s` }} />
                  ))}
                </div>
                <div className={styles.timer}>{tempoGravacao}</div>
                <p className={styles.gravandoLabel}>Gravando...</p>
                <button className={styles.btnParar} onClick={handleParar}>
                  <span className={styles.stopIcon} />
                  Parar e gerar ATA
                </button>
              </div>
            )}
            {estado === 'processando' && (
              <div className={styles.processando}>
                <div className={styles.spinner} />
                <p className={styles.processandoLabel}>{progresso < 100 ? `Enviando áudio... ${progresso}%` : 'Gerando ATA com IA...'}</p>
                <p className={styles.processandoSub}>Isso leva alguns segundos</p>
              </div>
            )}
            {estado === 'erro' && (
              <div className={styles.erroArea}>
                <p className={styles.erroMsg}>{erro || erroApi}</p>
                <button className={styles.btnSecundario} onClick={handleNovaDaily}>Tentar novamente</button>
              </div>
            )}
          </div>
        </div>
      )}
      {estado === 'pronto' && resultado && (
        <div className={styles.resultadoArea}>
          <div className={styles.resultadoHeader}>
            <div>
              <h2 className={styles.resultadoTitle}>ATA gerada ✓</h2>
              <p className={styles.resultadoSub}>Revise e edite se necessário</p>
            </div>
            <div className={styles.resultadoAcoes}>
              <button className={styles.btnSecundario} onClick={() => navigate(`/historico/${resultado.id}`)}>Ver detalhes</button>
              <button className={styles.btnNovaDaily} onClick={handleNovaDaily}>Nova daily</button>
            </div>
          </div>
          <AtaViewer ata={resultado.ata} dailyId={resultado.id} />
        </div>
      )}
    </div>
  )
}
ENDOFFILE

cat > frontend/src/pages/Home.module.css << 'ENDOFFILE'
.page { min-height: 100%; padding: 48px 52px; animation: fadeIn 0.3s ease; }
.hero { max-width: 640px; margin: 0 auto; }
.header { margin-bottom: 48px; }
.title { font-size: 36px; font-weight: 800; letter-spacing: -1px; color: var(--text); line-height: 1.1; }
.subtitle { margin-top: 8px; font-size: 15px; color: var(--text2); text-transform: capitalize; }
.gravadorArea { display: flex; flex-direction: column; align-items: center; gap: 24px; }
.hint { font-size: 14px; color: var(--text3); text-align: center; max-width: 380px; line-height: 1.7; padding: 16px 20px; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); }
.btnGravar { display: flex; align-items: center; gap: 14px; background: var(--accent); color: #fff; font-size: 17px; font-weight: 600; padding: 18px 36px; border-radius: 100px; transition: all 0.2s; letter-spacing: -0.2px; }
.btnGravar:hover { background: var(--accent2); transform: translateY(-2px); box-shadow: 0 8px 32px var(--accent-glow); }
.btnIcon { display: flex; align-items: center; }
.gravando { display: flex; flex-direction: column; align-items: center; gap: 20px; }
.waveContainer { display: flex; align-items: center; gap: 5px; height: 60px; }
.bar { width: 4px; height: 100%; background: var(--accent2); border-radius: 2px; animation: wave 1s ease-in-out infinite; }
.timer { font-family: var(--mono); font-size: 48px; font-weight: 300; color: var(--text); letter-spacing: -2px; line-height: 1; }
.gravandoLabel { font-size: 14px; color: var(--text2); animation: pulse 2s ease-in-out infinite; }
.btnParar { display: flex; align-items: center; gap: 12px; background: var(--bg3); border: 1px solid var(--border2); color: var(--text); font-size: 15px; font-weight: 500; padding: 14px 28px; border-radius: 100px; transition: all 0.2s; }
.btnParar:hover { border-color: var(--red); color: var(--red); }
.stopIcon { width: 14px; height: 14px; background: currentColor; border-radius: 3px; }
.processando { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 48px 0; }
.spinner { width: 40px; height: 40px; border: 2px solid var(--border2); border-top-color: var(--accent2); border-radius: 50%; animation: spin 0.8s linear infinite; }
.processandoLabel { font-size: 16px; font-weight: 500; color: var(--text); }
.processandoSub { font-size: 13px; color: var(--text3); }
.erroArea { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 32px; background: rgba(247, 106, 106, 0.06); border: 1px solid rgba(247, 106, 106, 0.2); border-radius: var(--radius); max-width: 400px; text-align: center; }
.erroMsg { font-size: 14px; color: var(--red); line-height: 1.6; }
.resultadoArea { animation: fadeIn 0.4s ease; }
.resultadoHeader { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; gap: 16px; flex-wrap: wrap; }
.resultadoTitle { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
.resultadoSub { margin-top: 6px; font-size: 14px; color: var(--text2); }
.resultadoAcoes { display: flex; gap: 10px; align-items: center; }
.btnSecundario { background: var(--bg3); border: 1px solid var(--border2); color: var(--text2); font-size: 14px; font-weight: 500; padding: 10px 20px; border-radius: var(--radius-sm); transition: all 0.15s; }
.btnSecundario:hover { color: var(--text); }
.btnNovaDaily { background: var(--accent-dim); border: 1px solid var(--accent); color: var(--accent2); font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: var(--radius-sm); transition: all 0.15s; }
.btnNovaDaily:hover { background: var(--accent); color: #fff; }
ENDOFFILE

cat > frontend/src/components/AtaViewer.jsx << 'ENDOFFILE'
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

      {ata.pessoas?.length > 0 && (
        <div className={styles.secao}>
          <h3 className={styles.secaoTitulo}>Por participante</h3>
          <div className={styles.pessoasGrid}>
            {ata.pessoas.map((pessoa, i) => (
              <div key={i} className={styles.pessoaCard}>
                <div className={styles.pessoaNome}>{pessoa.nome}</div>
                <div className={styles.pessoaCampo}>
                  <label className={styles.campoLabel}>✓ Feito</label>
                  {readOnly ? <p className={styles.campoTexto}>{pessoa.feito || '—'}</p> : <textarea className={styles.textarea} value={pessoa.feito || ''} onChange={(e) => atualizarPessoa(i, 'feito', e.target.value)} rows={2} />}
                </div>
                <div className={styles.pessoaCampo}>
                  <label className={styles.campoLabel}>→ Vai fazer</label>
                  {readOnly ? <p className={styles.campoTexto}>{pessoa.farA || '—'}</p> : <textarea className={styles.textarea} value={pessoa.farA || ''} onChange={(e) => atualizarPessoa(i, 'farA', e.target.value)} rows={2} />}
                </div>
                {pessoa.impedimentos && (
                  <div className={styles.pessoaCampo}>
                    <label className={`${styles.campoLabel} ${styles.bloqueio}`}>⚠ Impedimento</label>
                    {readOnly ? <p className={styles.campoTexto}>{pessoa.impedimentos}</p> : <textarea className={`${styles.textarea} ${styles.textareaRed}`} value={pessoa.impedimentos} onChange={(e) => atualizarPessoa(i, 'impedimentos', e.target.value)} rows={2} />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {ata.decisoes?.length > 0 && (
        <div className={styles.secao}>
          <h3 className={styles.secaoTitulo}>Decisões</h3>
          <div className={styles.listaCard}>
            {ata.decisoes.map((d, i) => (
              <div key={i} className={styles.listaItem}>
                <span className={styles.listaIcone}>◆</span>
                {readOnly ? <span>{d}</span> : <input className={styles.inputLinha} value={d} onChange={(e) => atualizarDecisao(i, e.target.value)} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {ata.acoes?.length > 0 && (
        <div className={styles.secao}>
          <h3 className={styles.secaoTitulo}>Ações</h3>
          <div className={styles.listaCard}>
            {ata.acoes.map((a, i) => (
              <div key={i} className={styles.acaoItem}>
                <span className={styles.acaoResponsavel}>{a.responsavel || 'Time'}</span>
                {readOnly ? <span className={styles.acaoTarefa}>{a.tarefa}</span> : <input className={styles.inputLinha} value={a.tarefa} onChange={(e) => atualizarAcao(i, 'tarefa', e.target.value)} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {ata.observacoes && (
        <div className={styles.secao}>
          <h3 className={styles.secaoTitulo}>Observações</h3>
          <div className={styles.listaCard}><p className={styles.obsTexto}>{ata.observacoes}</p></div>
        </div>
      )}

      {!readOnly && dailyId && (
        <div className={styles.salvarArea}>
          {salvo && <span className={styles.salvoMsg}>✓ Salvo</span>}
          <button className={styles.btnSalvar} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      )}
    </div>
  )
}
ENDOFFILE

cat > frontend/src/components/AtaViewer.module.css << 'ENDOFFILE'
.container { display: flex; flex-direction: column; gap: 20px; max-width: 860px; }
.card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 24px 28px; }
.cardHeader { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.badge { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--accent2); background: var(--accent-dim); padding: 4px 10px; border-radius: 100px; }
.data { font-family: var(--mono); font-size: 13px; color: var(--text3); }
.resumoTexto { font-size: 16px; color: var(--text); line-height: 1.7; }
.participantes { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.tag { font-size: 13px; font-weight: 500; color: var(--text2); background: var(--bg3); border: 1px solid var(--border); padding: 4px 12px; border-radius: 100px; }
.secao { display: flex; flex-direction: column; gap: 12px; }
.secaoTitulo { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text3); }
.pessoasGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
.pessoaCard { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 22px; display: flex; flex-direction: column; gap: 14px; }
.pessoaNome { font-size: 16px; font-weight: 700; color: var(--text); padding-bottom: 12px; border-bottom: 1px solid var(--border); }
.pessoaCampo { display: flex; flex-direction: column; gap: 6px; }
.campoLabel { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text3); }
.bloqueio { color: var(--amber) !important; }
.campoTexto { font-size: 14px; color: var(--text2); line-height: 1.6; }
.textarea { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); font-size: 14px; line-height: 1.6; padding: 10px 12px; resize: vertical; transition: border-color 0.15s; width: 100%; }
.textarea:focus { outline: none; border-color: var(--accent); }
.textareaRed { border-color: rgba(247, 201, 106, 0.3); }
.textareaRed:focus { border-color: var(--amber); }
.listaCard { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.listaItem { display: flex; align-items: center; gap: 14px; padding: 14px 20px; font-size: 14px; color: var(--text2); border-bottom: 1px solid var(--border); }
.listaItem:last-child { border-bottom: none; }
.listaIcone { font-size: 8px; color: var(--accent2); flex-shrink: 0; }
.inputLinha { flex: 1; background: transparent; border: none; color: var(--text); font-size: 14px; font-family: var(--font); outline: none; padding: 2px 0; }
.inputLinha:focus { border-bottom: 1px solid var(--accent); }
.acaoItem { display: flex; align-items: center; gap: 14px; padding: 12px 20px; border-bottom: 1px solid var(--border); }
.acaoItem:last-child { border-bottom: none; }
.acaoResponsavel { font-size: 12px; font-weight: 600; color: var(--accent2); background: var(--accent-dim); padding: 3px 10px; border-radius: 100px; white-space: nowrap; flex-shrink: 0; }
.acaoTarefa { font-size: 14px; color: var(--text2); }
.obsTexto { padding: 16px 20px; font-size: 14px; color: var(--text2); line-height: 1.7; }
.salvarArea { display: flex; align-items: center; justify-content: flex-end; gap: 16px; padding-top: 8px; }
.salvoMsg { font-size: 13px; color: var(--green); font-weight: 500; }
.btnSalvar { background: var(--accent); color: #fff; font-size: 14px; font-weight: 600; padding: 10px 24px; border-radius: var(--radius-sm); transition: all 0.15s; }
.btnSalvar:hover { background: var(--accent2); }
.btnSalvar:disabled { opacity: 0.5; cursor: not-allowed; }
ENDOFFILE

cat > frontend/src/pages/Historico.jsx << 'ENDOFFILE'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { buscarHistorico, deletarDaily } from '../services/api.js'
import styles from './Historico.module.css'

export default function Historico() {
  const [dailys, setDailys] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarHistorico().then(setDailys).finally(() => setCarregando(false))
  }, [])

  async function handleDeletar(id, e) {
    e.preventDefault()
    if (!confirm('Deletar esta daily?')) return
    await deletarDaily(id)
    setDailys((prev) => prev.filter((d) => d.id !== id))
  }

  if (carregando) return <div className={styles.page}><div className={styles.loading}><div className={styles.spinner} /></div></div>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Histórico</h1>
        <p className={styles.subtitle}>{dailys.length} daily{dailys.length !== 1 ? 's' : ''} registrada{dailys.length !== 1 ? 's' : ''}</p>
      </div>
      {dailys.length === 0 ? (
        <div className={styles.vazio}>
          <p>Nenhuma daily registrada ainda.</p>
          <Link to="/" className={styles.linkNova}>Gravar primeira daily →</Link>
        </div>
      ) : (
        <div className={styles.lista}>
          {dailys.map((d) => (
            <Link to={`/historico/${d.id}`} key={d.id} className={styles.card}>
              <div className={styles.cardLeft}>
                <span className={styles.cardData}>{d.data}</span>
                <p className={styles.cardResumo}>{d.resumo || 'Sem resumo'}</p>
                {d.participantes && (
                  <div className={styles.cardParticipantes}>
                    {d.participantes.split(', ').map((p, i) => <span key={i} className={styles.tag}>{p}</span>)}
                  </div>
                )}
              </div>
              <div className={styles.cardRight}>
                <span className={styles.cardHora}>{new Date(d.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                <button className={styles.btnDeletar} onClick={(e) => handleDeletar(d.id, e)} title="Deletar">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
ENDOFFILE

cat > frontend/src/pages/Historico.module.css << 'ENDOFFILE'
.page { padding: 48px 52px; animation: fadeIn 0.3s ease; min-height: 100%; }
.header { margin-bottom: 36px; }
.title { font-size: 36px; font-weight: 800; letter-spacing: -1px; }
.subtitle { margin-top: 6px; font-size: 14px; color: var(--text3); }
.loading { display: flex; justify-content: center; padding: 80px 0; }
.spinner { width: 32px; height: 32px; border: 2px solid var(--border2); border-top-color: var(--accent2); border-radius: 50%; animation: spin 0.8s linear infinite; }
.vazio { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 80px 0; color: var(--text3); font-size: 15px; }
.linkNova { color: var(--accent2); font-weight: 500; font-size: 14px; transition: opacity 0.15s; }
.linkNova:hover { opacity: 0.7; }
.lista { display: flex; flex-direction: column; gap: 10px; max-width: 760px; }
.card { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 24px; transition: all 0.15s; cursor: pointer; }
.card:hover { border-color: var(--border2); background: var(--bg3); transform: translateX(3px); }
.cardLeft { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.cardData { font-family: var(--mono); font-size: 12px; color: var(--accent2); font-weight: 500; }
.cardResumo { font-size: 14px; color: var(--text2); line-height: 1.5; }
.cardParticipantes { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.tag { font-size: 12px; color: var(--text3); background: var(--bg); border: 1px solid var(--border); padding: 2px 10px; border-radius: 100px; }
.cardRight { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; flex-shrink: 0; }
.cardHora { font-family: var(--mono); font-size: 12px; color: var(--text3); }
.btnDeletar { background: transparent; color: var(--text3); padding: 4px; border-radius: 6px; transition: all 0.15s; display: flex; align-items: center; }
.btnDeletar:hover { color: var(--red); background: rgba(247, 106, 106, 0.1); }
ENDOFFILE

cat > frontend/src/pages/DetalheDaily.jsx << 'ENDOFFILE'
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { buscarDaily } from '../services/api.js'
import AtaViewer from '../components/AtaViewer.jsx'
import styles from './DetalheDaily.module.css'

export default function DetalheDaily() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [daily, setDaily] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarDaily(id).then(setDaily).catch(() => navigate('/historico')).finally(() => setCarregando(false))
  }, [id])

  if (carregando) return <div className={styles.page}><div className={styles.loading}><div className={styles.spinner} /></div></div>
  if (!daily) return null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to="/historico" className={styles.voltar}>← Histórico</Link>
        <div>
          <h1 className={styles.title}>Daily — {daily.data}</h1>
          <p className={styles.subtitle}>Registrada às {new Date(daily.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
      <AtaViewer ata={daily.ata} dailyId={daily.id} />
    </div>
  )
}
ENDOFFILE

cat > frontend/src/pages/DetalheDaily.module.css << 'ENDOFFILE'
.page { padding: 48px 52px; animation: fadeIn 0.3s ease; min-height: 100%; }
.loading { display: flex; justify-content: center; padding: 80px 0; }
.spinner { width: 32px; height: 32px; border: 2px solid var(--border2); border-top-color: var(--accent2); border-radius: 50%; animation: spin 0.8s linear infinite; }
.header { margin-bottom: 36px; display: flex; flex-direction: column; gap: 12px; }
.voltar { font-size: 13px; color: var(--text3); font-weight: 500; transition: color 0.15s; }
.voltar:hover { color: var(--accent2); }
.title { font-size: 32px; font-weight: 800; letter-spacing: -0.8px; }
.subtitle { margin-top: 6px; font-size: 13px; color: var(--text3); font-family: var(--mono); }
ENDOFFILE

# ─── RAIZ ───────────────────────────────────────────────────────────────────

cat > .gitignore << 'ENDOFFILE'
node_modules/
.env
*.db
dist/
.DS_Store
ENDOFFILE

echo ""
echo "✅ Todos os arquivos criados!"
echo ""
echo "Próximos passos:"
echo ""
echo "  1. cd backend && npm install"
echo "  2. cp backend/.env.example backend/.env"
echo "  3. Edite backend/.env com sua chave do Groq"
echo "  4. cd frontend && npm install"
echo ""
echo "Para rodar:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "  Acesse: http://localhost:5173"
echo ""
