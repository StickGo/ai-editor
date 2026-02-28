'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export type SaveStatus = 'saved' | 'saving' | 'error'

export function useAutoSave(
  documentId: string | null,
  content: string,
  isOwner: boolean = true
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const savedContentRef = useRef(content)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // ── Core save function ───────────────────────────────────
  const performSave = useCallback(async (contentToSave: string) => {
    if (!documentId) return
    // Only the document owner should auto-save
    if (!isOwner) return

    setSaveStatus('saving')
    try {
      const { error } = await supabase
        .from('documents')
        .update({ content: contentToSave, updated_at: new Date().toISOString() })
        .eq('id', documentId)

      if (error) throw error

      savedContentRef.current = contentToSave
      setSaveStatus('saved')
    } catch (err) {
      console.error('Save failed:', err)
      setSaveStatus('error')
      throw err
    }
  }, [documentId, isOwner])

  // ── Manual "Save Now" exposed to callers ─────────────────
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    await performSave(savedContentRef.current)
  }, [performSave])

  // ── Auto-save: debounce 2s after content changes ─────────
  useEffect(() => {
    if (!documentId || !isOwner) return
    if (content === savedContentRef.current) return

    // Guard: never save empty content over non-empty saved content
    if (!content && savedContentRef.current) return

    savedContentRef.current = content
    setSaveStatus('saving')

    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(async () => {
      try {
        await performSave(content)
      } catch {
        // error state already set by performSave
      }
    }, 2000)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [documentId, content, performSave, isOwner])

  return { saveStatus, saveNow }
}

