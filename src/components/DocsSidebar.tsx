'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getUserDocuments,
  createDocument,
  renameDocument,
  deleteDocument,
  searchDocuments,
  getDocumentsPaginated,
  type DocumentSummary,
  type SortOption,
} from '@/lib/documents'
import { useDebounce } from '@/hooks/useDebounce'
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Loader2,
  X,
} from 'lucide-react'

interface DocsSidebarProps {
  userId: string
  activeDocumentId: string | null
  onDocumentSelect: (doc: DocumentSummary) => void
  onDocumentDelete: (deletedId: string) => void
}

export function DocsSidebar({
  userId,
  activeDocumentId,
  onDocumentSelect,
  onDocumentDelete,
}: DocsSidebarProps) {
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebounce(searchQuery, 300)

  // Sort & Pagination state
  const [sortOption, setSortOption] = useState<SortOption>('updated_desc')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Load documents ──────────────────────────────────────────
  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (debouncedQuery.trim()) {
        // Search mode
        const results = await searchDocuments(userId, debouncedQuery)
        setDocuments(results)
        setTotalPages(1)
        setTotal(results.length)
      } else {
        // Paginated + sorted mode
        const result = await getDocumentsPaginated(userId, sortOption, page, 10)
        setDocuments(result.documents)
        setTotalPages(result.totalPages)
        setTotal(result.total)
      }
    } catch (err) {
      setError('Gagal memuat dokumen. Coba refresh halaman.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [userId, debouncedQuery, sortOption, page])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // Reset page when search or sort changes
  useEffect(() => {
    setPage(0)
  }, [debouncedQuery, sortOption])

  // ── Create document ─────────────────────────────────────────
  async function handleCreate() {
    try {
      const newDoc = await createDocument(userId, 'Untitled')
      setDocuments(prev => [newDoc, ...prev])
      onDocumentSelect(newDoc)
      setRenamingId(newDoc.id)
      setRenameValue('Untitled')
    } catch (err) {
      console.error('Gagal membuat dokumen:', err)
    }
  }

  // ── Rename ──────────────────────────────────────────────────
  function startRename(doc: DocumentSummary) {
    setRenamingId(doc.id)
    setRenameValue(doc.title)
  }

  async function submitRename(documentId: string) {
    try {
      await renameDocument(documentId, renameValue)
      setDocuments(prev =>
        prev.map(d => d.id === documentId ? { ...d, title: renameValue.trim() } : d)
      )
    } catch (err) {
      console.error('Gagal rename:', err)
    } finally {
      setRenamingId(null)
    }
  }

  // ── Delete ──────────────────────────────────────────────────
  async function handleDelete(documentId: string) {
    try {
      await deleteDocument(documentId)
      setDocuments(prev => prev.filter(d => d.id !== documentId))
      setDeletingId(null)
      if (documentId === activeDocumentId) {
        onDocumentDelete(documentId)
      }
    } catch (err) {
      console.error('Gagal menghapus:', err)
    }
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="sidebar-root">
      {/* Header */}
      <div className="sidebar-header">
        <span className="sidebar-title">
          <FileText size={14} strokeWidth={1.5} />
          Documents
        </span>
        <button className="sidebar-create-btn" onClick={handleCreate} title="New Document">
          <Plus size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <Search size={12} strokeWidth={1.5} className="sidebar-search-icon" />
        <input
          type="text"
          placeholder="Cari dokumen..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="sidebar-search-input"
        />
        {searchQuery && (
          <button className="sidebar-search-clear" onClick={() => setSearchQuery('')}>
            <X size={12} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Sort */}
      {!searchQuery && (
        <div className="sidebar-sort">
          <ArrowUpDown size={10} strokeWidth={1.5} />
          <select
            value={sortOption}
            onChange={e => setSortOption(e.target.value as SortOption)}
            className="sidebar-sort-select"
          >
            <option value="updated_desc">Terbaru</option>
            <option value="updated_asc">Terlama</option>
            <option value="title_asc">Judul A-Z</option>
            <option value="title_desc">Judul Z-A</option>
          </select>
        </div>
      )}

      {/* Document List */}
      <div className="sidebar-list">
        {isLoading ? (
          <div className="sidebar-state">
            <Loader2 size={16} strokeWidth={1.5} className="sidebar-spinner" />
            <span>Memuat...</span>
          </div>
        ) : error ? (
          <div className="sidebar-state sidebar-error">
            <p>{error}</p>
            <button onClick={loadDocuments} className="sidebar-retry-btn">
              Coba lagi
            </button>
          </div>
        ) : documents.length === 0 ? (
          <div className="sidebar-state">
            <FileText size={20} strokeWidth={1} style={{ opacity: 0.3 }} />
            {searchQuery ? (
              <p>Tidak ada dokumen dengan kata &ldquo;{searchQuery}&rdquo;</p>
            ) : (
              <>
                <p>Belum ada dokumen</p>
                <button className="sidebar-create-first-btn" onClick={handleCreate}>
                  Buat dokumen pertama
                </button>
              </>
            )}
          </div>
        ) : (
          documents.map(doc => (
            <div
              key={doc.id}
              className={`sidebar-item ${doc.id === activeDocumentId ? 'active' : ''}`}
              onClick={() => renamingId !== doc.id && onDocumentSelect(doc)}
            >
              {renamingId === doc.id ? (
                <input
                  type="text"
                  value={renameValue}
                  autoFocus
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => submitRename(doc.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitRename(doc.id)
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  className="sidebar-rename-input"
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <>
                  <div className="sidebar-item-info">
                    <span className="sidebar-item-title">{doc.title}</span>
                    <span className="sidebar-item-date">
                      {new Date(doc.updated_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short'
                      })}
                    </span>
                  </div>
                  <div className="sidebar-item-actions">
                    <button
                      onClick={e => { e.stopPropagation(); startRename(doc) }}
                      className="sidebar-action-btn"
                      title="Ganti nama"
                    >
                      <Pencil size={11} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeletingId(doc.id) }}
                      className="sidebar-action-btn sidebar-action-delete"
                      title="Hapus"
                    >
                      <Trash2 size={11} strokeWidth={1.5} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!searchQuery && totalPages > 1 && (
        <div className="sidebar-pagination">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="sidebar-page-btn"
          >
            <ChevronLeft size={12} strokeWidth={1.5} />
          </button>
          <span className="sidebar-page-info">
            {page + 1}/{totalPages} ({total})
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="sidebar-page-btn"
          >
            <ChevronRight size={12} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deletingId && (
        <div className="sidebar-modal-overlay">
          <div className="sidebar-modal">
            <h3 className="sidebar-modal-title">Hapus Dokumen?</h3>
            <p className="sidebar-modal-text">
              Dokumen ini akan dihapus permanen dan tidak bisa dipulihkan.
            </p>
            <div className="sidebar-modal-actions">
              <button onClick={() => setDeletingId(null)} className="sidebar-modal-cancel">
                Batal
              </button>
              <button onClick={() => handleDelete(deletingId)} className="sidebar-modal-confirm">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
