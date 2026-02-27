'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export type SaveStatus = 'saved' | 'saving' | 'error'

export function useAutoSave(documentId: string | null, content: string) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const savedContentRef = useRef(content)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // ── Core save function ───────────────────────────────────
  const performSave = useCallback(async (contentToSave: string) => {
    if (!documentId) return
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
  }, [documentId])

  // ── Manual "Save Now" exposed to callers ─────────────────
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    await performSave(savedContentRef.current)
  }, [performSave])

  // ── Auto-save: debounce 2s after content changes ─────────
  useEffect(() => {
    if (!documentId) return
    if (content === savedContentRef.current) return

    // update the ref so saveNow always has latest content
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
  }, [documentId, content, performSave])

  return { saveStatus, saveNow }
}
