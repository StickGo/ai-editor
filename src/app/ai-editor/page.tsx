'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import DocumentEditor from '@/components/DocumentEditor'
import AIChat from '@/components/AIChat'
import { DocsSidebar } from '@/components/DocsSidebar'
import { VersionTimeline } from '@/components/VersionTimeline'
import { DiffModal } from '@/components/DiffModal'
import { PresenceIndicator } from '@/components/PresenceIndicator'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase/client'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useAutoSnapshot } from '@/hooks/useAutoSnapshot'
import { useCollaboration } from '@/hooks/useCollaboration'
import { useThrottle } from '@/hooks/useThrottle'
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback'
import { getDocument, renameDocument, type DocumentSummary } from '@/lib/documents'
import {
  FileText,
  Undo2,
  Redo2,
  Download,
  LogOut,
  Share2,
  Loader2,
  PanelLeftClose,
  PanelLeft,
  Save,
  History,
  Pencil,
} from 'lucide-react'

// ─── Undo/Redo Hook ─────────────────────────────────────────
function useUndoRedo(initial: string) {
  const [history, setHistory] = useState<string[]>([initial])
  const [index, setIndex] = useState(0)
  const skipNextPush = useRef(false)

  const current = history[index]

  const push = useCallback((value: string) => {
    if (skipNextPush.current) {
      skipNextPush.current = false
      return
    }
    setHistory(prev => {
      const newHistory = prev.slice(0, index + 1)
      newHistory.push(value)
      if (newHistory.length > 100) newHistory.shift()
      return newHistory
    })
    setIndex(prev => Math.min(prev + 1, 100))
  }, [index])

  const undo = useCallback(() => {
    if (index > 0) {
      skipNextPush.current = true
      setIndex(prev => prev - 1)
    }
  }, [index])

  const redo = useCallback(() => {
    if (index < history.length - 1) {
      skipNextPush.current = true
      setIndex(prev => prev + 1)
    }
  }, [index, history.length])

  const reset = useCallback((value: string) => {
    setHistory([value])
    setIndex(0)
  }, [])

  return { current, push, undo, redo, reset, canUndo: index > 0, canRedo: index < history.length - 1 }
}

// ─── Auth Form ───────────────────────────────────────────────
function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <FileText size={28} strokeWidth={1.5} />
        </div>
        <h1 className="auth-title">Document Editor</h1>
        <p className="auth-subtitle">
          {isLogin ? 'Sign in to continue' : 'Create your account'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            required
            minLength={6}
          />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <button
          className="auth-toggle"
          onClick={() => { setIsLogin(!isLogin); setError('') }}
        >
          {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Editor Page ────────────────────────────────────────
export default function EditorPage() {
  const { user, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const [activeDocId, setActiveDocId] = useState<string | null>(null)
  const [activeDocTitle, setActiveDocTitle] = useState<string>('')
  const [activeDocOwnerId, setActiveDocOwnerId] = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [compareVersions, setCompareVersions] = useState<{ a: string; b: string } | null>(null)

  // Is current user the owner of the active document?
  const isDocOwner = !!(user && activeDocOwnerId && user.id === activeDocOwnerId)

  // Undo/Redo
  const {
    current: documentContent,
    push: pushHistory,
    undo, redo, reset: resetHistory,
    canUndo, canRedo
  } = useUndoRedo('')

  // Auto-save with status (only owner can save)
  const { saveStatus, saveNow } = useAutoSave(activeDocId, documentContent, isDocOwner)

  // Auto-snapshot (every 30s)
  const { saveNamedVersion } = useAutoSnapshot({
    documentId: activeDocId,
    content: documentContent,
    userId: user?.id ?? '',
  })

  // ── Collaboration ──────────────────────────────────────────
  // Guard against infinite loop: flag set when receiving remote content
  const isReceivingRemoteChange = useRef(false)

  const handleRemoteContentChange = useCallback((newContent: string) => {
    isReceivingRemoteChange.current = true
    pushHistory(newContent)
    // Use a longer timeout to ensure React finishes batching state updates
    // before we re-enable broadcasting
    setTimeout(() => { isReceivingRemoteChange.current = false }, 100)
  }, [pushHistory])

  const { collaborators, typingUsers, isConnected, broadcastContentChange, updateCursor } =
    useCollaboration({
      documentId: activeDocId,
      userId: user?.id ?? '',
      displayName: user?.email?.split('@')[0] ?? 'Anonymous',
      onContentChange: handleRemoteContentChange,
    })

  // Debounced broadcast (150ms after user stops typing — snappy)
  const debouncedBroadcast = useDebouncedCallback(
    (content: string) => broadcastContentChange(content),
    150
  )

  // Throttled cursor update (max 10x/sec)
  const throttledUpdateCursor = useThrottle(updateCursor, 100)

  // ── Auto-open document from query param (?docId=...) ──────
  const docIdHandled = useRef(false)
  useEffect(() => {
    if (docIdHandled.current || !user || authLoading) return
    const docIdParam = searchParams.get('docId')
    if (!docIdParam) return
    docIdHandled.current = true
    setDocLoading(true)

    // Try sessionStorage first (set by SharedDocumentView "Buka di Editor")
    const cached = sessionStorage.getItem(`shared_doc_${docIdParam}`)
    if (cached) {
      try {
        const doc = JSON.parse(cached)
        setActiveDocId(doc.id)
        setActiveDocTitle(doc.title)
        setActiveDocOwnerId(doc.user_id)
        resetHistory(doc.content || '')
        sessionStorage.removeItem(`shared_doc_${docIdParam}`)
        setDocLoading(false)
        return
      } catch { /* fall through to getDocument */ }
    }

    // Fallback: try getDocument directly (works if user is owner)
    getDocument(docIdParam)
      .then((fullDoc) => {
        setActiveDocId(fullDoc.id)
        setActiveDocTitle(fullDoc.title)
        setActiveDocOwnerId(fullDoc.user_id)
        resetHistory(fullDoc.content)
      })
      .catch((err) => console.error('Failed to open shared doc:', err))
      .finally(() => setDocLoading(false))
  }, [user, authLoading, searchParams, resetHistory])

  // ── Open document ─────────────────────────────────────────
  async function handleDocumentSelect(doc: DocumentSummary) {
    if (doc.id === activeDocId) return
    setDocLoading(true)
    try {
      const fullDoc = await getDocument(doc.id)
      setActiveDocId(fullDoc.id)
      setActiveDocTitle(fullDoc.title)
      setActiveDocOwnerId(fullDoc.user_id)
      resetHistory(fullDoc.content)
    } catch (err) {
      console.error('Failed to open document:', err)
    } finally {
      setDocLoading(false)
    }
  }

  // ── Handle document delete ────────────────────────────────
  function handleDocumentDelete(deletedId: string) {
    if (deletedId === activeDocId) {
      setActiveDocId(null)
      setActiveDocTitle('')
      resetHistory('')
    }
  }

  function handleContentChange(newContent: string) {
    pushHistory(newContent)
    // Only broadcast locally-initiated changes
    if (!isReceivingRemoteChange.current) {
      debouncedBroadcast(newContent)
    }
  }

  function handleAIUpdate(newContent: string) {
    pushHistory(newContent)
    // AI updates are always local, broadcast immediately
    broadcastContentChange(newContent)
  }

  function handleCursorChange(line: number, col: number) {
    throttledUpdateCursor(line, col)
  }

  function downloadDocument() {
    if (!activeDocId) return
    const blob = new Blob([documentContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeDocTitle || 'document'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  // Suppress unused var warning for saveNamedVersion
  void saveNamedVersion

  // Auth loading
  if (authLoading) {
    return (
      <div className="auth-page">
        <div className="auth-loading">Loading...</div>
      </div>
    )
  }

  // Not signed in
  if (!user) {
    return <AuthForm />
  }

  // Lazy-load ShareDialog
  const ShareDialog = showShareDialog
    ? require('@/components/ShareDialog').ShareDialog
    : null

  // Typing users display names
  const typingNames = typingUsers
    .map((uid) => collaborators.find((c) => c.userId === uid)?.displayName ?? 'Someone')
    .join(', ')

  return (
    <div className="ai-editor-root">
      {/* Top Bar */}
      <div className="topbar">
        <div className="topbar-left">
          <button
            className="topbar-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            {sidebarOpen
              ? <PanelLeftClose size={12} strokeWidth={1.5} />
              : <PanelLeft size={12} strokeWidth={1.5} />
            }
          </button>
          <span className="topbar-brand">AI Editor</span>
          {activeDocId && (
            <>
              <span className="topbar-separator">/</span>
              <span
                className={`topbar-doctitle ${isRenaming ? 'renaming' : ''}`}
                title="Klik untuk ganti nama"
                onClick={async () => {
                  const newTitle = prompt('Ganti nama dokumen:', activeDocTitle)
                  if (!newTitle || newTitle === activeDocTitle) return
                  try {
                    setIsRenaming(true)
                    await renameDocument(activeDocId, newTitle)
                    setActiveDocTitle(newTitle)
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Error tidak diketahui'
                    alert(`Gagal mengganti nama: ${msg}`)
                  } finally {
                    setIsRenaming(false)
                  }
                }}
              >
                {isRenaming ? '...' : activeDocTitle}
                <Pencil size={10} strokeWidth={1.5} style={{ marginLeft: 6, opacity: 0.5 }} />
              </span>
              {/* Auto-save Status Indicator */}
              <span className={`topbar-save-status topbar-save-status--${saveStatus}`}>
                {saveStatus === 'saving' && (
                  <><span className="topbar-save-dot saving" />Menyimpan...</>
                )}
                {saveStatus === 'saved' && (
                  <><span className="topbar-save-dot saved" />Tersimpan</>
                )}
                {saveStatus === 'error' && (
                  <><span className="topbar-save-dot error" />Gagal simpan</>
                )}
              </span>
            </>
          )}
        </div>

        {/* Presence Indicator — center/right of topbar */}
        {activeDocId && (
          <div className="topbar-presence">
            <PresenceIndicator
              collaborators={collaborators}
              isConnected={isConnected}
            />
          </div>
        )}

        {activeDocId && (
          <div className="topbar-actions">
            <button className="topbar-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
              <Undo2 size={12} strokeWidth={1.5} />
              Undo
            </button>
            <button className="topbar-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
              <Redo2 size={12} strokeWidth={1.5} />
              Redo
            </button>
            <button className="topbar-btn" onClick={downloadDocument} title="Download">
              <Download size={12} strokeWidth={1.5} />
              Export
            </button>
            <button className="topbar-btn" onClick={() => setShowShareDialog(true)} title="Share">
              <Share2 size={12} strokeWidth={1.5} />
              Share
            </button>
            <button
              className="topbar-btn topbar-btn-primary"
              onClick={async () => {
                try {
                  await saveNow()
                  alert('Dokumen berhasil disimpan!')
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : 'Error'
                  alert(`Gagal simpan: ${msg}`)
                }
              }}
              title="Save (Ctrl+S)"
            >
              <Save size={12} strokeWidth={1.5} />
              Save
            </button>

            <button
              className={`topbar-btn ${showHistory ? 'topbar-btn-active' : ''}`}
              onClick={() => setShowHistory(!showHistory)}
              title="Version History"
            >
              <History size={12} strokeWidth={1.5} />
              History
            </button>
          </div>
        )}

        <div className="topbar-right">
          <span className="topbar-email">{user.email}</span>
          <button className="topbar-btn" onClick={handleSignOut}>
            <LogOut size={12} strokeWidth={1.5} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-layout">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="sidebar-container">
            <DocsSidebar
              userId={user.id}
              activeDocumentId={activeDocId}
              onDocumentSelect={handleDocumentSelect}
              onDocumentDelete={handleDocumentDelete}
            />
          </div>
        )}

        {/* Editor + Chat */}
        <div className="editor-area">
          {docLoading ? (
            <div className="editor-loading">
              <Loader2 size={20} strokeWidth={1.5} className="sidebar-spinner" />
              <span>Loading document...</span>
            </div>
          ) : activeDocId ? (
            <div className="panels-wrapper" key={activeDocId}>
              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <div className="typing-indicator">
                  <span className="typing-dots">
                    <span /><span /><span />
                  </span>
                  <span className="typing-text">
                    {typingNames} sedang mengetik...
                  </span>
                </div>
              )}

              <PanelGroup orientation="horizontal">
                <Panel id="editor" defaultSize={50} minSize={30}>
                  <DocumentEditor
                    content={documentContent}
                    onChange={handleContentChange}
                    collaborators={collaborators}
                    onCursorChange={handleCursorChange}
                  />
                </Panel>

                <PanelResizeHandle className="panel-resize-handle" />

                <Panel id="chat" defaultSize={50} minSize={30}>
                  <AIChat
                    documentContent={documentContent}
                    onDocumentUpdate={handleAIUpdate}
                  />
                </Panel>
              </PanelGroup>
            </div>
          ) : (
            <div className="editor-empty">
              <FileText size={32} strokeWidth={1} style={{ opacity: 0.15 }} />
              <p className="editor-empty-title">No Document Selected</p>
              <p className="editor-empty-desc">
                Select a document from the sidebar or create a new one to start editing.
              </p>
            </div>
          )}
        </div>

        {/* Version History Sidebar */}
        {showHistory && activeDocId && (
          <div className="history-sidebar">
            <VersionTimeline
              documentId={activeDocId}
              userId={user.id}
              onCompare={(a, b) => {
                setCompareVersions({ a, b })
              }}
              onContentRestore={async () => {
                try {
                  const fresh = await getDocument(activeDocId)
                  resetHistory(fresh.content)
                } catch (err) {
                  console.error('Failed to reload after restore:', err)
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Diff Modal */}
      {compareVersions && (
        <DiffModal
          versionIdA={compareVersions.a}
          versionIdB={compareVersions.b}
          onClose={() => setCompareVersions(null)}
        />
      )}

      {/* Share Dialog */}
      {showShareDialog && activeDocId && ShareDialog && (
        <ShareDialog
          documentId={activeDocId}
          ownerId={user.id}
          onClose={() => setShowShareDialog(false)}
        />
      )}
    </div>
  )
}
