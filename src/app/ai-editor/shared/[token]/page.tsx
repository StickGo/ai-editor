import { supabase } from '@/lib/supabase/client'
import { SharedDocumentView } from './SharedDocumentView'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function SharedDocumentPage({ params }: PageProps) {
  const { token } = await params

  // Fetch share record
  const { data: share } = await supabase
    .from('document_shares')
    .select('document_id, permission, expires_at')
    .eq('share_token', token)
    .maybeSingle()

  // Not found
  if (!share) {
    return <InvalidLink reason="Link tidak ditemukan atau sudah dihapus." />
  }

  // Expired
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return <InvalidLink reason="Link ini sudah kedaluwarsa." />
  }

  // Fetch the document
  const { data: document } = await supabase
    .from('documents')
    .select('id, title, content, user_id, updated_at, created_at')
    .eq('id', share.document_id)
    .single()

  if (!document) {
    return <InvalidLink reason="Dokumen tidak ditemukan atau sudah dihapus." />
  }

  return (
    <SharedDocumentView
      document={document}
      permission={share.permission as 'view' | 'edit'}
    />
  )
}

function InvalidLink({ reason }: { reason: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#000',
      color: '#fff',
      fontFamily: 'Inter, sans-serif',
      gap: 12,
    }}>
      <span style={{ fontSize: 48 }}>🔗</span>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Link Tidak Valid</h1>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0 }}>{reason}</p>
      <a
        href="/ai-editor"
        style={{
          marginTop: 8,
          padding: '8px 20px',
          background: '#fff',
          color: '#000',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 600,
          textDecoration: 'none',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        Buka Editor
      </a>
    </div>
  )
}
