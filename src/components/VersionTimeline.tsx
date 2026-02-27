'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getVersionList,
  getVersionContent,
  restoreVersion,
  type DocumentVersionSummary,
} from '@/lib/versions'
import { Loader2, RotateCcw } from 'lucide-react'

interface VersionTimelineProps {
  documentId: string
  userId: string
  onCompare: (versionIdA: string, versionIdB: string) => void
  onContentRestore: () => void
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  if (hours < 24) return `${hours} jam lalu`
  return `${days} hari lalu`
}

export function VersionTimeline({
  documentId,
  userId,
  onCompare,
  onContentRestore,
}: VersionTimelineProps) {
  const [versions, setVersions] = useState<DocumentVersionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)

  // State untuk pilih 2 versi arbitrary
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isRestoring, setIsRestoring] = useState<string | null>(null)

  const loadVersions = useCallback(
    async (pageNum: number, append = false) => {
      try {
        setIsLoading(true)
        const result = await getVersionList(documentId, pageNum)
        setVersions((prev) =>
          append ? [...prev, ...result.versions] : result.versions
        )
        setHasMore(result.hasMore)
      } catch (err) {
        console.error('Failed to load versions:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [documentId]
  )

  useEffect(() => {
    loadVersions(0)
  }, [loadVersions])

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 2) return [prev[1], id] // geser: buang yang pertama
      return [...prev, id]
    })
  }

  async function handleRestore(version: DocumentVersionSummary) {
    if (
      !confirm(
        `Restore ke v${version.version_number}? Versi saat ini akan tersimpan otomatis sebelum restore.`
      )
    )
      return
    try {
      setIsRestoring(version.id)
      await restoreVersion(documentId, version.id, userId)
      // Reload versi setelah restore
      await loadVersions(0)
      onContentRestore()
    } catch (err) {
      alert('Gagal restore versi')
      console.error(err)
    } finally {
      setIsRestoring(null)
    }
  }

  function handleLoadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    loadVersions(nextPage, true)
  }

  return (
    <div className="version-timeline">
      {/* Header */}
      <div className="version-timeline-header">
        <h2 className="version-timeline-title">Histori Versi</h2>

        {/* Quick compare: last vs second-to-last */}
        {versions.length >= 2 && (
          <button
            onClick={() => onCompare(versions[1].id, versions[0].id)}
            className="version-quick-compare-btn"
          >
            ⚡ Compare: v{versions[1].version_number} vs v
            {versions[0].version_number}
          </button>
        )}

        {/* Arbitrary compare: pilih 2 versi */}
        {selectedIds.length === 2 && (
          <button
            onClick={() => onCompare(selectedIds[0], selectedIds[1])}
            className="version-compare-selected-btn"
          >
            🔍 Compare {selectedIds.length} versi dipilih
          </button>
        )}
        {selectedIds.length === 1 && (
          <p className="version-hint">Pilih 1 versi lagi untuk dibandingkan</p>
        )}
        {selectedIds.length === 0 && versions.length >= 2 && (
          <p className="version-hint-muted">
            Centang 2 versi untuk compare bebas
          </p>
        )}
      </div>

      {/* Daftar versi */}
      <div className="version-timeline-list">
        {isLoading && versions.length === 0 ? (
          <div className="version-state">
            <Loader2 size={16} strokeWidth={1.5} className="sidebar-spinner" />
            <span>Memuat histori...</span>
          </div>
        ) : versions.length === 0 ? (
          <div className="version-state">
            Belum ada histori versi. Edit dokumen dan tunggu auto-save, atau
            klik &ldquo;Save Version&rdquo;.
          </div>
        ) : (
          <>
            {versions.map((version, index) => {
              const isSelected = selectedIds.includes(version.id)
              const isLatest = index === 0

              return (
                <div
                  key={version.id}
                  className={`version-item ${isSelected ? 'selected' : ''}`}
                >
                  <div className="version-item-row">
                    {/* Checkbox untuk arbitrary compare */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(version.id)}
                      className="version-checkbox"
                    />

                    <div className="version-item-info">
                      {/* Nomor versi + label */}
                      <div className="version-item-header">
                        <span className="version-number">
                          v{version.version_number}
                        </span>
                        {isLatest && (
                          <span className="version-badge-latest">Latest</span>
                        )}
                        {version.label && (
                          <span className="version-label">
                            — {version.label}
                          </span>
                        )}
                      </div>

                      {/* Timestamp */}
                      <p className="version-time">
                        {formatRelativeTime(version.created_at)}
                        {' · '}
                        {new Date(version.created_at).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* Tombol restore */}
                    {!isLatest && (
                      <button
                        onClick={() => handleRestore(version)}
                        disabled={isRestoring === version.id}
                        className="version-restore-btn"
                        title={`Restore to v${version.version_number}`}
                      >
                        {isRestoring === version.id ? (
                          <Loader2
                            size={11}
                            strokeWidth={1.5}
                            className="sidebar-spinner"
                          />
                        ) : (
                          <RotateCcw size={11} strokeWidth={1.5} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Load more */}
            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="version-load-more"
              >
                {isLoading ? 'Memuat...' : 'Muat lebih banyak'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
