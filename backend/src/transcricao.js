import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../.env') })

const BASE = 'https://api.assemblyai.com/v2'

function getKey() {
  const key = process.env.ASSEMBLYAI_API_KEY
  console.log('🔑 Usando chave AssemblyAI:', key ? `${key.slice(0, 8)}...` : 'NÃO ENCONTRADA')
  return key
}

async function uploadAudio(buffer) {
  const API_KEY = getKey()
  const response = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': API_KEY,
      'Content-Type': 'application/octet-stream'
    },
    body: buffer
  })

  const text = await response.text()
  console.log('📤 Upload response status:', response.status)
  console.log('📤 Upload response:', text.slice(0, 100))

  if (!response.ok) throw new Error(`Falha no upload: ${text}`)
  const data = JSON.parse(text)
  return data.upload_url
}

async function criarTranscricao(uploadUrl) {
  const API_KEY = process.env.ASSEMBLYAI_API_KEY
  const response = await fetch(`${BASE}/transcript`, {
    method: 'POST',
    headers: {
      'Authorization': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: uploadUrl,
      speech_models: ['universal-2'],
      language_code: 'pt'
    })
  })
  const data = await response.json()
  if (!data.id) throw new Error(`Falha ao criar transcrição: ${JSON.stringify(data)}`)
  return data.id
}

async function aguardarTranscricao(id) {
  const API_KEY = process.env.ASSEMBLYAI_API_KEY
  while (true) {
    const response = await fetch(`${BASE}/transcript/${id}`, {
      headers: { 'Authorization': API_KEY }
    })
    const data = await response.json()

    if (data.status === 'completed') return data.text
    if (data.status === 'error') throw new Error(`Erro na transcrição: ${data.error}`)

    await new Promise(r => setTimeout(r, 2000))
  }
}

export async function transcrever(buffer) {
  console.log('📤 Fazendo upload do áudio...')
  const uploadUrl = await uploadAudio(buffer)

  console.log('📝 Criando transcrição...')
  const id = await criarTranscricao(uploadUrl)

  console.log('⏳ Aguardando processamento...')
  const texto = await aguardarTranscricao(id)

  return texto
}