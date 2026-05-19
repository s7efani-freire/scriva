import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export async function processarAudio(audioBlob, tipo = 'daily', onProgress) {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'reuniao.webm')
  formData.append('tipo', tipo)

  const { data } = await api.post('/processar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    }
  })
  return data
}

export async function buscarHistorico(tipo) {
  const params = tipo ? `?tipo=${tipo}` : ''
  const { data } = await api.get(`/historico${params}`)
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