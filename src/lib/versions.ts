// ─── VERSION HISTORY — berbasis localStorage ─────────────────
// Tidak memerlukan tabel database. Bekerja 100% offline/instan.

export interface DocumentVersion {
  id: string
  document_id: string
  content: string
  version_number: number
  label: string | null
  created_by: string | null
  created_at: string
}

export type DocumentVersionSummary = Omit<DocumentVersion, 'content'>

// ── Helpers ──────────────────────────────────────────────────

function storageKey(documentId: string) {
  return `doc_versions_${documentId}`
}

function loadVersions(documentId: string): DocumentVersion[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey(documentId))
    return raw ? (JSON.parse(raw) as DocumentVersion[]) : []
  } catch {
    return []
  }
}

function saveVersions(documentId: string, versions: DocumentVersion[]) {
  if (typeof window === 'undefined') return
  // Batasi 50 versi per dokumen agar tidak penuh
  const trimmed = versions.slice(0, 50)
  localStorage.setItem(storageKey(documentId), JSON.stringify(trimmed))
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ── Simpan snapshot ──────────────────────────────────────────

export async function createSnapshot(
  documentId: string,
  content: string,
  createdBy: string,
  label?: string
): Promise<DocumentVersion | null> {
  if (!documentId || !createdBy) {
    throw new Error('ID Dokumen atau User ID tidak ditemukan.')
  }

  const versions = loadVersions(documentId)

  // Skip jika konten sama dengan versi terakhir
  if (versions.length > 0 && versions[0].content === content) {
    return null
  }

  const nextVersion = (versions[0]?.version_number ?? 0) + 1

  const newVersion: DocumentVersion = {
    id: generateId(),
    document_id: documentId,
    content,
    version_number: nextVersion,
    label: label ?? null,
    created_by: createdBy,
    created_at: new Date().toISOString(),
  }

  // Simpan di urutan terbaru dulu
  saveVersions(documentId, [newVersion, ...versions])

  console.log(`[Versions] Saved v${nextVersion} for doc ${documentId}`)
  return newVersion
}

// ── Ambil daftar versi untuk timeline ───────────────────────

export async function getVersionList(
  documentId: string,
  page: number = 0,
  pageSize: number = 20
): Promise<{ versions: DocumentVersionSummary[]; hasMore: boolean }> {
  const all = loadVersions(documentId)
  const start = page * pageSize
  const slice = all.slice(start, start + pageSize + 1)
  const hasMore = slice.length > pageSize

  const versions: DocumentVersionSummary[] = slice.slice(0, pageSize).map(
    ({ content: _, ...rest }) => rest
  )

  return { versions, hasMore }
}

// ── Ambil konten satu versi ──────────────────────────────────

export async function getVersionContent(versionId: string): Promise<DocumentVersion> {
  if (typeof window === 'undefined') throw new Error('SSR tidak didukung')

  // Cari di semua dokumen yang tersimpan
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith('doc_versions_')) continue
    try {
      const versions: DocumentVersion[] = JSON.parse(localStorage.getItem(key) ?? '[]')
      const found = versions.find((v) => v.id === versionId)
      if (found) return found
    } catch {
      continue
    }
  }

  throw new Error('Versi tidak ditemukan')
}

// ── Restore versi lama ───────────────────────────────────────

export async function restoreVersion(
  documentId: string,
  versionId: string,
  userId: string
): Promise<DocumentVersion | null> {
  const version = await getVersionContent(versionId)

  // Buat snapshot baru bertanda "Restored"
  const restored = await createSnapshot(
    documentId,
    version.content,
    userId,
    `Restored from v${version.version_number}`
  )

  return restored
}
