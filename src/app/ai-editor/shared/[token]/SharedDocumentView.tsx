'use client'

import { useState } from 'react'
import { Eye, Pencil, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'

interface Document {
  id: string
  title: string
  content: string
  user_id: string
  updated_at: string
  created_at: string
}

interface SharedDocumentViewProps {
  document: Document
  permission: 'view' | 'edit'
}

export function SharedDocumentView({ document, permission }: SharedDocumentViewProps) {
  const isViewOnly = permission === 'view'
  const [content, setContent] = useState(document.content)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const { user } = useAuth()

  async function handleChange(value: string) {
    if (isViewOnly) return
    setContent(value)
    setSaveStatus('saving')
    try {
      const { error } = await supabase
        .from('documents')
        .update({ content: value, updated_at: new Date().toISOString() })
        .eq('id', document.id)
      if (error) throw error
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  }

  function handleOpenInEditor() {
    // Save document data to sessionStorage so editor can load it
    // without needing to call getDocument (which fails due to RLS for non-owner)
    sessionStorage.setItem(`shared_doc_${document.id}`, JSON.stringify({
      id: document.id,
      title: document.title,
      content: content, // use current content state (may have been edited)
      user_id: document.user_id,
    }))
    window.location.href = `/ai-editor?docId=${document.id}`
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#000',
      color: '#fff',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* Share Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 20px',
        background: isViewOnly ? '#111' : '#0a1628',
        borderBottom: `1px solid ${isViewOnly ? 'rgba(255,255,255,0.06)' : 'rgba(99,179,237,0.2)'}`,
        fontSize: 11,
        color: isViewOnly ? 'rgba(255,255,255,0.4)' : 'rgba(147,210,255,0.8)',
        flexShrink: 0,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}>
        {isViewOnly
          ? <Eye size={12} strokeWidth={1.5} />
          : <Pencil size={12} strokeWidth={1.5} />
        }
        <span>
          {isViewOnly
            ? `Kamu sedang melihat "${document.title}" — hanya baca`
            : `Kamu sedang mengedit "${document.title}" — shared document`
          }
        </span>
        {!isViewOnly && (
          <span style={{ fontSize: 10 }}>
            {saveStatus === 'saving' && '● Menyimpan...'}
            {saveStatus === 'saved' && '✓ Tersimpan'}
            {saveStatus === 'error' && '⚠ Gagal simpan'}
          </span>
        )}

        {/* Open in Editor button — only for logged in users */}
        {user && (
          <button
            onClick={handleOpenInEditor}
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 12px',
              background: '#fff',
              color: '#000',
              border: 'none',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <ExternalLink size={10} />
            Buka di Editor
          </button>
        )}
      </div>

      {/* Document Title */}
      <div style={{
        padding: '24px 40px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}>
        <h1 style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '-0.02em',
        }}>
          {document.title}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          Terakhir diperbarui: {new Date(document.updated_at).toLocaleString('id-ID')}
        </p>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {isViewOnly ? (
          <div style={{
            height: '100%',
            overflow: 'auto',
            padding: '24px 40px',
            whiteSpace: 'pre-wrap',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: 13,
            lineHeight: 1.7,
            color: 'rgba(255,255,255,0.75)',
          }}>
            {content || <span style={{ opacity: 0.3 }}>Dokumen ini kosong.</span>}
          </div>
        ) : (
          <textarea
            value={content}
            onChange={e => handleChange(e.target.value)}
            style={{
              width: '100%',
              height: '100%',
              padding: '24px 40px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: 13,
              lineHeight: 1.7,
              color: 'rgba(255,255,255,0.85)',
              boxSizing: 'border-box',
            }}
            placeholder="Mulai menulis..."
            spellCheck={false}
          />
        )}
      </div>
    </div>
  )
}
