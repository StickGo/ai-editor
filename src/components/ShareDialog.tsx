'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X, Copy, Check, Loader2, Trash2 } from 'lucide-react'

interface ShareRecord {
  id: string
  share_token: string
  permission: 'view' | 'edit'
  expires_at: string | null
  created_at: string
}

interface ShareDialogProps {
  documentId: string
  ownerId: string
  onClose: () => void
}

export function ShareDialog({ documentId, ownerId, onClose }: ShareDialogProps) {
  const [shares, setShares] = useState<ShareRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [permission, setPermission] = useState<'view' | 'edit'>('view')
  const [expiresInDays, setExpiresInDays] = useState<number | ''>('')
  const [isCreating, setIsCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── Load existing share links ──────────────────────────────
  const loadShares = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('document_shares')
        .select('id, share_token, permission, expires_at, created_at')
        .eq('document_id', documentId)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setShares(data ?? [])
    } catch {
      // non-critical, shares list just stays empty
    } finally {
      setIsLoading(false)
    }
  }, [documentId, ownerId])

  useEffect(() => { loadShares() }, [loadShares])

  // ── Create share link ──────────────────────────────────────
  async function handleCreate() {
    setIsCreating(true)
    setError(null)
    try {
      const token = crypto.randomUUID()
      const expiresAt = expiresInDays
        ? new Date(Date.now() + Number(expiresInDays) * 86400_000).toISOString()
        : null

      const { error: insertError } = await supabase
        .from('document_shares')
        .insert({
          document_id: documentId,
          owner_id: ownerId,
          share_token: token,
          permission,
          expires_at: expiresAt,
        })

      if (insertError) throw insertError

      await loadShares()
      // Auto-copy the new link
      const url = `${window.location.origin}/ai-editor/shared/${token}`
      await navigator.clipboard.writeText(url).catch(() => null)
      setCopiedId(token)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      setError(`Error: ${msg}`)
    } finally {
      setIsCreating(false)
    }
  }

  // ── Copy link ──────────────────────────────────────────────
  async function handleCopy(token: string) {
    const url = `${window.location.origin}/ai-editor/shared/${token}`
    await navigator.clipboard.writeText(url).catch(() => null)
    setCopiedId(token)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ── Revoke link ────────────────────────────────────────────
  async function handleRevoke(shareId: string) {
    if (!confirm('Hapus link ini? Orang yang punya link tidak bisa akses lagi.')) return
    const { error: delError } = await supabase
      .from('document_shares')
      .delete()
      .eq('id', shareId)
    if (!delError) setShares(prev => prev.filter(s => s.id !== shareId))
  }

  // ── Helpers ────────────────────────────────────────────────
  function isExpired(expiresAt: string | null) {
    return expiresAt ? new Date(expiresAt) < new Date() : false
  }

  function formatExpiry(expiresAt: string | null) {
    if (!expiresAt) return 'Tidak kedaluwarsa'
    const d = new Date(expiresAt)
    return isExpired(expiresAt)
      ? `Kedaluwarsa ${d.toLocaleDateString('id-ID')}`
      : `Exp: ${d.toLocaleDateString('id-ID')}`
  }

  return (
    <div className="sidebar-modal-overlay">
      <div className="sidebar-modal" style={{ maxWidth: 460, width: '100%' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 className="sidebar-modal-title" style={{ margin: 0 }}>Share Dokumen</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>

        {/* Create new link */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Buat Link Baru
          </p>

          {/* Permission toggle */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {(['view', 'edit'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPermission(p)}
                className={`topbar-btn ${permission === p ? 'topbar-btn-active' : ''}`}
                style={{ flex: 1 }}
              >
                {p === 'view' ? '👁 View Only' : '✏️ Can Edit'}
              </button>
            ))}
          </div>

          {/* Expiry */}
          <select
            value={expiresInDays}
            onChange={e => setExpiresInDays(e.target.value === '' ? '' : Number(e.target.value))}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.7)',
              borderRadius: 4,
              padding: '6px 10px',
              fontSize: 11,
              marginBottom: 10,
              cursor: 'pointer',
            }}
          >
            <option value="">Tidak kedaluwarsa</option>
            <option value="1">Kedaluwarsa dalam 1 hari</option>
            <option value="7">Kedaluwarsa dalam 7 hari</option>
            <option value="30">Kedaluwarsa dalam 30 hari</option>
          </select>

          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="auth-submit"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            {isCreating ? <><Loader2 size={11} className="sidebar-spinner" /> Membuat...</> : 'Buat & Salin Link'}
          </button>

          {error && <p style={{ fontSize: 11, color: '#f87171', marginTop: 8 }}>{error}</p>}
        </div>

        {/* Active shares list */}
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Link Aktif
          </p>

          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
              <Loader2 size={12} className="sidebar-spinner" /> Memuat...
            </div>
          ) : shares.length === 0 ? (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>
              Belum ada link yang dibuat.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {shares.map(share => {
                const expired = isExpired(share.expires_at)
                return (
                  <div
                    key={share.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${expired ? 'rgba(255,100,100,0.15)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 4,
                      opacity: expired ? 0.5 : 1,
                    }}
                  >
                    {/* Permission badge */}
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 3,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      background: share.permission === 'edit' ? 'rgba(250,200,50,0.15)' : 'rgba(255,255,255,0.08)',
                      color: share.permission === 'edit' ? '#fac832' : 'rgba(255,255,255,0.5)',
                      flexShrink: 0,
                    }}>
                      {share.permission}
                    </span>

                    {/* Expiry */}
                    <span style={{ fontSize: 10, color: expired ? '#f87171' : 'rgba(255,255,255,0.3)', flex: 1 }}>
                      {formatExpiry(share.expires_at)}
                    </span>

                    {/* Copy */}
                    {!expired && (
                      <button
                        onClick={() => handleCopy(share.share_token)}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4 }}
                        title="Salin link"
                      >
                        {copiedId === share.share_token
                          ? <Check size={12} color="#4ade80" />
                          : <Copy size={12} />
                        }
                      </button>
                    )}

                    {/* Revoke */}
                    <button
                      onClick={() => handleRevoke(share.id)}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,100,100,0.5)', cursor: 'pointer', padding: 4 }}
                      title="Hapus link"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Close */}
        <div style={{ marginTop: 20 }}>
          <button onClick={onClose} className="sidebar-modal-cancel" style={{ width: '100%' }}>
            Tutup
          </button>
        </div>

      </div>
    </div>
  )
}
