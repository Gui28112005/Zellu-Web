import { useState, useEffect } from 'react'

/** Returns true while the main scroll container is at the very top. */
export function useScrollAtTop(threshold = 8): boolean {
  const [atTop, setAtTop] = useState(true)

  useEffect(() => {
    const el = document.querySelector('main')
    if (!el) return
    const check = () => setAtTop(el.scrollTop <= threshold)
    el.addEventListener('scroll', check, { passive: true })
    check()
    return () => el.removeEventListener('scroll', check)
  }, [threshold])

  return atTop
}
