'use client'

import { useEffect } from 'react'

export default function ScrollToContent({ id }: { id: string }) {
  useEffect(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'instant' })
  }, [id])

  return null
}
