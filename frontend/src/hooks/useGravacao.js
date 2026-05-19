import { useState, useRef, useCallback, useEffect } from 'react'

export function useGravacao() {
  const [estado, setEstado] = useState('idle') // idle | gravando | pausado | processando | pronto | erro
  const [tempoGravacao, setTempoGravacao] = useState(0)
  const [erro, setErro] = useState(null)
  const [volume, setVolume] = useState(0) // 0-100 para visualização das ondas

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const streamRef = useRef(null)

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  function iniciarAnalise(stream) {
    const ctx = new AudioContext()
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyserRef.current = analyser

    function tick() {
      const data = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length
      setVolume(Math.min(100, avg * 2))
      animFrameRef.current = requestAnimationFrame(tick)
    }
    tick()
  }

  const iniciarGravacao = useCallback(async () => {
    try {
      setErro(null)
      chunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      iniciarAnalise(stream)

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm'
      })

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(1000)

      setEstado('gravando')
      setTempoGravacao(0)
      timerRef.current = setInterval(() => setTempoGravacao((t) => t + 1), 1000)
    } catch (err) {
      setErro('Não foi possível acessar o microfone. Verifique as permissões.')
      setEstado('erro')
    }
  }, [])

  const pausarGravacao = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder || estado !== 'gravando') return
    mediaRecorder.pause()
    clearInterval(timerRef.current)
    cancelAnimationFrame(animFrameRef.current)
    setVolume(0)
    setEstado('pausado')
  }, [estado])

  const retormarGravacao = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current
    if (!mediaRecorder || estado !== 'pausado') return
    mediaRecorder.resume()
    timerRef.current = setInterval(() => setTempoGravacao((t) => t + 1), 1000)
    if (analyserRef.current) {
      function tick() {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        setVolume(Math.min(100, avg * 2))
        animFrameRef.current = requestAnimationFrame(tick)
      }
      tick()
    }
    setEstado('gravando')
  }, [estado])

  const pararGravacao = useCallback(() => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current
      if (!mediaRecorder) return resolve(null)

      clearInterval(timerRef.current)
      cancelAnimationFrame(animFrameRef.current)
      setVolume(0)

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        mediaRecorder.stream.getTracks().forEach((t) => t.stop())
        resolve(blob)
      }

      if (mediaRecorder.state === 'paused') mediaRecorder.resume()
      mediaRecorder.stop()
      setEstado('processando')
    })
  }, [])

  const resetar = useCallback(() => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(animFrameRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    setEstado('idle')
    setTempoGravacao(0)
    setErro(null)
    setVolume(0)
    chunksRef.current = []
  }, [])

  const formatarTempo = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const seg = (s % 60).toString().padStart(2, '0')
    return `${m}:${seg}`
  }

  return {
    estado, setEstado,
    tempoGravacao: formatarTempo(tempoGravacao),
    volume,
    erro,
    iniciarGravacao,
    pausarGravacao,
    retormarGravacao,
    pararGravacao,
    resetar
  }
}