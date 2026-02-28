'use client'

import { useRef, useEffect, useState } from 'react'
import type { CollaboratorPresence } from '@/hooks/useCollaboration'

interface CursorOverlayProps {
  collaborators: CollaboratorPresence[]
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  content: string
}

interface CursorPixelPosition {
  x: number
  y: number
  collaborator: CollaboratorPresence
}

export function CursorOverlay({ collaborators, textareaRef, content }: CursorOverlayProps) {
  const [cursorPositions, setCursorPositions] = useState<CursorPixelPosition[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const style = window.getComputedStyle(textarea)
    const fontSize = parseFloat(style.fontSize)
    const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.5
    const paddingTop = parseFloat(style.paddingTop)
    const paddingLeft = parseFloat(style.paddingLeft)

    // Use a cached canvas for text measurement
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    ctx.font = `${fontSize}px ${style.fontFamily}`
    const charWidth = ctx.measureText('M').width

    const positions: CursorPixelPosition[] = []
    const lines = content.split('\n')

    for (const collaborator of collaborators) {
      if (!collaborator.cursor) continue
      const { line, col } = collaborator.cursor
      if (line < 1 || line > lines.length + 1) continue

      positions.push({
        x: paddingLeft + col * charWidth,
        y: paddingTop + (line - 1) * lineHeight,
        collaborator,
      })
    }

    setCursorPositions(positions)
  }, [collaborators, content, textareaRef])

  if (!textareaRef.current || cursorPositions.length === 0) return null

  return (
    <div
      className="cursor-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 10,
      }}
    >
      {cursorPositions.map(({ x, y, collaborator }) => (
        <div
          key={collaborator.userId}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}
        >
          {/* Caret line */}
          <div
            style={{
              width: 2,
              height: '1.25em',
              backgroundColor: collaborator.color,
              borderRadius: 1,
            }}
          />
          {/* Name label */}
          <div
            style={{
              backgroundColor: collaborator.color,
              color: '#fff',
              fontSize: 10,
              fontWeight: 600,
              padding: '1px 5px',
              borderRadius: 3,
              whiteSpace: 'nowrap',
              marginTop: 2,
              marginLeft: 2,
              lineHeight: '14px',
            }}
          >
            {collaborator.displayName}
          </div>
        </div>
      ))}
    </div>
  )
}
