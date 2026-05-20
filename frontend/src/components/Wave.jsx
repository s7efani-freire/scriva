import { useEffect, useRef } from 'react'

export default function Wave() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const cores = ['#d4457a', '#a855f7', '#6366f1', '#3b82f6', '#ec4899', '#8b5cf6']

    const particulas = Array.from({ length: 80 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 4 + 2,
      cor: cores[i % cores.length],
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      alpha: Math.random() * 0.4 + 0.6,
      pulso: Math.random() * Math.PI * 2,
      velocidadePulso: 0.02 + Math.random() * 0.03,
    }))

    let frame
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particulas.forEach((p, i) => {
        for (let j = i + 1; j < particulas.length; j++) {
          const b = particulas[j]
          const dx = p.x - b.x
          const dy = p.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(b.x, b.y)
            const alpha = (1 - dist / 100) * 0.5
            ctx.strokeStyle = p.cor + Math.round(alpha * 255).toString(16).padStart(2, '0')
            ctx.lineWidth = 1.2
            ctx.stroke()
          }
        }
      })

      particulas.forEach(p => {
        p.pulso += p.velocidadePulso
        p.x += p.vx + Math.sin(p.pulso) * 0.5
        p.y += p.vy + Math.cos(p.pulso * 0.7) * 0.5

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        const alpha = p.alpha * (0.7 + Math.sin(p.pulso) * 0.3)

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.cor + Math.round(alpha * 255).toString(16).padStart(2, '0')
        ctx.fill()

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2)
        ctx.fillStyle = p.cor + '22'
        ctx.fill()
      })

      frame = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full flex-1 min-h-[120px]"
      style={{ display: 'block' }}
    />
  )
}