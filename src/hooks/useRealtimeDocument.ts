'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export function useRealtimeDocument(
  documentId: string | null,
  onUpdate: (content: string) => void
) {
  useEffect(() => {
    if (!documentId) return

    const channel = supabase
      .channel(`document:${documentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'documents',
          filter: `id=eq.${documentId}`
        },
        (payload: RealtimePostgresChangesPayload<{ content: string }>) => {
          const newRecord = payload.new as { content: string }
          onUpdate(newRecord.content)
        }
      )
      .subscribe()

    // IMPORTANT: Use removeChannel for proper cleanup, not just unsubscribe
    return () => {
      supabase.removeChannel(channel)
    }
  }, [documentId, onUpdate])
}
