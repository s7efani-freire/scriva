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
