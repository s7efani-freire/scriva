# ◈ Scriva

> Grave, transcreva e gere ATAs automáticas de reuniões presenciais com IA.

**Scriva** é uma aplicação web que usa o microfone do navegador para gravar reuniões, transcreve o áudio com o modelo Whisper da Groq e gera automaticamente uma ATA estruturada usando LLaMA 3.3. Tudo gratuito, rodando localmente.

---

## Funcionalidades

- 🎙️ **Gravação no browser** — sem instalar nada, usa a API nativa do navegador
- ⏸️ **Pausar e retomar** — controle total da gravação
- 📊 **Visualização das ondas sonoras** em tempo real durante a gravação
- 🤖 **Transcrição automática** com Groq Whisper (PT-BR, alta precisão)
- 📝 **Geração de ATA com IA** usando LLaMA 3.3 70B via Groq
- ✏️ **Edição inline** — revise e corrija a ATA antes de salvar
- 📁 **Histórico completo** de todas as reuniões
- 🏷️ **4 tipos de reunião** com prompts especializados

### Tipos de reunião suportados

| Tipo | Descrição | ATA gerada |
|------|-----------|------------|
| **Daily** | Standup diário de desenvolvimento | Por pessoa: feito, vai fazer, impedimentos |
| **Reunião de Projeto** | Reunião de projeto específico | Discussões, decisões, riscos, prazos |
| **Alinhamento** | Múltiplos projetos | Status por projeto, interdependências, bloqueios |
| **Reunião Geral** | Qualquer reunião avulsa | Pauta, discussões detalhadas, ações |

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Transcrição | Groq API — `whisper-large-v3-turbo` |
| Geração de ATA | Groq API — `llama-3.3-70b-versatile` |
| Banco de dados | SQLite (via better-sqlite3) |

---

## Pré-requisitos

- **Node.js 18+**
- **Conta gratuita no [Groq](https://console.groq.com)** para obter a API key

---

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/s7efani-freire/scriva.git
cd scriva
```

### 2. Configure o backend

```bash
cd backend
npm install
cp .env.example .env
```

Edite o arquivo `.env` com sua chave do Groq:

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx
PORT=3001
```

> A chave do Groq é gratuita. Acesse [console.groq.com](https://console.groq.com) → API Keys → Create API Key.

### 3. Instale o frontend

```bash
cd ../frontend
npm install
```

---

## Como rodar

Abra dois terminais:

```bash
# Terminal 1 — Backend
cd backend
npm run dev
```

```bash
# Terminal 2 — Frontend
cd frontend
npm run dev
```

Acesse: **[http://localhost:5173](http://localhost:5173)**

---

## Como usar

1. Escolha o **tipo de reunião** na barra lateral
2. Clique em **Iniciar gravação**
3. Peça para cada participante **dizer o nome antes de falar** — a IA usa isso para separar as falas
4. Use **Pausar** se precisar de uma pausa sem interromper a gravação
5. Clique em **Parar e gerar ATA**
6. Revise e edite os campos da ATA gerada
7. Salve — fica no **Histórico** para consulta futura

---

## Limites gratuitos do Groq

| Serviço | Limite gratuito |
|---------|----------------|
| Whisper (transcrição) | 2.000 req/dia · 7.200s de áudio/hora |
| LLaMA 3.3 70B (ATA) | 1.000 req/dia · 30 req/min |

Para dailys de ~15 minutos, isso equivale a **mais de 100 reuniões por mês** sem custo.

---

## Estrutura do projeto

```
scriva/
├── backend/
│   ├── src/
│   │   ├── index.js        # Servidor Express
│   │   ├── routes.js       # Rotas da API
│   │   ├── transcricao.js  # Groq Whisper
│   │   ├── ata.js          # Groq LLaMA — 4 prompts especializados
│   │   └── db.js           # SQLite
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/     # Layout, AtaViewer
│   │   ├── pages/          # Home, Historico, DetalheDaily
│   │   ├── hooks/          # useGravacao (MediaRecorder + AudioAnalyser)
│   │   └── services/       # api.js
│   └── package.json
│
└── README.md
```

---

## API Reference

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/processar` | Recebe áudio + tipo, retorna transcrição e ATA |
| `GET` | `/api/historico` | Lista reuniões (aceita `?tipo=daily`) |
| `GET` | `/api/historico/:id` | Detalhe de uma reunião |
| `PUT` | `/api/historico/:id` | Atualiza ATA editada |
| `DELETE` | `/api/historico/:id` | Remove uma reunião |

---

## Licença

MIT