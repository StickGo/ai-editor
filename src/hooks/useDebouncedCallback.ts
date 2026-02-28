'use client'

import { useRef } from 'react'

export function useDebouncedCallback<T extends unknown[]>(
  fn: (...args: T) => void,
  delayMs: number
): (...args: T) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fnRef = useRef(fn)
  fnRef.current = fn

  // Stable function ref — does not change across renders
  const stableRef = useRef((...args: T) => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fnRef.current(...args), delayMs)
  })

  return stableRef.current
}
