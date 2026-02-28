'use client'

import { useRef, useImperativeHandle, forwardRef } from 'react'
import { CursorOverlay } from '@/components/CursorOverlay'
import type { CollaboratorPresence } from '@/hooks/useCollaboration'

export interface DocumentEditorHandle {
  getTextarea: () => HTMLTextAreaElement | null
}

interface Props {
  content: string
  onChange: (content: string) => void
  collaborators?: CollaboratorPresence[]
  onCursorChange?: (line: number, col: number) => void
}

function getCursorPosition(textarea: HTMLTextAreaElement): { line: number; col: number } {
  const value = textarea.value
  const selectionStart = textarea.selectionStart ?? 0
  const textBeforeCursor = value.substring(0, selectionStart)
  const lines = textBeforeCursor.split('\n')
  return {
    line: lines.length,
    col: lines[lines.length - 1].length,
  }
}

const DocumentEditor = forwardRef<DocumentEditorHandle, Props>(function DocumentEditor(
  { content, onChange, collaborators = [], onCursorChange },
  ref
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    getTextarea: () => textareaRef.current,
  }))

  const safeContent = content ?? ''
  const lines = safeContent.split('\n')
  const lineCount = lines.length

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  const handleCursorMove = (
    e: React.MouseEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (!onCursorChange) return
    const textarea = e.currentTarget
    const pos = getCursorPosition(textarea)
    onCursorChange(pos.line, pos.col)
  }

  return (
    <div className="editor-container">
      {/* Header */}
      <div className="editor-header">
        <span className="editor-header-dot red" />
        <span className="editor-header-dot yellow" />
        <span className="editor-header-dot green" />
        <span className="editor-header-title">Editor</span>
        <span className="editor-header-lines">{lineCount} lines</span>
      </div>

      {/* Body */}
      <div className="editor-body">
        <div ref={lineNumbersRef} className="editor-line-numbers">
          {lines.map((_, i) => (
            <div key={i} className="editor-line-number">{i + 1}</div>
          ))}
        </div>

        {/* Textarea + cursor overlay wrapper */}
        <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
          <textarea
            ref={textareaRef}
            value={safeContent}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onMouseUp={handleCursorMove}
            onKeyUp={handleCursorMove}
            onSelect={handleCursorMove}
            className="editor-textarea"
            placeholder="Start typing your document..."
            spellCheck={false}
          />
          {collaborators.length > 0 && (
            <CursorOverlay
              collaborators={collaborators}
              textareaRef={textareaRef}
              content={safeContent}
            />
          )}
        </div>
      </div>
    </div>
  )
})

export default DocumentEditor
