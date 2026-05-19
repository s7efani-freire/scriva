import Groq from 'groq-sdk'

export async function transcrever(buffer, mimetype) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const file = new File([buffer], 'audio.webm', { type: mimetype || 'audio/webm' })

  const resposta = await groq.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3-turbo',
    language: 'pt',
    response_format: 'text'
  })

  return resposta
}
