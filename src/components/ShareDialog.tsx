'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X, Copy, Check, Loader2 } from 'lucide-react'

interface ShareDialogProps {
  documentId: string
  ownerId: string
  onClose: () => void
}

export function ShareDialog({ documentId, ownerId, onClose }: ShareDialogProps) {
  const [permission, setPermission] = useState<'view' | 'edit'>('view')
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generateShareLink() {
    try {
      setIsLoading(true)
      setError(null)

      // Check if share already exists
      const { data: existing } = await supabase
        .from('document_shares')
        .select('share_token')
        .eq('document_id', documentId)
        .eq('permission', permission)
        .maybeSingle()

      if (existing) {
        setShareLink(`${window.location.origin}/ai-editor/shared/${existing.share_token}`)
        return
      }

      // Create new share
      const shareToken = crypto.randomUUID()
      const { error: insertError } = await supabase
        .from('document_shares')
        .insert({
          document_id: documentId,
          owner_id: ownerId,
          permission,
          share_token: shareToken,
        })

      if (insertError) throw insertError

      setShareLink(`${window.location.origin}/ai-editor/shared/${shareToken}`)
    } catch (err) {
      console.error('Failed to generate share link:', err)
      setError('Gagal membuat link berbagi')
    } finally {
      setIsLoading(false)
    }
  }

  async function copyToClipboard() {
    if (!shareLink) return
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="sidebar-modal-overlay">
      <div className="sidebar-modal" style={{ maxWidth: 420, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 className="sidebar-modal-title" style={{ margin: 0 }}>Share Document</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => { setPermission('view'); setShareLink(null) }}
            className={`topbar-btn ${permission === 'view' ? 'topbar-btn-active' : ''}`}
            style={{ flex: 1 }}
          >
            View Only
          </button>
          <button
            onClick={() => { setPermission('edit'); setShareLink(null) }}
            className={`topbar-btn ${permission === 'edit' ? 'topbar-btn-active' : ''}`}
            style={{ flex: 1 }}
          >
            Can Edit
          </button>
        </div>

        {!shareLink ? (
          <button
            onClick={generateShareLink}
            disabled={isLoading}
            className="auth-submit"
            style={{ width: '100%' }}
          >
            {isLoading ? (
              <><Loader2 size={12} className="sidebar-spinner" /> Generating...</>
            ) : (
              'Generate Share Link'
            )}
          </button>
        ) : (
          <div>
            <div style={{
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: 11,
              color: 'rgba(255,255,255,0.6)',
              wordBreak: 'break-all',
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 8,
            }}>
              {shareLink}
            </div>
            <button
              onClick={copyToClipboard}
              className="auth-submit"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Link</>}
            </button>
          </div>
        )}

        {error && (
          <div className="auth-error" style={{ marginTop: 8 }}>{error}</div>
        )}

        <div style={{ marginTop: 16 }}>
          <button onClick={onClose} className="sidebar-modal-cancel" style={{ width: '100%' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
