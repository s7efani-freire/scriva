# ◈ Scriva

> Grave, transcreva e gere ATAs automáticas de reuniões presenciais com IA.

**Scriva** é uma aplicação web que usa o microfone do navegador para gravar reuniões, transcreve o áudio com o modelo Whisper da Groq e gera automaticamente uma ATA estruturada usando LLaMA 3.3. Tudo gratuito, rodando localmente.

---

## Funcionalidades

- 🎙️ **Gravação no browser** — sem instalar nada, usa a API nativa do navegador
- 🔒 **HTTPS local para celular** — acesso seguro ao microfone via HTTPS na mesma rede
- 📱 **Compatível com mobile** — grave diretamente do celular
- ⏸️ **Pausar e retomar** — controle total da gravação
- 📊 **Visualização das ondas sonoras** em tempo real durante a gravação
- 🤖 **Transcrição automática** com Groq Whisper (PT-BR, alta precisão)
- 📝 **Geração de ATA com IA** usando LLaMA 3.3 70B via Groq
- ✏️ **Edição inline** — revise e corrija a ATA antes de salvar
- 📁 **Histórico completo** de todas as reuniões
- 🏷️ **4 tipos de reunião** com prompts especializados

---

## Tipos de reunião suportados

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
| Estilização | Tailwind CSS |
| Backend | Node.js + Express |
| Transcrição | Groq API — `whisper-large-v3-turbo` |
| Geração de ATA | Groq API — `llama-3.3-70b-versatile` |
| Banco de dados | SQLite (via better-sqlite3) |
| HTTPS Local | vite-plugin-mkcert |

---

## Pré-requisitos

- **Node.js 18+**
- **Conta gratuita no https://console.groq.com** para obter a API key
- Celular e computador na mesma rede Wi‑Fi (para testes mobile)

---

# Instalação

## 1. Clone o repositório

```bash
git clone https://github.com/s7efani-freire/scriva.git
cd scriva
```

---

## 2. Configure o backend

```bash
cd backend
npm install
cp .env.example .env
```

Edite o arquivo `.env`:

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx
PORT=3001
```

---

## 3. Configure o frontend

```bash
cd ../frontend
npm install
```

Instale o suporte HTTPS local:

```bash
npm install -D vite-plugin-mkcert
```

---

# Configuração HTTPS para acesso no celular

Os navegadores mobile exigem **HTTPS** para permitir acesso ao microfone.

Configure o `vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    mkcert()
  ],

  server: {
    host: '0.0.0.0',
    https: true,
    port: 5173,

    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

---

# Como rodar

Abra dois terminais.

## Terminal 1 — Backend

```bash
cd backend
npm run dev
```

---

## Terminal 2 — Frontend HTTPS

```bash
cd frontend
npm run dev
```

O Vite exibirá algo parecido com:

```txt
Local:   https://localhost:5173/
Network: https://192.168.0.10:5173/
```

---

# Acessando pelo celular

1. Conecte o celular na mesma rede Wi‑Fi do computador
2. Abra no navegador do celular:

```txt
https://SEU_IP:5173
```

Exemplo:

```txt
https://192.168.0.10:5173
```

---

## Descobrir IP da máquina

Linux:

```bash
ip a
```

Windows:

```bash
ipconfig
```

Mac:

```bash
ifconfig
```

---

## Firewall (Linux/Ubuntu/Pop!_OS)

Se o celular não conseguir acessar:

```bash
sudo ufw allow 5173
```

---

## Certificado HTTPS local

Na primeira execução o `vite-plugin-mkcert` pode solicitar senha sudo para instalar certificados locais confiáveis.

Isso é esperado.

---

# Como usar

1. Escolha o **tipo de reunião** na barra lateral
2. Clique em **Iniciar gravação**
3. Peça para cada participante **dizer o nome antes de falar**
4. Use **Pausar** se precisar interromper momentaneamente
5. Clique em **Parar e gerar ATA**
6. Revise e edite os campos da ATA
7. Salve — ficará disponível no histórico

---

# Limites gratuitos do Groq

| Serviço | Limite gratuito |
|---------|----------------|
| Whisper (transcrição) | 2.000 req/dia · 7.200s de áudio/hora |
| LLaMA 3.3 70B (ATA) | 1.000 req/dia · 30 req/min |

Para dailys de ~15 minutos, isso equivale a **mais de 100 reuniões por mês** sem custo.

---

# Estrutura do projeto

```txt
scriva/
├── backend/
│   ├── src/
│   │   ├── index.js
│   │   ├── routes.js
│   │   ├── transcricao.js
│   │   ├── ata.js
│   │   └── db.js
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── services/
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

# API Reference

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/processar` | Recebe áudio + tipo, retorna transcrição e ATA |
| `GET` | `/api/historico` | Lista reuniões |
| `GET` | `/api/historico/:id` | Detalhe de reunião |
| `PUT` | `/api/historico/:id` | Atualiza ATA editada |
| `DELETE` | `/api/historico/:id` | Remove reunião |

---

# Segurança e privacidade

- O áudio é enviado apenas para a API da Groq para transcrição e geração da ATA
- Nenhum serviço externo adicional é utilizado
- O banco SQLite roda localmente
- O HTTPS local é usado apenas para permitir acesso ao microfone no navegador mobile

---

# Licença

MIT
