'use client'

import { useState, useEffect, useRef } from 'react'
import { getVersionContent, type DocumentVersion } from '@/lib/versions'
import { computeDiff, type DiffLine, type DiffResult } from '@/lib/diff'
import { Loader2, X } from 'lucide-react'

interface DiffModalProps {
  versionIdA: string // versi A
  versionIdB: string // versi B
  onClose: () => void
}

type ViewMode = 'split' | 'unified'

export function DiffModal({ versionIdA, versionIdB, onClose }: DiffModalProps) {
  const [versionA, setVersionA] = useState<DocumentVersion | null>(null)
  const [versionB, setVersionB] = useState<DocumentVersion | null>(null)
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0)
  const changeRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true)
        const [a, b] = await Promise.all([
          getVersionContent(versionIdA),
          getVersionContent(versionIdB),
        ])

        // Pastikan A adalah yang lebih lama (version_number lebih kecil)
        const [older, newer] =
          a.version_number < b.version_number ? [a, b] : [b, a]

        setVersionA(older)
        setVersionB(newer)
        setDiffResult(computeDiff(older.content, newer.content))
      } catch (err) {
        console.error('Failed to load diff:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [versionIdA, versionIdB])

  // Indeks baris yang merupakan perubahan (added atau removed)
  const changeLineIndices =
    diffResult?.lines
      .map((line, i) => (line.type !== 'unchanged' ? i : -1))
      .filter((i) => i !== -1) ?? []

  function scrollToChange(index: number) {
    const el = changeRefs.current[index]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  function goToNextChange() {
    const next = Math.min(currentChangeIndex + 1, changeLineIndices.length - 1)
    setCurrentChangeIndex(next)
    scrollToChange(next)
  }

  function goToPrevChange() {
    const prev = Math.max(currentChangeIndex - 1, 0)
    setCurrentChangeIndex(prev)
    scrollToChange(prev)
  }

  // Warna latar per tipe baris
  function getLineBgClass(type: DiffLine['type']): string {
    switch (type) {
      case 'added':
        return 'diff-line-added'
      case 'removed':
        return 'diff-line-removed'
      default:
        return ''
    }
  }

  function getLineTextClass(type: DiffLine['type']): string {
    switch (type) {
      case 'added':
        return 'diff-text-added'
      case 'removed':
        return 'diff-text-removed'
      default:
        return 'diff-text-unchanged'
    }
  }

  function getLinePrefix(type: DiffLine['type']): string {
    switch (type) {
      case 'added':
        return '+'
      case 'removed':
        return '-'
      default:
        return ' '
    }
  }

  // Track which change index a line corresponds to (for refs)
  let changeCounter = -1
  const lineToChangeIndex = diffResult?.lines.map((line) => {
    if (line.type !== 'unchanged') {
      changeCounter++
      return changeCounter
    }
    return -1
  }) ?? []

  return (
    <div className="diff-overlay">
      <div className="diff-modal">
        {/* Header */}
        <div className="diff-header">
          <div className="diff-header-left">
            <h2 className="diff-title">
              {versionA && versionB
                ? `v${versionA.version_number} → v${versionB.version_number}`
                : 'Memuat diff...'}
            </h2>

            {diffResult && (
              <div className="diff-stats">
                <span className="diff-stat-added">
                  +{diffResult.stats.added} ditambah
                </span>
                <span className="diff-stat-removed">
                  -{diffResult.stats.removed} dihapus
                </span>
                <span className="diff-stat-unchanged">
                  {diffResult.stats.unchanged} tidak berubah
                </span>
              </div>
            )}
          </div>

          <div className="diff-header-right">
            {/* Navigation perubahan */}
            {changeLineIndices.length > 0 && (
              <div className="diff-nav">
                <button
                  onClick={goToPrevChange}
                  disabled={currentChangeIndex === 0}
                  className="diff-nav-btn"
                >
                  ↑
                </button>
                <span className="diff-nav-count">
                  {currentChangeIndex + 1} / {changeLineIndices.length}
                </span>
                <button
                  onClick={goToNextChange}
                  disabled={
                    currentChangeIndex === changeLineIndices.length - 1
                  }
                  className="diff-nav-btn"
                >
                  ↓
                </button>
              </div>
            )}

            {/* Toggle view mode */}
            <div className="diff-view-toggle">
              <button
                onClick={() => setViewMode('split')}
                className={`diff-view-btn ${viewMode === 'split' ? 'active' : ''}`}
              >
                Split
              </button>
              <button
                onClick={() => setViewMode('unified')}
                className={`diff-view-btn ${viewMode === 'unified' ? 'active' : ''}`}
              >
                Unified
              </button>
            </div>

            <button onClick={onClose} className="diff-close-btn">
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="diff-content">
          {isLoading ? (
            <div className="diff-loading">
              <Loader2 size={20} strokeWidth={1.5} className="sidebar-spinner" />
              <span>Menghitung perbedaan...</span>
            </div>
          ) : !diffResult ? (
            <div className="diff-error">Gagal memuat diff</div>
          ) : viewMode === 'unified' ? (
            // ── UNIFIED VIEW ──────────────────────────────────────
            <div className="diff-unified">
              {/* Header kolom */}
              <div className="diff-unified-header">
                <span>Lama</span>
                <span>Baru</span>
                <span>Konten</span>
              </div>

              {diffResult.lines.map((line, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    if (lineToChangeIndex[i] !== -1) {
                      changeRefs.current[lineToChangeIndex[i]] = el
                    }
                  }}
                  className={`diff-unified-line ${getLineBgClass(line.type)}`}
                >
                  <span className="diff-line-num">
                    {line.lineNumberOld ?? ''}
                  </span>
                  <span className="diff-line-num">
                    {line.lineNumberNew ?? ''}
                  </span>
                  <span
                    className={`diff-line-content ${getLineTextClass(line.type)}`}
                  >
                    <span className="diff-prefix">
                      {getLinePrefix(line.type)}
                    </span>
                    {line.content}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            // ── SPLIT VIEW ────────────────────────────────────────
            <div className="diff-split">
              {/* Panel kiri: versi LAMA */}
              <div className="diff-split-panel">
                <div className="diff-split-panel-header diff-panel-old">
                  v{versionA?.version_number} —{' '}
                  {versionA?.label ?? 'Versi Lama'}
                  {versionA && (
                    <span className="diff-panel-time">
                      {new Date(versionA.created_at).toLocaleString('id-ID')}
                    </span>
                  )}
                </div>
                {diffResult.lines
                  .filter((l) => l.type !== 'added')
                  .map((line, i) => (
                    <div
                      key={i}
                      className={`diff-split-line ${getLineBgClass(line.type)}`}
                    >
                      <span className="diff-line-num">
                        {line.lineNumberOld}
                      </span>
                      <span
                        className={`diff-line-content ${getLineTextClass(line.type)}`}
                      >
                        {line.content}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Panel kanan: versi BARU */}
              <div className="diff-split-panel">
                <div className="diff-split-panel-header diff-panel-new">
                  v{versionB?.version_number} —{' '}
                  {versionB?.label ?? 'Versi Baru'}
                  {versionB && (
                    <span className="diff-panel-time">
                      {new Date(versionB.created_at).toLocaleString('id-ID')}
                    </span>
                  )}
                </div>
                {diffResult.lines
                  .filter((l) => l.type !== 'removed')
                  .map((line, i) => {
                    const changeIdx = lineToChangeIndex[
                      diffResult.lines.indexOf(line)
                    ]
                    return (
                      <div
                        key={i}
                        ref={(el) => {
                          if (changeIdx !== undefined && changeIdx !== -1) {
                            changeRefs.current[changeIdx] = el
                          }
                        }}
                        className={`diff-split-line ${getLineBgClass(line.type)}`}
                      >
                        <span className="diff-line-num">
                          {line.lineNumberNew}
                        </span>
                        <span
                          className={`diff-line-content ${getLineTextClass(line.type)}`}
                        >
                          {line.content}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
