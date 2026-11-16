'use client'

import { useEffect, useRef } from 'react'

const frameWidth = 256
const frameHeight = 364
const frameCount = 81
const sheetColumns = 9
const frameDuration = 40
const stillFrame = 10

export function MarshadowAscii() {
  const asideRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const aside = asideRef.current
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!aside || !canvas || !context) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const wideScreen = window.matchMedia('(min-width: 768px)')
    let sprite: HTMLImageElement | undefined
    let loaded = false
    let hovered = false
    let current = stillFrame
    let timer: number | undefined

    function draw() {
      if (!sprite || !loaded || !context) return
      context.clearRect(0, 0, frameWidth, frameHeight)
      context.drawImage(
        sprite,
        (current % sheetColumns) * frameWidth,
        Math.floor(current / sheetColumns) * frameHeight,
        frameWidth,
        frameHeight,
        0,
        0,
        frameWidth,
        frameHeight
      )
    }

    function stopTimer() {
      if (timer !== undefined) window.clearTimeout(timer)
      timer = undefined
    }

    function schedule() {
      stopTimer()
      hovered = aside?.matches(':hover') ?? false
      if (loaded && !hovered && !reducedMotion.matches && wideScreen.matches && !document.hidden) {
        timer = window.setTimeout(() => {
          current = (current + 1) % frameCount
          draw()
          schedule()
        }, frameDuration)
      }
    }

    function updatePlayback() {
      if (wideScreen.matches && !sprite) {
        sprite = new window.Image()
        sprite.onload = () => {
          loaded = true
          draw()
          schedule()
        }
        sprite.src = '/ascii/marshadow-sprite.png?v=2'
      }
      if (reducedMotion.matches) {
        current = stillFrame
        draw()
      }
      schedule()
    }

    function onPointerEnter() {
      hovered = true
      stopTimer()
    }

    function onPointerLeave() {
      hovered = false
      schedule()
    }

    aside.addEventListener('pointerenter', onPointerEnter)
    aside.addEventListener('pointerleave', onPointerLeave)
    reducedMotion.addEventListener('change', updatePlayback)
    wideScreen.addEventListener('change', updatePlayback)
    document.addEventListener('visibilitychange', updatePlayback)
    updatePlayback()

    return () => {
      stopTimer()
      if (sprite) sprite.onload = null
      aside.removeEventListener('pointerenter', onPointerEnter)
      aside.removeEventListener('pointerleave', onPointerLeave)
      reducedMotion.removeEventListener('change', updatePlayback)
      wideScreen.removeEventListener('change', updatePlayback)
      document.removeEventListener('visibilitychange', updatePlayback)
    }
  }, [])

  return (
    <aside
      ref={asideRef}
      aria-hidden="true"
      className="marshadow-ascii"
      style={{ pointerEvents: 'auto' }}
    >
      <canvas ref={canvasRef} width={frameWidth} height={frameHeight} />
      <noscript>
        <img src="/ascii/marshadow-still.png?v=2" width={frameWidth} height={frameHeight} alt="" />
      </noscript>
    </aside>
  )
}
