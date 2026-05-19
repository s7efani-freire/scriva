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
