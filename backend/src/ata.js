import Groq from 'groq-sdk'

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
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

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
